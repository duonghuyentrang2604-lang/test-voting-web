const env = process.env;
const find = re => { const k = Object.keys(env).find(k => re.test(k) && env[k]); return k ? env[k] : undefined; };
const U = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || find(/REST_API_URL$|REST_URL$/);
const T = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || find(/REST_API_TOKEN$|REST_TOKEN$/);
module.exports = async function redis(cmds) {
  if (!U || !T) { console.error("Thiếu biến môi trường Redis (REST URL/TOKEN)"); throw new Error("missing redis env"); }
  const r = await fetch(U.replace(/\/$/, "") + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + T },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) { console.error("Redis lỗi", r.status, await r.text()); throw new Error("redis " + r.status); }
  return r.json();
};
