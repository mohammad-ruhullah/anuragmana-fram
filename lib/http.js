export function only(req, res, method) {
  if (req.method !== method) {
    res.setHeader("Allow", method);
    res.status(405).json({ error: "method not allowed" });
    return false;
  }
  return true;
}

export function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}
