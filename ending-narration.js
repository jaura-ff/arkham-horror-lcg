/* Approved v2 voice accompanies the ending text without a visible player. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  let active=null,timer=null,revision=0,resumeOnVisible=false,autoEnabled=false;
  function clearDelay(){if(timer!==null)clearTimeout(timer);timer=null;}
  function visible(media){return media===active&&media.isConnected&&byId('modal').classList.contains('open')&&!document.hidden;}
  function status(text,notice=false){const el=byId('endingVoiceStatus');if(el){el.textContent=text;el.hidden=!notice;}}
  function play(media,ticket){
    if(ticket!==revision||!visible(media))return;
    try{Promise.resolve(media.play()).then(()=>{if(ticket!==revision||!visible(media))media.pause();}).catch(()=>{if(ticket===revision&&visible(media))status('浏览器未允许旁白自动播放，仍可阅读结局文字。',true);});}
    catch(_){if(ticket===revision)status('旁白暂时无法播放，仍可阅读结局文字。',true);}
  }
  window.stopEndingNarration=()=>{
    clearDelay();revision++;resumeOnVisible=false;autoEnabled=false;const old=active;active=null;
    if(old){try{old.pause();old.removeAttribute('src');old.load();}catch(_){}}
  };
  window.beginEndingNarration=()=>{
    const media=byId('endingNarration');if(!media||active===media)return;
    window.stopEndingNarration();active=media;
    if(typeof media.play!=='function'){status('浏览器不支持配音播放，仍可阅读结局。',true);return;}
    media.volume=1;media.loop=false;
    media.addEventListener('play',()=>{if(media!==active)return;clearDelay();if(!visible(media)){media.pause();return;}status('正在播放结局旁白。');});
    media.addEventListener('ended',()=>{if(media===active){resumeOnVisible=false;status('旁白已结束。');}});
    media.addEventListener('error',()=>{if(media===active){clearDelay();resumeOnVisible=false;status('配音暂时无法加载，仍可阅读结局。',true);}});
    let enabled=true;try{enabled=JSON.parse(localStorage.getItem('arkham-narration-v1')||'true')!==false;}catch(_){}
    autoEnabled=enabled;
    if(!enabled){status('旁白自动播放已关闭。');return;}
    if(document.hidden){resumeOnVisible=true;status('页面在后台，返回后播放旁白。');return;}
    const ticket=revision;
    timer=setTimeout(()=>{
      timer=null;if(ticket!==revision||!visible(media))return;
      play(media,ticket);
    },2700);
  };
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    if(document.hidden){resumeOnVisible=autoEnabled&&(resumeOnVisible||timer!==null||(!active.paused&&!active.ended));clearDelay();revision++;active.pause();status('页面切到后台，旁白已暂停。');}
    else if(resumeOnVisible){resumeOnVisible=false;play(active,revision);}
  });
  document.addEventListener('arkham:menu',window.stopEndingNarration);
  document.addEventListener('arkham:game-started',window.stopEndingNarration);
  window.addEventListener('pagehide',window.stopEndingNarration);
  const modal=byId('modal');if(modal)new MutationObserver(()=>{
    if(active&&(!active.isConnected||!modal.classList.contains('open')))window.stopEndingNarration();
  }).observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
