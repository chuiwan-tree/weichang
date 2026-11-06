// 我自己一圈一圈打（甲，第 12 天 20:06）。每回把 /tmp/我打/步.json 里记下的每一步从头重放到现在，停在下一个要我拿主意的地方，截图、打出局面。
// 一步是 {摆:{内:[8 个，null 是空],外:[...]}, 放:[拍号]} 或 {挑:0/1/2}
const fs = require('fs');
module.exports = async (p) => {
  const steps = fs.existsSync('/tmp/我打/步.json') ? JSON.parse(fs.readFileSync('/tmp/我打/步.json', 'utf8')) : [];
  const r = await p.eval(`(() => {
    window.TEST = true; reset(${process.env.SEED || 21}); S.started = true;
    const steps = ${JSON.stringify(steps)}; let i = 0, err = '';
    const atLoop = () => S.beatN % 8 === 0 && S.t >= S.nextT - 1/60;
    let lastB = -1;
    for (let n = 0; n < 60 * 600 && !S.over; n++){
      if (S.offer){ if (i >= steps.length) break; const s = steps[i++]; if (s.挑 == null){ err = '这一步该挑奖励'; break; } S.hand.push(S.offer[s.挑]); S.offer = null; continue; }
      if (S.beatN % 8 === 0 && S.beatN !== lastB){
        if (i >= steps.length) break; const s = steps[i++]; lastB = S.beatN;
        if (s.摆){ const pool = S.inner.concat(S.outer).filter(x => x != null).concat(S.hand); const want = (s.摆.内 || []).concat(s.摆.外 || []).filter(x => x != null);
          const left = pool.slice(); for (const w of want){ const j = left.indexOf(w); if (j < 0){ err = '手里没有 ' + NAMES[w]; break; } left.splice(j, 1); }
          if (err) break; S.inner = (s.摆.内 || Array(8).fill(null)).slice(); S.outer = S.outerOpen ? (s.摆.外 || Array(8).fill(null)).slice() : Array(8).fill(null); S.hand = left; }
        for (const k of (s.放 || [])) release(k);
      }
      step(1/60);
    }
    const mons = Array.from({length: 8}, () => []);
    for (const m of S.mons) if (m.d < 470) mons[sectorOf(m.ang)].push(NAMES[m.pc] + Math.round(m.d));
    return JSON.stringify({ 第几步: i, 错: err, 时: S.t.toFixed(1), 段: S.sec + 1, 和弦: S.chord.p.map(x => NAMES[x]).join(''), 心: S.hp, 级: S.lvl, 外圈开: S.outerOpen,
      内: S.inner.map(x => x == null ? '·' : NAMES[x]).join(' '), 外: S.outer.map(x => x == null ? '·' : NAMES[x]).join(' '), 手: S.hand.map(x => NAMES[x]).join(' '),
      挑: S.offer ? S.offer.map(x => NAMES[x]).join(' ') : null,
      声部: S.allies.map((a, k) => a ? k + ':' + NAMES[a.pc] + a.st + (a.mo ? '[' + a.mo.map(o => (k + o.d) % 8).join(',') + ']' : '') + '#' + a.id : null).filter(Boolean).join('  '),
      怪: mons.map((m, k) => k + ':' + m.join(',')).join(' | '), 完: S.over ? (S.won ? '唱完了' : '被围住了') : '' });
  })()`);
  console.log(r);
  await p.shot('局');
};
