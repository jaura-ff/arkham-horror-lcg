const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'..','ambience.js'),'utf8');
function setup({saved=null,unsupported=false,rejectResume=false,brokenStorage=false}={}) {
  const contexts=[],timers=new Map(),nodes=new Map(); let nextTimer=0;
  function element(){return {value:'',dataset:{},textContent:'',listeners:{},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this.listeners[k]=fn}}}
  for(const id of ['startButton','soundToggle','soundVolume','soundStatus'])nodes.set(id,element());
  const doc={hidden:false,listeners:{},getElementById:id=>nodes.get(id),addEventListener(k,fn){this.listeners[k]=fn}};
  function param(){return {value:0,cancelScheduledValues(){},setTargetAtTime(v){this.value=v},setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v}}}
  function audioNode(){return {gain:param(),frequency:param(),Q:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){return this},disconnect(){},start(){},stop(){}}}
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=24;this.destination={};contexts.push(this)}
    createGain(){return audioNode()} createDynamicsCompressor(){return audioNode()}
    createBuffer(_,n){return {getChannelData(){return new Float32Array(n)}}}
    createBufferSource(){return audioNode()} createBiquadFilter(){return audioNode()} createOscillator(){return audioNode()}
    async resume(){if(rejectResume)throw Error('blocked');this.state='running'}
    async suspend(){this.state='suspended'} async close(){this.state='closed'}
  }
  const win={listeners:{},addEventListener(k,fn){this.listeners[k]=fn}};
  if(!unsupported)win.AudioContext=AudioContext;
  const storage={getItem(){if(brokenStorage)throw Error('private');return saved},setItem(k,v){if(brokenStorage)throw Error('private');saved=v}};
  vm.runInNewContext(source,{window:win,document:doc,localStorage:storage,Math,Number,JSON,Set,setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id},clearTimeout(id){timers.delete(id)}});
  const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
  const fire=async(id,event='click')=>{nodes.get(id).listeners[event]();await flush()};
  return {nodes,contexts,timers,doc,win,flush,fire,saved:()=>JSON.parse(saved)};
}
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
