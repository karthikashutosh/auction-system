import "dotenv/config";
import { db } from "@repo/db";
import fs from "node:fs/promises";
import path from "node:path";

const migrationsDir = path.join(
  process.cwd(),
  "../../packages/db/src/migrations",
);

async function migrate() {
  const client = await db.connect();

  try {
    console.log("========================================");
    console.log("🚀 Database Migration Started");
    console.log("========================================\n");

    await client.query("BEGIN");

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS schema_migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        migration_name TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    console.log(`📂 Found ${files.length} migration(s).\n`);

    for (const file of files) {
      const existingMigration = await client.query(
        `
        SELECT 1
        FROM schema_migrations
        WHERE migration_name = $1
        `,
        [file],
      );

      if (existingMigration.rowCount) {
        console.log(`⏭️  Skipping ${file}`);
        continue;
      }

      console.log(`▶️  Running ${file}`);

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

      await client.query(sql);

      await client.query(
        `
        INSERT INTO schema_migrations (migration_name)
        VALUES ($1)
        `,
        [file],
      );

      console.log(`✅ Completed ${file}`);
    }

    await client.query("COMMIT");

    console.log("\n========================================");
    console.log("🎉 Database Migration Completed");
    console.log("========================================");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("\n========================================");
    console.error("❌ Database Migration Failed");
    console.error("========================================");
    console.error("↩️  Rolling back transaction...\n");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

void migrate();
