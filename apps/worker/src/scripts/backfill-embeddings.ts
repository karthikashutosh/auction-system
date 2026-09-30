import "dotenv/config";
import { aiClient } from "@repo/ai-client";
import {
  db,
  getAuctionsNeedingEmbedding,
  getEmbeddingStats,
  setAuctionEmbedding,
} from "@repo/db";
import { embeddingText } from "../embedding-text";

/**
 * Batched, resumable, idempotent: it only ever selects rows whose embedding is
 * missing or was produced by a different model, so re-running is a no-op and
 * a crash mid-way resumes where it stopped.
 */
const BATCH = Number(process.env.BACKFILL_BATCH ?? 32);
// Throttle between batches (rate limits; also makes outage drills observable).
const DELAY_MS = Number(process.env.BACKFILL_DELAY_MS ?? 0);

async function main() {
  const started = Date.now();
  const { model } = await aiClient.embed("model probe", "backfill_probe");
  let done = 0;
  let tokens = 0;

  for (;;) {
    const rows = await getAuctionsNeedingEmbedding({ model, limit: BATCH });
    if (rows.length === 0) break;

    let res: Awaited<ReturnType<typeof aiClient.embedBatch>> | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        res = await aiClient.embedBatch(rows.map(embeddingText));
        break;
      } catch (e) {
        if (attempt >= 20) throw e;
        console.warn(`AI service unavailable, waiting (attempt ${attempt + 1})…`);
        await new Promise((r) => setTimeout(r, Math.min(15_000, 1000 * 2 ** Math.min(attempt, 4))));
      }
    }
    if (!res) throw new Error("unreachable");
    for (let i = 0; i < rows.length; i++) {
      await setAuctionEmbedding({
        id: rows[i]!.id,
        embedding: res.embeddings[i]!,
        provider: res.provider,
        model: res.model,
      });
    }
    done += rows.length;
    tokens += res.tokens;
    console.log(`embedded ${done} (batch of ${rows.length})`);
    if (DELAY_MS) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const seconds = (Date.now() - started) / 1000;
  const stats = await getEmbeddingStats();
  console.log(
    JSON.stringify({ model, newlyEmbedded: done, tokens, seconds, stats }, null, 2)
  );
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
