const c = require("crypto");
const key = () => c.createHash("sha256").update((process.env.ADMIN_EMAIL || "") + "|" + (process.env.ADMIN_PASSWORD || "")).digest();
const sig = p => c.createHmac("sha256", key()).update(p).digest("base64url");
exports.sign = () => { const p = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 36e5 })).toString("base64url"); return p + "." + sig(p); };
exports.verify = t => {
  try {
    const [p, s] = String(t || "").split(".");
    const a = Buffer.from(sig(p)), b = Buffer.from(s);
    return a.length === b.length && c.timingSafeEqual(a, b) && JSON.parse(Buffer.from(p, "base64url")).exp > Date.now();
  } catch (e) { return false; }
};
const h = x => c.createHash("sha256").update(String(x)).digest();
exports.same = (a, b) => c.timingSafeEqual(h(a), h(b));
exports.ip = req => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";
exports.hash = x => c.createHash("sha256").update(String(x)).digest("hex").slice(0, 8);
