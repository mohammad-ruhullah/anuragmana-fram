import crypto from "node:crypto";

const COOKIE = "anf_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(data) {
  return crypto.createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createToken(ttlMs = MAX_AGE_SEC * 1000) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

function cookieAttrs(maxAge) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE}=${token}; ${cookieAttrs(MAX_AGE_SEC)}`);
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; ${cookieAttrs(0)}`);
}

export function getToken(req) {
  const header = req.headers.cookie || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

export function requireAuth(req, res) {
  if (!verifyToken(getToken(req))) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}
