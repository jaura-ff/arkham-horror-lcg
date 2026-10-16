const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(reduced=false){
  const nodes=new Map(),events=[];
  const document={body:{style:{overflow:'auto'}},hidden:false,listeners:{},addEventListener(k,fn){this.listeners[k]=fn},activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node(''),dispatchEvent(e){events.push(e)}};
  function node(id){const classes=new Set();return{id,open:false,disabled:false,innerHTML:'',textContent:'',style:{},dataset:{},attributes:{},setAttribute(k,v){this.attributes[k]=v},listeners:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(){},focus(){document.activeElement=this},showModal(){this.open=true},close(){this.open=false},addEventListener(k,fn){this.listeners[k]=fn}};}
  class Event{constructor(type,options={}){this.type=type;this.detail=options.detail}}
  const motion={matches:reduced,addEventListener(k,fn){this.change=fn}};
  const ctx=vm.createContext({document,matchMedia:()=>motion,Math:Object.create(Math),Event,CustomEvent:Event,startCalls:0,phaseCalls:0});ctx.window=ctx;
  const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'prologue.js'),'utf8'));
  run(`const originalStart=startGame;startGame=()=>{startCalls++;originalStart()};announcePhase=()=>{phaseCalls++;phaseTransitionActive=true}`);
  document.getElementById('game').style.display='none';document.getElementById('startOverlay').style.display='flex';document.getElementById('difficultySelect').value='standard';
  return{run,get,events,motion,doc:document,el:id=>document.getElementById(id),click:id=>document.getElementById(id).listeners.click()};
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
 const css=fs.readFileSync(path.join(root,'prologue.css'),'utf8');assert.match(html,/class="prologue-stage" aria-hidden="true"/);assert.match(html,/prologue\.css\?v=animated-story-1/);assert.match(html,/prologue\.js\?v=animated-story-1/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/infinite/);assert.match(css,/pointer:coarse/);assert.match(css,/noir-rooms.webp/);
});
