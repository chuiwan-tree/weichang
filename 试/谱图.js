// 谱.html：让笨手（知道怪唱什么、撞了就放）打一局，截打完那一页上"这首歌是谁唱的"（甲，第 12 天 18:07）
module.exports = async (p) => {
  for (const seed of (process.env.SEEDS || '3').split(',')){
  const r = await p.eval(`(() => {
    window.TEST = true; reset(${seed}); S.started = true;
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    function place(){ const toks = S.inner.concat(S.outer).filter(x => x != null).concat(S.hand); S.inner.fill(null); S.outer.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const ring of ['inner','outer']){ if (ring === 'outer' && !S.outerOpen) break;
        for (const k of order){ if (!toks.length) break; let bi = 0, bv = -99; toks.forEach((pc, i) => { let v = fitAt(k, pc); const al = S.allies[k]; if (al && value(pc, al.pc) < 0) v -= 3; if (v > bv){ bv = v; bi = i; } }); S[ring][k] = toks.splice(bi,1)[0]; } }
      S.hand = toks; }
    let lastB = -1;
    for (let i = 0; i < 60*400 && !S.over; i++){
      if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
      if (S.beatN % 8 === 0 && S.beatN !== lastB){ lastB = S.beatN; place(); for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); }
      step(1/60); }
    return JSON.stringify({ won: S.won, t: Math.round(S.t), rec: S.recruits, rel: S.released, ids: S.aid, who: S.secSong.map(s => s ? s.who.map(w => w ? w.id + NAMES[w.pc] + w.st : '-').join(' ') : null) });
  })()`);
  console.log(seed, r);
  await p.shot('谱-' + seed);
  }
};
