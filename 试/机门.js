// 门.html 的笨手（第 12 天 08:46，己）。底下都是"收会放"那只（挪知，每圈放撞的），只换挑门的法子：
//   随手   —— 总挑左边那扇（门的左右是随机排的，等于乱挑）
//   要音   —— 只看奖励，有"多一个音"就挑它
//   要少   —— 只看奖励，挑"怪少三成"
//   看合唱 —— 只看声部：照唱多、撞少的那扇
//   都看   —— 照唱 +1、撞 -1.5，再加奖励（音 +0.8，少 +0.5）
module.exports = async (api) => {
  const N = +(process.env.N || 16);
  const r = await api.eval(`(() => {
    window.TEST = true; window.HARD = ${process.env.HARD || 1}; window.VET = ${process.env.VET ?? 1}; window.SW = ${process.env.SW || 2}; window.VETK = ${process.env.VETK || 0.25}; window.NODRAG = ${process.env.NODRAG || 0};
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    function place(pick){
      const toks = S.inner.filter(x => x != null).concat(S.hand); S.inner.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; const i = pick(k, toks); S.inner[k] = toks.splice(i,1)[0]; } }
    const know = (k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const al = S.allies[k]; let v = fitAt(k, pc); if (al && value(pc, al.pc) < 0) v -= 3; if (v > bv){ bv = v; bi = i; } }); return bi; };
    const rel = () => { if (window.NODRAG) return; for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); };
    const choir = d => { let s = 0; for (const a of S.allies) if (a){ const st = stateIn(a.pc, d.ch); s += st === '合' ? 1 + 0.3*(a.lv||0) : st === '撞' ? -1.5 - 0.3*(a.lv||0) : 0; } return s; };
    const doors = {
      随手: () => 0,
      要音: () => S.door[0].rw.id === '音' ? 0 : 1,
      要位: () => S.door[0].rw.id === '位' ? 0 : 1,
      看合唱: () => choir(S.door[1]) > choir(S.door[0]) ? 1 : 0,
      都看: () => { const sc = d => choir(d) + (d.rw.id === '音' ? 0.8 : 0.6); return sc(S.door[1]) > sc(S.door[0]) ? 1 : 0; },
    };
    const out = {};
    for (const name of Object.keys(doors)){
      const res = [];
      for (let seed = 1; seed <= ${N}; seed++){
        reset(seed); S.started = true;
        let lastB = -1, sz = 0, szn = 0, dragBeats = 0, diff = 0, nd = 0;
        for (let i = 0; i < 60*400 && !S.over; i++){
          if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
          if (S.door){ if (Math.abs(choir(S.door[0]) - choir(S.door[1])) >= 1) diff++; nd++; takeDoor(doors[name]()); }
          if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; rel(); place(know);
            const a = S.allies.filter(Boolean); sz += a.length; szn++; dragBeats += a.filter(x => allyDrag(x.pc)).length; }
          step(1/60);
        }
        res.push({ t: Math.round(S.beatN * BEAT), won: S.won, sec: S.sec + 1, rec: S.recruits, rel: S.released, avg: szn ? sz / szn : 0, drag: szn ? dragBeats / szn : 0, diff, nd, log: S.doorLog.join(' ') });
      }
      out[name] = res;
    }
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  for (const [n, rs] of Object.entries(o)){
    const m = k => (rs.reduce((a, x) => a + x[k], 0) / rs.length);
    console.log(n.padEnd(4), '平均撑', Math.round(m('t')), '秒  唱完', rs.filter(x => x.won).length + '/' + rs.length, ' 到第几段', rs.map(x => x.sec).join(','),
      ' 收', m('rec').toFixed(1), ' 放', m('rel').toFixed(1), ' 平均合唱', m('avg').toFixed(1), ' 其中拖累', m('drag').toFixed(2), ' 两扇门对合唱差得多的', m('diff').toFixed(1) + '/' + m('nd').toFixed(1));
  }
  if (process.env.LOG) for (const [n, rs] of Object.entries(o)) console.log(n, rs[0].log);
};
