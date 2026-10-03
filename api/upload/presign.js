import crypto from "node:crypto";
import { presignPut } from "../../lib/b2.js";
import { only, readJson } from "../../lib/http.js";

function extFor(contentType) {
  if (!contentType) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("heic")) return ".heic";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  try {
    const { filename = "photo", contentType = "image/jpeg" } = readJson(req);
    const extMatch = String(filename).match(/\.[a-z0-9]+$/i);
    const ext = extMatch ? extMatch[0].toLowerCase() : extFor(contentType);

    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = `uploads/${y}/${m}/${crypto.randomUUID()}${ext}`;

    const url = await presignPut(key, contentType, 600);
    res.status(200).json({ url, key });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
