import { getConfig } from "../lib/db.js";
import { presignGet } from "../lib/b2.js";
import { only } from "../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "GET")) return;
  try {
    const key = await getConfig("active_frame_key", null);
    const version = await getConfig("frame_version", "1");
    if (!key) {
      res.status(200).json({ url: null, version, configured: false });
      return;
    }
    const url = await presignGet(key, 3600);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ url, version, configured: true });
  } catch (e) {
    res.status(200).json({ url: null, version: null, configured: false, error: String(e.message || e) });
  }
}
