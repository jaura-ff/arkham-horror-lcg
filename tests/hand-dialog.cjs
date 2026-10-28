const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(id='resource'){
  const nodes=new Map();let now=1000;
  const doc={body:{style:{overflow:'auto'}},activeElement:null,createElement:()=>element(''),querySelector:()=>doc.getElementById('menuButton'),getElementById(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)}};
  function element(id){const classes=new Set();return{id,innerHTML:'',textContent:'',disabled:false,isConnected:true,open:false,inert:false,style:{setProperty(k,v){this[k]=v}},dataset:{},listeners:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},appendChild(){},addEventListener(k,fn){this.listeners[k]=fn},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};}
  const context=vm.createContext({document:doc,Date:{now:()=>now},Math:Object.create(Math)});
  const run=code=>vm.runInContext(code,context);run('window=globalThis');run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  run(fs.readFileSync(path.join(root,'hand-dialog.js'),'utf8'));
  run(`startGame();S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='${id}')}];S.enemies=[];renderHand()`);
  const get=expr=>JSON.parse(run(`JSON.stringify(${expr})`)),node=id=>doc.getElementById(id);
  const tap=(index=0,detail=1)=>{node(`hand-card-${index}`).focus();run(`inspectHandCard(${index},{detail:${detail}})`)};
  const open=()=>{tap();now+=100;tap()};
  const click=id=>{node(id).focus();node(id).listeners.click()};
  return{run,get,node,tap,open,click,doc,wait:ms=>{now+=ms}};
}
test('单击只选中，双击只打开效果，取消不扣资源或行动',()=>{
  const g=setup(),before=g.get('S');g.tap();assert.equal(g.node('handCardDialog').open,false);assert.match(g.node('hand').innerHTML,/is-selected/);
  g.tap();assert.equal(g.node('handCardDialog').open,true);assert.deepEqual(g.get('S'),before);
  g.click('handCardCancel');assert.equal(g.node('handCardDialog').open,false);assert.deepEqual(g.get('S'),before);assert.equal(g.doc.body.style.overflow,'auto');
});
test('三连点不直接出牌，慢速两次或切换卡牌不误开弹窗',()=>{
  const g=setup();g.run('S.hand.push({...INVESTIGATOR.deck[0]})');g.tap();g.wait(600);g.tap();assert.equal(g.node('handCardDialog').open,false);
  g.tap(1);assert.equal(g.node('handCardDialog').open,false);g.tap(1);g.tap(1);assert.equal(g.node('handCardDialog').open,true);assert.equal(g.get('S.assets.length'),0);assert.equal(g.get('S.actions'),3);
});
test('Enter 等键盘激活直接打开讲解，关闭及原生关闭均恢复焦点',()=>{
  const g=setup();g.tap(0,0);assert.equal(g.node('handCardDialog').open,true);g.node('handCardDialog').close();assert.equal(g.doc.activeElement.id,'hand-card-0');
  g.tap(0,0);g.click('handCardClose');assert.equal(g.doc.body.style.overflow,'auto');
});
test('每张手牌的效果、用法及插画与游戏和图鉴共用数据',()=>{
  const g=setup();
  for(const id of g.get('INVESTIGATOR.deck.map(c=>c.id)')){
    g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='${id}')}];selectedHandCard=null`);g.tap(0,0);
    assert.equal(g.node('handCardEffect').textContent,g.get('S.hand[0].text'));assert.equal(g.node('handCardUsage').textContent,g.get(`CARD_USAGE['${id}']`));
    assert.equal(g.node('handCardArt').style['--art-x'],g.get(`CARD_ART['${id}'][0]`)+'%');g.click('handCardClose');
  }
});
test('确认才打出资产事件，连续点击确认只扣一次费用行动',()=>{
  for(const id of ['p45','machete','aid','resource','dodge']){
    const g=setup(id);g.run('S.hp=5');g.open();const cost=g.get('S.hand[0].cost');
    g.click('handCardPlay');g.click('handCardPlay');assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.resources'),5-cost+(id==='resource'?3:0));assert.equal(g.get('S.hand.length'),0);
    if(['p45','machete'].includes(id))assert.equal(g.get('S.assets.length'),1);
    if(id==='aid')assert.equal(g.get('S.hp'),7);if(id==='dodge')assert.equal(g.get('S.evadeBonus'),2);
  }
});
test('技能、弱点、资源不足、手槽满和无行动都可讲解但不可出牌',()=>{
  for(const [id,pre,reason] of [['courage','','技能牌'],['nightmare','','弱点'],['p45','S.resources=0','资源不足'],['p45',"S.assets=[{card:{slot:'hand'}},{card:{slot:'hand'}}]",'手槽已满'],['aid','S.actions=0','行动已用完']]){
    const g=setup(id);g.run(pre);g.open();const before=g.get('S');assert.equal(g.node('handCardPlay').disabled,true);assert.match(g.node('handCardWarning').textContent,new RegExp(reason));g.click('handCardPlay');assert.deepEqual(g.get('S'),before);
  }
});
test('确认重新检查资源和卡牌身份，不会打出索引处的另一张牌',()=>{
  const g=setup('p45');g.open();g.run('S.resources=0');g.click('handCardPlay');assert.equal(g.get('S.actions'),3);
  g.run('S.resources=5;S.hand=[{...INVESTIGATOR.deck[3]}]');g.click('handCardPlay');assert.equal(g.get('S.resources'),5);assert.equal(g.get('S.actions'),3);assert.match(g.node('handCardWarning').textContent,/手牌已变化/);
});
test('讲解和取消不触发借机攻击，确认后才结算，致死不执行牌效',()=>{
  for(const lethal of [false,true]){
    const g=setup('resource');g.run(`S.enemies=[{card:{...ENCOUNTER[0]},hp:2,engaged:true,exhausted:false,location:'study'}];S.hp=${lethal?1:9}`);
    const hp=g.get('S.hp');g.open();assert.match(g.node('handCardWarning').textContent,/借机攻击/);assert.equal(g.get('S.hp'),hp);g.click('handCardCancel');assert.equal(g.get('S.hp'),hp);
    g.open();g.click('handCardPlay');assert.equal(g.get('S.hp'),hp-1);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.resources'),lethal?5:8);
    if(lethal)assert.match(g.node('modalBox').innerHTML,/调查失败/);
  }
});
test('检定、移动、菜单确认、教学、图鉴和终局都不叠加手牌弹窗',()=>{
  for(const pre of ['S.test={}','S.pendingMove=true','pendingNavigation=true',"document.getElementById('game').inert=true","document.getElementById('cardAtlas').open=true",'S.gameOver=true',"document.getElementById('modal').classList.add('open')"]){
    const g=setup();g.run(pre);g.tap(0,0);assert.equal(g.node('handCardDialog').open,false);
  }
});
test('手牌入口不再直接出牌，说明弹窗有语义标题与触摸交互提示',()=>{
  const g=setup();g.run('renderHand()');assert.match(g.node('hand').innerHTML,/onclick="inspectHandCard/);assert.doesNotMatch(g.node('hand').innerHTML,/onclick="onHandCard/);
  assert.match(html,/<dialog id="handCardDialog"[^>]*aria-labelledby="handCardTitle"/);assert.match(html,/快速连点两次/);assert.match(html,/hand-dialog.js\?v=faction-1/);
});
