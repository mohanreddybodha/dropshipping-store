import { neon } from "@neondatabase/serverless";
import fs from "fs";

async function main() {
  const env = fs.readFileSync("storefront/.env.local", "utf8");
  const match = env.match(/DATABASE_URL=([^\r\n]+)/);
  if (!match) {
    console.error("No DATABASE_URL in storefront/.env.local");
    process.exit(1);
  }

  const sql = neon(match[1]);
  console.log("Adding DLQ columns to orders table if not present...");
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_error TEXT;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dlq_retry_count INTEGER DEFAULT 0;`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(64) DEFAULT 'PENDING';`;
  console.log("Columns successfully ensured!");
}

main().catch((err) => {
  console.error("Migration error:", err.message);
  process.exit(1);
});
