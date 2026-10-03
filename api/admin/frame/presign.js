import { requireAuth } from "../../../lib/auth.js";
import { presignPut } from "../../../lib/b2.js";
import { only, readJson } from "../../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  if (!requireAuth(req, res)) return;
  try {
    const { filename = "frame.png", contentType = "image/png" } = readJson(req);
    const safe = String(filename).replace(/[^a-z0-9._-]/gi, "-").replace(/\.(png|webp)$/i, "");
    const key = `frames/${Date.now()}-${safe || "frame"}.png`;
    const url = await presignPut(key, "image/png", 900);
    res.status(200).json({ url, key });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
