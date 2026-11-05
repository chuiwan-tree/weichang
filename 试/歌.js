module.exports = async (p) => {
  await p.click(400, 400); await p.sleep(200);
  console.log(await p.eval(`(()=>{ window.TEST=true; reset(2); S.started=true; S.inner=[0,4,7,0,4,7,0,4];
    for (let i=0;i<60*60 && !S.over;i++){ if (S.offer){S.hand.push(S.offer[0]); S.offer=null;} step(1/60);} S.over=true; window.TEST=false;
    return JSON.stringify(S.secSong.map(x=>x&&x.r)); })()`));
  await p.eval(`window.dispatchEvent(new KeyboardEvent('keydown',{key:' '}))`); await p.sleep(1500);
  console.log(await p.eval(`S.playing`)); await p.shot('歌');
};
