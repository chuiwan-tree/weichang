// 各唱各.html：打到第 6 段停住截一张打的时候的样子（甲 20:01）
module.exports = async (p) => {
  await p.eval(`(() => { window.TEST = true; reset(7); S.started = true;
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + value(pc, m.pc), 0);
    let lastB = -1;
    for (let i = 0; i < 60*400 && !S.over && S.sec < 5; i++){ if (S.offer){ S.hand.push(S.offer[0]); S.offer = null; }
      if (S.beatN % 8 === 0 && S.beatN !== lastB){ lastB = S.beatN; const toks = S.inner.filter(x => x != null).concat(S.hand); S.inner.fill(null); S.hand = [];
        for (let k = 0; k < 8 && toks.length; k++){ let bi = 0, bv = -99; toks.forEach((pc, j) => { const v = fitAt(k, pc); if (v > bv){ bv = v; bi = j; } }); S.inner[k] = toks.splice(bi, 1)[0]; } S.hand = toks;
        for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); }
      step(1/60); } return 'ok'; })()`);
  await p.shot('打的时候');
};
