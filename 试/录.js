// 后台看不见的浏览器里玩一局，画面（CDP screencast）和声音（MediaRecorder 接在总线上）一起录下来，拼成 mp4。
// 用法：node 录.js 出的目录 秒数
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const OUT = path.resolve(process.argv[2] || '/tmp/围唱录'), SECS = +(process.argv[3] || 90);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT + '/帧', { recursive: true });
const base = process.env.HOME + '/Library/Caches/ms-playwright';
const shell = fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell')).map(d => path.join(base, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell')).find(fs.existsSync);
const port = 9333 + Math.floor(Math.random() * 500);
const ch = spawn(shell, ['--remote-debugging-port=' + port, '--autoplay-policy=no-user-gesture-required', '--window-size=800,880',
  '--user-data-dir=/tmp/围唱-chrome-' + port, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ws;
  for (let k = 0; k < 50 && !ws; k++){ try { const j = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const p = j.find(x => x.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch (e) {} await sleep(200); }
  console.error('连上', !!ws, shell); if (ws.readyState !== 1) await new Promise(r => ws.onopen = r); console.error('开了');
  let id = 0; const wait = {}; const frames = [];
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const d = JSON.parse(ev.data);
    if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; }
    if (d.method === 'Page.screencastFrame'){ const n = frames.length; const f = `${OUT}/帧/${String(n).padStart(5, '0')}.jpg`;
      fs.writeFileSync(f, Buffer.from(d.params.data, 'base64')); frames.push({ f, t: d.params.metadata.timestamp });
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId: d.params.sessionId } })); }
    if (d.method === 'Runtime.exceptionThrown') console.log('[页·错]', JSON.stringify(d.params.exceptionDetails).slice(0, 400));
    if (d.method === 'Runtime.consoleAPICalled') console.log('[页]', d.params.args.map(a => a.value ?? a.description).join(' ')); };
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result.exceptionDetails) console.log('[求值·错]', JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result?.value; };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 880, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file://' + process.env.HOME + '/围唱/index.html' }); await sleep(1200);
  await sleep(1500); console.error('页开了');   // 先让开头那一屏停一会儿
  // 声音：总线接一路给录音机
  await ev(`(() => { A.init(); const d = A.ctx.createMediaStreamDestination(); A.comp.connect(d);
    window.__rec = new MediaRecorder(d.stream, { mimeType: 'audio/webm;codecs=opus' }); window.__chunks = [];
    __rec.ondataavailable = e => __chunks.push(e.data); __rec.start(500); window.__t0 = performance.now(); return 'ok'; })()`);
  console.error('录音机好了'); await send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1 });
  const tStart = Date.now() / 1000;
  await sleep(1500);
  // 手：会听的那一只（看得见怪唱什么，挑最合的），中间有一段故意乱放
  await ev(`(() => { reset(7); S.started = true;
    let lastLoop = -1, offerAt = 0;
    const threat = () => { const t = Array(8).fill(0); for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30); return t; };
    window.__bot = setInterval(() => {
      if (S.over) return;
      if (S.offer){ if (!offerAt) offerAt = performance.now(); if (performance.now() - offerAt > 900){
          // 挑一个跟现在怪唱的最合的
          let bi = 0, bv = -99; S.offer.forEach((pc, i) => { const v = S.chord.p.reduce((a, q) => a + value(pc, q), 0); if (v > bv){ bv = v; bi = i; } });
          S.hand.push(S.offer[bi]); S.offer = null; offerAt = 0; } return; }
      const loop = Math.floor(S.beatN / 8); if (loop === lastLoop) return; lastLoop = loop;
      const sloppy = S.t > 52 && S.t < 66;     // 这一段乱放：让人听听撞了是什么声
      const toks = S.inner.concat(S.outer).filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.outer.fill(null); S.hand = [];
      const t = threat(); const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const ring of ['inner','outer']){ if (ring === 'outer' && !S.outerOpen) break;
        for (const k of order){ if (!toks.length) break;
          let bi = 0;
          if (sloppy) bi = Math.floor(Math.random() * toks.length);
          else { const ms = S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460); let bv = -99;
            toks.forEach((pc, i) => { const v = ms.reduce((a, m) => a + value(pc, m.pc), 0) + (ring==='outer' && S.inner[k]!=null && value(pc, S.inner[k]) < 0 ? -5 : 0); if (v > bv){ bv = v; bi = i; } }); }
          S[ring][k] = toks.splice(bi, 1)[0]; } }
      S.hand = toks;
      if (sloppy && !window.__said){ window.__said = 1; say('（这一段手乱放音，听听撞了是什么声）', 12); }
      if (!sloppy && S.t > 66 && window.__said === 1){ window.__said = 2; say('（放回去了）', 3); }
    }, 50);
    return 'ok'; })()`);
  for (let s = 0; s < SECS; s += 10){ await sleep(10000);
    console.log(await ev(`JSON.stringify({t: S.t.toFixed(0), hp: S.hp, lvl: S.lvl, k: S.kills, st: S.stat, over: S.over})`)); }
  await send('Page.stopScreencast');
  const b64 = await ev(`new Promise(r => { __rec.onstop = () => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(new Blob(__chunks, {type:'audio/webm'})); }; __rec.stop(); })`);
  fs.writeFileSync(OUT + '/声.webm', Buffer.from(b64, 'base64'));
  ch.kill();
  // 帧按真时间拼
  const lines = [];
  for (let i = 0; i < frames.length; i++){ const d = i + 1 < frames.length ? frames[i + 1].t - frames[i].t : 0.04;
    lines.push(`file '${frames[i].f}'`, `duration ${Math.max(0.001, d).toFixed(4)}`); }
  lines.push(`file '${frames[frames.length - 1].f}'`);
  fs.writeFileSync(OUT + '/帧.txt', lines.join('\n'));
  const lead = Math.max(0, frames[0].t - tStart);   // 录音比第一帧早多少
  console.log('帧', frames.length, '第一帧晚', lead.toFixed(2), '秒');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', OUT + '/帧.txt', '-ss', lead.toFixed(3), '-i', OUT + '/声.webm',
    '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '23', '-c:a', 'aac', '-b:a', '160k', '-shortest', OUT + '/围唱一局.mp4']);
  console.log('好了', OUT + '/围唱一局.mp4');
  process.exit(0);
})();
