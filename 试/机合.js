// 合唱.html 的笨手。看三件事：收声部有没有用；放走拖累的有没有用；合唱平均多大。
//   不收   —— 挪知，但关掉收声部（NO_RECRUIT），就是二
//   收不放 —— 挪知，收过来的一直留着
//   收会放 —— 挪知，每圈把跟和弦撞的声部放走
//   瞄会放 —— 只看方向、音随手，也会放（看不懂音的人能不能靠收声部活）
module.exports = async (api) => {
  const N = +(process.env.N || 12);
  const r = await api.eval(`(() => {
    window.TEST = true;
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    function place(pick){
      const toks = S.inner.filter(x => x != null).concat(S.hand); S.inner.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; const i = pick(k, toks); S.inner[k] = toks.splice(i,1)[0]; } }
    const know = (k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const al = S.allies[k]; let v = fitAt(k, pc); if (al && value(pc, al.pc) < 0) v -= 3; if (v > bv){ bv = v; bi = i; } }); return bi; };
    const rel = () => { for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); };
    const relAll = () => { for (let k = 0; k < 8; k++) if (S.allies[k] && allyState(S.allies[k].pc) !== '合') release(k); };
    const bots = {
      不收: { nr: true, f: () => place(know) },
      收不放: { f: () => place(know) },
      收会放: { f: () => { rel(); place(know); } },
      全换: { f: () => { relAll(); place(know); } },
      瞄会放: { f: () => { rel(); place(() => 0); } },
    };
    const out = {};
    for (const name of Object.keys(bots)){
      const res = [];
      for (let seed = 1; seed <= ${N}; seed++){
        window.NO_RECRUIT = !!bots[name].nr; reset(seed); S.started = true;
        let lastB = -1, sz = 0, szn = 0, dragBeats = 0;
        for (let i = 0; i < 60*300 && !S.over; i++){
          if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
          if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bots[name].f();
            const a = S.allies.filter(Boolean); sz += a.length; szn++; dragBeats += a.filter(x => allyDrag(x.pc)).length; }
          step(1/60);
        }
        res.push({ t: Math.round(S.beatN * BEAT), won: S.won, sec: S.sec + 1, rec: S.recruits, rel: S.released, avg: szn ? sz / szn : 0, drag: szn ? dragBeats / szn : 0, st: S.stat });
      }
      out[name] = res;
    }
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  for (const [n, rs] of Object.entries(o)){
    const m = k => (rs.reduce((a, x) => a + x[k], 0) / rs.length);
    console.log(n.padEnd(4), '平均撑', Math.round(m('t')), '秒  唱完', rs.filter(x => x.won).length + '/' + rs.length, ' 段', rs.map(x => x.sec).join(','),
      ' 收', m('rec').toFixed(1), ' 放', m('rel').toFixed(1), ' 平均合唱', m('avg').toFixed(1), ' 其中拖累', m('drag').toFixed(1));
  }
};
