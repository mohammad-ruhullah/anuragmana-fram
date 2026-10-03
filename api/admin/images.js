import { requireAuth } from "../../lib/auth.js";
import { listKeys, presignGet } from "../../lib/b2.js";
import { only } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "GET")) return;
  if (!requireAuth(req, res)) return;
  try {
    const token = req.query?.token ? String(req.query.token) : undefined;
    const { items, nextToken } = await listKeys("uploads/", { max: 48, token });
    const images = await Promise.all(
      items.map(async (o) => ({
        key: o.key,
        size: o.size,
        lastModified: o.lastModified,
        url: await presignGet(o.key, 3600),
      }))
    );
    res.status(200).json({ images, nextToken });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
