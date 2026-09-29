const redis = require("./_redis");
const { ip: getIp, hash } = require("./_auth");
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const { voterId, candidateId } = req.body || {};
    if (typeof voterId !== "string" || !/^[\w-]{16,64}$/.test(voterId)) return res.status(400).json({ error: "Thiết bị không hợp lệ" });
    const [c, s, e] = await redis([["GET", "candidates"], ["GET", "status"], ["GET", "endsAt"]]);
    const endsAt = +e.result || 0;
    if (s.result !== "open" || (endsAt && Date.now() > endsAt)) return res.status(423).json({ error: "Bình chọn hiện không mở" });
    if (!JSON.parse(c.result || "[]").some(x => x.id === candidateId)) return res.status(400).json({ error: "Lựa chọn không hợp lệ" });
    const ip = getIp(req);
    const [n] = await redis([["INCR", "ip:" + ip], ["EXPIRE", "ip:" + ip, 86400]]);
    if (n.result > (+process.env.MAX_PER_IP || 50)) return res.status(429).json({ error: "Quá nhiều phiếu từ mạng này" });
    const [lock] = await redis([["SET", "voted:" + voterId, "1", "NX"]]);
    if (!lock.result) return res.status(409).json({ error: "Thiết bị này đã bình chọn rồi" });
    await redis([
      ["HINCRBY", "votes", candidateId, 1], ["INCR", "total"],
      ["LPUSH", "log", JSON.stringify({ t: Date.now(), c: candidateId, v: voterId.slice(0, 8), ip: hash(ip) })]
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Lỗi máy chủ, vui lòng thử lại" }); }
};
