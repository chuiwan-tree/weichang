// 几只笨手在后台各打几局：看"合上"到底是不是活下去的那个东西。
// 都会"瞄"：每圈把手上的音挪到怪最近的那几个方向。差别只在挑哪个音放哪边：
//   瞄    —— 不挑，随手放（只靠眼睛看哪边危险）
//   瞄听  —— 记着每个方向上每个音打出来是甜/稳/软/撞，挑记得最好的（靠结果学，耳朵/眼睛都给这个）
//   瞄知  —— 作弊：知道怪唱的音，挑算出来最好的（上限）
//   乱满  —— 每圈所有格子随便的白键（不看任何东西，看"填满"本身值多少）
module.exports = async (api) => {
  const N = +(process.env.N || 8);
  const r = await api.eval(`(() => {
    window.TEST = true;
    const threat = () => { const t = Array(8).fill(0);
      for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    function place(pick){   // pick(k, tokens) -> 下标
      const toks = S.inner.concat(S.outer).filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.outer.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const ring of ['inner','outer']){ if (ring === 'outer' && !S.outerOpen) break;
        for (const k of order){ if (!toks.length) break; const i = pick(k, toks, ring); S[ring][k] = toks.splice(i,1)[0]; } }
      S.hand = toks;
    }
    let mem;
    const bots = {
      瞄: () => place(() => 0),
      瞄听: () => place((k, toks) => { let bi = 0, bv = -9; toks.forEach((pc, i) => { const v = mem[k][pc] ?? 1.2; if (v > bv){ bv = v; bi = i; } }); return bi; }),
      瞄知: () => place((k, toks) => { const ms = S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460);
        let bi = 0, bv = -99; toks.forEach((pc, i) => { const v = ms.reduce((a, m) => a + value(pc, m.pc), 0); if (v > bv){ bv = v; bi = i; } }); return bi; }),
      乱满: () => { const sc=[0,2,4,5,7,9,11]; for (let k=0;k<8;k++){ S.inner[k] = sc[Math.floor(Math.random()*7)]; if (S.outerOpen) S.outer[k] = sc[Math.floor(Math.random()*7)]; } },
    };
    const out = {};
    const orig = hitMon;
    for (const name of Object.keys(bots)){
      const res = [];
      for (let seed = 1; seed <= ${N}; seed++){
        reset(seed); S.started = true; mem = Array.from({length:8}, () => ({}));
        window.hitMon = hitMon = function(a, m){ const b = {...S.stat}; orig(a, m);
          const kd = ['甜','稳','软','撞'].find(x => S.stat[x] > b[x]); const v = {甜:2,稳:1,软:0,撞:-1}[kd];
          if (a.notes.length === 1) mem[a.k][a.notes[0]] = v; };
        let lastB = -1;
        for (let i = 0; i < 60*240 && !S.over; i++){
          if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
          if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bots[name](); }
          step(1/60);
        }
        res.push({ t: Math.round(S.t), sec: S.sec+1, lvl: S.lvl, k: S.kills, won: S.won, st: S.stat, lost: S.lost });
      }
      out[name] = res;
    }
    window.hitMon = hitMon = orig;
    return JSON.stringify(out);
  })()`);
  const o = JSON.parse(r);
  for (const [n, rs] of Object.entries(o)){
    const avg = Math.round(rs.reduce((a, x) => a + x.t, 0) / rs.length), won = rs.filter(x => x.won).length;
    const st = rs.reduce((a, x) => { for (const k in x.st) a[k] = (a[k]||0) + x.st[k]; return a; }, {});
    console.log(n.padEnd(4), '平均撑', avg, '秒  赢', won + '/' + rs.length, ' 段', rs.map(x => x.sec).join(','), ' 甜稳软撞', st.甜, st.稳, st.软, st.撞, ' 丢声部', rs.reduce((a,x)=>a+(x.lost||0),0));
  }
};
