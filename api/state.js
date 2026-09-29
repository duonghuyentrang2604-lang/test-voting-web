const redis = require("./_redis");
module.exports = async (req, res) => {
  try {
    const [c, s, e, t, v] = await redis([["GET", "candidates"], ["GET", "status"], ["GET", "endsAt"], ["GET", "total"], ["HGETALL", "votes"]]);
    let status = s.result || "prepare";
    const endsAt = +e.result || 0;
    if (status === "open" && endsAt && Date.now() > endsAt) status = "closed";
    const cands = JSON.parse(c.result || "[]");
    const out = { status, endsAt, now: Date.now(), candidates: cands, total: +t.result || 0 };
    // Số phiếu từng tiết mục CHỈ được gửi khi admin đã công bố
    if (status === "revealed") {
      const o = {}, a = v.result || [];
      for (let i = 0; i < a.length; i += 2) o[a[i]] = +a[i + 1];
      out.ranking = cands.map(x => ({ ...x, votes: o[x.id] || 0 })).sort((a, b) => b.votes - a.votes);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(out);
  } catch (e) { res.status(500).json({ error: "Lỗi máy chủ" }); }
};
