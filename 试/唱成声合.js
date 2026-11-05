// 在后台把一局围唱整个唱出来，存成 wav（用的是游戏里一模一样的声音，OfflineAudioContext 渲染，不用真放）。
// 用法：cd ~ && PAGE=../围唱/v4.html SECS=60 BOT=挪知 SEED=3 OUT=/tmp/围唱一局.wav node 轮唱/试/开.js 围唱/试/唱成声.js /tmp/x
// BOT：挪知（知道怪唱什么、每圈挪）/ 挪瞄（只看方向）/ 不动（开头摆好不动）
const fs = require('fs');
module.exports = async (api) => {
  const SECS = +(process.env.SECS || 60), BOT = process.env.BOT || '挪知', SEED = +(process.env.SEED || 3), OUT = process.env.OUT || '/tmp/围唱一局.wav';
  const b64 = await api.eval(`(async () => {
    window.TEST = true;
    const SR = 22050, c = new OfflineAudioContext(1, SR * ${SECS + 2}, SR);
    A.ctx = c; A.muted = false; A.vt = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    A.master = c.createGain(); A.master.gain.value = 0.75; A.master.connect(comp); comp.connect(c.destination);
    const nb = A.noiseBuf = c.createBuffer(1, SR, SR); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random()*2 - 1;
    A.ok = function(){ return true; }; window.LOGS = []; for (const nm of ["ally","join","leave","you","mon","bass","tick","spark","clash","pop","lose","hurt","sus","sweet","steady","puff","preview","click"]){ const f = A[nm]; if (!f) continue; A[nm] = function(...a){ let t = this.vt; if (nm === "pop" || nm === "join") t += (S.nextT - S.t) > 0.03 ? S.nextT - S.t : 0; window.LOGS.push([nm, +t.toFixed(3)]); return f.apply(this, a); }; }
    A.osc = function(type, f, peak, dec, a = 0.005, lp = 0, t0 = 0){
      const t = this.vt + t0, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f; this.env(g, t, a, peak, dec);
      let n = o; if (lp){ const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
      n.connect(g); g.connect(this.master); o.start(t); o.stop(t + a + dec + 0.05); };
    A.noise = function(peak, dec, type, f, q = 1){
      const t = this.vt, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = this.noiseBuf; fl.type = type; fl.frequency.value = f; fl.Q.value = q; this.env(g, t, 0.002, peak, dec);
      s.connect(fl); fl.connect(g); g.connect(this.master); s.start(t, Math.random()*0.5); s.stop(t + dec + 0.05); };
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    const fitAt = (k, pc) => S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).reduce((a, m) => a + hitVal(pc, m), 0);
    function place(pick){
      const toks = [], abs = [];
      for (let k = 0; k < 8; k++) if (S.inner[k] != null){ toks.push(S.inner[k]); abs.push(S.innerAb ? S.innerAb[k] : null); }
      S.hand.forEach((pc, i) => { toks.push(pc); abs.push(S.handAb ? S.handAb[i] : null); });
      S.inner.fill(null); if (S.innerAb) S.innerAb.fill(null); S.hand = []; if (S.handAb) S.handAb = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; const i = pick(k, toks); S.inner[k] = toks.splice(i,1)[0]; if (S.innerAb) S.innerAb[k] = abs.splice(i,1)[0]; } }
    const bots = {
      挪瞄: () => place(() => 0),
      挪知: () => place((k, toks) => { let bi = 0, bv = -99; toks.forEach((pc, i) => { const v = fitAt(k, pc); if (v > bv){ bv = v; bi = i; } }); return bi; }),
      收会放: () => { for (let k = 0; k < 8; k++) if (S.allies[k] && allyDrag(S.allies[k].pc)) release(k); bots.挪知(); },
      不动: () => { while (S.hand.length){ const k = [0,2,4,6,1,3,5,7].find(k => S.inner[k] == null); if (k == null) break; S.inner[k] = S.hand.shift(); if (S.handAb) S.handAb.shift(); } },
    };
    reset(${SEED}); S.started = true; let lastB = -1;
    for (let i = 0; i < 60 * ${SECS} && !S.over; i++){
      if (S.offer){ if (S.offerKind === 'abil'){ const ab = S.offer.filter(x => typeof x === 'string'); S.abHand = ab[0] || null; if (!S.abHand){ S.offer = null; } }
        else { S.hand.push(S.offer[0]); if (S.handAb) S.handAb.push(null); } S.offer = null; }
      if (S.abHand){ const ks = [0,1,2,3,4,5,6,7].filter(k => S.inner[k] != null); if (S.innerAb && ks.length) S.innerAb[ks[0]] = S.abHand; S.abHand = null; }
      if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bots['${BOT}'](); }
      A.vt = S.t + 0.05; step(1/60);
    }
    const info = { 合唱: S.allies.filter(Boolean).map(a => NAMES[a.pc]).join(" "), 收: S.recruits, 放: S.released, 秒: Math.round(S.t), 段: S.sec + 1, 打散: S.kills, 心: S.hp, 甜: S.stat.甜, 稳: S.stat.稳, 没动: S.stat.软, 撞: S.stat.撞, 完: S.over ? (S.won ? '唱完' : '死了') : '没完' };
    const buf = await c.startRendering(); const ch = buf.getChannelData(0), n = Math.min(ch.length, Math.ceil((S.t + 1.5) * SR));
    const ab = new ArrayBuffer(44 + n * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ch[i]));
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, ch[i])) * 32000, true);
    let s = ''; const u8 = new Uint8Array(ab); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    const g = BEAT, off = {}; for (const [nm, t] of window.LOGS){ const ph = ((t - 0.0833) % g + g) % g; const d = Math.min(ph, g - ph); if (d > 0.04){ off[nm] = (off[nm] || 0) + 1; } } const all = {}; for (const [nm] of window.LOGS) all[nm] = (all[nm] || 0) + 1; return JSON.stringify({ info: { ...info, 不在拍上: off, 一共: all }, peak, wav: btoa(s) });
  })()`);
  const r = JSON.parse(b64);
  fs.writeFileSync(OUT, Buffer.from(r.wav, 'base64'));
  console.log('存了', OUT, '最响', r.peak.toFixed(2), JSON.stringify(r.info));
};
