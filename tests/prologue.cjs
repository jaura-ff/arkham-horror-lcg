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
  const speech={voices:options.voices||[{lang:'en-US'},{lang:'zh-CN',name:'本地中文',localService:true}],spoken:[],cancels:0,listeners:{},getVoices(){return this.voices},speak(u){if(options.throws)throw Error('blocked');this.spoken.push(u)},cancel(){this.cancels++;this.spoken.at(-1)?.onerror?.({error:'canceled'})},addEventListener(k,fn){on(this,k,fn)}};
  const ctx=vm.createContext({document,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},...(options.speech?{speechSynthesis:speech,SpeechSynthesisUtterance:class{constructor(text){this.text=text}}}:{}),matchMedia:()=>motion,Math:Object.create(Math),Event,CustomEvent:Event,startCalls:0,phaseCalls:0});ctx.window=ctx;
  const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'prologue-narration.js'),'utf8'));run(fs.readFileSync(path.join(root,'prologue.js'),'utf8'));
  run(`const originalStart=startGame;startGame=()=>{startCalls++;originalStart()};announcePhase=()=>{phaseCalls++;phaseTransitionActive=true}`);
  document.getElementById('game').style.display='none';document.getElementById('startOverlay').style.display='flex';document.getElementById('difficultySelect').value='standard';
  return{run,get,events,motion,speech,storage,doc:document,el:id=>document.getElementById(id),click:id=>document.getElementById(id).listeners.click()};
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
 const css=fs.readFileSync(path.join(root,'prologue.css'),'utf8');assert.match(html,/class="prologue-stage" aria-hidden="true"/);assert.match(html,/prologue\.css\?v=narration-1/);assert.match(html,/prologue\.js\?v=narration-1/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/infinite/);assert.match(css,/pointer:coarse/);assert.match(css,/noir-rooms.webp/);
});

test('进入三幕时朗读对应标题和完整正文，中文优先且不操作游戏',()=>{
 const g=setup(false,{speech:true});g.run('beginPrologue()');assert.equal(g.speech.spoken[0].text,'阿卡姆，夜色渐深。');assert.equal(g.speech.spoken[0].lang,'zh-CN');assert.equal(g.speech.spoken[0].rate,.92);
 for(let scene=0;scene<3;scene++){
   const first=g.speech.spoken.length-1;
   let safety=0;while(g.el('prologueVoiceStatus').textContent.includes('正在朗读')&&safety++<30)g.speech.spoken.at(-1).onend();
   assert.ok(safety<30);assert.match(g.el('prologueVoiceStatus').textContent,/已结束/);
   const read=g.speech.spoken.slice(first).map(u=>u.text).join('');assert.equal(read,`${g.el('prologueTitle').textContent}。${g.el('prologueText').textContent.replace(/\n/g,'')}`);
   assert.equal(g.get('S'),null);if(scene<2)g.click('prologueNext');
 }
});

test('翻幕取消旧句，晚到的结束和错误回调不会播放旧内容',()=>{
 const g=setup(false,{speech:true});g.run('beginPrologue()');const old=g.speech.spoken[0];g.click('prologueNext');assert.equal(g.speech.cancels,1);assert.match(g.speech.spoken.at(-1).text,/陌生的声音/);const n=g.speech.spoken.length;old.onend();old.onerror();assert.equal(g.speech.spoken.length,n);assert.match(g.el('prologueVoiceStatus').textContent,/正在朗读/);g.click('prologuePrevious');assert.equal(g.speech.spoken.at(-1).text,'阿卡姆，夜色渐深。');
});

test('旁白暂停继续从当前句重读，重播从标题开始，不影响动画',()=>{
 const g=setup(false,{speech:true});g.run('beginPrologue()');g.speech.spoken[0].onend();const sentence=g.speech.spoken.at(-1).text;g.click('prologueVoicePause');assert.match(g.el('prologueVoiceStatus').textContent,/已暂停/);assert.equal(g.el('prologueDialog').dataset.motion,'playing');g.click('prologueVoicePause');assert.equal(g.speech.spoken.at(-1).text,sentence);g.click('prologueVoiceReplay');assert.equal(g.speech.spoken.at(-1).text,'阿卡姆，夜色渐深。');
});

test('旁白独立开关保存设置，关闭后翻幕及语音加载事件不得复活播放',()=>{
 const g=setup(false,{speech:true});g.run('beginPrologue()');g.click('prologueNarration');assert.equal(g.storage.get('arkham-narration-v1'),'false');const n=g.speech.spoken.length;g.click('prologueNext');g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,n);assert.equal(g.el('prologueVoiceReplay').disabled,true);g.click('prologueNarration');assert.match(g.speech.spoken.at(-1).text,/陌生的声音/);const muted=setup(false,{speech:true,saved:false});muted.run('beginPrologue()');assert.equal(muted.speech.spoken.length,0);assert.equal(muted.el('prologueNarration').textContent,'旁白：关');
});

test('旁白后台停止且返回不突发播放，点击继续恢复',()=>{
 const g=setup(false,{speech:true});g.run('beginPrologue()');const old=g.speech.spoken[0];g.doc.hidden=true;g.doc.listeners.visibilitychange();assert.equal(g.speech.cancels,1);old.onend();g.doc.hidden=false;g.doc.listeners.visibilitychange();assert.equal(g.speech.spoken.length,1);g.click('prologueVoicePause');assert.equal(g.speech.spoken.length,2);
});

test('跳过、菜单、Escape和实际开局都停止旁白且拒绝迟到回调',()=>{
 for(const action of ['prologueSkip','prologueMenu','escape','finish']){
   const g=setup(false,{speech:true});g.run('beginPrologue()');if(action==='finish'){g.click('prologueNext');g.click('prologueNext')}
   const old=g.speech.spoken.at(-1),n=g.speech.spoken.length;
   if(action==='escape')g.el('prologueDialog').listeners.cancel({preventDefault(){}});else g.click(action==='finish'?'prologueNext':action);
   assert.equal(g.el('prologueDialog').open,false);old.onend();old.onerror();g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,n);assert.ok(g.speech.cancels>0);
 }
});

test('中文语音延迟加载后可朗读，不用英文声音硬读中文',()=>{
 const g=setup(false,{speech:true,voices:[]});g.run('beginPrologue()');assert.equal(g.speech.spoken.length,0);assert.match(g.el('prologueVoiceStatus').textContent,/未检测到中文/);g.speech.voices=[{lang:'en-US'}];g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,0);g.speech.voices.push({lang:'zh-CN'});g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,1);g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,1);
});

test('不支持、抛错或播放失败时给出提示，仍可正常开始游戏',()=>{
 for(const options of [{},{speech:true,throws:true},{speech:true}]){
   const g=setup(false,options);g.run('beginPrologue()');if(options.speech&&!options.throws)g.speech.spoken[0].onerror({error:'not-allowed'});
   assert.match(g.el('prologueVoiceStatus').textContent,/不支持|不可用|重试/);g.click('prologueSkip');assert.equal(g.get('startCalls'),1);
 }
});

test('语音准备期间关闭或后台化后加载事件不会自动开始',()=>{
 for(const action of ['prologueNarration','prologueMenu','hidden']){
   const g=setup(false,{speech:true,voices:[]});g.run('beginPrologue()');if(action==='hidden'){g.doc.hidden=true;g.doc.listeners.visibilitychange()}else g.click(action);g.speech.voices=[{lang:'zh-CN'}];g.speech.listeners.voiceschanged();assert.equal(g.speech.spoken.length,0);
 }
});
