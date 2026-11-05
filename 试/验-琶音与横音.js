// 验证“四条作曲规矩（级进成弧、三度重唱、五度对答、休止重音）”+“琶音小队”：
// 核心问题：如果升级不给无脑的 power *= 1.15，而是给这四条作曲规矩，
// “只看方向合不合、无视旋律结构的笨手 (挪知)” vs “懂按作曲规矩摆出乐句结构的笨手 (曲式知)”
// 能不能拉开显著差距？

const BEATS = 8, BEAT = 0.3, SECTION_LOOPS = 8, TOTAL_SECTIONS = 12;
const NAMES = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const SCALE = [0,2,4,5,7,9,11];
const CHORDS = [{n:'C',r:0,p:[0,4,7]},{n:'Am',r:9,p:[9,0,4]},{n:'F',r:5,p:[5,9,0]},{n:'G',r:7,p:[7,11,2]},
                {n:'Em',r:4,p:[4,7,11]},{n:'Dm',r:2,p:[2,5,9]},{n:'F',r:5,p:[5,9,0]},{n:'G',r:7,p:[7,11,2]}];
const HALF = Math.PI / 8 * 1.05;
const WAVE_V = 650;
const MAXN = 4;
const iv = (a, b) => ((a - b) % 12 + 12) % 12;
function value(pc, mpc){
  const i = iv(pc, mpc);
  if (i===3||i===4||i===8||i===9) return 2;     // 三度六度：甜
  if (i===0||i===5||i===7) return 1;            // 同音、四五度：稳
  if (i===2||i===10) return 0;                  // 大二小七：软
  return -1;                                    // 小二、三全音、大七：撞
}
function kindOf(v){ return v>=2?'甜':v>=1?'稳':v>=0?'软':'撞'; }
const angOf = k => -Math.PI/2 + k * Math.PI/4;
const sectorOf = a => ((Math.round((a + Math.PI/2) / (Math.PI/4)) % 8) + 8) % 8;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2*Math.PI; while (d < -Math.PI) d += 2*Math.PI; return d; };
function rng32(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const RULES = [
  { id: 'slur',   name: '级进成弧', desc: '相邻两拍是二度级进（如 C→D），后一拍的波张开成宽弧，连带再扫前一拍方向' },
  { id: 'third',  name: '三度重唱', desc: '相邻两拍是三度/六度（如 C→E），后一拍响时拉着前一拍的音一起重唱（双音波）' },
  { id: 'fifth',  name: '五度对答', desc: '正对面两拍（相隔4拍）是四度/五度（如 C与G），这一拍响时对面也推一道七成力的应答波' },
  { id: 'accent', name: '休止重音', desc: '连续空 2 拍以上后的第一个音是起音重拍：伤害 ×1.6、击退 ×2.2、射程 +50' },
];

const isStep = (a, b) => { const d = iv(a, b); return d===1||d===2||d===10||d===11; };
const isThird = (a, b) => { const d = iv(a, b); return d===3||d===4||d===8||d===9; };
const isFifth = (a, b) => { const d = iv(a, b); return d===5||d===7; };

function countRestsBefore(inner, k){
  let r = 0;
  for (let d = 1; d <= 7; d++){
    if (inner[(k + 8 - d) % 8] == null) r++;
    else break;
  }
  return r;
}

function makeSim(cfg){
  let S;
  function reset(seed){
    S = { t: 0, rng: rng32(seed), beatN: 0, nextT: 0.05, sec: 0, chord: CHORDS[0],
      inner: Array(8).fill(null), hand: [0, 4, 7], power: 1, rules: new Set(),
      mons: [], arcs: [],
      hp: 3, maxhp: 3, xp: 0, lvl: 1, need: 2, kills: 0, offer: null, ruleOffer: null, over: false, won: false,
      spawnAcc: 0.6, nid: 1, range: 290, lost: 0,
      stat: { 甜: 0, 稳: 0, 软: 0, 撞: 0, 连弧: 0, 重唱: 0, 对答: 0, 重音: 0, 震退: 0 },
      secSong: [] };
    return S;
  }

  function spawnPack(){
    const R = S.rng, sec = S.sec, ch = S.chord;
    const n = 1 + Math.floor(R() * (1 + Math.min(3, sec / 2)));
    const startIdx = Math.floor(R() * ch.p.length);
    const ang = R() * Math.PI * 2;
    const w = sec >= 4 && R() < 0.3 ? (R() < 0.5 ? -1 : 1) * (0.06 + R()*0.06) : 0;
    for (let i = 0; i < n; i++){
      // 琶音小队：从第 2 段起，一队多只怪不再全唱同一个音，第 2 只起有 60% 概率唱和弦里的下一个音
      const pc = (cfg.arpPack && sec >= 1 && i > 0 && R() < 0.65)
        ? ch.p[(startIdx + i) % ch.p.length]
        : ch.p[startIdx];
      S.mons.push({ id: S.nid++, pc, ang: ang + (R() - 0.5) * 0.14, d: 450 + i * 26, hp: 2 + sec * 0.4, maxhp: 2 + sec * 0.4,
        v: 24 + Math.min(sec, 3) * 2.2 + R() * 6, w, rad: 11, kb: 0, rage: 0 });
    }
  }

  function fireBeat(n){
    const k = n % 8, loop = Math.floor(n / 8), sec = Math.floor(loop / SECTION_LOOPS);
    if (sec >= TOTAL_SECTIONS){ S.over = true; S.won = true; return; }
    if (sec !== S.sec){ S.sec = sec; S.chord = CHORDS[sec % CHORDS.length]; }
    if (k === 7) S.secSong[sec] = { r: S.chord.r, inner: S.inner.slice() };
    const pc = S.inner[k];
    if (pc != null){
      const prevK = (k + 7) % 8, prevPc = S.inner[prevK];
      const oppK = (k + 4) % 8, oppPc = S.inner[oppK];
      let ang = angOf(k), half = HALF, dmgMul = 1, kbMul = 1, rangeAdd = 0, notes = [pc];

      // 1. 休止重音
      if (S.rules.has('accent') && countRestsBefore(S.inner, k) >= 2){
        dmgMul *= 1.6; kbMul *= 2.2; rangeAdd += 50; S.stat.重音++;
      }
      // 2. 级进成弧
      if (S.rules.has('slur') && prevPc != null && isStep(pc, prevPc)){
        ang = angOf(k) - Math.PI / 8; half = HALF * 1.95; S.stat.连弧++;
      }
      // 3. 三度重唱
      if (S.rules.has('third') && prevPc != null && isThird(pc, prevPc)){
        notes = [pc, prevPc]; S.stat.重唱++;
      }
      S.arcs.push({ k, ang, half, dmgMul, kbMul, r: 24, max: S.range + rangeAdd, notes, hit: new Set(), blocks: [] });

      // 4. 五度对答：对面第 k+4 拍如果有四五度的音，对面也推一道 0.75 倍的应答波！
      if (S.rules.has('fifth') && oppPc != null && isFifth(pc, oppPc)){
        S.stat.对答++;
        S.arcs.push({ k: oppK, ang: angOf(oppK), half: HALF, dmgMul: 0.75, kbMul: 1.0,
          r: 24, max: S.range, notes: [oppPc], hit: new Set(), blocks: [] });
      }
    }
  }

  function hitMon(a, m){
    // 双音重唱时：取两个音里对怪最好的那个音程为主，若另一个音也合则叠加 50%，若另一个音撞则不叠加（比外圈更宽容直观）
    let v = 0, best = -9;
    if (a.notes.length === 1){
      v = best = value(a.notes[0], m.pc);
    } else {
      const v0 = value(a.notes[0], m.pc), v1 = value(a.notes[1], m.pc);
      best = Math.max(v0, v1);
      const other = Math.min(v0, v1);
      v = best + (other > 0 ? other * 0.5 : 0);
    }
    if (v === 0){ S.stat.软++; return; }
    if (v < 0){
      a.blocks.push({ ang: m.ang, w: Math.atan2(m.rad * 1.8, m.d) });
      m.rage = 2; S.stat.撞++; m.hp = Math.min(m.maxhp * 1.5, m.hp + 0.5);
    } else {
      const kind = kindOf(best);
      S.stat[kind]++;
      const dmg = v * S.power * a.dmgMul;
      m.hp -= dmg;
      m.kb += 26 * v * a.kbMul;
      // 甜杀遗音震退：用“甜(三六度)”当场打散前排怪时，唱出高八度遗音，把同扇区紧跟在它身后 55 像素内的怪震退并削 0.8 血
      if (cfg.sweetPop && best >= 2 && m.hp <= 0 && !m.dead){
        for (const m2 of S.mons){
          if (m2.id !== m.id && !m2.dead && m2.hp > 0 && sectorOf(m2.ang) === sectorOf(m.ang) && Math.abs(m2.d - m.d) < 55){
            m2.hp -= 0.8 * S.power; m2.kb += 28; S.stat.震退++;
          }
        }
      }
    }
  }

  function step(dt){
    if (S.over) return;
    S.t += dt;
    while (S.t >= S.nextT && !S.over){ fireBeat(S.beatN); S.beatN++; S.nextT += BEAT; }
    if (S.over) return;
    const rate = 0.32 + 0.085 * S.sec;
    S.spawnAcc += rate * dt;
    while (S.spawnAcc >= 1){ S.spawnAcc -= 1; spawnPack(); }
    for (const a of S.arcs){
      a.r += WAVE_V * dt;
      for (const m of S.mons){
        if (a.hit.has(m.id) || m.d - m.rad > a.r) continue;
        if (Math.abs(angDiff(m.ang, a.ang)) > a.half + m.rad / Math.max(m.d, 20)) continue;
        a.hit.add(m.id);
        if (a.blocks.some(b => Math.abs(angDiff(m.ang, b.ang)) < b.w)) continue;
        hitMon(a, m);
      }
    }
    S.arcs = S.arcs.filter(a => a.r < a.max);
    for (const m of S.mons){
      const sp = m.v * (m.rage > 0 ? 1.75 : 1);
      m.d += (m.kb * 7 - sp) * dt; m.kb *= Math.exp(-7 * dt);
      m.ang += m.w * dt; m.rage -= dt;
      if (m.hp <= 0 && !m.dead){
        m.dead = true; S.kills++; S.xp++;
      } else if (m.d < 22 && !m.dead){
        m.dead = true;
        const k = sectorOf(m.ang);
        if (S.inner[k] != null){ S.inner[k] = null; S.lost++; }
        else { S.hp--; if (S.hp <= 0) S.over = true; }
      }
    }
    S.mons = S.mons.filter(m => !m.dead);
    if (S.xp >= S.need && !S.over){
      S.xp -= S.need; S.lvl++; S.need = 2 + S.lvl * 2; S.range = Math.min(380, S.range + 10);
      const total = S.inner.filter(x => x != null).length + S.hand.length;
      if (total < MAXN){
        const pool = SCALE.slice(); const pick = [];
        while (pick.length < 3){ const i = Math.floor(S.rng() * pool.length); pick.push(pool.splice(i, 1)[0]); }
        S.offer = pick;
      } else if (cfg.useRules && S.rules.size < RULES.length){
        const avail = RULES.filter(r => !S.rules.has(r.id));
        const pick = [];
        while (pick.length < Math.min(3, avail.length)){
          const i = Math.floor(S.rng() * avail.length); pick.push(avail.splice(i, 1)[0].id);
        }
        S.ruleOffer = pick;
      } else {
        S.power *= 1.12;
      }
    }
  }
  return { reset, step };
}

function evalBoard(S, inner, scoreDir){
  let total = 0;
  for (let k = 0; k < 8; k++){
    const pc = inner[k];
    if (pc == null) continue;
    const prevK = (k + 7) % 8, prevPc = inner[prevK];
    const oppK = (k + 4) % 8, oppPc = inner[oppK];
    let dmgMul = 1;
    if (S.rules.has('accent') && countRestsBefore(inner, k) >= 2) dmgMul *= 1.6;
    if (S.rules.has('third') && prevPc != null && isThird(pc, prevPc)){
      total += scoreDir(k, [pc, prevPc], dmgMul);
    } else {
      total += scoreDir(k, [pc], dmgMul);
    }
    if (S.rules.has('slur') && prevPc != null && isStep(pc, prevPc)){
      total += scoreDir(prevK, [pc], dmgMul * 0.95);
    }
    if (S.rules.has('fifth') && oppPc != null && isFifth(pc, oppPc)){
      total += scoreDir(oppK, [oppPc], 0.75);
    }
  }
  return total;
}

function runBench(label, cfg, N = 16){
  console.log(`\n=== ${label} (${N} 局) ===`);
  const sim = makeSim(cfg);

  const bots = {
    挪瞄: (S) => {
      const toks = S.inner.filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.hand = [];
      const t = Array(8).fill(0);
      for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30);
      const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){ if (!toks.length) break; S.inner[k] = toks.shift(); }
    },
    挪知_无视规矩: (S) => {
      // 知道怪唱什么音，但完全不管音和音之间的作曲规矩，只按最危险的 4 个方向塞最合的音
      const toks = S.inner.filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.hand = [];
      const t = Array(8).fill(0);
      for (const m of S.mons) if (m.d < 460) t[sectorOf(m.ang)] += 1 / Math.max(m.d, 30);
      const order = [0,1,2,3,4,5,6,7].sort((a,b) => t[b]-t[a]);
      for (const k of order){
        if (!toks.length) break;
        const ms = S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).sort((a,b) => a.d - b.d);
        let bi = 0, bv = -999;
        toks.forEach((pc, i) => {
          let v = 0;
          for (const m of ms){
            const x = value(pc, m.pc);
            if (x < 0){ v -= 6; break; }
            v += x * (300 / Math.max(m.d, 55));
          }
          if (v > bv){ bv = v; bi = i; }
        });
        S.inner[k] = toks.splice(bi, 1)[0];
      }
    },
    曲式知_懂规矩: (S) => {
      // 既知道怪唱什么，又懂得按已拿到的作曲规矩（级进成弧/三度重唱/五度对答/休止重音）摆出最优乐句
      const toks = S.inner.filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.hand = [];
      const msByK = Array.from({length: 8}, (_, k) =>
        S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).sort((a,b) => a.d - b.d));
      const scoreDir = (k, notes, mul) => {
        let s = 0;
        for (const m of msByK[k]){
          let v = 0;
          if (notes.length === 1) v = value(notes[0], m.pc);
          else {
            const v0 = value(notes[0], m.pc), v1 = value(notes[1], m.pc);
            v = Math.max(v0, v1) + (Math.min(v0, v1) > 0 ? Math.min(v0, v1) * 0.5 : 0);
          }
          if (v < 0){ s -= 6.5; break; }
          s += v * mul * (300 / Math.max(m.d, 50));
        }
        return s;
      };
      // 贪心 + 局部交换搜索最优 8 拍摆法
      const used = new Array(toks.length).fill(false);
      for (let stepIdx = 0; stepIdx < toks.length; stepIdx++){
        let bestK = -1, bestTi = -1, bestVal = -1e9;
        for (let k = 0; k < 8; k++){
          if (S.inner[k] != null) continue;
          for (let ti = 0; ti < toks.length; ti++){
            if (used[ti]) continue;
            S.inner[k] = toks[ti];
            const val = evalBoard(S, S.inner, scoreDir);
            S.inner[k] = null;
            if (val > bestVal){ bestVal = val; bestK = k; bestTi = ti; }
          }
        }
        if (bestK >= 0){ S.inner[bestK] = toks[bestTi]; used[bestTi] = true; }
      }
      // 再做一轮两格交换微调（因为先放的音可能换个位置能跟后放的音触发五度对答或级进成弧）
      let improved = true;
      while (improved){
        improved = false;
        const curVal = evalBoard(S, S.inner, scoreDir);
        for (let a = 0; a < 8; a++){
          for (let b = a + 1; b < 8; b++){
            if (S.inner[a] === S.inner[b]) continue;
            const tmp = S.inner[a]; S.inner[a] = S.inner[b]; S.inner[b] = tmp;
            if (evalBoard(S, S.inner, scoreDir) > curVal + 0.01){ improved = true; break; }
            S.inner[b] = S.inner[a]; S.inner[a] = tmp;
          }
          if (improved) break;
        }
      }
    }
  };

  for (const [name, bot] of Object.entries(bots)){
    const res = [];
    for (let seed = 1; seed <= N; seed++){
      const S = sim.reset(seed);
      let lastB = -1;
      for (let i = 0; i < 60 * 300 && !S.over; i++){
        if (S.offer){
          // 起始手牌是 [0, 4, 7] (C, E, G)，第 4 个音选 D(2) 或 A(9)，这样既有二度级进(C-D-E)、又有三度(C-E-G)、又有五度(C-G, D-A)！
          let pick = S.offer.find(c => c === 2 || c === 9) ?? S.offer[0];
          S.hand.push(pick); S.offer = null;
        }
        if (S.ruleOffer){
          S.rules.add(S.ruleOffer[0]); S.ruleOffer = null;
        }
        if (S.beatN !== lastB && S.beatN % 8 === 0){ lastB = S.beatN; bot(S); }
        sim.step(1/60);
      }
      res.push({ t: Math.round(S.beatN * BEAT), sec: S.sec + 1, won: S.won, st: S.stat, lost: S.lost });
    }
    const avg = Math.round(res.reduce((a, x) => a + x.t, 0) / res.length);
    const won = res.filter(x => x.won).length;
    const st = res.reduce((a, x) => { for (const k in x.st) a[k] = (a[k]||0) + x.st[k]; return a; }, {});
    console.log(
      name.padEnd(11),
      `平均 ${String(avg).padStart(3)}秒  赢 ${String(won).padStart(2)}/${N}`,
      ` 甜:${st.甜} 稳:${st.稳} 撞:${st.撞} 震:${st.震退}`,
      ` [连弧:${st.连弧} 重唱:${st.重唱} 对答:${st.对答} 重音:${st.重音}]`
    );
  }
}

runBench('A. 琶音小队 + 旧版升级 (只加 power×1.12，无作曲规矩)', { arpPack: true, sweetPop: true, useRules: false });
runBench('B. 琶音小队 + 升级拿四条作曲规矩 (取代 power×1.12)', { arpPack: true, sweetPop: true, useRules: true });
// 接在后面：单独看两种双规矩流派（流派1：级进成弧+休止重音；流派2：五度对答+三度重唱）摆出来的 8 拍旋律长相
function showBuildSongs(title, fixedRules){
  console.log(`\n--- ${title} ---`);
  const sim = makeSim({ arpPack: true, sweetPop: true, useRules: false });
  const S = sim.reset(3);
  fixedRules.forEach(r => S.rules.add(r));
  let lastB = -1;
  const msByK = () => Array.from({length: 8}, (_, k) =>
    S.mons.filter(m => sectorOf(m.ang) === k && m.d < 460).sort((a,b) => a.d - b.d));
  for (let i = 0; i < 60 * 300 && !S.over; i++){
    if (S.offer){
      let pick = S.offer.find(c => c === 2 || c === 9) ?? S.offer[0];
      S.hand.push(pick); S.offer = null;
    }
    if (S.beatN !== lastB && S.beatN % 8 === 0){
      lastB = S.beatN;
      const toks = S.inner.filter(x => x != null).concat(S.hand);
      S.inner.fill(null); S.hand = [];
      const mk = msByK();
      const scoreDir = (k, notes, mul) => {
        let s = 0;
        for (const m of mk[k]){
          let v = notes.length === 1 ? value(notes[0], m.pc) :
            Math.max(value(notes[0], m.pc), value(notes[1], m.pc)) + (Math.min(value(notes[0], m.pc), value(notes[1], m.pc)) > 0 ? Math.min(value(notes[0], m.pc), value(notes[1], m.pc)) * 0.5 : 0);
          if (v < 0){ s -= 6.5; break; }
          s += v * mul * (300 / Math.max(m.d, 50));
        }
        return s;
      };
      const used = new Array(toks.length).fill(false);
      for (let stepIdx = 0; stepIdx < toks.length; stepIdx++){
        let bestK = -1, bestTi = -1, bestVal = -1e9;
        for (let k = 0; k < 8; k++){
          if (S.inner[k] != null) continue;
          for (let ti = 0; ti < toks.length; ti++){
            if (used[ti]) continue;
            S.inner[k] = toks[ti];
            const val = evalBoard(S, S.inner, scoreDir);
            S.inner[k] = null;
            if (val > bestVal){ bestVal = val; bestK = k; bestTi = ti; }
          }
        }
        if (bestK >= 0){ S.inner[bestK] = toks[bestTi]; used[bestTi] = true; }
      }
      let improved = true;
      while (improved){
        improved = false;
        const curVal = evalBoard(S, S.inner, scoreDir);
        for (let a = 0; a < 8; a++){
          for (let b = a + 1; b < 8; b++){
            if (S.inner[a] === S.inner[b]) continue;
            const tmp = S.inner[a]; S.inner[a] = S.inner[b]; S.inner[b] = tmp;
            if (evalBoard(S, S.inner, scoreDir) > curVal + 0.01){ improved = true; break; }
            S.inner[b] = S.inner[a]; S.inner[a] = tmp;
          }
          if (improved) break;
        }
      }
    }
    sim.step(1/60);
  }
  const fmt = arr => arr.map(x => x == null ? ' · ' : (' ' + NAMES[x] + ' ').slice(0,3)).join('');
  S.secSong.forEach((sec, idx) => {
    if (sec) console.log(`第${String(idx+1).padStart(2)}段 (${CHORDS[idx%CHORDS.length].n.padEnd(2)}): [${fmt(sec.inner)}]`);
  });
  console.log('统计:', S.stat);
}

showBuildSongs('流派一：【级进成弧 + 休止重音】', ['slur', 'accent']);
showBuildSongs('流派二：【五度对答 + 三度重唱】', ['fifth', 'third']);
