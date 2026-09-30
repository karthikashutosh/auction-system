/**
 * Deterministic seed: ~450 CLOSED auctions across 8 categories with clustered
 * prices, realistic bid histories, and 5 planted suspicious patterns.
 *
 *   npm run seed:auctions            # insert (idempotent: ON CONFLICT DO NOTHING)
 *   npm run seed:auctions -- --reset # delete previous seed rows first
 *
 * Writes services/ai-service/data/seed-manifest.json (planted IDs + catalog
 * ground truth) which Blocks 4, 5, 6 and 8 consume.
 */
import "dotenv/config";
import { faker } from "@faker-js/faker";
import { db } from "@repo/db";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  CATALOG,
  CONDITIONS,
  DESCRIPTION_CLOSERS,
  DESCRIPTION_OPENERS,
  Product,
} from "./seed-catalog";

const EMAIL_DOMAIN = "seed.auctionflow.test";
const DAY = 86_400_000;
const NOW = Date.now();
const PER_MODEL = 7;

// ---------- deterministic helpers ----------
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260916);
faker.seed(42);
const uniform = (a: number, b: number) => a + rng() * (b - a);
const randInt = (a: number, b: number) => Math.floor(uniform(a, b + 1));
const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)]!;
const round100 = (x: number) => Math.max(100, Math.round(x / 100) * 100);
const gaussian = () =>
  Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

function uuidFrom(key: string): string {
  const h = createHash("sha1").update(`auctionflow-seed:${key}`).digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

function weighted<T extends { weight: number }>(xs: T[]): T {
  const total = xs.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const x of xs) if ((r -= x.weight) <= 0) return x;
  return xs[xs.length - 1]!;
}

// ---------- types ----------
interface SeedUser { id: string; email: string; name: string; createdAt: Date }
interface SeedBid { id: string; auctionId: string; userId: string; amount: number; at: number; planted?: string }
interface SeedAuction {
  id: string; ownerId: string; title: string; description: string; category: string;
  brand: string; model: string; condition: string;
  start: number; end: number; startingPrice: number; reservePrice: number; finalPrice: number;
  sold: boolean; bids: SeedBid[];
}

const users: SeedUser[] = [];
const mkUser = (key: string, name: string, createdAt: number): SeedUser => {
  const u = { id: uuidFrom(`user:${key}`), email: `${key}@${EMAIL_DOMAIN}`, name, createdAt: new Date(createdAt) };
  users.push(u);
  return u;
};

// ---------- users ----------
const normal: SeedUser[] = [];
for (let i = 0; i < 90; i++) {
  normal.push(mkUser(`user${i}`, faker.person.fullName(), NOW - uniform(150, 700) * DAY));
}
const sellers = normal.slice(0, 12);
const sellerWeights = sellers.map((_, i) => (i === 3 ? 3 : 1)); // seller 3 is the loyalist's target

// ---------- auctions ----------
const auctions: SeedAuction[] = [];
let seq = 0;

function makeAuction(category: string, p: Product, opts: Partial<{ owner: SeedUser; end: number; start: number }> = {}): SeedAuction {
  const cond = weighted(CONDITIONS);
  const owner =
    opts.owner ??
    (() => {
      const total = sellerWeights.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      for (let i = 0; i < sellers.length; i++) if ((r -= sellerWeights[i]!) <= 0) return sellers[i]!;
      return sellers[0]!;
    })();
  const end = opts.end ?? NOW - uniform(2, 120) * DAY;
  const start = opts.start ?? end - uniform(3, 7) * DAY;
  const price = round100(p.base * cond.mult * Math.exp(gaussian() * 0.12));
  const title = `${p.brand} ${p.model} ${p.noun} - ${cond.name}`;
  const opener = pick(DESCRIPTION_OPENERS).replace("{brand}", p.brand).replace("{model}", p.model).replace("{noun}", p.noun).replace("{cond}", cond.text);
  const extras = [p.era ? `Dates from the ${p.era}.` : "", `Keywords: ${p.keywords.join(", ")}.`, pick(DESCRIPTION_CLOSERS)].filter(Boolean).join(" ");
  const sold = rng() < 0.85;
  const startingPrice = round100(price * uniform(0.3, 0.6));
  const a: SeedAuction = {
    id: uuidFrom(`auction:${seq++}`), ownerId: owner.id, title, description: `${opener} ${extras}`,
    category, brand: p.brand, model: p.model, condition: cond.name,
    start, end, startingPrice, reservePrice: 0, finalPrice: price, sold, bids: [],
  };
  a.reservePrice = Math.max(startingPrice, round100(price * (sold ? uniform(0.6, 0.98) : uniform(1.05, 1.3))));
  auctions.push(a);
  return a;
}

for (const [category, products] of Object.entries(CATALOG)) {
  for (const p of products) for (let i = 0; i < PER_MODEL; i++) makeAuction(category, p);
}

// ---------- normal bids ----------
const MIN_GAP_MS = 45_000;
const bidId = (a: SeedAuction, n: number, tag = "n") => uuidFrom(`bid:${a.id}:${tag}:${n}`);

for (const a of auctions) {
  const n = randInt(3, 16);
  const times: number[] = [];
  for (let i = 0; i < n; i++) times.push(a.start + (a.end - a.start) * (1 - Math.pow(rng(), 2)) - 5_000);
  times.sort((x, y) => x - y);
  for (let i = 1; i < times.length; i++) times[i] = Math.max(times[i]!, times[i - 1]! + MIN_GAP_MS);
  let prev = "";
  for (let i = 0; i < n; i++) {
    let u = pick(normal);
    while (u.id === a.ownerId || u.id === prev) u = pick(normal);
    prev = u.id;
    a.bids.push({ id: bidId(a, i), auctionId: a.id, userId: u.id, amount: 0, at: Math.min(times[i]!, a.end - 1_000) });
  }
}

// ---------- planted patterns ----------
const manifestPlanted: Record<string, { description: string; user_id: string; auction_ids: string[]; bid_ids: string[] }> = {};
const plantedBids = new Map<string, SeedBid[]>();
function plant(pattern: string, description: string, user: SeedUser, list: SeedBid[]) {
  const entry = (manifestPlanted[pattern] ??= { description, user_id: user.id, auction_ids: [], bid_ids: [] });
  for (const b of list) {
    const a = auctions.find((x) => x.id === b.auctionId)!;
    a.bids.push(b);
    if (!entry.auction_ids.includes(a.id)) entry.auction_ids.push(a.id);
    entry.bid_ids.push(b.id);
  }
  plantedBids.set(pattern, list);
}
const expensive = auctions.filter((a) => a.finalPrice >= 40_000 && a.bids.length < 12);
const usedAuctions = new Set<string>();
const takeExpensive = (pred: (a: SeedAuction) => boolean = () => true) => {
  const a = expensive.find((x) => !usedAuctions.has(x.id) && pred(x));
  if (!a) throw new Error("not enough auctions to plant pattern");
  usedAuctions.add(a.id);
  return a;
};

// P1: bot bidding every ~3 seconds
{
  const bot = mkUser("bot_rapid", "Rapid Bidder", NOW - 220 * DAY);
  const list: SeedBid[] = [];
  for (let k = 0; k < 2; k++) {
    const a = takeExpensive();
    let t = a.end - 3 * 3_600_000;
    for (let i = 0; i < 20; i++) {
      list.push({ id: bidId(a, i, "bot"), auctionId: a.id, userId: bot.id, amount: 0, at: t, planted: "rapid_bot" });
      t += 2_000 + rng() * 2_000;
    }
  }
  plant("rapid_bot", "Account bidding every 2-4 seconds against itself in bursts of 20 bids", bot, list);
}

// P2: brand-new account bidding heavily
{
  const T = NOW - 30 * DAY;
  const active = expensive.filter((a) => !usedAuctions.has(a.id) && a.start < T && a.end > T + 6 * 3_600_000).slice(0, 5);
  if (active.length < 5) throw new Error("not enough overlapping auctions for new_account_whale");
  const acct = mkUser("new_whale", "Fresh Account", T - 2 * 3_600_000);
  const list: SeedBid[] = [];
  active.forEach((a, k) => {
    usedAuctions.add(a.id);
    const base = T + k * 20 * 60_000;
    for (let i = 0; i < 3; i++) list.push({ id: bidId(a, i, "whale"), auctionId: a.id, userId: acct.id, amount: 0, at: base + i * 25_000, planted: "new_account_whale" });
  });
  plant("new_account_whale", "Account created 2h before its first bid, then 15 bids across 5 high-value auctions", acct, list);
}

// P3: seller loyalist (only ever bids on one seller)
{
  const target = sellers[3]!;
  const acct = mkUser("seller_loyalist", "Loyal Buyer", NOW - 400 * DAY);
  const theirs = auctions.filter((a) => a.ownerId === target.id && !usedAuctions.has(a.id)).slice(0, 12);
  const list: SeedBid[] = [];
  theirs.forEach((a) => {
    usedAuctions.add(a.id);
    const mid = a.start + (a.end - a.start) * uniform(0.3, 0.8);
    list.push({ id: bidId(a, 0, "loyal"), auctionId: a.id, userId: acct.id, amount: 0, at: mid, planted: "seller_loyalist" });
    list.push({ id: bidId(a, 1, "loyal"), auctionId: a.id, userId: acct.id, amount: 0, at: mid + uniform(2, 6) * 3_600_000, planted: "seller_loyalist" });
  });
  plant("seller_loyalist", "Established account whose 24 bids all go to a single seller's listings", acct, list);
}

// P4: last-second sniper bursts
{
  const acct = mkUser("sniper", "Last Second", NOW - 300 * DAY);
  const list: SeedBid[] = [];
  for (let k = 0; k < 6; k++) {
    const a = takeExpensive((x) => x.ownerId !== sellers[3]!.id);
    for (let i = 0; i < 5; i++) list.push({ id: bidId(a, i, "snipe"), auctionId: a.id, userId: acct.id, amount: 0, at: a.end - 9_000 + i * 1_800, planted: "sniper_burst" });
  }
  plant("sniper_burst", "Five bids inside the final 9 seconds on each of 6 auctions", acct, list);
}

// P5: combo - new account, one seller, rapid bursts
{
  const shill = mkUser("shill_seller", "Boutique Seller", NOW - 500 * DAY);
  const T = NOW - 12 * DAY;
  const acct = mkUser("combo_shill", "Newcomer Buyer", T - 26 * 3_600_000);
  const list: SeedBid[] = [];
  const cameras = CATALOG["cameras"]!;
  for (let k = 0; k < 6; k++) {
    const end = T + (k + 2) * 12 * 3_600_000;
    const a = makeAuction("cameras", cameras[k % cameras.length]!, { owner: shill, end, start: end - 4 * DAY });
    a.bids = [];
    // ordinary participation from two normal users
    const t0 = end - 30 * 3_600_000;
    a.bids.push({ id: bidId(a, 0), auctionId: a.id, userId: pick(normal).id, amount: 0, at: t0 });
    a.bids.push({ id: bidId(a, 1), auctionId: a.id, userId: pick(normal).id, amount: 0, at: t0 + 3_600_000 });
    // combo account: rapid burst just after its account is a day old
    const bt = Math.max(acct.createdAt.getTime() + 24 * 3_600_000, t0 + 2 * 3_600_000) + k * 40 * 60_000;
    for (let i = 0; i < 3; i++) list.push({ id: bidId(a, i, "combo"), auctionId: a.id, userId: acct.id, amount: 0, at: Math.min(bt + i * 9_000, a.end - 1_000), planted: "combo_new_account_single_seller" });
  }
  plant("combo_new_account_single_seller", "Day-old account, bidding 3x in ~10s bursts, exclusively on one seller's new listings", acct, list);
}

// ---------- assign amounts (monotone, >= 100 steps, ending exactly at final price) ----------
for (const a of auctions) {
  a.bids.sort((x, y) => x.at - y.at || x.id.localeCompare(y.id));
  const n = a.bids.length;
  let m = Math.round((a.finalPrice - a.startingPrice) / 100);
  if (m < n) {
    m = n + randInt(0, 5);
    a.finalPrice = a.startingPrice + m * 100;
    a.reservePrice = Math.max(a.startingPrice, a.sold ? round100(a.finalPrice * uniform(0.6, 0.98)) : round100(a.finalPrice * uniform(1.05, 1.3)));
  }
  const w = a.bids.map(() => -Math.log(1 - rng()));
  const wsum = w.reduce((s, x) => s + x, 0);
  const extra = m - n;
  const units = w.map((x) => 1 + Math.floor((extra * x) / wsum));
  units[units.length - 1]! += m - units.reduce((s, x) => s + x, 0);
  let cum = a.startingPrice;
  a.bids.forEach((b, i) => {
    cum += units[i]! * 100;
    b.amount = cum;
    b.at = Math.min(b.at, a.end - 500);
  });
}

// ---------- persist ----------
async function bulkInsert(client: import("pg").PoolClient, table: string, cols: string[], rows: unknown[][], conflict = "ON CONFLICT DO NOTHING") {
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const params: unknown[] = [];
    const tuples = chunk.map((r) => `(${r.map((v) => { params.push(v); return `$${params.length}`; }).join(",")})`);
    await client.query(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${tuples.join(",")} ${conflict}`, params);
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    if (reset) {
      const seedUsers = `(SELECT id FROM users WHERE email LIKE '%@${EMAIL_DOMAIN}')`;
      await client.query(`DELETE FROM flagged_auctions WHERE user_id IN ${seedUsers} OR auction_id IN (SELECT id FROM auctions WHERE owner_id IN ${seedUsers})`);
      await client.query(`DELETE FROM notifications WHERE user_id IN ${seedUsers}`);
      await client.query(`DELETE FROM bids WHERE user_id IN ${seedUsers} OR auction_id IN (SELECT id FROM auctions WHERE owner_id IN ${seedUsers})`);
      await client.query(`DELETE FROM auctions WHERE owner_id IN ${seedUsers}`);
      await client.query(`DELETE FROM users WHERE email LIKE '%@${EMAIL_DOMAIN}'`);
    }
    await bulkInsert(client, "users", ["id", "email", "name", "created_at", "updated_at", "provider"],
      users.map((u) => [u.id, u.email, u.name, u.createdAt, u.createdAt, "local"]));
    await bulkInsert(client, "auctions",
      ["id", "owner_id", "title", "description", "image_key", "category", "starting_price", "current_price", "reserve_price", "start_time", "end_time", "status", "highest_bidder_id", "created_at", "updated_at"],
      auctions.map((a) => [a.id, a.ownerId, a.title, a.description, "seed/placeholder.jpg", a.category, a.startingPrice, a.finalPrice, a.reservePrice,
        new Date(a.start), new Date(a.end), "ENDED", a.bids[a.bids.length - 1]!.userId, new Date(a.start), new Date(a.end)]));
    await bulkInsert(client, "bids", ["id", "auction_id", "user_id", "amount", "created_at"],
      auctions.flatMap((a) => a.bids.map((b) => [b.id, b.auctionId, b.userId, b.amount, new Date(b.at)])));
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  const byCat: Record<string, number[]> = {};
  for (const a of auctions) (byCat[a.category] ??= []).push(a.finalPrice);
  const stats = Object.fromEntries(Object.entries(byCat).map(([c, xs]) => {
    xs.sort((a, b) => a - b);
    const q = (p: number) => xs[Math.floor(p * (xs.length - 1))]!;
    return [c, { n: xs.length, p10: q(0.1), median: q(0.5), p90: q(0.9) }];
  }));

  const manifest = {
    generated_at: new Date(NOW).toISOString(),
    counts: { users: users.length, auctions: auctions.length, bids: auctions.reduce((s, a) => s + a.bids.length, 0) },
    price_distribution_by_category: stats,
    planted: manifestPlanted,
    planted_user_ids: Object.values(manifestPlanted).map((p) => p.user_id),
    catalog: auctions.map((a) => ({
      id: a.id, category: a.category, brand: a.brand, model: a.model, condition: a.condition,
      title: a.title, owner_id: a.ownerId, final_price: a.finalPrice, sold: a.sold,
      bid_count: a.bids.length,
    })),
  };
  const outDir = path.resolve(process.cwd(), "../../services/ai-service/data");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "seed-manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ counts: manifest.counts, price_distribution_by_category: stats, planted: Object.fromEntries(Object.entries(manifestPlanted).map(([k, v]) => [k, { bids: v.bid_ids.length, auctions: v.auction_ids.length }])) }, null, 2));
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
