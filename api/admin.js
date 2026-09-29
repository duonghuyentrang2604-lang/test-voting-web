const redis = require("./_redis");
const { sign, verify, same, ip: getIp } = require("./_auth");
const STATUS = ["open", "paused", "closed", "revealed"];
async function wipe(pat) {
  let cur = "0";
  do {
    const [r] = await redis([["SCAN", cur, "MATCH", pat, "COUNT", 500]]);
    cur = r.result[0];
    if (r.result[1].length) await redis([["DEL", ...r.result[1]]]);
  } while (cur !== "0");
}
const parse = a => (a || []).map(x => JSON.parse(x));
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).end();
    const b = req.body || {}, a = b.action, E = process.env.ADMIN_EMAIL, P = process.env.ADMIN_PASSWORD;
    if (a === "login") {
      const ip = getIp(req);
      const [f] = await redis([["GET", "fail:" + ip]]);
      if ((+f.result || 0) >= 10) return res.status(429).json({ error: "Thử sai quá nhiều, hãy đợi 5 phút" });
      if (!E || !P || !same(b.email, E) || !same(b.password, P)) {
        await redis([["INCR", "fail:" + ip], ["EXPIRE", "fail:" + ip, 300]]);
        return res.status(401).json({ error: "Sai email hoặc mật khẩu" });
      }
      return res.json({ token: sign() });
    }
    if (!verify((req.headers.authorization || "").replace("Bearer ", ""))) return res.status(401).json({ error: "Hết phiên đăng nhập" });
    const act = (what) => ["LPUSH", "alog", JSON.stringify({ t: Date.now(), a: what })];

    if (a === "import") {
      const [t] = await redis([["GET", "total"]]);
      if (+t.result > 0) return res.status(409).json({ error: "Đã có phiếu bầu. Hãy đặt lại dữ liệu trước khi nhập danh sách mới." });
      const list = (Array.isArray(b.candidates) ? b.candidates : []).map(x => ({ name: String(x.name || "").trim().slice(0, 100), sub: String(x.sub || "").trim().slice(0, 150) })).filter(x => x.name);
      if (!list.length || list.length > 100) return res.status(400).json({ error: "Danh sách phải có từ 1 đến 100 tiết mục" });
      list.forEach((x, i) => x.id = "c" + (i + 1));
      await redis([["SET", "candidates", JSON.stringify(list)], act("Nhập " + list.length + " tiết mục")]);
      return res.json({ ok: true, count: list.length });
    }
    if (a === "status") {
      if (!STATUS.includes(b.status)) return res.status(400).json({ error: "Trạng thái không hợp lệ" });
      const cmds = [["SET", "status", b.status]];
      if (b.status === "open") {
        const m = +b.minutes;
        cmds.push(m > 0 ? ["SET", "endsAt", String(Date.now() + m * 60000)] : ["DEL", "endsAt"]);
      }
      cmds.push(act("Đổi trạng thái: " + b.status));
      await redis(cmds);
      return res.json({ ok: true });
    }
    if (a === "stats") {
      const [c, s, e, t, v, l, al] = await redis([["GET", "candidates"], ["GET", "status"], ["GET", "endsAt"], ["GET", "total"], ["HGETALL", "votes"], ["LRANGE", "log", 0, 49], ["LRANGE", "alog", 0, 19]]);
      const o = {}, h = v.result || [];
      for (let i = 0; i < h.length; i += 2) o[h[i]] = +h[i + 1];
      const cands = JSON.parse(c.result || "[]").map(x => ({ ...x, votes: o[x.id] || 0 }));
      return res.json({ status: s.result || "prepare", endsAt: +e.result || 0, total: +t.result || 0, candidates: cands, log: parse(l.result), alog: parse(al.result) });
    }
    if (a === "log") {
      const [l] = await redis([["LRANGE", "log", 0, -1]]);
      return res.json({ log: parse(l.result) });
    }
    if (a === "reset") {
      await redis([["DEL", "votes", "total", "log", "alog", "status", "endsAt"]]);
      await wipe("voted:*"); await wipe("ip:*");
      return res.json({ ok: true });
    }
    res.status(400).json({ error: "Hành động không hợp lệ" });
  } catch (e) { res.status(500).json({ error: "Lỗi máy chủ" }); }
};
