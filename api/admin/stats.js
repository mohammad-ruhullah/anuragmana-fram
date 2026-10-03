import { requireAuth } from "../../lib/auth.js";
import { getDb, getConfig } from "../../lib/db.js";
import { only } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "GET")) return;
  if (!requireAuth(req, res)) return;
  try {
    const sql = getDb();
    const rows = await sql`SELECT count(*)::int AS total FROM creations`;
    const base = parseInt((await getConfig("count_base", "0")) || "0", 10);
    res.status(200).json({ total: (rows[0]?.total ?? 0) + base });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
