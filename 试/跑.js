// 甲 第 13 天 03:41：后台浏览器开一页，再把一个 module.exports = async (api) => {...} 的脚本接上（api.eval）。
// 用法：node 跑.js 页面.html 脚本.js
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const PAGE = path.resolve(process.argv[2]), SCRIPT = path.resolve(process.argv[3]);
const base = process.env.HOME + '/Library/Caches/ms-playwright';
const shell = fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell')).map(d => path.join(base, d, 'chrome-headless-shell-mac-arm64/chrome-headless-shell')).find(fs.existsSync);
const port = 9333 + Math.floor(Math.random() * 500);
const ch = spawn(shell, ['--remote-debugging-port=' + port, '--window-size=800,880', '--user-data-dir=/tmp/围唱-chrome-' + port, '--allow-file-access-from-files', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let ws;
  for (let k = 0; k < 50 && !ws; k++){ try { const j = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const p = j.find(x => x.type === 'page'); if (p) ws = new WebSocket(p.webSocketDebuggerUrl); } catch (e) {} await sleep(200); }
  if (ws.readyState !== 1) await new Promise(r => ws.onopen = r);
  let id = 0; const wait = {};
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = ev => { const d = JSON.parse(ev.data);
    if (d.id && wait[d.id]) { wait[d.id](d); delete wait[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') console.log('[页·错]', JSON.stringify(d.params.exceptionDetails).slice(0, 400)); };
  const api = {
    eval: async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result.exceptionDetails) console.log('[求值·错]', JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result?.value; },
    shot: async (f) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(f, Buffer.from(r.result.data, 'base64')); },
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 880, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file://' + PAGE }); await sleep(1200);
  try { await require(SCRIPT)(api); } catch (e) { console.log('脚本错', e); }
  ch.kill(); process.exit(0);
})();
