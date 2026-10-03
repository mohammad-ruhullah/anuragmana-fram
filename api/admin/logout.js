import { clearSessionCookie } from "../../lib/auth.js";
import { only } from "../../lib/http.js";

export default async function handler(req, res) {
  if (!only(req, res, "POST")) return;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
