import { requireAuth } from "../../lib/auth.js";
import { getDb } from "../../lib/db.js";
import { only } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "GET")) return;
  if (!requireAuth(req, res)) return;
  try {
    const sql = getDb();
    const totalRows = await sql`SELECT count(*)::int AS total FROM creations`;
    const todayRows = await sql`SELECT count(*)::int AS today FROM creations WHERE created_at >= now()::date`;
    res.status(200).json({
      total: totalRows[0]?.total ?? 0,
      today: todayRows[0]?.today ?? 0,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
