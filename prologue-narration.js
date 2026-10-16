/* Optional device Chinese narration. No recording, microphone or API key. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('prologueDialog');
  const toggle=byId('prologueNarration'),pause=byId('prologueVoicePause'),replay=byId('prologueVoiceReplay'),status=byId('prologueVoiceStatus');
  if(!dialog||!toggle||!pause||!replay||!status)return;
  const synth=window.speechSynthesis,Utterance=window.SpeechSynthesisUtterance;
  const supported=!!(synth&&Utterance),key='arkham-narration-v1';
  let enabled=true,state='idle',sentences=[],index=0,revision=0,active=null,waiting=false;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(typeof saved==='boolean')enabled=saved;}catch(_){}
  function ui(message){
    toggle.textContent=supported?`旁白：${enabled?'开':'关'}`:'旁白：不可用';
    toggle.disabled=!supported;toggle.setAttribute('aria-pressed',String(enabled&&supported));
    pause.textContent=state==='speaking'?'暂停旁白':'继续旁白';
    pause.disabled=!supported||!enabled||!['speaking','paused'].includes(state);
    replay.disabled=!supported||!enabled;
    status.textContent=message;
  }
  function cancel(){
    revision++;waiting=false;
    const owned=active;active=null;
    // Invalidate callbacks before cancel: some engines synchronously emit errors.
    if(owned)try{synth.cancel();}catch(_){}
  }
  function voice(){
    const voices=synth.getVoices();
    const chinese=voices.filter(v=>/^zh(?:-|_)/i.test(v.lang));
    return chinese.find(v=>/^zh[-_]CN$/i.test(v.lang)&&v.localService)||chinese.find(v=>/^zh[-_]CN$/i.test(v.lang))||chinese.find(v=>!/^zh[-_]HK$/i.test(v.lang));
  }
  function speak(){
    if(!supported||!enabled||!dialog.open||document.hidden)return;
    if(index>=sentences.length){state='ended';ui('本幕旁白已结束，可以继续下一幕。');return;}
    const ticket=revision;
    try{
      const selected=voice();
      if(!selected){
        state='waiting';waiting=true;
        ui('未检测到中文语音。可点「重播本幕」重试，或继续阅读文字。');return;
      }
      waiting=false;
      const utterance=new Utterance(sentences[index]);active=utterance;
      utterance.voice=selected;utterance.lang=selected.lang;utterance.rate=.92;utterance.pitch=.9;utterance.volume=.85;
      state='speaking';ui('正在朗读本幕 · 设备中文语音');
      utterance.onend=()=>{
        if(ticket!==revision||active!==utterance)return;
        active=null;index++;speak();
      };
      utterance.onerror=()=>{
        if(ticket!==revision||active!==utterance)return;
        active=null;state='error';waiting=false;
        ui('旁白暂未播放，请点「重播本幕」重试；不影响继续游戏。');
      };
      synth.speak(utterance);
    }catch(_){
      cancel();state='error';ui('旁白暂不可用，可重试或继续阅读文字。');
    }
  }
  function stop(){cancel();state='idle';ui(enabled?'旁白已停止。':'旁白已关闭。');}
  window.prologueNarrator={
    scene(title,text){
      cancel();index=0;
      // Short utterances avoid long-speech cutoffs; resume repeats only this sentence.
      sentences=(`${title}。${text}`).match(/[^。！？；\n]+[。！？；]?/g)||[];
      state='idle';
      if(!supported){ui('当前浏览器不支持旁白，仍可完整阅读前序。');return;}
      if(!enabled){ui('旁白已关闭，可随时开启。');return;}
      if(document.hidden){state='paused';ui('页面在后台，旁白已暂停。');return;}
      speak();
    },stop
  };
  toggle.addEventListener('click',()=>{
    if(!supported||!dialog.open)return;
    enabled=!enabled;
    try{localStorage.setItem(key,JSON.stringify(enabled));}catch(_){}
    cancel();index=0;state='idle';
    if(enabled)speak();else ui('旁白已关闭，不影响动画和操作音效。');
  });
  pause.addEventListener('click',()=>{
    if(!dialog.open||!enabled)return;
    if(state==='speaking'){
      cancel();state='paused';ui('旁白已暂停，继续时从当前句开头朗读。');
    }else if(state==='paused')speak();
  });
  replay.addEventListener('click',()=>{
    if(!dialog.open||!enabled)return;
    cancel();index=0;speak();
  });
  if(supported)synth.addEventListener?.('voiceschanged',()=>{
    if(waiting&&dialog.open&&enabled&&!document.hidden)speak();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&dialog.open&&['speaking','waiting'].includes(state)){
      cancel();state='paused';ui('页面切到后台，旁白已暂停；返回后点「继续旁白」。');
    }
  });
  dialog.addEventListener('close',stop);
  window.addEventListener?.('pagehide',stop);
  ui(supported?'进入前序后朗读 · 旁白独立开关':'当前浏览器不支持旁白，仍可完整阅读前序。');
})();
