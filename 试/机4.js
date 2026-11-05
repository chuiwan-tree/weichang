// 围唱 四 的笨手（本事跟着音走，手里的音和本事一起挪）。原来是三的：看两件事：
//   1) 加了硬壳、走调以后，"知道怪唱什么"（挪知）比"只看方向"（挪瞄）多撑多少——差得越多，挑音越要紧
//   2) 本事有没有用：随手拿本事、随手放 vs 不拿本事（照二那样 ×1.15）
// 环境：KINDS=0 关掉新怪；ABIL=0 关掉本事；N 每种几局
module.exports = async (api) => {
  const N = +(process.env.N || 8), KINDS = process.env.KINDS !== '0', ABIL = process.env.ABIL !== '0', AB = process.env.AB || '';
  const r = await api.eval(`(() => {
    window.TEST = true; window.NO_KINDS = ${!KINDS}; window.NO_ABIL = ${!ABIL}; window.ONLY_KIND = '${process.env.KIND || ''}';
    const threat = () => { const t = Array(8).fill(0);
      for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + hitVal(pc, m), 0);
    function place(pick){
      const toks = [], abs = [];
      for (let k = 0; k < 8; k++) if (S.inner[k] != null){ toks.push(S.inner[k]); abs.push(S.innerAb[k]); }
      S.hand.forEach((pc, i) => { toks.push(pc); abs.push(S.handAb[i]); });
      S.inner.fill(null); S.innerAb.fill(null); S.hand = []; S.handAb = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; const i = pick(k, toks); S.inner[k] = toks.splice(i,1)[0]; S.innerAb[k] = abs.splice(i,1)[0]; }
    }
    const bots = {
      挪瞄: () => place(() => 0),
      挪知: () => place((k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const v = fitAt(k, pc); if (v > bv){ bv = v; bi = i; } }); return bi; }),
    };
    const out = {};
    for (const name of Object.keys(bots)){
      const res = [];
      for (let seed = 1; seed <= ${N}; seed++){
        reset(seed); S.started = true;
        let lastB = -1, abs = {};
        for (let i = 0; i < 60*520 && !S.over; i++){
          if (S.offer){ if (S.offerKind === 'abil'){ const want = '${AB}'; const more = S.offer.find(x => x.more);
              if (more && !want){ S.maxn++; S.hand.push(SCALE[Math.floor(S.rng()*7)]); S.handAb.push(null); abs.多 = (abs.多||0)+1; }
              else { const ab = S.offer.filter(x => typeof x === 'string'); S.abHand = (want && ab.includes(want)) ? want : ab[Math.floor(S.rng()*ab.length)]; } }
            else { S.hand.push(S.offer[0]); S.handAb.push(null); } S.offer = null; }
          if (S.abHand){ const ks = [0,1,2,3,4,5,6,7].filter(k => S.inner[k] != null); const k = ks.length ? ks[Math.floor(S.rng()*ks.length)] : 0; S.innerAb[k] = S.abHand; abs[S.abHand] = (abs[S.abHand]||0)+1; S.abHand = null; }
          if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bots[name](); }
          step(1/60);
        }
        res.push({ t: Math.round(S.beatN * BEAT), sec: S.sec+1, won: S.won, st: S.stat, abs });
      }
      out[name] = res;
    }
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  console.log('新怪', KINDS ? '开' : '关', ' 本事', ABIL ? '开' : '关', AB ? '只拿' + AB : '');
  for (const [n, rs] of Object.entries(o)){
    const avg = Math.round(rs.reduce((a, x) => a + x.t, 0) / rs.length), won = rs.filter(x => x.won).length;
    const st = rs.reduce((a, x) => { for (const k in x.st) a[k] = (a[k]||0) + x.st[k]; return a; }, {});
    console.log(n.padEnd(4), '平均撑', avg, '秒  赢', won + '/' + rs.length, ' 段', rs.map(x => x.sec).join(','), ' 甜稳软撞回', st.甜, st.稳, st.软, st.撞, st.回 || 0);
  }
};
