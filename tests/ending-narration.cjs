const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'ending-narration.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup({saved='true',hidden=false,reject=false}={}){
 const events={},nodes=new Map(),timers=new Map(),windowEvents={};let next=0,observe;
 const media={isConnected:true,src:'assets/audio/ending-narration-natural-v2.mp3',listeners:{},plays:0,pauses:0,loads:0,addEventListener(k,f){this.listeners[k]=f},pause(){this.pauses++;this.paused=true},play(){this.plays++;this.paused=false;this.listeners.play?.();return reject?Promise.reject(Error('blocked')):Promise.resolve()},load(){this.loads++},removeAttribute(k){delete this[k]}};
 const modal={open:true,classList:{contains:()=>modal.open}},status={textContent:''};nodes.set('modal',modal);nodes.set('endingNarration',media);nodes.set('endingVoiceStatus',status);
 const ctx={document:{hidden,getElementById:id=>nodes.get(id),addEventListener:(k,f)=>events[k]=f},localStorage:{getItem:()=>saved},window:{addEventListener:(k,f)=>windowEvents[k]=f},setTimeout(f,ms){const id=++next;timers.set(id,{f,ms});return id},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(f){observe=f}observe(){}}};vm.runInNewContext(source,ctx);
 return{ctx,events,media,modal,status,timers,windowEvents,nodes,mutate:()=>observe(),begin:()=>ctx.window.beginEndingNarration(),stop:()=>ctx.window.stopEndingNarration(),async fire(){for(const [id,t]of [...timers]){timers.delete(id);t.f();}for(let i=0;i<5;i++)await Promise.resolve();}};
}
test('结局原始声音与选定素材本地存在，隐藏音频只在胜利出现并有明确关闭钩子',()=>{
 const wav=fs.readFileSync(path.join(root,'assets/audio/victory-cheerful-v1.wav')),mp3=fs.readFileSync(path.join(root,'assets/audio/ending-narration-natural-v2.mp3'));
 assert.equal(wav.subarray(0,4).toString(),'RIFF');assert.equal(wav.readUInt32LE(24),44100);assert.equal(crypto.createHash('sha256').update(wav).digest('hex'),'092794ac6b4a6d0f9cad7de3e4bb48b5d0e8d864b6f4ba470bbdf41e9a1de8be');
 assert.equal(crypto.createHash('sha256').update(mp3).digest('hex'),'c6225b73e0e59c62d70ade78f145f97f75efea11d08076cd17874c7c8010a5c3');assert.match(html,/win&&S.chapter!==2\?'<div class="ending-voice"/);assert.match(html,/<audio id="endingNarration" hidden/);assert.doesNotMatch(html,/<audio id="endingNarration"[^>]*controls/);assert.match(html,/typeof stopEndingNarration==='function'/);assert.match(html,/ending-narration.js\?v=text-voice-2/);
});
test('成功提示后延迟2.7秒播放原速干声，重复启动不重叠，无额外游戏操作',async()=>{
 const g=setup();g.begin();g.begin();assert.equal(g.media.plays,0);assert.equal(g.timers.size,1);assert.equal([...g.timers.values()][0].ms,2700);await g.fire();assert.equal(g.media.plays,1);assert.equal(g.media.volume,1);assert.equal(g.media.loop,false);assert.equal(g.media.playbackRate,undefined);assert.match(g.status.textContent,/正在播放/);assert.doesNotMatch(source,/speechSynthesis|playbackRate|requestAction|resolveTest|S\./);
});
test('旁白关闭偏好保持静默，不再提示点击不存在的播放按钮',async()=>{
 const g=setup({saved:'false'});g.begin();await g.fire();assert.equal(g.media.plays,0);assert.match(g.status.textContent,/自动播放已关闭/);assert.equal(g.status.hidden,true);assert.doesNotMatch(g.status.textContent,/点击播放/);
});
test('关闭或返回菜单清除延迟和音频，不在之后补播',async()=>{
 for(const end of [g=>g.stop(),g=>g.events['arkham:menu'](),g=>{g.modal.open=false;g.mutate()},g=>{g.media.isConnected=false;g.mutate()}]){
  const g=setup();g.begin();end(g);assert.equal(g.timers.size,0);await g.fire();assert.equal(g.media.plays,0);assert.equal(g.media.src,undefined);assert.ok(g.media.pauses>0);
 }
});
test('切后台暂停，返回自动继续；页面退出停止',async()=>{
 const g=setup();g.begin();await g.fire();g.ctx.document.hidden=true;g.events.visibilitychange();assert.equal(g.media.paused,true);g.ctx.document.hidden=false;g.events.visibilitychange();assert.equal(g.media.plays,2);g.windowEvents.pagehide();assert.equal(g.media.src,undefined);
 const h=setup({hidden:true});h.begin();assert.equal(h.timers.size,0);assert.match(h.status.textContent,/页面在后台/);
});
test('浏览器拒绝自动播放、加载错误和不可用播放器不影响结局阅读',async()=>{
 const g=setup({reject:true});g.begin();await g.fire();assert.match(g.status.textContent,/未允许旁白自动播放/);g.media.listeners.error();assert.match(g.status.textContent,/无法加载/);
 const h=setup();delete h.media.play;h.begin();assert.match(h.status.textContent,/不支持配音/);assert.equal(h.timers.size,0);
});
test('正常播放和结束不显示状态栏，异常仅显示文字而不要求操作播放器',async()=>{
 const g=setup();g.begin();await g.fire();assert.equal(g.status.hidden,true);g.media.listeners.ended();assert.equal(g.status.hidden,true);
 const h=setup({reject:true});h.begin();await h.fire();assert.equal(h.status.hidden,false);assert.doesNotMatch(h.status.textContent,/点击|按钮|上方/);
});
test('旁白已结束或偏好关闭时，切换前后台不会重新播放',async()=>{
 for(const saved of ['true','false']){const g=setup({saved});g.begin();await g.fire();if(saved==='true'){g.media.ended=true;g.media.paused=true;g.media.listeners.ended();}
 const plays=g.media.plays;g.ctx.document.hidden=true;g.events.visibilitychange();g.ctx.document.hidden=false;g.events.visibilitychange();assert.equal(g.media.plays,plays);}
});
test('后台待播返回后自动播放，但关闭结局后不能恢复',async()=>{
 const g=setup({hidden:true});g.begin();g.ctx.document.hidden=false;g.events.visibilitychange();await g.fire();assert.equal(g.media.plays,1);
 g.ctx.document.hidden=true;g.events.visibilitychange();g.stop();g.ctx.document.hidden=false;g.events.visibilitychange();assert.equal(g.media.plays,1);
});
