/* Approved v2 dry voice; independent native narration controls, like the prologue. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  let active=null,timer=null,revision=0;
  function clearDelay(){if(timer!==null)clearTimeout(timer);timer=null;}
  function visible(media){return media===active&&media.isConnected&&byId('modal').classList.contains('open')&&!document.hidden;}
  function status(text){const el=byId('endingVoiceStatus');if(el)el.textContent=text;}
  window.stopEndingNarration=()=>{
    clearDelay();revision++;const old=active;active=null;
    if(old){try{old.pause();old.removeAttribute('src');old.load();}catch(_){}}
  };
  window.beginEndingNarration=()=>{
    const media=byId('endingNarration');if(!media||active===media)return;
    window.stopEndingNarration();active=media;
    if(typeof media.play!=='function'){status('浏览器不支持配音播放，仍可阅读结局。');return;}
    media.volume=1;media.loop=false;
    media.addEventListener('play',()=>{if(media!==active)return;clearDelay();if(!visible(media)){media.pause();return;}status('正在播放结局旁白 · 可暂停或调节独立音量。');});
    media.addEventListener('ended',()=>{if(media===active)status('旁白已结束，可拖回开头重播，或关闭结局。');});
    media.addEventListener('error',()=>{if(media===active){clearDelay();status('配音暂时无法加载，仍可阅读结局或刷新后重试。');}});
    let enabled=true;try{enabled=JSON.parse(localStorage.getItem('arkham-narration-v1')||'true')!==false;}catch(_){}
    if(!enabled){status('旁白自动播放已关闭；可点击播放试听。');return;}
    if(document.hidden){status('页面在后台，返回后可点击播放旁白。');return;}
    const ticket=revision;
    timer=setTimeout(()=>{
      timer=null;if(ticket!==revision||!visible(media))return;
      try{Promise.resolve(media.play()).then(()=>{if(ticket!==revision||!visible(media))media.pause();}).catch(()=>{if(ticket===revision&&visible(media))status('浏览器阻止了自动播放，请点击上方播放按钮。');});}
      catch(_){if(ticket===revision)status('请点击上方播放按钮试听结局旁白。');}
    },2700);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){clearDelay();revision++;active.pause();status('页面切到后台，旁白已暂停；返回后点击播放继续。');}});
  document.addEventListener('arkham:menu',window.stopEndingNarration);
  document.addEventListener('arkham:game-started',window.stopEndingNarration);
  window.addEventListener('pagehide',window.stopEndingNarration);
  const modal=byId('modal');if(modal)new MutationObserver(()=>{
    if(active&&(!active.isConnected||!modal.classList.contains('open')))window.stopEndingNarration();
  }).observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
