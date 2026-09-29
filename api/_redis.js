const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
module.exports = async function redis(cmds) {
  const r = await fetch(U + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + T },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return r.json();
};
