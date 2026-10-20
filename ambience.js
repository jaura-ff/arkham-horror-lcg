/* Sparse tonal ambience, without noise/drone layers; CC0 one-shots stay intact. */
(() => {
  'use strict';
  const toggle = document.getElementById('soundToggle');
  const slider = document.getElementById('soundVolume');
  const status = document.getElementById('soundStatus');
  const start = document.getElementById('startButton');
  const ambientToggle=document.getElementById('ambientToggle');
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!toggle || !slider || !status || !start) return;

  const key = 'arkham-ambience-v1';
  let enabled = true, ambientEnabled=true, volume = .18, entered = false, context = null;
  let master, compressor, ambienceTimer = null, revision = 0;
  const ambientVoices=new Map();
  function stopAmbient(){
    for(const [source,gain]of ambientVoices){try{source.stop()}catch(_){}source.disconnect();gain.disconnect();}
    ambientVoices.clear();
  }
  const clips=Object.fromEntries(Object.entries({draw:'card-draw',card:'card-play',token:'chaos-token',hurt:'hurt',sanity:'sanity-alert',phase:'phase',move:'door',page:'page',attackMiss:'attack-miss',monster:'monster-appear',clue:'clue-found'}).map(([name,file])=>[name,`assets/audio/kenney/${file}.mp3`]));
  Object.assign(clips,{ghoul:'assets/audio/ghoul-servant-v1.mp3',ghoulHunter:'assets/audio/ghoul-hunter-v1.mp3',testSuccess:'assets/audio/kenney/test-success.mp3',testFailure:'assets/audio/kenney/test-failure.mp3'});
  const cueGains={sanity:.85,attackMiss:.75,monster:.7,clue:.8,ghoul:.65,ghoulHunter:.65,testSuccess:.7,testFailure:.7};
  const buffers=new Map(),oneShots=new Map();
  let sfxRevision=0;
  function stopSfx(){
    sfxRevision++;
    for(const [source,gain] of oneShots){try{source.stop()}catch(_){}source.disconnect();gain.disconnect();}
    oneShots.clear();
  }
  function bufferFor(name){
    if(!buffers.has(name)){
      const ctx=context;
      const pending=fetch(clips[name]).then(response=>{
        if(!response.ok)throw new Error('Audio file unavailable');return response.arrayBuffer();
      }).then(data=>ctx.decodeAudioData(data)).catch(error=>{buffers.delete(name);throw error});
      buffers.set(name,pending);
    }
    return buffers.get(name);
  }
  window.playGameSfx=async name=>{
    if(!Object.hasOwn(clips,name) || !entered || !enabled || volume===0 || document.hidden || !context || context.state!=='running')return;
    const ctx=context,ticket=revision,effectTicket=sfxRevision;
    try{
      const buffer=await bufferFor(name);
      if(ctx!==context || ticket!==revision || effectTicket!==sfxRevision || !entered || !enabled || volume===0 || document.hidden || ctx.state!=='running')return;
      if(oneShots.size>=4){const [old,gain]=oneShots.entries().next().value;old.stop();old.disconnect();gain.disconnect();oneShots.delete(old);}
      const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=Object.hasOwn(cueGains,name)?cueGains[name]:.8;
      source.connect(gain).connect(master);oneShots.set(source,gain);
      source.onended=()=>{source.disconnect();gain.disconnect();oneShots.delete(source)};source.start();
    }catch(_){ /* Missing/blocked media must never interrupt gameplay. */ }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved.enabled === 'boolean') enabled = saved.enabled;
    if(saved && typeof saved.ambientEnabled==='boolean')ambientEnabled=saved.ambientEnabled;
    if (saved && Number.isFinite(saved.volume)) volume = Math.min(1, Math.max(0, saved.volume));
  } catch (_) { /* Storage may be unavailable in private browsing. */ }
  slider.value = String(Math.round(volume * 100));

  function save() {
    try { localStorage.setItem(key, JSON.stringify({ enabled, volume, ambientEnabled })); } catch (_) {}
  }
  function ui(state) {
    toggle.setAttribute('aria-pressed', String(enabled));
    const label = state === 'error' ? '音效：点击重试' : `音效：${enabled ? '开' : '关'}`;
    toggle.innerHTML = `<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="assets/icons/ui.svg#${enabled && volume > 0 ? 'sound' : 'mute'}"></use></svg><span>${label}</span>`;
    toggle.dataset.audioState = state;
    status.textContent = ({ready:'进入游戏后播放',playing:ambientEnabled?'轻氛围与操作音效已开启':'仅播放操作音效',paused:'后台已暂停',muted:'全部音效已关闭',silent:'音量为零',error:'浏览器未允许播放，请点击重试',unsupported:'浏览器不支持音效'})[state];
    const prologue=document.getElementById('prologueSound');
    if(prologue){prologue.textContent=label;prologue.disabled=state==='unsupported';prologue.setAttribute('aria-pressed',String(enabled));}
    for(const button of [ambientToggle,document.getElementById('prologueAmbient')]){
      if(button){button.textContent=`氛围：${ambientEnabled?'开':'关'}`;button.disabled=state==='unsupported';button.setAttribute('aria-pressed',String(ambientEnabled));}
    }
  }
  function clearAmbienceTimer() {
    if (ambienceTimer !== null) clearTimeout(ambienceTimer);
    ambienceTimer = null;
  }
  function build() {
    const ctx = new Audio();
    context = ctx;
    master = ctx.createGain();
    master.gain.value = 0;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = .015;
    compressor.release.value = .4;
    master.connect(compressor).connect(ctx.destination);

  }
  function softPad() {
    if(!entered || !ambientEnabled || !context || context.state!=='running' || !enabled || document.hidden || volume===0 || ambientVoices.size)return;
    const t=context.currentTime;
    // Stable mid-low tones, no beating sub-bass, noise buffer or pitch sweeps.
    [130.81,196].forEach((frequency,index)=>{
      const source=context.createOscillator(),gain=context.createGain(),begin=t+index*.3;
      source.type='sine';source.frequency.value=frequency;
      gain.gain.setValueAtTime(0,begin);
      gain.gain.linearRampToValueAtTime(index===0?.055:.025,begin+1.8);
      gain.gain.exponentialRampToValueAtTime(.0001,begin+5.5);
      gain.gain.linearRampToValueAtTime(0,begin+6);
      source.connect(gain).connect(master);ambientVoices.set(source,gain);
      source.onended=()=>{source.disconnect();gain.disconnect();ambientVoices.delete(source)};
      source.start(begin);source.stop(begin+6.1);
    });
  }
  function schedule() {
    clearAmbienceTimer();
    if (!enabled || !ambientEnabled || document.hidden || volume === 0 || !context || context.state !== 'running') return;
    ambienceTimer = setTimeout(() => { ambienceTimer = null; softPad(); schedule(); }, 20000);
  }
  function fadeVolume() {
    if (!master || !context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(enabled && !document.hidden ? volume * .65 : 0, context.currentTime, .12);
  }
  async function apply() {
    const ticket = ++revision;
    clearAmbienceTimer();
    if (!Audio) return;
    if (!entered) { ui(enabled ? 'ready' : 'muted'); return; }
    if (!enabled || document.hidden) {
      stopSfx();
      stopAmbient();
      fadeVolume();
      if (context && context.state !== 'closed') {
        try { await context.suspend(); } catch (_) {}
      }
      if (ticket === revision) ui(enabled ? 'paused' : 'muted');
      return;
    }
    try {
      if (!context || context.state === 'closed') build();
      await context.resume();
      if (ticket !== revision) return;
      if (context.state !== 'running') throw new Error('Audio suspended');
      fadeVolume(); ui(volume === 0 ? 'silent' : 'playing'); softPad();schedule();
      if(typeof fetch==='function')Object.keys(clips).forEach(name=>{bufferFor(name).catch(()=>{});});
    } catch (_) {
      if (ticket !== revision) return;
      // A partially created graph must not survive a retry as a duplicate drone.
      const failed = context; context = null;
      if (failed) { try { await failed.close(); } catch (_) {} }
      stopAmbient();
      stopSfx();buffers.clear();
      ui('error');
    }
  }
  if (!Audio) {
    enabled = false; toggle.disabled = true; slider.disabled = true; ui('unsupported'); return;
  }
  toggle.addEventListener('click', () => {
    enabled = toggle.dataset.audioState === 'error' ? true : !enabled;
    save(); apply();
  });
  ambientToggle?.addEventListener('click',()=>{
    ambientEnabled=!ambientEnabled;save();stopAmbient();clearAmbienceTimer();
    if(ambientEnabled){softPad();schedule();}
    ui(toggle.dataset.audioState||'ready');
  });
  slider.addEventListener('input', () => {
    const next = Number(slider.value);
    if (!Number.isFinite(next)) return;
    volume = Math.min(1, Math.max(0, next / 100));
    if(volume===0){stopSfx();stopAmbient();}
    save(); fadeVolume();
    if (context && context.state === 'running' && enabled && !document.hidden) {
      ui(volume === 0 ? 'silent' : 'playing'); schedule();
    }
  });
  start.addEventListener('click', () => { entered = true; apply(); });
  document.addEventListener('arkham:game-started', () => { entered = true; apply(); });
  document.addEventListener('arkham:menu', () => {
    entered = false;
    ++revision;
    clearAmbienceTimer();
    stopSfx();
    stopAmbient();
    if(context) context.suspend().catch(() => {});
    ui(enabled ? 'ready' : 'muted');
  });
  document.addEventListener('visibilitychange', () => { if (entered) apply(); });
  window.addEventListener('pagehide', () => {
    ++revision; clearAmbienceTimer();stopSfx();stopAmbient();
    if (context) context.suspend().catch(() => {});
  });
  window.addEventListener('pageshow', () => { if (entered) apply(); });
  ui(enabled ? 'ready' : 'muted');
})();
