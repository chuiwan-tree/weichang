// 真点开始、真出声地跑几秒，看声音那一截有没有报错
module.exports = async (p) => {
  await p.click(400, 400); await p.sleep(300);
  await p.eval(`S.inner[0]=0; S.inner[2]=4; S.inner[4]=7; S.inner[6]=9; S.outerOpen=true; S.outer[0]=1; 'ok'`);
  await p.sleep(6000);
  console.log(await p.eval(`JSON.stringify({ctx: A.ctx && A.ctx.state, t: S.t.toFixed(1), beat: S.beatN, mons: S.mons.length, st: S.stat})`));
  await p.click(400 + 140, 832); await p.sleep(200); // 点手里的（如果有）
  await p.shot('声');
};
