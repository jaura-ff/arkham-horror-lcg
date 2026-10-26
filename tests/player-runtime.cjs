const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function game(id='roland',opening=true){
 const nodes=new Map();const doc={body:{style:{}},getElementById:get,createElement:()=>({innerHTML:'',className:''})};
 function get(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,style:{setProperty(){}},dataset:{},hidden:true,inert:false,innerHTML:'',textContent:'',value:id==='difficultySelect'?'standard':'',listeners:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},appendChild(){},focus(){},querySelector(){return null},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}});}return nodes.get(id);}
 const ctx=vm.createContext({document:doc,Math:Object.assign(Object.create(Math),{random:()=>.25}),structuredClone,console});ctx.window=ctx;ctx.globalThis=ctx;
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 for(const f of ['official-core.js','official-cards.js','official-card-rules.js','official-decks.js','official-session.js','official-tests.js','player-catalogue.js','player-runtime.js'])run(fs.readFileSync(path.join(root,f),'utf8'));
 run(`ArkhamPlayerRuntime.select('${id}');startGame()`);
 function pick(label){const c=run('S.playerChoice');assert.ok(c,'expected a choice: '+label);const index=typeof label==='number'?label:c.options.findIndex(o=>o.label.includes(label));assert.ok(index>=0,'choice missing: '+label+' in '+c.options.map(o=>o.label).join('|'));run(`playerPick(${c.nonce},${index})`);}
 if(opening)pick('开始调查');
 const add=(code,zone='hand')=>run(`(()=>{const c=ArkhamPlayerRuntime.card('${code}');c.instanceId+=':test:'+Math.random()+S.${zone==='assets'?'player.assets':zone}.length;${zone==='assets'?'S.player.assets':'S.'+zone}.push(c);${zone==='assets'?'render();':''}return c.instanceId})()`);
 const settle=(label='不发动')=>{let max=30;while(run('!!S.playerChoice')&&max--){const c=run('S.playerChoice'),i=c.options.findIndex(o=>o.label.includes(label)||o.label==='不发动'||o.label.includes('不打出')||o.label.includes('不拿取'));pick(i>=0?i:0);}assert.ok(max>0);};
 return{run,json,pick,get,add,settle};
}
test('五位调查员实际开局、33张独立牌组、5张无弱点起手、身份及属性正确',()=>{
 for(const [id,hp,san,int] of [['roland',9,5,3],['daisy',5,9,5],['skids',8,6,3],['agnes',6,8,2],['wendy',7,7,3]]){
  const g=game(id);assert.deepEqual(g.json('[S.player.investigator,S.hp,S.sanity,skillValue("int")]'),[id,hp,san,int]);
  assert.equal(g.run('S.hand.length'),5);assert.equal(g.run('S.deck.length'),28);assert.equal(g.run('S.hand.some(c=>c.type==="weak")'),false);assert.equal(g.run('S.player.stage'),'playing');assert.equal(g.run('canAct()'),true);
  assert.equal(g.run('new Set([...S.hand,...S.deck].map(c=>c.instanceId)).size'),33);
 }
});
test('换牌只允许一次，选中起手牌会换回牌组，不消耗行动资源',()=>{
 const g=game('daisy',false),before=g.run('S.hand[0].instanceId');g.pick(0);g.pick('开始调查');assert.equal(g.run(`S.deck.some(c=>c.instanceId===${JSON.stringify(before)})`),true);assert.deepEqual(g.json('[S.actions,S.resources,S.player.mulliganUsed]'),[3,5,true]);
});
test('角色浏览与确定分离，游戏中不能换人，肖像文字不再冒用罗兰',()=>{
 const g=game('daisy');g.run("playerSelect('wendy')");assert.equal(g.run('S.player.investigator'),'daisy');assert.match(g.get('investigator').innerHTML,/黛西/);assert.doesNotMatch(g.get('investigator').innerHTML,/罗兰.*肖像/);assert.match(g.get('mapwrap').innerHTML,/黛西·沃克的当前位置/);
});
test('基本抽牌和资源、最后一个行动移动可用且只扣一次行动',()=>{
 const g=game();g.run('S.enemies=[];S.deck=S.deck.filter(c=>c.type!=="weak");draw();resource();doMove("hallway")');assert.equal(g.run('S.location'),'hallway');assert.equal(g.run('S.actions'),0);assert.equal(g.run('S.resources'),6);assert.equal(g.run('S.hand.length'),6);
});
test('检定取消不扣行动，确认调查采用当前人物智慧，成功发现线索',()=>{
 const g=game('daisy');g.run('S.hand=[];investigate();cancelTest()');assert.equal(g.run('S.actions'),3);g.run('S.chaos=[{label:"0",mod:0}];investigate();resolveTest();finishTest()');assert.deepEqual(g.json('[S.actions,S.clues,S.locClues.study,S.test,S.playerBusy]'),[2,1,1,null,false]);
});
test('.45手枪真实支付4资源并获得4弹药，攻击消耗弹药，武器不堆叠',()=>{
 const g=game();g.run('S.hand=[];S.resources=9');g.add('01016');g.run('onHandCard(0)');assert.deepEqual(g.json('[S.actions,S.resources,S.player.assets[0].uses.ammo]'),[2,5,4]);g.add('01020','assets');
 g.run('S.enemies=[{card:{...ENCOUNTER[0],hp:9},hp:9,location:"study",engaged:true,exhausted:false}];S.chaos=[{label:"0",mod:0}];fight()');g.pick('.45 自动手枪');g.pick(0);g.run('resolveTest();finishTest()');g.settle();assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.ammo,S.enemies[0].hp]'),[1,3,7]);
});
test('斯基兹花2资源买1行动，每回合一次；没有资源不出现发动选项',()=>{
 const g=game('skids');g.run('playerAbilities()');g.pick('2 资源换');assert.deepEqual(g.json('[S.resources,S.actions,S.turnActions]'),[3,4,4]);g.run('playerAbilities()');assert.doesNotMatch(g.run('S.playerChoice.options.map(o=>o.label).join()'),/2 资源换/);g.pick('返回');
});
test('温蒂在应用符号前真正取消、支付弃牌并重抽，未被选牌不会被弃置',()=>{
 const g=game('wendy');g.run('S.hand=[]');g.add('01093');g.run('S.chaos=[{label:"自动失败",autofail:true}];investigate();resolveTest()');assert.match(g.get('modalBox').innerHTML,/温蒂/);g.pick('弃置');assert.equal(g.run('S.discard.length'),1);assert.equal(g.run('S.player.test.wendyUsed'),true);g.run('finishTest()');assert.equal(g.run('S.actions'),2);assert.equal(g.run('S.clues'),0);
});
test('黛西没有普通行动时仍能使用一次典籍行动，取消检定不提前消耗',()=>{
 const g=game('daisy');g.add('01035','assets');g.run('S.actions=0;S.hp=4;playerAbilities()');g.pick('医学文献');g.run('cancelTest()');assert.equal(g.run('S.player.ability.daisyTurn'),null);
 g.run('S.chaos=[{label:"0",mod:0}];playerAbilities()');g.pick('医学文献');g.run('resolveTest()');g.pick('典籍额外行动');g.run('finishTest()');assert.equal(g.run('S.hp'),5);assert.equal(g.run('S.actions'),0);
 g.run('playerAbilities()');assert.doesNotMatch(g.run('S.playerChoice.options.map(o=>o.label).join()'),/医学文献/);g.pick('返回');
});
test('艾格尼丝本人受恐惧可选目标，每阶段一次；分配给资产不触发',()=>{
 const g=game('agnes');g.run('S.enemies=[{card:{...ENCOUNTER[0],hp:6},hp:6,location:"study",engaged:true,exhausted:false}];applyPlayerLoss(0,1,"测试")');g.pick(0);assert.deepEqual(g.json('[S.sanity,S.enemies[0].hp]'),[7,5]);
 g.run('applyPlayerLoss(0,1,"测试2")');assert.equal(g.run('S.enemies[0].hp'),5);assert.equal(g.run('!!S.playerChoice'),false);
 const h=game('agnes');h.add('01059','assets');h.run('S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}];applyPlayerLoss(0,1,"测试")');h.pick('神圣念珠');assert.equal(h.run('S.sanity'),8);assert.equal(h.run('S.player.assets[0].horror'),1);assert.equal(h.run('S.enemies[0].hp'),2);
});
test('全部基础盒资产可真实装备，使用各自槽位和初始化次数',()=>{
 const cards=require('../official-cards.js');
 for(const c of Object.values(cards).filter(c=>c.type_code==='asset'&&!c.subtype_code)){
  const g=game();g.run('S.hand=[];S.resources=20');g.add(c.code);g.run('onHandCard(0)');g.settle();assert.equal(g.run('S.player.assets.length'),1,c.code);assert.equal(g.run('S.player.assets[0].code'),c.code);assert.equal(g.run('S.resources'),20-c.cost,c.code);assert.equal(g.run('S.actions'),c.code==='01048'?3:c.code==='01030'||c.code==='01044'?3:2,c.code);
 }
});
test('每种弱点分别揭示结算，永久威胁与黑暗记忆不会误弃',()=>{
 for(const code of ['01007','01009','01011','01013','01015','01096','01097','01098','01099','01100','01101','01102','01103']){
  const g=game();g.run('S.deck=[];S.hand=[]');g.add('01093');g.add('01090');g.add(code,'deck');g.run('drawCards(1)');g.settle();
  if(['01007','01009','01011','01098','01099','01100'].includes(code))assert.equal(g.run('S.player.threats[0].code'),code);
  else if(code==='01013')assert.equal(g.run('S.hand.some(c=>c.code==="01013")'),true);
  else if(['01101','01102','01103'].includes(code))assert.equal(g.run('S.enemies[0].card.code'),code);
  else assert.equal(g.run(`S.discard.some(c=>c.code==='${code}')`),true,code);
  assert.equal(g.run('S.weaknessReveal'),null,code);assert.equal(g.run('S.playerBusy'),false,code);
 }
});
test('医院债务每轮最多支付2次，威胁移除要花2行动，不触发误扣理智',()=>{
 const g=game('skids');g.run('S.deck=[]');g.add('01011','deck');g.run('drawCards(1);playerAbilities()');g.pick('医院债务');g.run('playerAbilities()');g.pick('医院债务');g.run('playerAbilities()');assert.doesNotMatch(g.run('S.playerChoice.options.map(o=>o.label).join()'),/医院债务/);g.pick('返回');assert.deepEqual(g.json('[S.resources,S.player.threats[0].resources,S.actions]'),[3,2,3]);
 const h=game();h.run('S.deck=[]');h.add('01098','deck');h.run('drawCards(1);playerAbilities()');h.pick('闹鬼');assert.deepEqual(h.json('[S.actions,S.player.threats.length,S.sanity]'),[1,0,5]);
});
test('伤害与恐惧同时分配，资产可吸收且被击败后正确弃置',()=>{
 const g=game();g.add('01021','assets');g.run('applyPlayerLoss(3,1,"测试")');g.pick('看门狗');g.pick('看门狗');g.pick('看门狗');g.pick('看门狗');assert.deepEqual(g.json('[S.hp,S.sanity,S.player.assets.length,S.discard.at(-1).code]'),[9,5,0,'01021']);
});
test('反应闪躲正确取消整次借机攻击，普通出牌费用照付',()=>{
 const g=game();g.run('S.hand=[];S.resources=8');g.add('01023');g.add('01016');g.run('S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}];onHandCard(1)');g.pick('打出闪躲');assert.deepEqual(g.json('[S.hp,S.sanity,S.resources,S.actions,S.player.assets.length]'),[9,5,3,2,1]);
});
test('阶段循环正确更新回合、恢复次数限制和额外行动，维持弱点结算后再给资源',()=>{
 const g=game('skids');g.run('S.hand=[];S.deck=[]');g.add('01097','deck');g.run('endTurn();enterPhase()');assert.equal(g.run('S.resources'),1);assert.equal(g.run('S.phase'),'upkeep');g.run('S.encounter=[{...ENCOUNTER[3]}];enterPhase();enterPhase()');assert.deepEqual(g.json('[S.round,S.phase,S.actions]'),[2,'investigation',3]);
});
test('新角色三个章节保留同一人物、牌组和能力状态，不能重复进入章节重置行动',()=>{
 for(const id of ['daisy','skids','agnes','wendy']){
  const g=game(id);g.run('S.location="attic";S.actIdx=1;finish();continueChapter();beginChapter()');assert.equal(g.run('S.chapter'),2,id);assert.equal(g.run('S.player.investigator'),id);const before=g.run('S.playerTurn');g.run('S.actions=1;continueChapter()');assert.equal(g.run('S.playerTurn'),before);assert.equal(g.run('S.actions'),1);
  g.run('S.actions=3;S.location="altar";S.actIdx=3;S.hand=[];S.chaos=[{label:"+9",mod:9}];finish();resolveTest();finishTest();continueChapter();beginChapter()');assert.equal(g.run('S.chapter'),3,id);assert.equal(g.run('S.player.investigator'),id);
 }
});
test('主动资产能力真实支付使用次数、力竭与弃置，完成后不会卡住行动',()=>{
 for(const [code,label] of [['01018','巡警'],['01019','急救'],['01031','古老智慧之书'],['01035','医学文献'],['01045','入室行窃'],['01058','禁忌知识'],['01061','占卜'],['01063','奥术学徒'],['01076','流浪猫'],['01087','手电筒']]){
  const g=game();g.run('S.hand=[];S.resources=10;S.hp=8;S.chaos=[{label:"0",mod:0}];S.enemies=[{card:{...ENCOUNTER[0],hp:8},hp:8,location:"study",engaged:false,exhausted:false}]');g.add(code,'assets');
  g.run('playerAbilities()');g.pick(label);
  if(g.run('!!S.test'))g.run('resolveTest();finishTest()');
  g.settle();assert.equal(g.run('S.playerBusy'),false,code);assert.equal(g.run('!!S.playerChoice'),false,code);assert.equal(g.run('S.test'),null,code);
  if(code==='01058')assert.deepEqual(g.json('[S.resources,S.sanity,S.player.assets[0].uses.secrets,S.player.assets[0].exhausted]'),[11,4,3,true]);
  if(code==='01087')assert.equal(g.run('S.player.assets[0].uses.supplies'),2);
  if(code==='01076')assert.deepEqual(g.json('[S.enemies[0].engaged,S.enemies[0].exhausted,S.player.assets.length]'),[false,true,0]);
 }
});
test('主动事件、快速事件和法术皆有实际效果；快速出牌不消耗行动',()=>{
 for(const code of ['01010','01013','01024','01036','01037','01038','01050','01051','01052','01064','01066','01078','01088']){
  const g=game('skids');g.run('S.hand=[];S.resources=10;S.revealed.hallway=true;S.chaos=[{label:"+5",mod:5}];S.enemies=[{card:{...ENCOUNTER[0],hp:8},hp:8,location:"study",engaged:true,exhausted:true}];S.encounter=[{...ENCOUNTER[3]}]');g.add(code);if(code==='01066')g.run('S.enemies[0].exhausted=false');
  g.run('onHandCard(0)');
  // Choose target/destination before a combat or evade test starts.
  if(g.run('!!S.playerChoice'))g.settle();
  if(g.run('!!S.test'))g.run('resolveTest();finishTest()');g.settle();
  assert.equal(g.run('S.playerBusy'),false,code);assert.equal(g.run('!!S.playerChoice'),false,code);
  assert.equal(g.run(`S.playedCards.some(e=>e.card.code==='${code}')`),true,code);
  if(['01010','01036','01037','01050'].includes(code))assert.equal(g.run('S.actions'),3,code);
  if(code==='01088')assert.equal(g.run('S.resources'),13);
  if(code==='01038')assert.equal(g.run('S.player.attachments.length'),1);
 }
});
test('投入技能含资产及事件图标，同名上限生效；感知成功抽牌不再只有数值',()=>{
 const g=game('daisy');g.run('S.hand=[];S.chaos=[{label:"0",mod:0}]');g.add('01090');g.add('01090');g.add('01030');g.run('investigate();toggleCommit(0);toggleCommit(1)');assert.equal(g.run('S.committed.length'),1);g.run('toggleCommit(2)');assert.equal(g.run('S.committed.length'),2);g.run('resolveTest();finishTest()');g.pick('发动');assert.equal(g.run('S.hand.length'),2);assert.equal(g.run('S.discard.filter(c=>c.code==="01090").length'),1);
});
test('技能加值资源在确认时支付，取消可返回，确认后不能重复支付',()=>{
 const g=game();g.add('01034','assets');g.run('S.hand=[];investigate();playerBoost(S.player.assets[0].instanceId)');assert.equal(g.run('S.resources'),5);g.run('cancelTest()');assert.equal(g.run('S.resources'),5);
 g.run('S.chaos=[{label:"0",mod:0}];investigate();playerBoost(S.player.assets[0].instanceId);resolveTest();resolveTest();finishTest()');assert.equal(g.run('S.resources'),4);assert.equal(g.run('S.actions'),2);
});
test('真实槽位替换由玩家选择，双手球棍占两槽，手提袋只增加典籍容量',()=>{
 const g=game();g.run('S.hand=[];S.resources=10');g.add('01016','assets');g.add('01087','assets');g.add('01074');g.run('onHandCard(0)');g.pick('.45 自动手枪');g.pick('手电筒');assert.equal(g.run('S.player.assets.length'),1);assert.equal(g.run('S.player.assets[0].code'),'01074');assert.equal(g.run('S.discard.length'),2);
 const h=game('daisy');h.run('S.hand=[];S.resources=10');h.add('01008','assets');h.add('01031','assets');h.add('01035','assets');h.add('01074');h.run('onHandCard(0)');assert.equal(h.run('S.player.assets.length'),4);assert.equal(h.run('!!S.playerChoice'),false);
});
test('死灵之书的上古印记覆盖自动失败，移完3恐惧才弃置',()=>{
 const g=game('daisy');g.run('S.deck=[];S.hand=[];S.chaos=[{label:"上古印记",elder:true}]');g.add('01009','deck');g.run('drawCards(1);investigate();resolveTest()');assert.equal(g.run('S.test.playerResult.autofail'),true);g.run('finishTest();S.actions=3');for(let i=0;i<3;i++){g.run('playerAbilities()');g.pick('死灵之书');if(g.run('!!S.playerChoice'))g.pick('典籍额外行动');}assert.equal(g.run('S.player.threats.length'),0);assert.equal(g.run('S.sanity'),6);
});
test('温蒂取消石板后不承受其伤害，护符可从弃牌堆重打事件且放到牌组底',()=>{
 const g=game('wendy');g.run('S.hand=[];S.chaos=[{label:"石板",symbol:"tablet"},{label:"0",mod:0}];S.enemies=[{card:{...ENCOUNTER[0],fight:1},hp:2,location:"study",engaged:true,exhausted:false}]');g.add('01093');g.run('fight()');g.pick('徒手');g.pick(0);g.run('resolveTest();Math.random=()=>0');g.pick('弃置');g.run('finishTest()');assert.equal(g.run('S.hp'),7);assert.equal(g.run('S.enemies[0].hp'),1);
 const h=game('wendy');h.run('S.hand=[]');h.add('01014','assets');h.add('01088','discard');h.run('playerAbilities()');h.pick('护符重打');assert.equal(h.run('S.resources'),8);assert.equal(h.run('S.deck[0].code'),'01088');assert.equal(h.run('S.discard.some(c=>c.code==="01088")'),false);
});
test('检定玩家窗口可打出快速放大镜，回到原检定且不多扣行动',()=>{
 const g=game('daisy');g.run('S.hand=[];S.chaos=[{label:"0",mod:0}]');g.add('01030');g.run('investigate();playerTestAbilities()');g.pick('放大镜');assert.equal(g.run('S.test.label'),'调查');assert.equal(g.run('S.player.assets[0].code'),'01030');assert.equal(g.run('S.resources'),4);assert.equal(g.run('S.actions'),3);g.run('resolveTest();finishTest()');assert.equal(g.run('S.actions'),2);assert.equal(g.run('S.clues'),1);
});
test('未结算的选择不能被返回菜单、下一阶段或重复确认打断',()=>{
 const g=game('daisy',false),before=g.run('S.phase');g.run('requestReturnMenu();next();enterPhase();closeModal()');assert.equal(g.run('pendingNavigation'),false);assert.equal(g.run('S.phase'),before);assert.equal(g.run('!!S.playerChoice'),true);const nonce=g.run('S.playerChoice.nonce');g.pick('开始调查');g.run(`playerPick(${nonce},0)`);assert.equal(g.run('S.playerBusy'),false);assert.equal(g.run('S.player.mulliganUsed'),true);
});
test('固定弱点占手槽时不能强行装备双手武器，拒绝出牌不扣费用',()=>{
 const g=game('daisy');g.run('S.hand=[];S.deck=[]');g.add('01009','deck');g.run('drawCards(1)');g.add('01074');g.run('onHandCard(0)');assert.deepEqual(g.json('[S.resources,S.actions,S.player.assets.length,S.hand.length]'),[5,3,0,1]);
});
test('所有武器攻击、失败耗弹、枯萎术后果和球棍弃置走真实结算',()=>{
 for(const code of ['01006','01016','01020','01044','01047','01060','01074','01086']){
  const g=game('roland');g.run('S.hand=[];S.chaos=[{label:"+5",mod:5}];S.enemies=[{card:{...ENCOUNTER[0],hp:20},hp:20,engaged:true,exhausted:false,location:"study"}]');g.add(code,'assets');g.run('fight()');g.pick(1);g.pick(0);g.run('resolveTest();finishTest()');assert.equal(g.run('S.enemies[0].hp'),code==='01086'?19:18,code);assert.equal(g.run('S.actions'),2,code);
 }
 const gun=game();gun.run('S.hand=[];S.chaos=[{label:"自动失败",autofail:true}];S.enemies=[{card:ENCOUNTER[0],hp:2,engaged:true,exhausted:false,location:"study"}]');gun.add('01016','assets');gun.run('fight()');gun.pick('.45');gun.pick(0);gun.run('resolveTest();finishTest()');assert.equal(gun.run('S.player.assets[0].uses.ammo'),3);assert.equal(gun.run('S.enemies[0].hp'),2);
 const bat=game();bat.run('S.hand=[];S.chaos=[{label:"骷髅",symbol:"skull"}];S.enemies=[{card:ENCOUNTER[0],hp:2,engaged:true,exhausted:false,location:"study"}]');bat.add('01074','assets');bat.run('fight()');bat.pick('棒球棍');bat.pick(0);bat.run('resolveTest();finishTest()');bat.settle();assert.equal(bat.run('S.player.assets.length'),0);assert.equal(bat.run('S.discard.at(-1).code'),'01074');
});
test('条件反应守护之咒会取消遭遇且承受恐惧；好运可改变失败结果',()=>{
 const g=game('agnes');g.run('S.hand=[];S.encounter=[{...ENCOUNTER[3]}]');g.add('01065');g.run('drawEncounter()');g.pick('打出守护之咒');assert.equal(g.run('S.doom'),0);assert.equal(g.run('S.sanity'),7);assert.equal(g.run('S.resources'),4);assert.equal(g.run('S.encounterDiscard.length'),1);
 const h=game('wendy');h.run('S.hand=[];S.chaos=[{label:"-2",mod:-2}]');h.add('01080');h.run('investigate();resolveTest()');h.pick('保留');h.pick('打出好运');h.run('finishTest()');assert.deepEqual(h.json('[S.clues,S.resources,S.actions]'),[1,4,2]);
});
test('罗兰击杀线索为可选且每轮一次，胜利点不被错误当成额外地点线索',()=>{
 const g=game();g.run('S.hand=[];S.enemies=[{card:{...ENCOUNTER[2],hp:1},hp:1,engaged:true,exhausted:false,location:"study"}];ArkhamPlayerRuntime.damageEnemy(S.enemies[0],1,()=>{})');g.pick('发动');assert.equal(g.run('S.clues'),1);assert.equal(g.run('S.victory.length'),1);assert.equal(g.run('S.locClues.study'),1);
});
test('五种上古印记在实际检定中使用当前角色规则，而非固定罗兰加值',()=>{
 for(const id of ['roland','daisy','skids','agnes','wendy']){
  const g=game(id);g.run('S.hand=[];S.deck=[];S.chaos=[{label:"上古印记",elder:true}]');g.add('01093','deck');
  if(id==='daisy')g.add('01031','assets');if(id==='wendy')g.add('01014','assets');if(id==='agnes')g.run('S.sanity-=2');
  g.run('investigate();resolveTest()');if(id==='wendy')assert.equal(g.run('S.test.playerResult.automaticSuccess'),true);
  assert.ok(g.get('modalBox').innerHTML.includes(g.run('INVESTIGATOR.name')));
  g.run('finishTest()');g.settle('发动');assert.equal(g.run('S.clues'),1,id);
  if(id==='skids')assert.equal(g.run('S.resources'),7);if(id==='daisy')assert.equal(g.run('S.hand.length'),1);
 }
});
test('法术事件完整结算后才触发传家宝抽牌，资源和行动各只扣一次',()=>{
 const g=game('agnes');g.run('S.hand=[];S.deck=[];S.chaos=[{label:"0",mod:0}];S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}]');g.add('01012','assets');g.add('01066');g.add('01093','deck');g.run('onHandCard(0)');g.pick(0);g.run('resolveTest();finishTest()');assert.equal(g.run('S.enemies[0].exhausted'),true);assert.equal(g.run('S.enemies[0].hp'),1);g.pick('发动');assert.equal(g.run('S.hand.length'),1);assert.deepEqual(g.json('[S.resources,S.actions]'),[3,2]);
});
test('耗尽的资产重新打出后恢复印刷次数，查阅初始牌组按编号而非洗牌顺序',()=>{
 const g=game();g.run('S.hand=[];S.resources=10');g.add('01087');g.run('S.hand[0].uses.supplies=0;S.hand[0].exhausted=true;onHandCard(0)');assert.deepEqual(g.json('[S.player.assets[0].uses.supplies,S.player.assets[0].exhausted]'),[3,false]);
 const codes=g.json('S.initialPlayerDeck.map(c=>c.code)');assert.deepEqual(codes,[...codes].sort());
});
