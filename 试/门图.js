// 截一张门的样子（己，第 12 天 08:48）
module.exports = async (p) => {
  await p.eval(`window.TEST = true; reset(5); S.started = true; 'ok'`);
  await p.eval(`(()=>{ for (let i=0;i<60*200 && !S.door;i++){ if (S.offer){ S.hand.push(S.offer[0]); S.offer=null; } if (i%120===0){ S.inner=[0,4,7,9,null,null,null,null]; } step(1/60); } return 'ok'; })()`);
  await p.eval(`S.allies[1]={pc:7,lv:2,sing:0}; S.allies[4]={pc:4,lv:0,sing:0}; S.allies[6]={pc:11,lv:1,sing:0}; openDoor(); 'ok'`);
  await p.shot('门');
};
