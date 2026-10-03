import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Use: npm run db:migrate (reads .env.local)");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS admins (
    id serial PRIMARY KEY,
    password_hash text NOT NULL,
    created_at timestamptz DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS config (
    key text PRIMARY KEY,
    value text
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS creations (
    id bigserial PRIMARY KEY,
    object_key text,
    created_at timestamptz DEFAULT now()
  )
`;

await sql`INSERT INTO config (key, value) VALUES ('frame_version', '1') ON CONFLICT (key) DO NOTHING`;

console.log("Migration complete: admins, config, creations ready.");
