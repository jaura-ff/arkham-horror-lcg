/* User-supplied MiniMax recordings. Presentation only; never generate speech. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),key='arkham-scene-narration-v1';
  const files={study:'study',hallway:'hallway',attic:'attic',stairs:'stairs',cellar:'cellar',altar:'altar',intro:'chapter-two'};
  let enabled=true,owner=null,seen=new Set(),job=null,timer=null,revision=0;
  try{enabled=JSON.parse(localStorage.getItem(key)??localStorage.getItem('arkham-narration-v1')??'true')!==false;}catch(_){}
  function status(text){const node=byId('sceneNarrationStatus');if(node&&node.textContent!==text)node.textContent=text;}
  function controls(){const toggle=byId('sceneNarrationToggle');if(toggle){toggle.textContent=`场景旁白：${enabled?'开':'关'}`;toggle.setAttribute('aria-pressed',String(enabled));}const stop=byId('sceneNarrationStop');if(stop)stop.disabled=!job;}
  function clearTimer(){if(timer!==null)clearTimeout(timer);timer=null;}
  function stop(){
    revision++;clearTimer();const old=job;job=null;
    // An interrupted location is consumed for this game, including a play()
    // request still loading. Settings or returning to the room must not replay it.
    if(old?.kind==='location'&&['playing','loading'].includes(old.state))seen.add(old.id);
    if(old?.media){try{old.media.pause();old.media.removeAttribute('src');old.media.load();}catch(_){}}
    controls();
  }
  function reset(){stop();owner=null;seen.clear();status('进入新地点时播放场景配音');}
  function valid(j){return j===job&&S===j.owner&&!S.gameOver&&byId('game')?.style.display!=='none'&&(j.kind==='intro'?S.chapterIntro&&byId('modal')?.classList.contains('open')&&byId('chapterNarrationAnchor'):S.location===j.id&&!S.chapterIntro);}
  function blocked(j){return document.hidden||(j.kind==='location'&&(S.test||S.pendingMove||pendingAction||pendingNavigation||phaseTransitionActive||byId('game')?.inert||byId('modal')?.classList.contains('open')||document.querySelector('dialog[open]')));}
  function schedule(){
    if(timer!==null||!job)return;
    const ticket=revision;
    timer=setTimeout(()=>{if(ticket!==revision)return;timer=null;audit();},200);
  }
  function handleBlock(j){
    if(j.kind==='location'&&['playing','loading'].includes(j.state)){
      stop();status('地点旁白已中断，不再自动续播。');return;
    }
    // First visits may wait before playback has started. Chapter introductions
    // keep their existing background-pause behavior; this rule is location-only.
    if(j.media&&['playing','loading'].includes(j.state)){
      revision++;clearTimer();j.media.pause();j.state='paused';
    }
    schedule();
  }
  function play(j,fromGesture=false){
    if(!valid(j)){stop();return;}
    if(!enabled){stop();return;}
    if(blocked(j)){handleBlock(j);return;}
    if(j.state==='playing'||j.state==='loading'||(j.state==='blocked'&&!fromGesture))return;
    clearTimer();const ticket=revision;
    try{
      if(!j.media){
        j.media=new window.Audio(`assets/audio/minimax-${files[j.id]}-v1.mp3`);
        j.media.preload='auto';j.media.volume=1;j.media.loop=false;
        j.media.addEventListener('ended',()=>{if(j===job){stop();status('场景旁白已结束。');}});
        j.media.addEventListener('error',()=>{if(j===job){stop();status('配音暂时无法加载，仍可继续游戏。');}});
      }
      j.state='loading';
      Promise.resolve(j.media.play()).then(()=>{
        if(!valid(j)){j.media.pause();return;}
        if(ticket!==revision)return;
        if(blocked(j)){handleBlock(j);return;}
        j.state='playing';if(j.kind==='location')seen.add(j.id);
        status(j.kind==='intro'?'正在播放：第二幕 · 地板之下':`正在播放：${LOCATIONS[j.id].name}`);
      }).catch(()=>{if(ticket===revision&&valid(j)){j.state='blocked';status('浏览器暂缓了旁白，点击游戏页面后重试；仍可继续阅读。');}});
    }catch(_){stop();status('当前浏览器无法播放配音，仍可继续游戏。');}
  }
  function audit(){
    if(!job)return;
    if(!valid(job)){stop();return;}
    if(blocked(job)){
      handleBlock(job);return;
    }
    play(job);
  }
  function start(id,kind){
    if(!S||S.gameOver||!files[id])return;
    if(owner!==S){reset();owner=S;}
    if(job?.id===id&&job.owner===S)return;
    stop();if(!enabled||(kind==='location'&&seen.has(id)))return;
    job={id,kind,owner:S,state:'pending',media:null};controls();play(job);
  }
  window.gameNarrator={
    enter(id){if(S?.location!==id)return;if(!files[id]){stop();status('当前地点暂未配置旁白，请阅读场景文字。');return;}start(id,'location');},
    intro(){if(S?.chapter!==2||!S.chapterIntro)return;start('intro','intro');},
    closeIntro(){if(job?.kind==='intro')stop();},stop,reset
  };
  byId('sceneNarrationToggle')?.addEventListener('click',()=>{
    enabled=!enabled;try{localStorage.setItem(key,JSON.stringify(enabled));}catch(_){}
    if(!enabled){stop();status('场景旁白已关闭。');}
    else if(S&&!S.gameOver){if(S.chapterIntro)window.gameNarrator.intro();else window.gameNarrator.enter(S.location);}
    controls();
  });
  byId('sceneNarrationStop')?.addEventListener('click',()=>{stop();status('当前旁白已停止。');});
  document.addEventListener('click',()=>{if(job?.state==='blocked')play(job,true);});
  document.addEventListener('visibilitychange',audit);
  document.addEventListener('arkham:phase-ready',audit);
  document.addEventListener('arkham:menu',reset);
  window.addEventListener('pagehide',stop);
  if(typeof MutationObserver!=='undefined')new MutationObserver(audit).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','inert','class','style']});
  controls();
})();
