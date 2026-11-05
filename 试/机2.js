// 围唱 二 的笨手：手上最多 4 个音。看"挪""转"是不是分出高低。
//   死摆 —— 一开始摆在 0,2,4,6 拍上，之后再也不动（新拿的音放到下一个空的偶数拍）
//   挪瞄 —— 每圈把音挪到最危险的几个方向，音随手
//   挪知 —— 每圈挪到最危险的方向，知道怪唱什么，挑最合的音
//   转知 —— 不拆开，只整圈转：挑一个转法让"危险 × 合不合"最大
module.exports = async (api) => {
  const N = +(process.env.N || 8), TM = process.env.TM === '1';
  const r = await api.eval(`(() => {
    window.TEST = true;
    const threat = () => { const t = Array(8).fill(0);
      for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    function place(pick){
      const toks = S.inner.filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; const i = pick(k, toks); S.inner[k] = toks.splice(i,1)[0]; }
    }
    const bots = {
      死摆: () => { while (S.hand.length){ const k = [0,2,4,6,1,3,5,7].find(k => S.inner[k] == null); S.inner[k] = S.hand.shift(); } },
      挪瞄: () => place(() => 0),
      挪知: () => place((k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const v = fitAt(k, pc); if (v > bv){ bv = v; bi = i; } }); return bi; }),
      转知: () => { while (S.hand.length){ const k = [0,2,4,6,1,3,5,7].find(k => S.inner[k] == null); S.inner[k] = S.hand.shift(); }
        const t = threat(); let best = 0, bv = -1e9;
        for (let d = 0; d < 8; d++){ let v = 0; for (let k = 0; k < 8; k++){ const pc = S.inner[k]; if (pc == null) continue; const kk = (k + d) % 8;
          v += t[kk] * (1 + fitAt(kk, pc)); } if (v > bv){ bv = v; best = d; } }
        if (best) rotate(best); },
    };
    const out = {};
    for (const name of Object.keys(bots)){
      const res = [];
      for (let seed = 1; seed <= ${N}; seed++){
        reset(seed); S.started = true; S.turnMode = ${TM};
        let lastB = -1;
        for (let i = 0; i < 60*300 && !S.over; i++){
          if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
          if (S.waiting){ bots[name](); S.waiting = false; lastB = S.beatN; }
          else if (!S.turnMode && S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bots[name](); }
          step(1/60);
        }
        res.push({ t: Math.round(S.beatN * BEAT), sec: S.sec+1, lvl: S.lvl, k: S.kills, won: S.won, st: S.stat, lost: S.lost });
      }
      out[name] = res;
    }
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  for (const [n, rs] of Object.entries(o)){
    const avg = Math.round(rs.reduce((a, x) => a + x.t, 0) / rs.length), won = rs.filter(x => x.won).length;
    const st = rs.reduce((a, x) => { for (const k in x.st) a[k] = (a[k]||0) + x.st[k]; return a; }, {});
    console.log(n.padEnd(4), '平均撑', avg, '秒  赢', won + '/' + rs.length, ' 段', rs.map(x => x.sec).join(','), ' 甜稳软撞', st.甜, st.稳, st.软, st.撞, ' 丢', rs.reduce((a,x)=>a+(x.lost||0),0));
  }
};
