const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'..','ambience.js'),'utf8');
test('本地MP3及四份原始CC0授权齐全，素材总量保持轻量',()=>{
  const dir=path.join(__dirname,'..','assets/audio/kenney'),names=['card-draw','card-play','chaos-token','hurt','sanity','phase','door','page','sanity-alert','attack-miss','monster-appear','clue-found'];let total=0;
  for(const name of names){const bytes=fs.readFileSync(path.join(dir,name+'.mp3'));assert.ok(bytes.length>1000,name);assert.ok(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255,name);total+=bytes.length;}
  assert.ok(total<150000);for(const pack of ['casino','impact','interface','rpg'])assert.match(fs.readFileSync(path.join(dir,`LICENSE-${pack}.txt`),'utf8'),/CC0|Creative Commons Zero/);
});
test('前序后的实际开局事件可启动音频，返回菜单会停止',async()=>{
  const g=setup();g.doc.listeners['arkham:game-started']();await g.flush();assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].state,'running');g.doc.listeners['arkham:menu']();await g.flush();assert.equal(g.contexts[0].state,'suspended');assert.equal(g.timers.size,0);
});
function setup({saved=null,unsupported=false,rejectResume=false,brokenStorage=false,samples=false,failFetch=false,failDecode=false,slowFetch=false}={}) {
  const contexts=[],timers=new Map(),nodes=new Map(),oscillators=[],gains=[]; let nextTimer=0;
  const fetches=[],played=[],pendingFetches=[];let decodes=0;
  function element(){return {value:'',dataset:{},textContent:'',listeners:{},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this.listeners[k]=fn}}}
  for(const id of ['startButton','soundToggle','soundVolume','soundStatus','ambientToggle','prologueAmbient','menuSoundToggle','menuAmbientToggle','menuSoundVolume'])nodes.set(id,element());
  const doc={hidden:false,listeners:{},getElementById:id=>nodes.get(id),addEventListener(k,fn){this.listeners[k]=fn}};
  function param(){return {value:0,events:[],cancelScheduledValues(){},setTargetAtTime(v){this.value=v},setValueAtTime(v,t){this.value=v;this.events.push([v,t])},linearRampToValueAtTime(v,t){this.value=v;this.events.push([v,t])},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push([v,t])}}}
  function audioNode(){return {gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){return this},disconnect(){},start(at){this.startedAt=at;if(this.buffer?.sample)played.push(this)},stop(at){if(at===undefined)this.stopped=true;else this.stopAt=at}}}
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=24;this.destination={};contexts.push(this)}
    createGain(){const gain=audioNode();gains.push(gain);return gain} createDynamicsCompressor(){return audioNode()}
    createBuffer(_,n){return {getChannelData(){return new Float32Array(n)}}}
    createBufferSource(){return audioNode()} createBiquadFilter(){return audioNode()} createOscillator(){const osc=audioNode();oscillators.push(osc);return osc}
    async decodeAudioData(){decodes++;if(failDecode)throw Error('bad audio');return{sample:true}}
    async resume(){if(rejectResume)throw Error('blocked');this.state='running'}
    async suspend(){this.state='suspended'} async close(){this.state='closed'}
  }
  const win={listeners:{},addEventListener(k,fn){this.listeners[k]=fn}};
  if(!unsupported)win.AudioContext=AudioContext;
  const storage={getItem(){if(brokenStorage)throw Error('private');return saved},setItem(k,v){if(brokenStorage)throw Error('private');saved=v}};
  const runtime={window:win,document:doc,localStorage:storage,Math,Number,JSON,Set,setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}};
  if(samples)runtime.fetch=url=>{fetches.push(url);const response={ok:!failFetch,arrayBuffer:async()=>new ArrayBuffer(8)};return slowFetch?new Promise(resolve=>pendingFetches.push(()=>resolve(response))):Promise.resolve(response)};
  vm.runInNewContext(source,runtime);
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  const fire=async(id,event='click')=>{nodes.get(id).listeners[event]();await flush()};
  return {nodes,contexts,timers,doc,win,flush,fire,fetches,played,pendingFetches,oscillators,gains,decodes:()=>decodes,saved:()=>JSON.parse(saved)};
}

test('移除持续噪声和超低频，氛围只保留有限时长的轻音垫',async()=>{
  const g=setup();await g.fire('startButton');assert.equal(g.oscillators.length,2);assert.deepEqual(g.oscillators.map(o=>o.frequency.value),[130.81,196]);assert.ok(g.oscillators.every(o=>o.type==='sine'&&o.stopAt<=6.5));
  assert.doesNotMatch(source,/Math\.random|noiseBuffer|\.loop\s*=\s*true|function creak/);
  for(const gain of g.gains.filter(n=>n.gain.events.length)){assert.ok(gain.gain.events.every(([value])=>value<=.055));assert.equal(gain.gain.events.at(-1)[0],0);}
});
test('每20秒最多一组音垫，有结束和留白，重复进入不叠加',async()=>{
  const g=setup();await g.fire('startButton');await g.fire('startButton');assert.equal(g.oscillators.length,2);g.oscillators.slice().forEach(o=>o.onended());g.contexts[0].currentTime=20;const[id,callback]=g.timers.entries().next().value;g.timers.delete(id);callback();assert.equal(g.oscillators.length,4);assert.ok(g.oscillators.slice(2).every(o=>o.startedAt>=20));assert.equal(g.timers.size,1);
});
test('只关氛围会停止音垫，保留操作音并保存偏好',async()=>{
  const g=setup({samples:true});await g.fire('startButton');await g.win.playGameSfx('card');await g.fire('ambientToggle');assert.ok(g.oscillators.every(o=>o.stopped));assert.equal(g.timers.size,0);assert.notEqual(g.played[0].stopped,true);await g.win.playGameSfx('card');assert.equal(g.played.length,2);assert.equal(g.saved().ambientEnabled,false);assert.equal(g.nodes.get('ambientToggle')['aria-pressed'],'false');assert.equal(g.nodes.get('prologueAmbient').textContent,'氛围：关');assert.equal(g.nodes.get('soundStatus').textContent,'仅播放操作音效');
});
test('关闭氛围偏好跨局恢复，不影响旧版音量静音设置',async()=>{
  const g=setup({saved:'{"enabled":true,"volume":0.3,"ambientEnabled":false}',samples:true});await g.fire('startButton');assert.equal(g.oscillators.length,0);assert.equal(g.timers.size,0);await g.win.playGameSfx('token');assert.equal(g.played.length,1);await g.fire('ambientToggle');assert.equal(g.oscillators.length,2);assert.equal(g.timers.size,1);assert.equal(g.nodes.get('soundVolume').value,'30');
});
test('静音、音量零和后台停止氛围声，不在后台持续生成',async()=>{
  const g=setup();await g.fire('startButton');await g.fire('soundToggle');assert.ok(g.oscillators.every(o=>o.stopped));await g.fire('soundToggle');g.nodes.get('soundVolume').value='0';await g.fire('soundVolume','input');assert.ok(g.oscillators.every(o=>o.stopped));g.nodes.get('soundVolume').value='20';await g.fire('soundVolume','input');g.doc.hidden=true;g.doc.listeners.visibilitychange();await g.flush();assert.equal(g.timers.size,0);assert.ok(g.oscillators.every(o=>o.stopped));
});

test('CC0短音效在用户进入后预加载，本地缓存不重复下载和解码',async()=>{
  const g=setup({samples:true});assert.equal(g.fetches.length,0);await g.fire('startButton');assert.equal(g.fetches.length,16);assert.ok(g.fetches.every(p=>p.startsWith('assets/audio/')&&/\.(mp3|wav)$/.test(p)));
  await g.win.playGameSfx('card');await g.win.playGameSfx('card');assert.equal(g.played.length,2);assert.equal(g.fetches.length,16);assert.equal(g.decodes(),16);
});
test('新增交互提示均可缓存播放且受静音控制，精神警示音不再过轻',async()=>{
 const g=setup({samples:true});await g.fire('startButton');for(const name of ['sanity','attackMiss','monster','clue','move'])await g.win.playGameSfx(name);assert.equal(g.played.length,5);assert.equal(g.fetches.length,16);assert.ok(g.fetches.includes('assets/audio/kenney/sanity-alert.mp3'));assert.equal(g.gains.at(-5).gain.value,.85);await g.fire('soundToggle');assert.ok(g.played.every(p=>p.stopped));for(const name of ['sanity','attackMiss','monster','clue','move'])await g.win.playGameSfx(name);assert.equal(g.played.length,5);
});

test('两类怪物专属素材本地可用，首次预载缓存并随静音停止',async()=>{
 const g=setup({samples:true});await g.fire('startButton');for(const name of ['ghoul','ghoulHunter']){const file=`assets/audio/${name==='ghoul'?'ghoul-servant-v1':'ghoul-hunter-v1'}.mp3`;assert.ok(g.fetches.includes(file));const bytes=fs.readFileSync(path.join(__dirname,'..',file));assert.ok(bytes.length>1000&&bytes.length<100000);await g.win.playGameSfx(name);assert.equal(g.gains.at(-1).gain.value,.65);}assert.equal(g.fetches.length,16);assert.equal(g.played.length,2);await g.fire('soundToggle');assert.ok(g.played.every(p=>p.stopped));await g.win.playGameSfx('ghoul');await g.win.playGameSfx('ghoulHunter');assert.equal(g.played.length,2);
});

test('成功与失败音效使用不同素材且可静音，加载一次后缓存',async()=>{
 const g=setup({samples:true});await g.fire('startButton');for(const name of ['testSuccess','testFailure'])await g.win.playGameSfx(name);assert.equal(g.played.length,2);for(const file of ['test-success','test-failure']){const cue='assets/audio/kenney/'+file+'.mp3';assert.ok(g.fetches.includes(cue));assert.ok(fs.statSync(path.join(__dirname,'..',cue)).size>1000);}assert.equal(g.fetches.length,16);await g.fire('soundToggle');for(const name of ['testSuccess','testFailure'])await g.win.playGameSfx(name);assert.equal(g.played.length,2);assert.ok(g.played.every(p=>p.stopped));
});

test('通关胜利使用选定的喜庆WAV，不替换普通成功音且遵循静音音量缓存',async()=>{
 const g=setup({samples:true});await g.fire('startButton');assert.ok(g.fetches.includes('assets/audio/victory-cheerful-v1.wav'));assert.ok(g.fetches.includes('assets/audio/kenney/test-success.mp3'));await g.win.playGameSfx('victory');assert.equal(g.played.length,1);assert.equal(g.gains.at(-1).gain.value,.7);assert.equal(g.fetches.length,16);await g.fire('soundToggle');assert.equal(g.played[0].stopped,true);await g.win.playGameSfx('victory');assert.equal(g.played.length,1);
});

test('静音、音量零、后台和菜单时不播放，正在播放的短音效被停止',async()=>{
  const g=setup({samples:true});await g.fire('startButton');await g.win.playGameSfx('hurt');await g.fire('soundToggle');assert.equal(g.played[0].stopped,true);await g.win.playGameSfx('hurt');assert.equal(g.played.length,1);
  await g.fire('soundToggle');await g.win.playGameSfx('token');g.nodes.get('soundVolume').value='0';await g.fire('soundVolume','input');assert.equal(g.played[1].stopped,true);await g.win.playGameSfx('token');assert.equal(g.played.length,2);
  g.nodes.get('soundVolume').value='20';await g.fire('soundVolume','input');await g.win.playGameSfx('move');g.doc.hidden=true;g.doc.listeners.visibilitychange();await g.flush();assert.equal(g.played[2].stopped,true);await g.win.playGameSfx('move');assert.equal(g.played.length,3);
  g.doc.hidden=false;g.doc.listeners.visibilitychange();await g.flush();await g.win.playGameSfx('phase');g.doc.listeners['arkham:menu']();await g.flush();assert.equal(g.played[3].stopped,true);await g.win.playGameSfx('phase');assert.equal(g.played.length,4);
});
test('异步加载期间静音后恢复，不补播过时操作音',async()=>{
  const g=setup({samples:true,slowFetch:true});await g.fire('startButton');const pending=g.win.playGameSfx('token');await g.fire('soundToggle');await g.fire('soundToggle');g.pendingFetches.forEach(resolve=>resolve());await pending;assert.equal(g.played.length,0);
});
test('最多同时4个操作音，页面隐藏停止残留音效',async()=>{
  const g=setup({samples:true});await g.fire('startButton');for(let i=0;i<6;i++)await g.win.playGameSfx('hurt');assert.equal(g.played.length,6);assert.equal(g.played.filter(p=>p.stopped).length,2);g.win.listeners.pagehide();assert.ok(g.played.every(p=>p.stopped));
});
test('下载失败、解码失败、无音频支持和未知音效均安全降级',async()=>{
  for(const option of [{failFetch:true},{failDecode:true},{unsupported:true}]){const g=setup({samples:true,...option});if(!option.unsupported)await g.fire('startButton');await g.win.playGameSfx('card');assert.equal(g.played.length,0);}
  const g=setup({samples:true});await g.fire('startButton');await g.win.playGameSfx('../evil');await g.win.playGameSfx('constructor');assert.equal(g.played.length,0);
});
test('首页声音设置同步保存偏好，不在未开局时自动播放',async()=>{
 const g=setup({saved:'{"enabled":false,"volume":0.35,"ambientEnabled":false}',samples:true});assert.equal(g.nodes.get('menuSoundVolume').value,'35');assert.equal(g.nodes.get('menuSoundToggle')['aria-pressed'],'false');assert.equal(g.nodes.get('menuAmbientToggle')['aria-pressed'],'false');assert.equal(g.contexts.length,0);await g.fire('soundToggle');assert.equal(g.nodes.get('menuSoundToggle')['aria-pressed'],'true');await g.fire('ambientToggle');assert.equal(g.nodes.get('menuAmbientToggle')['aria-pressed'],'true');g.nodes.get('soundVolume').value='42';await g.fire('soundVolume','input');assert.equal(g.nodes.get('menuSoundVolume').value,'42');assert.equal(g.saved().volume,.42);assert.equal(g.contexts.length,0);assert.equal(g.played.length,0);
});

test('打开页面不创建音频；点击进入后才播放，重复进入不叠加',async()=>{
  const g=setup();assert.equal(g.contexts.length,0);
  await g.fire('startButton');assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].state,'running');assert.equal(g.timers.size,1);
  await g.fire('startButton');assert.equal(g.contexts.length,1);assert.equal(g.timers.size,1);
});
test('静音停止音频和随机声响，重新开启复用音频图',async()=>{
  const g=setup();await g.fire('startButton');await g.fire('soundToggle');
  assert.equal(g.contexts[0].state,'suspended');assert.equal(g.timers.size,0);assert.equal(g.saved().enabled,false);
  await g.fire('soundToggle');assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].state,'running');assert.equal(g.timers.size,1);
});
test('音量为零停止随机声响，音量与静音偏好可恢复',async()=>{
  const g=setup();await g.fire('startButton');g.nodes.get('soundVolume').value='0';await g.fire('soundVolume','input');
  assert.equal(g.timers.size,0);assert.equal(g.nodes.get('soundToggle').dataset.audioState,'silent');assert.equal(g.saved().volume,0);
  const restored=setup({saved:'{"enabled":false,"volume":0.3}'});await restored.fire('startButton');
  assert.equal(restored.nodes.get('soundVolume').value,'30');assert.equal(restored.contexts.length,0);
});
test('切后台暂停，返回恢复；手动静音不会被返回页面取消',async()=>{
  const g=setup();await g.fire('startButton');g.doc.hidden=true;g.doc.listeners.visibilitychange();await g.flush();
  assert.equal(g.contexts[0].state,'suspended');assert.equal(g.timers.size,0);
  g.doc.hidden=false;g.doc.listeners.visibilitychange();await g.flush();assert.equal(g.contexts[0].state,'running');
  await g.fire('soundToggle');g.doc.listeners.visibilitychange();await g.flush();assert.equal(g.contexts[0].state,'suspended');
});
test('不支持音频或禁用本地存储时游戏不受影响',async()=>{
  const a=setup({unsupported:true});assert.equal(a.nodes.get('soundToggle').disabled,true);assert.equal(a.contexts.length,0);
  const b=setup({brokenStorage:true});await b.fire('startButton');assert.equal(b.contexts[0].state,'running');
});
test('播放失败释放音频并显示重试，不残留计时器',async()=>{
  const g=setup({rejectResume:true});await g.fire('startButton');
  assert.equal(g.nodes.get('soundToggle').dataset.audioState,'error');assert.equal(g.contexts[0].state,'closed');assert.equal(g.timers.size,0);
});

test('返回菜单暂停环境音，新一局复用音频图且图标跟随开关',async()=>{
  const g=setup();await g.fire('startButton');
  assert.match(g.nodes.get('soundToggle').innerHTML,/ui.svg#sound/);
  g.doc.listeners['arkham:menu']();await g.flush();
  assert.equal(g.contexts[0].state,'suspended');assert.equal(g.timers.size,0);
  assert.equal(g.nodes.get('soundToggle').dataset.audioState,'ready');
  await g.fire('startButton');assert.equal(g.contexts.length,1);assert.equal(g.contexts[0].state,'running');
  await g.fire('soundToggle');assert.match(g.nodes.get('soundToggle').innerHTML,/ui.svg#mute/);
});
