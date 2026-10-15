const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
test('倒计时按3、2、1逐秒显示，3000ms关闭而不显示0',()=>{
  const g=setup(),counter=g.el('phaseAnnouncementCountdown');assert.equal(counter.textContent,'3');g.tick(999);assert.equal(counter.textContent,'3');g.tick(1);assert.equal(counter.textContent,'2');g.tick(999);assert.equal(counter.textContent,'2');g.tick(1);assert.equal(counter.textContent,'1');g.tick(999);assert.equal(counter.textContent,'1');assert.equal(g.el('phaseAnnouncement').open,true);g.tick(1);assert.equal(g.el('phaseAnnouncement').open,false);assert.equal(counter.textContent,'1');assert.equal(g.timers.size,0);
});
test('每次阶段提示重置为3，重新开始清理旧倒计时回调',()=>{
  const g=setup(),counter=g.el('phaseAnnouncementCountdown');const old=[...g.timers.values()].map(t=>t.fn);g.tick(2000);assert.equal(counter.textContent,'1');g.run('startGame()');assert.equal(counter.textContent,'3');old.forEach(fn=>fn());assert.equal(counter.textContent,'3');assert.equal(g.el('phaseAnnouncement').open,true);g.tick(3000);g.run('advancePhase()');assert.equal(counter.textContent,'3');g.tick(1000);assert.equal(counter.textContent,'2');
});
test('倒计时包含读屏通知且不会在重置后继续更新',()=>{
  const g=setup();g.run('resetPhaseAnnouncement()');g.el('phaseAnnouncementCountdown').textContent='保留';g.tick(5000);assert.equal(g.el('phaseAnnouncementCountdown').textContent,'保留');assert.equal(g.timers.size,0);assert.match(html,/id="phaseAnnouncementCountdown"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
});
function setup(){
  const nodes=new Map(),timers=new Map(),events={};let now=0,seq=0;
  const document={activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)},createElement:()=>element(''),querySelector:()=>null,dispatchEvent(e){events[e.type]?.(e)}};
  function element(id){const classes=new Set();return{id,innerHTML:'',textContent:'',style:{},dataset:{},children:[],hidden:id==='tutorial',open:false,listeners:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(n){this.children.push(n)},addEventListener(type,fn){this.listeners[type]=fn},focus(){document.activeElement=this},showModal(){this.open=true},close(){this.open=false}};}
  const context=vm.createContext({document,Math:Object.create(Math),Event:class{constructor(type){this.type=type}},setTimeout(fn,delay){const id=++seq;timers.set(id,{fn,at:now+delay});return id},clearTimeout(id){timers.delete(id)}});context.window=context;
  const run=code=>vm.runInContext(code,context),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'phase-transition.js'),'utf8'));run('startGame()');
  function tick(ms){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}
  return{run,get,tick,timers,events,el:id=>document.getElementById(id)};
}
test('开局调查提示满3000ms关闭，等待期间保留起手状态',()=>{
  const g=setup(),state=g.get('S');assert.equal(g.el('phaseAnnouncement').open,true);assert.equal(g.el('phaseAnnouncementTitle').textContent,'调查阶段');assert.equal(g.el('phaseAnnouncementRound').textContent,'第 1 回合');assert.equal(g.get('canAct()'),false);
  g.tick(2999);assert.equal(g.el('phaseAnnouncement').open,true);assert.deepEqual(g.get('S'),state);g.tick(1);assert.equal(g.el('phaseAnnouncement').open,false);assert.equal(g.get('canAct()'),true);assert.deepEqual(g.get('S'),state);
});
test('四阶段顺序提示后执行，下一轮行动和轮次仅更新一次',()=>{
  const g=setup();g.tick(3000);g.run('S.enemies=[];S.encounter=[];S.encounterDiscard=[];S.actions=0');
  for(const[phase,label]of [['enemy','敌人阶段'],['upkeep','维持阶段'],['mythos','神话阶段'],['investigation','调查阶段']]){
    const previous=g.get('S.phase');g.run('advancePhase()');assert.equal(g.get('S.phase'),previous);assert.equal(g.el('phaseAnnouncementTitle').textContent,label);
    if(phase==='investigation')assert.equal(g.el('phaseAnnouncementRound').textContent,'第 2 回合');
    const before=g.get('S');g.tick(2999);assert.deepEqual(g.get('S'),before);g.tick(1);assert.equal(g.get('S.phase'),phase);assert.equal(g.el('phaseAnnouncement').open,false);
    const after=g.get('S');g.tick(3000);assert.deepEqual(g.get('S'),after);
  }assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.round'),2);
});
test('提示期间连点和Escape不能重复推进或提前结束',()=>{
  const g=setup(),before=g.get('S');g.run(`advancePhase();doAction('next');requestAction('resource');resource();draw();move();investigate();endTurn();requestReturnMenu()`);assert.deepEqual(g.get('S'),before);assert.equal(g.timers.size,3);
  let prevented=false;g.el('phaseAnnouncement').listeners.cancel({preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(g.el('phaseAnnouncement').open,true);g.tick(3000);assert.equal(g.get('phaseTransitionActive'),false);
});
test('敌人攻击和维持补给在提示后结算，不重复执行',()=>{
  const g=setup();g.tick(3000);g.run(`S.enemies=[{card:{...ENCOUNTER[0]},hp:2,location:'study',engaged:true,exhausted:false}];S.hp=9;S.sanity=5;advancePhase()`);assert.equal(g.get('S.hp'),9);g.tick(3000);assert.equal(g.get('S.hp'),9-g.get('ENCOUNTER[0].dmg'));
  const resources=g.get('S.resources');g.run('advancePhase()');assert.equal(g.get('S.resources'),resources);g.tick(3000);assert.equal(g.get('S.resources'),resources+1);g.tick(3000);assert.equal(g.get('S.resources'),resources+1);
});
test('神话遭遇检定在3秒后打开，阶段提示不会关闭检定弹窗',()=>{
  const g=setup();g.tick(3000);g.run(`S.phase='upkeep';S.encounter=[{id:'whisper-test',name:'低语',type:'treachery'}];advancePhase()`);assert.equal(g.get('S.test'),null);g.tick(3000);assert.equal(g.get('S.phase'),'mythos');assert.notEqual(g.get('S.test'),null);assert.equal(g.el('modal').classList.contains('open'),true);assert.equal(g.el('phaseAnnouncement').open,false);
});
test('致命攻击后保留结局弹窗，不再推进阶段',()=>{
  const g=setup();g.tick(3000);g.run(`S.hp=1;S.enemies=[{card:{...ENCOUNTER[0]},hp:2,location:'study',engaged:true,exhausted:false}];advancePhase()`);g.tick(3000);assert.equal(g.get('S.gameOver'),true);assert.equal(g.el('modal').classList.contains('open'),true);assert.match(g.el('modalBox').innerHTML,/调查失败/);g.run('advancePhase()');assert.equal(g.timers.size,0);
});
test('新开局清理旧定时器，旧回调不能改变新游戏或跳过新提示',()=>{
  const g=setup();g.tick(3000);g.run('advancePhase()');const old=[...g.timers.values()].at(-1).fn;g.tick(1000);g.run('startGame()');const before=g.get('S');old();assert.deepEqual(g.get('S'),before);assert.equal(g.el('phaseAnnouncement').open,true);assert.equal(g.timers.size,3);g.tick(2999);assert.equal(g.el('phaseAnnouncement').open,true);g.tick(1);assert.equal(g.el('phaseAnnouncement').open,false);assert.deepEqual(g.get('S'),before);
});
test('状态被替换或结束时，延迟回调不执行原阶段',()=>{
  const g=setup();g.tick(3000);g.run('advancePhase();S={...S,gameOver:true}');g.tick(3000);assert.equal(g.get('S.phase'),'investigation');assert.equal(g.get('phaseTransitionActive'),false);assert.equal(g.el('phaseAnnouncement').open,false);
});
test('提示完成事件只发一次，无动画、不改变页面布局',()=>{
  const g=setup();let ready=0;g.events['arkham:phase-ready']=()=>ready++;g.tick(3000);g.tick(3000);assert.equal(ready,1);assert.match(html,/<dialog id="phaseAnnouncement"[^>]*aria-labelledby/);assert.match(html,/phase-transition.js\?v=countdown-1/);assert.match(html,/停留 3 秒后自动继续/);
  const css=fs.readFileSync(path.join(root,'phase-transition.css'),'utf8');assert.match(css,/100dvh/);assert.match(css,/overflow:auto/);assert.doesNotMatch(css,/animation:/);
});
