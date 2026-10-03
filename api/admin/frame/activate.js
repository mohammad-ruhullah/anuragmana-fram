import { requireAuth } from "../../../lib/auth.js";
import { setConfig, bumpFrameVersion } from "../../../lib/db.js";
import { only, readJson } from "../../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  if (!requireAuth(req, res)) return;
  try {
    const { key } = readJson(req);
    if (!key || !String(key).startsWith("frames/")) {
      res.status(400).json({ error: "invalid frame key" });
      return;
    }
    await setConfig("active_frame_key", key);
    const version = await bumpFrameVersion();
    res.status(200).json({ ok: true, activeKey: key, version });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
