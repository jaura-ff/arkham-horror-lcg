const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function game(){
  const nodes = new Map();
  function element(){
    const classes = new Set();
    return {innerHTML:'',textContent:'',style:{},children:[],classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}},appendChild(x){this.children.push(x)}};
  }
  const document = {getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element};
  const context = vm.createContext({document,Math:Object.create(Math)});
  const run = code => vm.runInContext(code, context);
  run(script);
  run(`startGame(); S.hand=[]; S.assets=[]; S.enemies=[]; S.hp=9; S.sanity=5; S.actions=3;
    S.deck=Array.from({length:20},()=>({...INVESTIGATOR.deck.find(c=>c.id==='courage')}));
    S.encounterDiscard=[]; S.chaos=[{label:'0',mod:0}];`);
  const get = expr => JSON.parse(run(`JSON.stringify(${expr})`));
  const enemy = (hunter=false) => run(`S.enemies=[{card:{...ENCOUNTER[0],hunter:${hunter}},hp:2,engaged:true,exhausted:false,location:'study'}]`);
  const finish = () => run('resolveTest(); finishTest(S.testResult)');
  return {run,get,enemy,finish,document};
}

test('继续按钮完成敌人→维持→神话→调查完整流程',()=>{
  const g=game();g.run(`S.encounter=[{...ENCOUNTER[0]}];resource();endTurn()`);
  assert.equal(g.get('S.phase'),'enemy');
  g.run(`doAction('next')`);assert.equal(g.get('S.phase'),'upkeep');
  g.run(`doAction('next')`);assert.equal(g.get('S.phase'),'mythos');
  g.run(`doAction('next')`);assert.equal(g.get('S.phase'),'investigation');
  assert.equal(g.get('S.round'),2);assert.equal(g.get('S.actions'),3);
});
test('神话检定未完成时不能推进或覆盖检定，确认后可继续',()=>{
  const g=game();g.run(`S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];resource();endTurn();next();next()`);
  assert.equal(g.get('S.test.skill'),'will');g.run(`doAction('next');next();openInvestigatorModal()`);
  assert.equal(g.get('S.phase'),'mythos');assert.equal(g.get('S.test.skill'),'will');
  g.finish();g.run(`doAction('next')`);assert.equal(g.get('S.phase'),'investigation');
});
test('行动耗尽：地图与所有行动入口不再改变状态',()=>{
  const g=game();g.run(`S.revealed.hallway=true;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='resource')}];S.actions=0`);
  const before=g.get('[S.location,S.actions,S.resources,S.hand.length,S.hp,S.sanity]');
  g.run(`clickNode('hallway');doMove('hallway');draw();resource();move();investigate();fight();evade();onHandCard(0);doAction('resource')`);
  assert.deepEqual(g.get('[S.location,S.actions,S.resources,S.hand.length,S.hp,S.sanity]'),before);
});
test('用完三次移动后行动不会变负数',()=>{
  const g=game();g.run(`S.revealed.hallway=true;clickNode('hallway');clickNode('study');clickNode('hallway');clickNode('study')`);
  assert.equal(g.get('S.actions'),0);assert.equal(g.get('S.location'),'hallway');
});
for(const id of ['resource','aid','p45','dodge'])test(`打出 ${id} 消耗一次行动并触发借机攻击`,()=>{
  const g=game();g.enemy();g.run(`S.hp=5;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='${id}')}];onHandCard(0)`);
  assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.sanity'),4);
  assert.equal(g.get('S.hp'),id==='aid'?6:4);assert.equal(g.get('S.hand.length'),0);
});
test('非法卡牌、资源不足或手槽已满不会扣行动和受借机攻击',()=>{
  const g=game();g.enemy();g.run(`S.resources=0;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='p45')}];onHandCard(0)`);
  assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hp'),9);
  g.run(`S.resources=5;S.assets=[{card:{slot:'hand'}},{card:{slot:'hand'}}];onHandCard(0)`);
  assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hand.length'),1);
});
test('移动窗口取消无代价，确认移动只结算一次借机攻击',()=>{
  const g=game();g.enemy();g.run(`move();closeModal()`);
  assert.deepEqual(g.get('[S.actions,S.hp,S.sanity,S.location]'),[3,9,5,'study']);
  g.run(`move();doMove('hallway')`);
  assert.deepEqual(g.get('[S.actions,S.hp,S.sanity,S.location]'),[2,8,4,'hallway']);
  assert.equal(g.get('S.enemies[0].location'),'hallway');
});
test('点地图与移动窗口使用相同代价；非法目的地不会消耗',()=>{
  const g=game();g.enemy();g.run(`doMove('attic')`);assert.equal(g.get('S.actions'),3);
  g.run(`S.revealed.hallway=true;clickNode('hallway')`);
  assert.deepEqual(g.get('[S.actions,S.hp,S.sanity]'),[2,8,4]);
});
test('两名交缠敌人分别借机攻击，力竭敌人不攻击',()=>{
  const g=game();g.enemy();g.run(`S.enemies.push({...S.enemies[0],card:{...ENCOUNTER[1]}});S.enemies.push({...S.enemies[0],exhausted:true});resource()`);
  assert.deepEqual(g.get('[S.hp,S.sanity,S.resources,S.actions]'),[7,3,6,2]);
});
test('致命借机攻击终止资源行动，不执行后续奖励',()=>{
  const g=game();g.enemy();g.run(`S.hp=1;S.sanity=1;resource();render()`);
  assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.resources'),5);
  assert.match(g.document.getElementById('modalBox').innerHTML,/调查失败/);
  assert.match(g.document.getElementById('controls').innerHTML,/重新开始/);
});
test('致命借机攻击终止移动和治疗，失败弹窗不被覆盖',()=>{
  for(const command of [`move();doMove('hallway')`,`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='aid')}];onHandCard(0)`]){
    const g=game();g.enemy();g.run(`S.hp=1;S.sanity=1;${command}`);
    assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.location'),'study');assert.equal(g.get('S.hp'),0);
    assert.match(g.document.getElementById('modalBox').innerHTML,/调查失败/);
  }
});
test('武器加值进入实际检定，成功伤害与牌面一致',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].card.fight=3;S.enemies[0].hp=3;S.chaos=[{label:'-2',mod:-2}];S.assets=[{card:INVESTIGATOR.deck.find(c=>c.id==='p45')},{card:INVESTIGATOR.deck.find(c=>c.id==='machete')}];fight()`);
  assert.equal(g.get('S.test.bonus'),2);assert.equal(g.get('S.actions'),2);
  g.finish();assert.equal(g.get('S.enemies[0].hp'),1);assert.equal(g.get('S.actions'),2);
});
test('侧身闪避打出后加成生效，只用于下一次闪避',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].card.evade=3;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='dodge')}];onHandCard(0);evade()`);
  assert.equal(g.get('S.test.bonus'),2);g.finish();assert.equal(g.get('S.enemies[0].exhausted'),true);
  g.run(`S.enemies[0].exhausted=false;S.enemies[0].engaged=true;evade()`);assert.equal(g.get('S.test.bonus'),0);
});
test('侧身闪避可投入敏捷检定，不同时保存下次加成',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].card.evade=3;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='dodge')}];evade();toggleCommit(0)`);
  g.finish();assert.equal(g.get('S.enemies[0].exhausted'),true);assert.equal(g.get('S.evadeBonus'),0);
  assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('S.resources'),5);
});
test('战斗和闪避不触发借机攻击，可攻击力竭敌人',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].exhausted=true;S.enemies[0].engaged=false;fight()`);
  assert.equal(g.get('S.test.skill'),'combat');assert.equal(g.get('S.hp'),9);g.finish();
  g.run(`S.enemies[0].exhausted=false;S.enemies[0].engaged=true;evade()`);assert.equal(g.get('S.hp'),9);
});
test('检定中无法移动、打牌、结束回合或重复抽指示物',()=>{
  const g=game();g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];investigate();toggleCommit(0);closeModal();resource();onHandCard(0);endTurn();doMove('hallway')`);
  assert.deepEqual(g.get('[S.actions,S.resources,S.location,S.phase]'),[2,5,'study','investigation']);
  assert.equal(g.document.getElementById('modal').classList.contains('open'),true);
  g.run(`resolveTest();resolveTest();finishTest(false);finishTest(true)`);
  assert.equal(g.get('S.clues'),1);assert.equal(g.get('S.discard.length'),1);assert.equal(g.get('S.actions'),2);
});
test('非猎手闪避后同地点恢复就绪时重新交缠，离开则留在原地',()=>{
  const g=game();g.enemy();g.run(`evade()`);g.finish();g.run(`enemyPhase();upkeepPhase()`);
  assert.equal(g.get('S.enemies[0].engaged'),true);g.run(`enemyPhase()`);assert.equal(g.get('S.hp'),8);
  const h=game();h.enemy();h.run(`evade()`);h.finish();h.run(`doMove('hallway');upkeepPhase();enemyPhase()`);
  assert.equal(h.get('S.enemies[0].engaged'),false);assert.equal(h.get('S.enemies[0].location'),'study');assert.equal(h.get('S.hp'),9);
});
test('移动进入同地点就绪敌人会交缠',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].engaged=false;S.enemies[0].location='hallway';doMove('hallway')`);
  assert.equal(g.get('S.enemies[0].engaged'),true);assert.equal(g.get('S.hp'),9);
});
test('猎手每次只移动一个地点，力竭时不移动不交缠',()=>{
  const g=game();g.enemy(true);g.run(`S.enemies[0].engaged=false;S.location='attic';enemyPhase()`);
  assert.equal(g.get('S.enemies[0].location'),'hallway');assert.equal(g.get('S.hp'),9);
  g.run(`enemyPhase()`);assert.equal(g.get('S.enemies[0].location'),'attic');assert.equal(g.get('S.hp'),8);
  const h=game();h.enemy(true);h.run(`S.enemies[0].engaged=false;S.enemies[0].exhausted=true;S.location='attic';enemyPhase()`);
  assert.equal(h.get('S.enemies[0].location'),'study');assert.equal(h.get('S.enemies[0].engaged'),false);
});
test('起手弱点放回牌堆并补齐五张正常手牌',()=>{
  const g=game();g.run(`S.hand=[];S.deck=INVESTIGATOR.deck.filter(c=>c.type!=='weak').map(c=>({...c}));S.deck.push({...INVESTIGATOR.deck.find(c=>c.type==='weak')});drawOpeningHand()`);
  assert.equal(g.get('S.hand.length'),5);assert.equal(g.get(`S.hand.some(c=>c.type==='weak')`),false);
  assert.equal(g.get('S.deck.length'),5);assert.equal(g.get(`S.deck.filter(c=>c.type==='weak').length`),1);assert.equal(g.get('S.sanity'),5);
});
test('普通抽牌抽到弱点正确受恐惧并弃牌',()=>{
  const g=game();g.run(`S.deck=[{...INVESTIGATOR.deck.find(c=>c.type==='weak')}];draw()`);
  assert.equal(g.get('S.sanity'),4);assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('S.discard.length'),1);
});
test('牌组耗尽恐惧导致失败时维持阶段不再抽牌或加资源',()=>{
  const g=game();g.run(`S.sanity=1;S.deck=[];S.discard=[{...INVESTIGATOR.deck[0]}];upkeepPhase()`);
  assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('S.resources'),5);
});
test('恐惧低语成功或失败均回收到遭遇弃牌堆',()=>{
  for(const autofail of [false,true]){
    const g=game();g.run(`S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];S.chaos=[{label:'0',mod:0,autofail:${autofail}}];drawEncounter()`);g.finish();
    assert.equal(g.get('S.encounterDiscard.length'),1);assert.equal(g.get('S.sanity'),autofail?4:5);
  }
});
test('无胜利点敌人击败后回收，有胜利点敌人进入胜利区',()=>{
  for(const victory of [0,1]){
    const g=game();g.enemy();g.run(`S.enemies[0].hp=1;S.enemies[0].card.victory=${victory};fight()`);g.finish();
    assert.equal(g.get('S.enemies.length'),0);assert.equal(g.get('S.encounterDiscard.length'),victory?0:1);assert.equal(g.get('S.victory.length'),victory?1:0);
  }
});
test('遭遇弃牌堆可洗回；完全空牌堆不崩溃',()=>{
  const g=game();g.run(`S.encounter=[];S.encounterDiscard=[{...ENCOUNTER[0]}];drawEncounter()`);assert.equal(g.get('S.enemies.length'),1);
  g.run(`S.encounter=[];S.encounterDiscard=[];drawEncounter()`);assert.equal(g.get('S.enemies.length'),1);
});
test('议程推进但未失败时仍抽本轮遭遇，终局时停止',()=>{
  const g=game();g.run(`S.doom=2;S.encounter=[{...ENCOUNTER[0]}];mythosPhase()`);
  assert.equal(g.get('S.agendaIdx'),1);assert.equal(g.get('S.enemies.length'),1);
  g.run(`S.doom=2;S.encounter=[{...ENCOUNTER[1]}];mythosPhase()`);
  assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.enemies.length'),1);assert.equal(g.get('S.encounter.length'),1);
});
test('无效调查或推进幕不扣行动、不触发借机攻击',()=>{
  const g=game();g.enemy();g.run(`S.locClues.study=0;investigate();advanceAct()`);
  assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hp'),9);
});
test('完成调查消耗行动且先处理借机攻击，败北后不能获胜',()=>{
  const g=game();g.run(`S.location='attic';S.actIdx=1;finish()`);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.gameOver'),true);
  const h=game();h.enemy();h.run(`S.location='attic';S.enemies[0].location='attic';S.actIdx=1;S.hp=1;finish()`);
  assert.equal(h.get('S.hp'),0);assert.match(h.document.getElementById('modalBox').innerHTML,/调查失败/);
});
test('三线索推进幕后移动至阁楼可达成胜利结算',()=>{
  const g=game();g.run(`S.clues=3;S.location='hallway';advanceAct();doMove('attic');finish()`);
  assert.deepEqual(g.get('[S.actIdx,S.clues,S.location,S.actions,S.gameOver]'),[1,0,'attic',0,true]);
  assert.match(g.document.getElementById('modalBox').innerHTML,/调查成功/);
});
