import { neon } from "@neondatabase/serverless";

let _sql = null;

export function getDb() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export async function getConfig(key, fallback = null) {
  const sql = getDb();
  const rows = await sql`SELECT value FROM config WHERE key = ${key}`;
  return rows.length ? rows[0].value : fallback;
}

export async function setConfig(key, value) {
  const sql = getDb();
  await sql`
    INSERT INTO config (key, value) VALUES (${key}, ${value})
    ON CONFLICT (key) DO UPDATE SET value = ${value}
  `;
}

export async function bumpFrameVersion() {
  const sql = getDb();
  const current = parseInt((await getConfig("frame_version", "0")) || "0", 10);
  const next = current + 1;
  await setConfig("frame_version", String(next));
  return next;
}
