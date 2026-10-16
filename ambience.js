/* Original procedural sound design. No downloads, samples, voices or autoplay. */
(() => {
  'use strict';
  const toggle = document.getElementById('soundToggle');
  const slider = document.getElementById('soundVolume');
  const status = document.getElementById('soundStatus');
  const start = document.getElementById('startButton');
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!toggle || !slider || !status || !start) return;

  const key = 'arkham-ambience-v1';
  let enabled = true, volume = .18, entered = false, context = null;
  let master, compressor, noiseBuffer, ambienceTimer = null, revision = 0;
  const voices = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && typeof saved.enabled === 'boolean') enabled = saved.enabled;
    if (saved && Number.isFinite(saved.volume)) volume = Math.min(1, Math.max(0, saved.volume));
  } catch (_) { /* Storage may be unavailable in private browsing. */ }
  slider.value = String(Math.round(volume * 100));

  function save() {
    try { localStorage.setItem(key, JSON.stringify({ enabled, volume })); } catch (_) {}
  }
  function ui(state) {
    toggle.setAttribute('aria-pressed', String(enabled));
    const label = state === 'error' ? '音效：点击重试' : `环境音：${enabled ? '开' : '关'}`;
    toggle.innerHTML = `<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="assets/icons/ui.svg#${enabled && volume > 0 ? 'sound' : 'mute'}"></use></svg><span>${label}</span>`;
    toggle.dataset.audioState = state;
    status.textContent = ({ready:'进入游戏后播放',playing:'环境音播放中',paused:'后台已暂停',muted:'环境音已关闭',silent:'音量为零',error:'浏览器未允许播放，请点击重试',unsupported:'浏览器不支持音效'})[state];
  }
  function clearAmbienceTimer() {
    if (ambienceTimer !== null) clearTimeout(ambienceTimer);
    ambienceTimer = null;
  }
  function addVoice(source) {
    voices.add(source);
    source.onended = () => { source.disconnect(); voices.delete(source); };
    return source;
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

    // Eight seconds of softly filtered room air, smoothly looped at the seam.
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 8), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * .025) / 1.025;
      const edge = Math.min(1, i / (ctx.sampleRate * .08), (data.length - 1 - i) / (ctx.sampleRate * .08));
      data[i] = brown * 3 * edge;
    }
    const air = addVoice(ctx.createBufferSource());
    air.buffer = noiseBuffer;
    air.loop = true;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass'; lowpass.frequency.value = 430; lowpass.Q.value = .45;
    const airGain = ctx.createGain(); airGain.gain.value = .32;
    air.connect(lowpass).connect(airGain).connect(master); air.start();

    // Quiet, slightly beating low strings; never a loud jump-scare sting.
    [48, 48.35, 71.8].forEach((frequency, index) => {
      const osc = addVoice(ctx.createOscillator());
      osc.type = 'sine'; osc.frequency.value = frequency;
      const gain = ctx.createGain(); gain.gain.value = index === 2 ? .045 : .075;
      osc.connect(gain).connect(master); osc.start();
    });
  }
  function creak() {
    if (!context || context.state !== 'running' || !enabled || document.hidden || volume === 0) return;
    const t = context.currentTime;
    const oscillator = addVoice(context.createOscillator());
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(170 + Math.random() * 80, t);
    oscillator.frequency.exponentialRampToValueAtTime(90 + Math.random() * 25, t + 1.9);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(.065, t + .5);
    envelope.gain.exponentialRampToValueAtTime(.0001, t + 2.5);
    oscillator.connect(envelope).connect(master);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); voices.delete(oscillator); };
    oscillator.start(t); oscillator.stop(t + 2.6);
  }
  function schedule() {
    clearAmbienceTimer();
    if (!enabled || document.hidden || volume === 0 || !context || context.state !== 'running') return;
    ambienceTimer = setTimeout(() => { ambienceTimer = null; creak(); schedule(); }, 14000 + Math.random() * 16000);
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
      fadeVolume(); ui(volume === 0 ? 'silent' : 'playing'); schedule();
    } catch (_) {
      if (ticket !== revision) return;
      // A partially created graph must not survive a retry as a duplicate drone.
      const failed = context; context = null;
      if (failed) { try { await failed.close(); } catch (_) {} }
      voices.clear();
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
  slider.addEventListener('input', () => {
    const next = Number(slider.value);
    if (!Number.isFinite(next)) return;
    volume = Math.min(1, Math.max(0, next / 100));
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
    if(context) context.suspend().catch(() => {});
    ui(enabled ? 'ready' : 'muted');
  });
  document.addEventListener('visibilitychange', () => { if (entered) apply(); });
  window.addEventListener('pagehide', () => {
    ++revision; clearAmbienceTimer();
    if (context) context.suspend().catch(() => {});
  });
  window.addEventListener('pageshow', () => { if (entered) apply(); });
  ui(enabled ? 'ready' : 'muted');
})();
