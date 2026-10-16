/* Approved prerecorded narration + timed foley; never fall back to robotic TTS. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('prologueDialog');
  const toggle=byId('prologueNarration'),pause=byId('prologueVoicePause'),replay=byId('prologueVoiceReplay'),status=byId('prologueVoiceStatus');
  if(!dialog||!toggle||!pause||!replay||!status)return;
  const supported=typeof window.Audio==='function',key='arkham-narration-v1';
  let enabled=true,state='idle',active=null,source='',revision=0;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(typeof saved==='boolean')enabled=saved;}catch(_){}
  function ui(message){
    toggle.textContent=supported?`旁白：${enabled?'开':'关'}`:'旁白：不可用';
    toggle.disabled=!supported;toggle.setAttribute('aria-pressed',String(enabled&&supported));
    pause.textContent=['loading','playing'].includes(state)?'暂停旁白':'继续旁白';
    pause.disabled=!supported||!enabled||!active||!['loading','playing','paused'].includes(state);
    replay.disabled=!supported||!enabled||!source;
    status.textContent=message;
  }
  function stop(){
    revision++;
    const old=active;active=null;state='idle';
    if(old){old.onended=null;old.onerror=null;try{old.pause();old.removeAttribute('src');old.load();}catch(_){}}
    ui('旁白已停止。');
  }
  function play(restart=false){
    if(!supported||!enabled||!source||!active||!dialog.open||document.hidden)return;
    const media=active,ticket=++revision;
    try{
      if(state==='error')media.load();
      if(restart)media.currentTime=0;
      state='loading';ui('正在加载配音与环境声…');
      Promise.resolve(media.play()).then(()=>{
        if(ticket!==revision||active!==media)return;
        state='playing';ui('正在播放 · 悬疑旁白与环境声');
      }).catch(()=>{
        if(ticket!==revision||active!==media)return;
        state='error';media.pause();ui('请点「重播本幕」播放配音；仍可继续阅读或跳过。');
      });
    }catch(_){state='error';ui('配音暂不可用，请点「重播本幕」重试。');}
  }
  function pauseAudio(message){
    revision++;if(active)active.pause();state='paused';ui(message);
  }
  window.prologueNarrator={
    scene(title,text,audio){
      stop();source=audio||'';
      if(!supported){ui('当前浏览器不支持配音，仍可完整阅读前序。');return;}
      if(!source){ui('本幕为文字与动画 · 配音在「书房异响」一幕');return;}
      try{
        const media=new window.Audio(source);active=media;media.preload='auto';media.volume=1;
        media.onended=()=>{if(active!==media)return;revision++;state='ended';ui('本幕配音已结束，可以继续下一幕。');};
        media.onerror=()=>{if(active!==media)return;revision++;media.pause();state='error';ui('配音加载失败，可点「重播本幕」重试或继续阅读。');};
      }catch(_){state='error';ui('无法加载配音，仍可完整阅读前序。');return;}
      if(!enabled){ui('旁白与配套环境声已关闭，可随时开启。');return;}
      if(document.hidden){state='paused';ui('页面在后台，配音已暂停。');return;}
      play();
    },stop
  };
  toggle.addEventListener('click',()=>{
    if(!supported||!dialog.open)return;
    enabled=!enabled;
    try{localStorage.setItem(key,JSON.stringify(enabled));}catch(_){}
    if(!enabled)pauseAudio('旁白与配套环境声已关闭，不影响其他操作音效。');
    else if(source)play();else ui('本幕为文字与动画 · 配音在「书房异响」一幕');
  });
  pause.addEventListener('click',()=>{
    if(!dialog.open||!enabled||!active)return;
    if(['loading','playing'].includes(state))pauseAudio('配音已暂停，继续时从当前位置播放。');
    else if(state==='paused')play();
  });
  replay.addEventListener('click',()=>play(true));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&dialog.open&&active&&['loading','playing'].includes(state))pauseAudio('页面切到后台，配音已暂停；返回后点「继续旁白」。');
  });
  dialog.addEventListener('close',stop);
  window.addEventListener?.('pagehide',stop);
  ui('固定配音与环境声 · 不使用系统朗读');
})();
