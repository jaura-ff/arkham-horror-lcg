const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(reduced=false,options={}){
  const nodes=new Map(),events=[];
  function on(target,k,fn){const old=target.listeners[k];target.listeners[k]=old?(...args)=>{old(...args);fn(...args)}:fn;}
  const document={body:{style:{overflow:'auto'}},hidden:false,listeners:{},addEventListener(k,fn){on(this,k,fn)},activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node(''),dispatchEvent(e){events.push(e)}};
  function node(id){const classes=new Set();return{id,open:false,disabled:false,innerHTML:'',textContent:'',style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},listeners:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(){},focus(){document.activeElement=this},showModal(){this.open=true},close(){this.open=false},addEventListener(k,fn){on(this,k,fn)}};}
  class Event{constructor(type,options={}){this.type=type;this.detail=options.detail}}
  const motion={matches:reduced,addEventListener(k,fn){this.change=fn}};
  const storage=new Map(options.saved===undefined?[]:[['arkham-narration-v1',JSON.stringify(options.saved)]]);
  const media=[];
  class AudioMock{constructor(src){this.src=src;this.currentTime=0;this.plays=0;this.pauses=0;media.push(this)}play(){this.plays++;return options.blocked?Promise.reject(Error('blocked')):options.defer?new Promise(resolve=>this.resolve=resolve):Promise.resolve()}pause(){this.pauses++}removeAttribute(k){if(k==='src')this.src=''}load(){}}
  const ctx=vm.createContext({document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},...(options.audio?{Audio:AudioMock}:{}),matchMedia:()=>motion,Math:Object.create(Math),Event,CustomEvent:Event,startCalls:0,phaseCalls:0});ctx.window=ctx;
  const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'prologue-narration.js'),'utf8'));run(fs.readFileSync(path.join(root,'prologue.js'),'utf8'));
  run(`const originalStart=startGame;startGame=()=>{startCalls++;originalStart()};announcePhase=()=>{phaseCalls++;phaseTransitionActive=true}`);
  document.getElementById('game').style.display='none';document.getElementById('startOverlay').style.display='flex';document.getElementById('difficultySelect').value='standard';
  return{run,get,events,motion,media,storage,doc:document,el:id=>document.getElementById(id),click:id=>document.getElementById(id).listeners.click()};
}
test('开始按钮先进入前序，不创建游戏或随机发牌',()=>{
  const g=setup();g.run(`Math.random=()=>{throw Error('unexpected shuffle')};beginPrologue()`);assert.equal(g.get('S'),null);assert.equal(g.get('startCalls'),0);assert.equal(g.get('phaseCalls'),0);assert.equal(g.el('game').style.display,'none');assert.equal(g.el('prologueDialog').open,true);assert.match(g.el('prologueProgress').textContent,/1 \/ 3/);assert.match(g.el('prologueText').textContent,/1926 年，阿卡姆/);assert.equal(g.doc.body.style.overflow,'hidden');assert.equal(g.el('prologuePrevious').disabled,true);
});
test('逐幕阅读环境背景，最后确认才发牌并开始阶段提示',()=>{
  const g=setup();g.run('beginPrologue()');g.click('prologueNext');assert.match(g.el('prologueTitle').textContent,/书房/);assert.equal(g.get('S'),null);g.click('prologueNext');assert.equal(g.el('prologueNext').textContent,'开始调查');assert.match(g.el('prologueText').textContent,/探索宅邸/);assert.equal(g.get('S'),null);g.click('prologueNext');
  assert.equal(g.el('prologueDialog').open,false);assert.equal(g.get('startCalls'),1);assert.equal(g.get('phaseCalls'),1);assert.equal(g.get('S.hand.length'),5);assert.equal(g.get('S.actions'),3);assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.events.at(-1).type,'arkham:game-started');
});
test('上一幕可返回阅读，跳过前序只启动一次，不额外消耗行动',()=>{
  const g=setup();g.run('beginPrologue()');g.click('prologuePrevious');assert.match(g.el('prologueProgress').textContent,/1 \/ 3/);g.click('prologueNext');g.click('prologuePrevious');assert.match(g.el('prologueProgress').textContent,/1 \/ 3/);g.click('prologueSkip');g.click('prologueSkip');g.click('prologueNext');assert.equal(g.get('startCalls'),1);assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.resources'),5);
});
test('返回菜单和Escape取消前序，不开局、不丢失难度且可重看',()=>{
  for(const escape of [false,true]){const g=setup();g.el('difficultySelect').value='expert';g.run('beginPrologue()');g.click('prologueNext');if(escape){let prevented=false;g.el('prologueDialog').listeners.cancel({preventDefault(){prevented=true}});assert.equal(prevented,true)}else g.click('prologueMenu');assert.equal(g.get('S'),null);assert.equal(g.get('startCalls'),0);assert.equal(g.events.at(-1).type,'arkham:menu');assert.equal(g.el('difficultySelect').value,'expert');assert.equal(g.doc.activeElement.id,'startButton');assert.equal(g.doc.body.style.overflow,'auto');g.run('beginPrologue()');assert.match(g.el('prologueProgress').textContent,/1 \/ 3/);}
});
test('所选难度保持到实际开局，不在阅读时改变混沌袋',()=>{
  const g=setup();g.el('difficultySelect').value='hard';g.run('beginPrologue()');assert.match(g.el('prologueDifficulty').textContent,/困难/);assert.equal(g.get('S'),null);g.click('prologueSkip');assert.equal(g.get('S.difficulty'),'hard');assert.equal(g.get('S.chaos.length'),g.get("makeChaosBag('hard').length"));
});
test('手动新人指导请求随前序传递，完成前不触发教学事件',()=>{
  const g=setup();g.run('beginPrologue(true)');assert.equal(g.events.length,0);g.run('beginPrologue()');assert.match(g.el('prologueProgress').textContent,/1 \/ 3/);g.click('prologueSkip');assert.equal(g.events.at(-1).detail.tutorial,true);
});
test('新局始终有前序，游戏进行中不能重开前序',()=>{
  const g=setup();g.run('beginPrologue()');g.click('prologueSkip');g.run('beginPrologue()');assert.equal(g.el('prologueDialog').open,false);assert.equal(g.get('startCalls'),1);g.run('phaseTransitionActive=false;requestReturnMenu();confirmReturnMenu();beginPrologue()');assert.equal(g.el('prologueDialog').open,true);assert.equal(g.get('S'),null);
});
test('前序有适配与语义标题，使用已有背景且明确改编身份',()=>{
  assert.match(html,/id="startButton" onclick="beginPrologue\(\)"/);assert.match(html,/<dialog id="prologueDialog"[^>]*aria-labelledby="prologueTitle"/);assert.match(html,/本网页版剧情改编，非官方原文/);const css=fs.readFileSync(path.join(root,'prologue.css'),'utf8');assert.match(css,/noir-study.webp/);assert.match(css,/100dvh/);assert.match(css,/overflow:auto/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/animation-play-state:paused/);for(const file of ['noir-study.webp','noir-rooms.webp'])assert.ok(fs.existsSync(path.join(root,'assets/images',file)));
});

test('三幕场景随手动翻页更新，暂停后文字完整且跨幕保持暂停',()=>{
 const g=setup();g.run('beginPrologue()');const d=g.el('prologueDialog');assert.equal(d.dataset.scene,'0');assert.equal(d.dataset.motion,'playing');assert.ok(d.classList.contains('prologue-animate'));g.click('prologueMotion');assert.equal(d.dataset.motion,'paused');assert.equal(g.el('prologueMotion').attributes['aria-pressed'],'true');assert.match(g.el('prologueText').textContent,/合上卷宗/);g.click('prologueNext');assert.equal(d.dataset.scene,'1');assert.equal(d.dataset.motion,'paused');g.click('prologueNext');assert.equal(d.dataset.scene,'2');g.click('prologueMotion');assert.equal(d.dataset.motion,'playing');assert.equal(g.get('S'),null);assert.equal(g.get('phaseCalls'),0);
});

test('隐藏页面暂停镜头，回到页面不覆盖玩家手动暂停',()=>{
 const g=setup();g.run('beginPrologue()');const d=g.el('prologueDialog');g.doc.hidden=true;g.doc.listeners.visibilitychange();assert.equal(d.dataset.motion,'paused');g.doc.hidden=false;g.doc.listeners.visibilitychange();assert.equal(d.dataset.motion,'playing');g.click('prologueMotion');g.doc.hidden=true;g.doc.listeners.visibilitychange();g.doc.hidden=false;g.doc.listeners.visibilitychange();assert.equal(d.dataset.motion,'paused');g.click('prologueMenu');assert.equal(d.dataset.motion,'paused');g.run('beginPrologue()');assert.equal(d.dataset.motion,'playing');
});

test('减少动态效果优先，系统设置变化立即生效，不改变游戏状态',()=>{
 const g=setup(true);g.run('beginPrologue()');const d=g.el('prologueDialog');assert.equal(d.dataset.motion,'paused');assert.equal(g.el('prologueMotion').disabled,true);assert.equal(g.el('prologueMotion').textContent,'动画已简化');g.click('prologueMotion');assert.equal(d.dataset.motion,'paused');g.motion.matches=false;g.motion.change();assert.equal(d.dataset.motion,'playing');assert.equal(g.el('prologueMotion').disabled,false);g.motion.matches=true;g.motion.change();assert.equal(d.dataset.motion,'paused');assert.equal(g.get('S'),null);g.click('prologueSkip');assert.equal(d.dataset.motion,'paused');assert.equal(g.get('startCalls'),1);
});

test('动画层仅装饰、无无限循环，不遮挡交互且缓存版本更新',()=>{
 const css=fs.readFileSync(path.join(root,'prologue.css'),'utf8');assert.match(html,/class="prologue-stage" aria-hidden="true"/);assert.match(html,/prologue\.css\?v=narration-1/);assert.match(html,/prologue\.js\?v=recorded-foley-2/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/infinite/);assert.match(css,/pointer:coarse/);assert.match(css,/noir-rooms.webp/);
});

const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('只在已配音的第二幕播放本地录音，未配音幕保持文字动画',async()=>{
 const g=setup(false,{audio:true});g.run('beginPrologue()');assert.equal(g.media.length,0);assert.match(g.el('prologueVoiceStatus').textContent,/文字与动画/);g.click('prologueNext');await flush();assert.equal(g.media.length,1);assert.equal(g.media[0].src,'assets/audio/prologue-study-foley-v2.mp3');assert.match(g.el('prologueVoiceStatus').textContent,/正在播放/);assert.equal(g.get('S'),null);assert.match(g.el('prologueText').textContent,/只有你，一个人/);g.click('prologueNext');assert.ok(g.media[0].pauses>0);assert.match(g.el('prologueVoiceStatus').textContent,/文字与动画/);
});
test('暂停保留播放时间，继续不重头，重播回到开头',async()=>{
 const g=setup(false,{audio:true});g.run('beginPrologue()');g.click('prologueNext');await flush();const a=g.media[0];a.currentTime=28;g.click('prologueVoicePause');assert.match(g.el('prologueVoiceStatus').textContent,/已暂停/);assert.equal(g.el('prologueDialog').dataset.motion,'playing');g.click('prologueVoicePause');await flush();assert.equal(a.currentTime,28);g.click('prologueVoiceReplay');await flush();assert.equal(a.currentTime,0);assert.equal(a.plays,3);
});
test('后台暂停不自动恢复，返回后继续同一位置',async()=>{
 const g=setup(false,{audio:true});g.run('beginPrologue()');g.click('prologueNext');await flush();const a=g.media[0];a.currentTime=12;g.doc.hidden=true;g.doc.listeners.visibilitychange();g.doc.hidden=false;g.doc.listeners.visibilitychange();assert.equal(a.plays,1);assert.match(g.el('prologueVoiceStatus').textContent,/后台/);g.click('prologueVoicePause');await flush();assert.equal(a.currentTime,12);assert.equal(a.plays,2);
});
test('跳过、菜单、Escape、正常开局清理配音与事件，迟到播放结果不能复活',async()=>{
 for(const action of ['prologueSkip','prologueMenu','escape','finish']){
  const g=setup(false,{audio:true,defer:true});g.run('beginPrologue()');g.click('prologueNext');const a=g.media[0],ended=a.onended,error=a.onerror;
  if(action==='finish'){g.click('prologueNext');g.click('prologueNext')}else if(action==='escape')g.el('prologueDialog').listeners.cancel({preventDefault(){}});else g.click(action);
  a.resolve();await flush();ended();error();assert.equal(g.el('prologueDialog').open,false);assert.ok(a.pauses>0);assert.equal(a.src,'');assert.equal(a.plays,1);assert.equal(a.onended,null);
 }
});
test('旁白开关持久保存，关闭时进入第二幕不播放，开启才播放',async()=>{
 const g=setup(false,{audio:true,saved:false});g.run('beginPrologue()');g.click('prologueNext');await flush();assert.equal(g.media[0].plays,0);g.click('prologueNarration');await flush();assert.equal(g.storage.get('arkham-narration-v1'),'true');assert.equal(g.media[0].plays,1);g.click('prologueNarration');assert.equal(g.storage.get('arkham-narration-v1'),'false');assert.equal(g.el('prologueVoiceReplay').disabled,true);
});
test('浏览器拦截自动播放时可手动重播，不影响开始游戏',async()=>{
 const options={audio:true,blocked:true},g=setup(false,options);g.run('beginPrologue()');g.click('prologueNext');await flush();assert.match(g.el('prologueVoiceStatus').textContent,/重播本幕/);options.blocked=false;g.click('prologueVoiceReplay');await flush();assert.match(g.el('prologueVoiceStatus').textContent,/正在播放/);g.click('prologueSkip');assert.equal(g.get('startCalls'),1);
});
test('音频加载错误、不支持音频均保留文字和跳过',async()=>{
 for(const audio of [true,false]){const g=setup(false,{audio});g.run('beginPrologue()');g.click('prologueNext');await flush();if(audio)g.media[0].onerror();assert.match(g.el('prologueVoiceStatus').textContent,/失败|不支持/);g.click('prologueSkip');assert.equal(g.get('startCalls'),1);}
});
test('播放结束不自动翻幕，可重播同一音频',async()=>{
 const g=setup(false,{audio:true});g.run('beginPrologue()');g.click('prologueNext');await flush();g.media[0].onended();assert.match(g.el('prologueVoiceStatus').textContent,/已结束/);assert.equal(g.el('prologueDialog').dataset.scene,'1');assert.equal(g.get('S'),null);g.click('prologueVoiceReplay');await flush();assert.equal(g.media[0].currentTime,0);
});
test('加载时暂停，迟到的play Promise不会覆盖暂停状态',async()=>{
 const g=setup(false,{audio:true,defer:true});g.run('beginPrologue()');g.click('prologueNext');g.click('prologueVoicePause');g.media[0].resolve();await flush();assert.match(g.el('prologueVoiceStatus').textContent,/已暂停/);
});
test('上一幕再回来创建全新播放器，不复活旧幕音频',async()=>{
 const g=setup(false,{audio:true});g.run('beginPrologue()');g.click('prologueNext');await flush();const old=g.media[0],end=old.onended;g.click('prologuePrevious');g.click('prologueNext');await flush();end();assert.equal(g.media.length,2);assert.equal(old.src,'');assert.match(g.el('prologueVoiceStatus').textContent,/正在播放/);
});
test('固定配音文件与确认的试听逐字节相同，且不再调用系统TTS',()=>{
 const audio=fs.readFileSync(path.join(root,'assets/audio/prologue-study-foley-v2.mp3'));assert.equal(require('node:crypto').createHash('sha256').update(audio).digest('hex'),'41a5ce9acedc02b46972828ecbb32a5708ba65a9b885006833914d8ce452aacc');const source=fs.readFileSync(path.join(root,'prologue-narration.js'),'utf8');assert.doesNotMatch(source,/speechSynthesis|SpeechSynthesisUtterance/);assert.match(html,/prologue-narration\.js\?v=recorded-foley-2/);
});
