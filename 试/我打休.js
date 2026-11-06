// 甲 第 13 天 03:45：休止.html，前 6 段让"看合唱"笨手替我打，到第 6 段完的那扇门（门后就是休止段）起我自己来。
// {挪:[[从,到]]} 休止里挪声部。
// 我的步写在 /tmp/我打休/步.json：{门:0/1} / {挑:0/1/2} / {摆:{内:[8 个]}, 放:[拍号]}（每圈开头一步）
const fs = require('fs');
module.exports = async (p) => {
  const steps = fs.existsSync('/tmp/我打休/步.json') ? JSON.parse(fs.readFileSync('/tmp/我打休/步.json', 'utf8')) : [];
  const r = await p.eval(`(() => {
    window.TEST = true; reset(${process.env.SEED || 5}); S.started = true;
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    const know = (k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const al = S.allies[k]; let v = fitAt(k, pc); if (al && value(pc, al.pc) < 0) v -= 3; if (v > bv){ bv = v; bi = i; } }); return bi; };
    function place(){ const toks = S.inner.filter(x => x != null).concat(S.hand); S.inner.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]); for (const k of order){ if (!toks.length) break; const i = know(k, toks); S.inner[k] = toks.splice(i,1)[0]; } }
    const choir = d => { let s = 0; for (const a of S.allies) if (a){ const st = stateIn(a.pc, d.ch); s += st === '合' ? 1 : st === '撞' ? -1.5 : 0; } return s; };
    const steps = ${JSON.stringify(steps)}; let i = 0, err = '', mine = false, lastB = -1;
    for (let n = 0; n < 60 * 600 && !S.over; n++){
      if (!mine && S.door && S.sec + 1 === REST_SEC) mine = true;
      if (!mine){
        if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
        if (S.door) takeDoor(choir(S.door[1]) > choir(S.door[0]) ? 1 : 0);
        if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); place(); }
        step(1/60); continue;
      }
      if (S.door){ if (i >= steps.length) break; const s = steps[i++]; if (s.门 == null){ err = '这一步该挑门'; break; } takeDoor(s.门); continue; }
      if (S.offer){ if (i >= steps.length) break; const s = steps[i++]; if (s.挑 == null){ err = '这一步该挑奖励'; break; } S.hand.push(S.offer[s.挑]); S.offer = null; continue; }
      if (S.beatN % 8 === 0 && S.beatN !== lastB){
        if (i >= steps.length) break; const s = steps[i++]; lastB = S.beatN;
        if (s.摆){ const pool = S.inner.filter(x => x != null).concat(S.hand); const want = (s.摆.内 || []).filter(x => x != null);
          const left = pool.slice(); for (const w of want){ const j = left.indexOf(w); if (j < 0){ err = '手里没有 ' + NAMES[w]; break; } left.splice(j, 1); }
          if (err) break; S.inner = s.摆.内.slice(); S.hand = left; }
        for (const k of (s.放 || [])) release(k);
        for (const [a,b] of (s.挪 || [])) if (!moveAlly(a,b)) err = '挪不了 ' + a + '→' + b;
      }
      step(1/60);
    }
    const mons = Array.from({length: 8}, () => []);
    for (const m of S.mons) if (m.d < 470) mons[sectorOf(m.ang)].push(NAMES[m.pc] + Math.round(m.d));
    const loop = Math.floor(S.beatN / 8);
    return JSON.stringify({ 第几步: i, 错: err, 时: S.t.toFixed(1), 段: S.sec + 1, 段里第几圈: loop % SECTION_LOOPS + 1, 休止: !!S.resting || restingAt(S.beatN), 和弦: S.chord.p.map(x => NAMES[x]).join(''), 心: S.hp, 丢音: S.lost,
      内: S.inner.map(x => x == null ? '·' : NAMES[x]).join(' '), 手: S.hand.map(x => NAMES[x]).join(' '),
      门: S.door ? S.door.map(d => d.ch.n + '/' + d.rw.t + '：' + S.allies.map((a,k) => a ? k + NAMES[a.pc] + stateIn(a.pc, d.ch) : null).filter(Boolean).join(' ')).join('  ||  ') : null,
      挑: S.offer ? S.offer.map(x => NAMES[x]).join(' ') : null,
      声部: S.allies.map((a, k) => a ? k + ':' + NAMES[a.pc] + (a.st || allyState(a.pc)) : null).filter(Boolean).join('  '),
      怪: mons.map((m, k) => k + ':' + m.join(',')).join(' | '), 完: S.over ? (S.won ? '唱完了' : '被围住了') : '' });
  })()`);
  console.log(r);
  await p.shot('/tmp/我打休/局.png');
};
