import { requireAuth } from "../../lib/auth.js";
import { getConfig } from "../../lib/db.js";
import { listKeys, presignGet } from "../../lib/b2.js";
import { only } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "GET")) return;
  if (!requireAuth(req, res)) return;
  try {
    const activeKey = await getConfig("active_frame_key", null);
    const { items } = await listKeys("frames/", { max: 200 });
    const frames = await Promise.all(
      items
        .filter((o) => /\.(png|webp)$/i.test(o.key))
        .map(async (o) => ({
          key: o.key,
          size: o.size,
          lastModified: o.lastModified,
          active: o.key === activeKey,
          url: await presignGet(o.key, 3600),
        }))
    );
    res.status(200).json({ frames, activeKey });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
