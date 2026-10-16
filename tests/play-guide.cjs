const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
  const nodes=new Map();function element(){const classes=new Set();return{innerHTML:'',textContent:'',style:{},dataset:{},open:true,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(){}}}
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element};
  const ctx=vm.createContext({document,Math:Object.create(Math)});ctx.window=ctx;const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'play-guide.js'),'utf8'));run('startGame()');
  return{run,get,el:id=>document.getElementById(id),text:()=>document.getElementById('playGuideText').textContent};
}
test('首回合实时指引明确跳过神话而非敌人阶段',()=>{
  const g=setup();assert.match(g.text(),/首回合开局跳过神话阶段/);assert.match(g.text(),/敌人阶段仍会进行/);g.run('S.round=2;renderActions()');assert.doesNotMatch(g.text(),/首回合/);assert.match(g.text(),/3 次行动/);
});
test('无敌人时解释没有攻击，不删除敌人阶段',()=>{
  const g=setup();g.run('S.enemies=[];S.actions=0;advancePhase()');assert.equal(g.get('S.phase'),'enemy');assert.match(g.text(),/没有敌人/);assert.match(g.text(),/敌人阶段仍正常经过/);assert.doesNotMatch(g.text(),/首回合跳过敌人阶段/);
});
test('调查中根据交缠、行动及目标切换指引',()=>{
  const g=setup();g.run(`S.enemies=[{engaged:true,exhausted:false}];renderActions()`);assert.match(g.text(),/借机攻击/);assert.match(g.text(),/战斗、闪避豁免/);
  g.run('S.actions=0;renderActions()');assert.match(g.text(),/行动已用完/);g.run('S.actions=3;S.enemies=[];S.clues=3;renderActions()');assert.match(g.text(),/推进幕/);
  g.run(`S.actIdx=1;S.location='hallway';renderActions()`);assert.match(g.text(),/前往阁楼/);g.run(`S.location='attic';renderActions()`);assert.match(g.text(),/已到阁楼/);
});
test('后续阶段解释补给与遭遇，第二次调查预览不重复首回合提示',()=>{
  const g=setup();assert.match(g.run(`phaseGuideText('upkeep')`),/抽 1 张玩家牌并获得 1 资源/);assert.match(g.run(`phaseGuideText('mythos')`),/不会再次跳过/);
  g.run(`S.phase='mythos'`);assert.doesNotMatch(g.run(`phaseGuideText('investigation',true)`),/首回合/);g.run('S.round=2');assert.match(g.run(`phaseGuideText('mythos')`),/每一轮开端/);
});
test('检定前、强制检定与结果指引分开说明，结局不继续推荐行动',()=>{
  const g=setup();g.run(`S.enemies=[];requestAction('investigate')`);assert.match(g.text(),/抽取前可返回/);g.run(`S.chaos=[{label:'0',mod:0}];resolveTest()`);assert.match(g.text(),/不能返回重抽/);g.run('finishTest(true);startTest("will",2,"遭遇",()=>{})');assert.match(g.text(),/强制检定，不能取消/);
  g.run('S.gameOver=true;renderActions()');assert.match(g.text(),/调查已结束/);
});
test('指引只读且不重开用户收起的面板，不影响随机或行动状态',()=>{
  const g=setup(),before=g.get('S');g.el('playGuide').open=false;g.run(`Math.random=()=>{throw Error('unexpected random')};updatePlayGuide();renderActions();phaseGuideText('enemy',true);phaseGuideText('upkeep',true)`);assert.deepEqual(g.get('S'),before);assert.equal(g.el('playGuide').open,false);
});
test('指引有本地脚本、收起入口及官方来源，阶段弹窗读取同一规则说明',()=>{
  assert.match(html,/<details id="playGuide"[^>]*open>/);assert.match(html,/playGuideText" aria-live="polite"/);assert.match(html,/ahc01_learn_to_play_web.pdf#page=9/);assert.match(html,/play-guide.js\?v=guide-1/);assert.match(html,/phaseAnnouncementRule/);
  const phase=fs.readFileSync(path.join(root,'phase-transition.js'),'utf8');assert.match(phase,/phaseGuideText\(phase,true\)/);
});
