// 截几张图看样子：开头、摆音、打到一半、升级、外圈、结束
module.exports = async (p) => {
  await p.shot('0开头');
  await p.eval(`window.TEST = true; reset(3); S.started = true; S.inner[0]=0; S.inner[2]=4; S.inner[5]=7; S.hand=[9,5]; S.sel=0; 'ok'`);
  const run = (sec) => p.eval(`(()=>{ for (let i=0;i<60*${sec};i++){ if (S.offer){ S.hand.push(S.offer[0]); S.offer=null; } step(1/60); } return JSON.stringify({t:S.t|0, hp:S.hp, m:S.mons.length, a:S.arcs.length, lvl:S.lvl, st:S.stat}); })()`);
  console.log(await run(14)); await p.shot('1十四秒');
  await p.eval(`S.show = true`); await p.shot('2显示怪的音');
  await p.eval(`S.show = false; S.lvl=3; S.xp=S.need; S.outerOpen=false`); console.log(await run(0.05)); await p.shot('3升级');
  await p.eval(`S.offer=null; S.outerOpen=true; S.inner=[0,4,7,0,4,7,0,4]; S.outer=[4,7,0,4,7,0,4,7]; S.hp=6`);
  console.log(await run(20.3)); await p.shot('4外圈');
  await p.eval(`S.over=true`); await p.shot('5结束');
};
