import bcrypt from "bcryptjs";
import { getDb } from "../../lib/db.js";
import { createToken, setSessionCookie } from "../../lib/auth.js";
import { only, readJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  try {
    const { password = "" } = readJson(req);
    const sql = getDb();
    const rows = await sql`SELECT id, password_hash FROM admins ORDER BY id LIMIT 1`;
    if (!rows.length) {
      res.status(401).json({ error: "no admin configured" });
      return;
    }
    const ok = await bcrypt.compare(String(password), rows[0].password_hash);
    if (!ok) {
      res.status(401).json({ error: "invalid password" });
      return;
    }
    setSessionCookie(res, createToken());
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
