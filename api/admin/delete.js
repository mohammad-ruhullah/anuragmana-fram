import { requireAuth } from "../../lib/auth.js";
import { deleteObject } from "../../lib/b2.js";
import { only, readJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  if (!requireAuth(req, res)) return;
  try {
    const { key } = readJson(req);
    if (!key || !String(key).startsWith("uploads/")) {
      res.status(400).json({ error: "invalid key" });
      return;
    }
    await deleteObject(key);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
