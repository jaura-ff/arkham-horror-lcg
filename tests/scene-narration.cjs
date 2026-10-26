const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=fs.readFileSync(path.join(root,'scene-narration.js'),'utf8');
function setup({saved='true',reject=false,unsupported=false}={}){
 const nodes=new Map(),events={},windowEvents={},timers=new Map(),media=[];let seq=0,now=0,observer;
 const node=id=>{if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,textContent:'',style:{display:id==='game'?'block':''},inert:false,disabled:false,listeners:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute(k,v){this[k]=v},addEventListener(k,f){this.listeners[k]=f}})}return nodes.get(id)};
 const doc={hidden:false,body:{},nativeOpen:false,getElementById:node,querySelector:()=>doc.nativeOpen?{}:null,addEventListener(k,f){events[k]=f}};
 class Audio{constructor(src){this.src=src;this.listeners={};this.plays=0;this.pauses=0;this.paused=true;media.push(this)}addEventListener(k,f){this.listeners[k]=f}play(){this.plays++;this.paused=false;return reject?Promise.reject(Error('autoplay blocked')):Promise.resolve()}pause(){this.pauses++;this.paused=true}removeAttribute(k){delete this[k]}load(){this.loaded=true}}
 const ctx={S:{chapter:1,location:'study',gameOver:false,test:null,chapterIntro:false},LOCATIONS:{study:{name:'书房'},hallway:{name:'走廊'},attic:{name:'阁楼'},stairs:{name:'石阶入口'},cellar:{name:'地下窖室'},altar:{name:'仪式祭坛'}},pendingAction:null,pendingNavigation:false,phaseTransitionActive:false,document:doc,localStorage:{getItem:()=>saved,setItem(){}},window:{Audio:unsupported?undefined:Audio,addEventListener(k,f){windowEvents[k]=f}},setTimeout(f,ms){timers.set(++seq,{f,at:now+ms});return seq},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(f){observer=f}observe(){}}};vm.runInNewContext(source,ctx);
 return{ctx,doc,node,events,windowEvents,timers,media,audit:()=>observer(),api:ctx.window.gameNarrator,async flush(){for(let i=0;i<8;i++)await Promise.resolve()},async tick(ms=200){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.f()}for(let i=0;i<8;i++)await Promise.resolve()}};
}
test('六个地点分别选择对应配音，原速原音量不循环，反复进入不重播',async()=>{
 const g=setup();for(const id of ['study','hallway','attic','stairs','cellar','altar']){g.ctx.S.location=id;g.api.enter(id);await g.flush();const m=g.media.at(-1);assert.equal(m.src,`assets/audio/minimax-${id}-v1.mp3`);assert.equal(m.volume,1);assert.equal(m.loop,false);assert.equal(m.playbackRate,undefined);const total=g.media.length;g.api.enter(id);await g.flush();assert.equal(g.media.length,total)}
 assert.ok(g.media.slice(0,-1).every(m=>m.paused&&m.src===undefined));g.ctx.S.location='study';g.api.enter('study');await g.flush();assert.equal(g.media.length,6);assert.equal(g.media.at(-1).paused,true);
});
test('最终幕没有录音时保留文字，不错播第二幕旁白或请求不存在的音频',async()=>{
 const g=setup();g.api.enter('study');await g.flush();Object.assign(g.ctx.S,{chapter:3,chapterIntro:true,location:'vestibule'});g.api.intro();
 g.ctx.S.chapterIntro=false;g.api.enter('vestibule');await g.flush();assert.equal(g.media.length,1);assert.equal(g.media[0].paused,true);assert.equal(g.timers.size,0);assert.match(g.node('sceneNarrationStatus').textContent,/暂未配置旁白/);
 for(const id of ['gallery','gate']){g.ctx.S.location=id;g.api.enter(id);await g.flush()}assert.equal(g.media.length,1);
});

test('第二幕开场与石阶入口分开播放，开始调查时停止开场',async()=>{
 const g=setup();Object.assign(g.ctx.S,{chapter:2,chapterIntro:true,location:'stairs'});g.node('modal').classList.add('open');g.api.intro();await g.flush();assert.equal(g.media[0].src,'assets/audio/minimax-chapter-two-v1.mp3');g.api.closeIntro();assert.equal(g.media[0].paused,true);g.ctx.S.chapterIntro=false;g.node('modal').classList.remove('open');g.api.enter('stairs');await g.flush();assert.equal(g.media[1].src,'assets/audio/minimax-stairs-v1.mp3');
});
test('等待阶段、检定、教程及其它弹窗，不打断必须先完成的交互',async()=>{
 for(const kind of ['phase','test','tutorial','modal','native']){const g=setup();if(kind==='phase')g.ctx.phaseTransitionActive=true;if(kind==='test')g.ctx.S.test={};if(kind==='tutorial')g.node('game').inert=true;if(kind==='modal')g.node('modal').classList.add('open');if(kind==='native')g.doc.nativeOpen=true;g.api.enter('study');await g.flush();assert.equal(g.media.length,0,kind);g.ctx.phaseTransitionActive=false;g.ctx.S.test=null;g.node('game').inert=false;g.node('modal').classList.remove('open');g.doc.nativeOpen=false;await g.tick();assert.equal(g.media[0].plays,1,kind)}
});
test('后台暂停，返回当前场景继续，结束后不重播',async()=>{
 const g=setup();g.api.enter('study');await g.flush();g.doc.hidden=true;g.events.visibilitychange();assert.equal(g.media[0].paused,true);g.doc.hidden=false;g.events.visibilitychange();await g.flush();assert.equal(g.media[0].plays,2);g.media[0].listeners.ended();g.doc.hidden=true;g.events.visibilitychange();g.doc.hidden=false;g.events.visibilitychange();await g.flush();assert.equal(g.media[0].plays,2);assert.equal(g.timers.size,0);
});
test('声音设置可停止旁白或关闭自动播放，偏好关闭时不加载音频',async()=>{
 const h=setup({saved:'false'});h.api.enter('study');await h.flush();assert.equal(h.media.length,0);assert.match(h.node('sceneNarrationToggle').textContent,/关/);
 const g=setup();g.api.enter('study');await g.flush();g.node('sceneNarrationStop').listeners.click();assert.equal(g.media[0].paused,true);g.ctx.S.location='hallway';g.api.enter('hallway');await g.flush();g.node('sceneNarrationToggle').listeners.click();assert.equal(g.media[1].paused,true);g.ctx.S.location='attic';g.api.enter('attic');await g.flush();assert.equal(g.media.length,2);
});
test('返回菜单、结束游戏、离开网页及新游戏不会残留旧音频或计时',async()=>{
 for(const mode of ['menu','end','page','new']){const g=setup();g.api.enter('study');await g.flush();if(mode==='menu')g.events['arkham:menu']();if(mode==='end'){g.ctx.S.gameOver=true;g.audit()}if(mode==='page')g.windowEvents.pagehide();if(mode==='new'){g.api.reset();g.ctx.S={chapter:1,location:'study',gameOver:false};g.api.enter('study');await g.flush()}assert.equal(g.media[0].paused,true,mode);assert.equal(g.media[0].src,undefined,mode);assert.equal(g.timers.size,0,mode);if(mode==='new')assert.equal(g.media[1].plays,1)}
});
test('快速移动只播放当前地点，过期的待播回调不能启动旧场景',async()=>{
 const g=setup();g.ctx.phaseTransitionActive=true;g.api.enter('study');const old=[...g.timers.values()][0].f;g.ctx.S.location='hallway';g.api.enter('hallway');g.ctx.phaseTransitionActive=false;old();await g.tick();assert.equal(g.media.length,1);assert.equal(g.media[0].src,'assets/audio/minimax-hallway-v1.mp3');
});
test('浏览器拒绝自动播放时等待用户点击，加载错误不阻断游戏',async()=>{
 const g=setup({reject:true});g.api.enter('study');await g.flush();assert.equal(g.media[0].plays,1);assert.match(g.node('sceneNarrationStatus').textContent,/浏览器暂缓/);g.audit();await g.flush();assert.equal(g.media[0].plays,1);g.events.click();await g.flush();assert.equal(g.media[0].plays,2);g.media[0].listeners.error();assert.equal(g.media[0].paused,true);assert.match(g.node('sceneNarrationStatus').textContent,/无法加载/);assert.equal(g.ctx.S.gameOver,false);
 const h=setup({unsupported:true});h.api.enter('study');assert.match(h.node('sceneNarrationStatus').textContent,/无法播放/);
});
test('弹窗打断已播放地点旁白时暂停，关掉后从当前位置恢复',async()=>{
 const g=setup();g.api.enter('study');await g.flush();g.node('modal').classList.add('open');g.audit();assert.equal(g.media[0].paused,true);g.node('modal').classList.remove('open');await g.tick();assert.equal(g.media[0].plays,2);assert.equal(g.media[0].currentTime,undefined);
});
test('游戏钩子仅做播放反馈，七份本地文件齐全，不调用系统机器人配音',()=>{
 for(const id of ['study','hallway','attic','stairs','cellar','altar','chapter-two']){const b=fs.readFileSync(path.join(root,`assets/audio/minimax-${id}-v1.mp3`));assert.ok(b.length>1000);assert.ok(b.subarray(0,3).toString()==='ID3'||b[0]===255)}
 assert.match(html,/gameNarrator.enter\('study'\)/);assert.match(html,/gameNarrator.enter\(S.location\)/);assert.match(html,/gameNarrator.enter\(id\)/);assert.match(html,/gameNarrator.intro\(\)/);assert.match(html,/gameNarrator.closeIntro\(\)/);assert.match(html,/scene-narration.js\?v=finale-1/);assert.doesNotMatch(source,/speechSynthesis|playbackRate|requestAction|S\.[a-zA-Z]+\s*=(?!=)/);
});
