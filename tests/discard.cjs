const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
  const nodes=new Map();
  const doc={body:{style:{overflow:'auto'}},activeElement:null,createElement:()=>node(''),getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)}};
  function node(id){const classes=new Set();return{id,style:{},dataset:{},innerHTML:'',textContent:'',hidden:id==='tutorial',open:false,isConnected:true,listeners:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},setAttribute(k,v){this[k]=v},appendChild(){},addEventListener(k,fn){this.listeners[k]=fn},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};}
  const ctx=vm.createContext({document:doc,Math:Object.create(Math)}),run=s=>vm.runInContext(s,ctx);
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'discard.js'),'utf8'));run('startGame()');
  const get=s=>JSON.parse(run(`JSON.stringify(${s})`)),el=id=>doc.getElementById(id),click=id=>{el(id).focus();el(id).listeners.click()};
  const play=id=>run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='${id}')}];onHandCard(0)`);
  return{run,get,el,click,play,doc};
}
test('弃牌入口初始为空，默认展示所有出牌历史',()=>{
  const g=setup();assert.equal(g.el('discardPileSummary').textContent,'弃牌 0 张 · 已打出 0 次');g.click('discardPileButton');assert.equal(g.el('discardDialog').open,true);assert.match(g.el('discardCards').innerHTML,/还没有打出/);assert.equal(g.el('discardShowPlayed')['aria-pressed'],'true');
});
test('资产事件均记入历史，装备中的资产不进入实际弃牌',()=>{
  const g=setup();g.play('p45');g.play('resource');assert.equal(g.get('S.playedCards.length'),2);assert.equal(g.get('S.assets.length'),1);assert.equal(g.get('S.discard.length'),1);
  assert.equal(g.el('discardPileSummary').textContent,'弃牌 1 张 · 已打出 2 次');g.click('discardPileButton');let cards=g.el('discardCards').innerHTML;assert.match(cards,/自动手枪/);assert.ok(cards.indexOf('工作动力')<cards.indexOf('自动手枪'));
  g.click('discardShowPile');cards=g.el('discardCards').innerHTML;assert.match(cards,/工作动力/);assert.doesNotMatch(cards,/自动手枪/);
});
test('技能投入和抽到弱点只入弃牌，不冒充打出历史',()=>{
  const g=setup();g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];S.chaos=[{label:'0',mod:0}];investigate();toggleCommit(0);resolveTest();finishTest(S.testResult);S.deck=[{...INVESTIGATOR.deck.find(c=>c.id==='nightmare')}];drawCards(1);render()`);
  assert.equal(g.get('S.playedCards.length'),0);g.click('discardPileButton');g.click('discardShowPile');assert.match(g.el('discardCards').innerHTML,/感知/);assert.match(g.el('discardCards').innerHTML,/缠身梦魇/);
});
test('无效出牌和致命借机攻击不产生成功出牌记录',()=>{
  const g=setup();g.run('S.resources=0');g.play('p45');assert.equal(g.get('S.playedCards.length'),0);
  g.run(`S.resources=5;S.hp=1;S.enemies=[{card:ENCOUNTER[0],hp:2,engaged:true,exhausted:false,location:'study'}]`);g.play('resource');assert.equal(g.get('S.playedCards.length'),0);assert.equal(g.get('S.gameOver'),true);
});
test('同牌重复打出分别记录回合而不合并',()=>{
  const g=setup();g.play('resource');g.run('S.hand=[S.discard.pop()];S.round=2;onHandCard(0)');g.click('discardPileButton');assert.equal(g.get('S.playedCards.length'),2);assert.equal((g.el('discardCards').innerHTML.match(/class="discard-entry"/g)||[]).length,2);assert.match(g.el('discardCards').innerHTML,/第 1 回合/);assert.match(g.el('discardCards').innerHTML,/第 2 回合/);
});
test('弃牌洗回后历史保留，新开游戏清空两种记录',()=>{
  const g=setup();g.play('resource');g.run('S.deck=[];drawCards(1);render()');assert.equal(g.get('S.discard.length'),0);assert.equal(g.get('S.playedCards.length'),1);
  g.click('discardPileButton');g.click('discardShowPile');assert.match(g.el('discardCards').innerHTML,/弃牌堆为空/);g.click('discardShowPlayed');assert.match(g.el('discardCards').innerHTML,/工作动力/);g.click('discardClose');g.run('startGame()');assert.equal(g.get('S.playedCards.length'),0);
});
test('查看切换关闭不改变状态或随机数，恢复滚动焦点',()=>{
  const g=setup();g.play('resource');const before=g.get('S');g.run('Math.random=()=>{throw Error("unexpected shuffle")}');g.click('discardPileButton');assert.equal(g.doc.body.style.overflow,'hidden');g.click('discardShowPile');g.click('discardShowPlayed');g.click('discardClose');assert.deepEqual(g.get('S'),before);assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,'discardPileButton');
});
test('其他弹窗及教学不覆盖，原生关闭事件可恢复',()=>{
  for(const id of ['modal','handCardDialog','cardAtlas','tutorial']){const g=setup();if(id==='modal')g.el(id).classList.add('open');else if(id==='tutorial')g.el(id).hidden=false;else g.el(id).open=true;g.click('discardPileButton');assert.equal(g.el('discardDialog').open,false);}
  const g=setup();g.click('discardPileButton');g.el('discardDialog').close();assert.equal(g.doc.body.style.overflow,'auto');
});
test('内容转义且包含插画和只读用法，没有出牌操作',()=>{
  const g=setup();g.play('resource');g.run(`S.playedCards[0].card.name='<img src=x onerror=alert(1)>'`);g.click('discardPileButton');const cards=g.el('discardCards').innerHTML;assert.match(cards,/&lt;img/);assert.doesNotMatch(cards,/<img|onclick=|onHandCard\(/);assert.match(cards,/discard-art art/);assert.match(cards,/查看用法/);
});
test('弃牌弹窗语义完整，入口放在手牌区域',()=>{
  assert.match(html,/<dialog id="discardDialog"[^>]*aria-labelledby="discardTitle"/);assert.match(html,/discard.js\?v=card-art-1/);assert.match(html.split('<div class="panel hand-panel">')[1].split('<!-- 右栏 -->')[0],/id="discardPileButton"/);
});

test('查阅角色配牌展示完整初始牌组和分类数量，包括弱点',()=>{
  const g=setup();g.click('discardPileButton');g.click('discardShowDeck');
  const cards=g.el('discardCards').innerHTML;assert.equal((cards.match(/class="discard-entry"/g)||[]).length,g.get('INVESTIGATOR.deck.length'));
  for(const c of g.get('INVESTIGATOR.deck'))assert.ok(cards.includes(c.name),c.name);
  assert.match(g.el('discardCount').textContent,/配牌共 10 张/);assert.match(g.el('discardCount').textContent,/资产 2 · 事件 3 · 技能 4 · 弱点 1/);assert.match(g.el('discardDescription').textContent,/不透露抽牌顺序/);
  assert.equal(g.el('discardShowDeck')['aria-pressed'],'true');assert.equal(g.el('discardShowPile')['aria-pressed'],'false');assert.equal(g.el('discardShowPlayed')['aria-pressed'],'false');
});

test('配牌查阅独立于当前手牌、抽牌堆、弃牌及出牌历史',()=>{
  const g=setup();g.run('S.hand=[];S.deck=[];S.discard=[];S.playedCards=[]');g.click('discardPileButton');g.click('discardShowDeck');const before=g.el('discardCards').innerHTML;
  g.run(`S.hand=[{id:'not-in-deck',name:'不属于角色配牌',type:'event',text:'未知'}];S.deck=S.hand.slice();S.playedCards=[{card:S.hand[0],round:1}]`);g.click('discardShowDeck');assert.equal(g.el('discardCards').innerHTML,before);assert.doesNotMatch(g.el('discardCards').innerHTML,/不属于角色配牌/);
});

test('角色配牌含费用、插画、效果和用法，不提供出牌或取牌操作',()=>{
  const g=setup();g.click('discardPileButton');g.click('discardShowDeck');const cards=g.el('discardCards').innerHTML;
  assert.match(cards,/3 资源 \+ 1 行动 · 1 只手槽/);assert.match(cards,/不使用普通出牌费用/);assert.match(cards,/discard-art art/);assert.match(cards,/查看用法/);assert.doesNotMatch(cards,/onclick=|onHandCard\(/);
});

test('查阅和分类切换不改变游戏状态或配牌定义，关闭后重开仍默认历史',()=>{
  const g=setup();const state=g.get('S'),deck=g.get('INVESTIGATOR.deck');g.run('Math.random=()=>{throw Error("unexpected randomness")}');g.click('discardPileButton');g.click('discardShowDeck');g.click('discardShowPile');g.click('discardShowPlayed');g.click('discardClose');assert.deepEqual(g.get('S'),state);assert.deepEqual(g.get('INVESTIGATOR.deck'),deck);
  g.click('discardPileButton');assert.equal(g.el('discardShowPlayed')['aria-pressed'],'true');assert.equal(g.el('discardShowDeck')['aria-pressed'],'false');
});
