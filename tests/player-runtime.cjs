const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function game(id='roland',opening=true){
 const nodes=new Map();const doc={body:{style:{}},getElementById:get,createElement:()=>({innerHTML:'',className:''})};
 function get(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,style:{setProperty(){}},dataset:{},hidden:true,inert:false,innerHTML:'',textContent:'',value:id==='difficultySelect'?'standard':'',listeners:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute(){},addEventListener(k,f){this.listeners[k]=f},appendChild(){},focus(){},querySelector(){return null},querySelectorAll(){return []},showModal(){this.open=true},close(){this.open=false}});}return nodes.get(id);}
 const ctx=vm.createContext({document:doc,Math:Object.assign(Object.create(Math),{random:()=>.25}),structuredClone,console});ctx.window=ctx;ctx.globalThis=ctx;
 const run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
 run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 for(const f of ['official-core.js','official-cards.js','official-card-rules.js','official-decks.js','official-session.js','official-tests.js','player-catalogue.js','card-art.js','player-runtime.js'])run(fs.readFileSync(path.join(root,f),'utf8'));
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
test('实际发牌逐张符合FFG起始牌表v2第2至4页，含各自专属牌弱点和中立牌数量',()=>{
 // Independent transcription of printed collector numbers and copy counts,
 // rather than generating expectations from starterManifest's group ranges.
 const printed={
  roland:[6,7,16,17,18,19,20,21,22,23,24,25,30,31,32,33,34,35,36,37,38,39,86,86,87,87,88,88,89,89,92,92],
  daisy:[8,9,30,31,32,33,34,35,36,37,38,39,58,59,60,61,62,63,64,65,66,67,86,86,87,87,88,88,90,90,92,92],
  skids:[10,11,16,17,18,19,20,21,22,23,24,25,44,45,46,47,48,49,50,51,52,53,86,86,87,87,88,88,89,89,91,91],
  agnes:[12,13,58,59,60,61,62,63,64,65,66,67,72,73,74,75,76,77,78,79,80,81,86,86,87,87,88,88,90,90,93,93],
  wendy:[14,15,44,45,46,47,48,49,50,51,52,53,72,73,74,75,76,77,78,79,80,81,86,86,87,87,88,88,91,91,93,93]
 };
 const allowed={roland:['guardian','seeker'],daisy:['seeker','mystic'],skids:['rogue','guardian'],agnes:['mystic','survivor'],wendy:['survivor','rogue']};
 for(const [id,numbers]of Object.entries(printed)){
  const expected=numbers.map(n=>'01'+String(n).padStart(3,'0')).sort(),g=game(id,false);
  for(const cards of [g.json('S.initialPlayerDeck'),g.json('[...S.hand,...S.deck]')]){
   const basics=cards.filter(c=>c.subtype_code==='basicweakness');assert.equal(basics.length,1,id);
   assert.deepEqual(cards.filter(c=>c.subtype_code!=='basicweakness').map(c=>c.code).sort(),expected,id);
   assert.ok(cards.every(c=>allowed[id].includes(c.faction_code)||c.faction_code==='neutral'),id);
   assert.deepEqual(Object.fromEntries(['asset','event','skill','weak'].map(type=>[type,cards.filter(c=>c.type===type).length])),{asset:id==='skids'?16:17,event:id==='skids'?9:8,skill:6,weak:2},id);
  }
  const manifest=g.json(`ArkhamOfficialCore.starterManifest('${id}').counts`),counts={};for(const code of expected)counts[code]=(counts[code]||0)+1;assert.deepEqual(manifest,counts,id);
  g.pick('开始调查');assert.deepEqual(g.json('[...S.hand,...S.deck].filter(c=>c.subtype_code!=="basicweakness").map(c=>c.code).sort()'),expected,id);
 }
});
test('调查员主职业对应五色，牌组里的副职业牌与中立牌保持自身颜色',()=>{
 for(const [id,faction,label]of [['roland','guardian','蓝家'],['daisy','seeker','黄家'],['skids','rogue','绿家'],['agnes','mystic','紫家'],['wendy','survivor','红家']]){
  const g=game(id,false);assert.equal(g.get('investigator').dataset.faction,faction);assert.match(g.get('investigator').innerHTML,new RegExp(label));
  const original=g.json('[S.actions,S.resources,S.hand.map(c=>c.instanceId),S.deck.map(c=>c.instanceId)]');
  for(const card of g.json('S.hand'))assert.ok(g.get('modalBox').innerHTML.includes('data-faction="'+card.faction_code+'"'));
  g.run('render()');assert.deepEqual(g.json('[S.actions,S.resources,S.hand.map(c=>c.instanceId),S.deck.map(c=>c.instanceId)]'),original);
 }
 const g=game('wendy');g.run('S.hand=[]');for(const code of ['01016','01030','01044','01060','01074','01088','01014','01015'])g.add(code);
 g.run('render()');const cards=g.json('S.hand');assert.deepEqual(cards.map(c=>c.faction_code),['guardian','seeker','rogue','mystic','survivor','neutral','neutral','neutral']);
 for(const card of cards)assert.ok(g.get('hand').innerHTML.includes('data-faction="'+card.faction_code+'"'));
 assert.match(g.get('hand').innerHTML,/蓝家 · 守护者/);assert.match(g.get('hand').innerHTML,/中立/);
});
test('换牌只允许一次，选中起手牌会换回牌组，不消耗行动资源',()=>{
 const g=game('daisy',false),before=g.run('S.hand[0].instanceId');
 const opening=g.get('modalBox').innerHTML;
 assert.equal((opening.match(/class="player-opening-art art"/g)||[]).length,5);
 for(const card of g.json('S.hand')){assert.ok(opening.includes(card.name));assert.ok(opening.includes(card.text));}
 assert.match(opening,/费用 \d+ 资源|投入检定/);
 assert.doesNotMatch(opening,/[□☑]/);assert.match(opening,/其余牌会保留/);
 const unchanged=g.json('[S.hand.map(c=>c.instanceId),S.deck.map(c=>c.instanceId),S.actions,S.resources]');
 g.pick(0);assert.match(g.get('modalBox').innerHTML,/确认更换起手牌/);assert.match(g.get('modalBox').innerHTML,/player-opening-art art/);
 g.pick('返回');assert.doesNotMatch(g.get('modalBox').innerHTML,/已选更换<|已选更换 /);assert.deepEqual(g.json('[S.hand.map(c=>c.instanceId),S.deck.map(c=>c.instanceId),S.actions,S.resources]'),unchanged);
 g.pick(0);g.pick('确认更换');assert.match(g.get('modalBox').innerHTML,/aria-pressed="true"/);assert.match(g.get('modalBox').innerHTML,/已选更换 /);
 assert.deepEqual(g.json('[S.hand.map(c=>c.instanceId),S.deck.map(c=>c.instanceId),S.actions,S.resources]'),unchanged);
 g.pick(0);assert.doesNotMatch(g.get('modalBox').innerHTML,/aria-pressed="true"/);g.pick(0);g.pick('确认更换');
 g.pick('开始调查');assert.equal(g.run(`S.deck.some(c=>c.instanceId===${JSON.stringify(before)})`),true);assert.deepEqual(g.json('[S.actions,S.resources,S.player.mulliganUsed]'),[3,5,true]);
});
test('角色浏览与确定分离，游戏中不能换人，肖像文字不再冒用罗兰',()=>{
 const g=game('daisy');g.run("playerSelect('wendy')");assert.equal(g.run('S.player.investigator'),'daisy');assert.match(g.get('investigator').innerHTML,/黛西/);assert.doesNotMatch(g.get('investigator').innerHTML,/罗兰.*肖像/);assert.match(g.get('mapwrap').innerHTML,/黛西·沃克的当前位置/);
});
test('武器、能力、伤害分配与弃牌选项保留真实卡图及文字，普通返回不伪装成卡牌',()=>{
 const g=game();g.run('S.hand=[]');g.add('01016','assets');g.add('01019','assets');
 const state=g.json('[S.actions,S.resources,S.player.assets.map(c=>c.instanceId)]');
 g.run('playerAbilities()');let box=g.get('modalBox').innerHTML;assert.match(box,/player-opening-art art/);assert.match(box,/急救/);assert.doesNotMatch(box,/<button[^>]*player-opening-card[^>]*>返回游戏/);g.pick('返回');
 assert.deepEqual(g.json('[S.actions,S.resources,S.player.assets.map(c=>c.instanceId)]'),state);
 g.run('S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}];fight()');box=g.get('modalBox').innerHTML;assert.match(box,/player-opening-art art/);assert.match(box,/\.45 自动手枪/);g.pick('返回');
 g.add('01021','assets');g.run('applyPlayerLoss(1,0,"测试")');box=g.get('modalBox').innerHTML;assert.match(box,/player-opening-art art/);assert.match(box,/看门狗/);g.pick('本人');
 const h=game();h.run('S.hand=[];S.deck=[]');h.add('01016');h.add('01090');h.add('01096','deck');h.run('drawCards(1)');box=h.get('modalBox').innerHTML;assert.equal((box.match(/class="player-opening-art art"/g)||[]).length,3);assert.match(box,/失忆/);h.pick('感知');assert.equal(h.run('S.hand[0].code'),'01090');
});
test('角色配牌清单每种卡含缩略图，检定加值卡与所用武器带图，食尸鬼预览跟随选择',()=>{
 const g=game();const deck=g.get('playerCharacterDetails').innerHTML;assert.equal((deck.match(/class="player-opening-art art"/g)||[]).length,(deck.match(/class="player-deck-entry"/g)||[]).length);assert.match(deck,/player-deck-entry/);
 g.add('01017','assets');g.run('investigate();cancelTest();startTest("combat",2,"测试",()=>{});openTestModal()');assert.match(g.get('modalBox').innerHTML,/player-inline-card/);assert.match(g.get('modalBox').innerHTML,/体能训练/);g.run('cancelTest()');
 g.run('S.encounter=[ENCOUNTER[0],ENCOUNTER[2]];previewGhoulChoice("ghoul3")');const preview=g.get('ghoulChoicePreview').innerHTML;assert.match(preview,/class="art"/);assert.match(preview,/食尸鬼·猎手/);assert.match(preview,/生命 3/);
});
test('基本抽牌和资源、最后一个行动移动可用且只扣一次行动',()=>{
 const g=game();g.run('S.enemies=[];S.deck=S.deck.filter(c=>c.type!=="weak");draw();resource();doMove("hallway")');assert.equal(g.run('S.location'),'hallway');assert.equal(g.run('S.actions'),0);assert.equal(g.run('S.resources'),6);assert.equal(g.run('S.hand.length'),6);
});
test('检定取消不扣行动，确认调查采用当前人物智慧，成功发现线索',()=>{
 const g=game('daisy');g.run('S.hand=[];investigate();cancelTest()');assert.equal(g.run('S.actions'),3);g.run('S.chaos=[{label:"0",mod:0}];investigate();resolveTest();finishTest()');assert.deepEqual(g.json('[S.actions,S.clues,S.locClues.study,S.test,S.playerBusy]'),[2,1,1,null,false]);
});
test('普通调查窗口可选择手电筒，遮蔽最低0，取消不付费，抽取只扣1行动1补给',()=>{
 const g=game();g.run('S.hand=[];S.chaos=[{label:"-9",mod:-9}]');g.add('01087','assets');g.add('01090');
 const id=g.run('S.player.assets[0].instanceId');g.run('investigate();toggleCommit(0)');
 assert.match(g.get('modalBox').innerHTML,/使用手电筒调查/);
 g.run(`playerInvestigationTool(${JSON.stringify(id)})`);assert.deepEqual(g.json('[S.test.difficulty,S.player.test.difficulty,S.actions,S.player.assets[0].uses.supplies,S.committed.length]'),[0,0,3,3,1]);
 assert.match(g.get('modalBox').innerHTML,/地点遮蔽值 2 − 2 ＝ 本次遮蔽值 0/);
 g.run(`playerInvestigationTool(${JSON.stringify(id)});playerInvestigationTool(${JSON.stringify(id)});cancelTest()`);assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.supplies,S.discard.length]'),[3,3,0]);
 g.run(`investigate();playerInvestigationTool(${JSON.stringify(id)});resolveTest();resolveTest();playerInvestigationTool(${JSON.stringify(id)})`);
 assert.equal(g.run('S.test.playerResult.success'),true);assert.equal(g.run('S.test.difficulty'),0);g.run('finishTest()');
 assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.supplies,S.clues,LOCATIONS.study.shroud]'),[2,2,1,2]);
 g.run('investigate()');assert.equal(g.run('S.test.difficulty'),2);
});
test('手电筒不能零补给使用、不能叠加其它调查行动，自动失败照常失败',()=>{
 const g=game();g.run('S.hand=[];S.chaos=[{label:"自动失败",autofail:true}]');g.add('01087','assets');const id=g.run('S.player.assets[0].instanceId');
 g.run(`investigate();playerInvestigationTool(${JSON.stringify(id)});resolveTest();finishTest()`);assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.supplies,S.clues]'),[2,2,0]);
 g.run(`S.player.assets[0].uses.supplies=0;investigate();playerInvestigationTool(${JSON.stringify(id)})`);assert.equal(g.run('S.test.difficulty'),2);assert.equal(g.run('S.test.playerOptions.source'),undefined);assert.match(g.get('modalBox').innerHTML,/剩余补给 0/);g.run('cancelTest()');
 g.run('S.player.assets[0].uses.supplies=3');g.add('01045','assets');g.run('playerAbilities()');g.pick('入室行窃');assert.match(g.get('modalBox').innerHTML,/使用手电筒调查/);g.run(`playerInvestigationTool(${JSON.stringify(id)})`);assert.equal(g.run('S.test.playerOptions.source.code'),'01087');assert.equal(g.run('S.test.playerOptions.resourcesInstead'),false);assert.equal(g.run('S.test.difficulty'),0);assert.equal(g.run('S.player.assets[1].exhausted'),false);
});
test('调查方式切换为入室行窃后只获得资源，切回普通调查与手电筒不会叠加费用效果',()=>{
 const g=game();g.run('S.hand=[];S.chaos=[{label:"0",mod:0}]');g.add('01087','assets');g.add('01045','assets');
 g.run('investigate();playerInvestigationTool(S.player.assets[0].instanceId);playerInvestigationTool(S.player.assets[1].instanceId)');assert.deepEqual(g.json('[S.test.difficulty,S.test.playerOptions.resourcesInstead,S.resources,S.actions,S.player.assets[0].uses.supplies]'),[2,true,5,3,3]);assert.match(g.get('modalBox').innerHTML,/本次成功获得 3 资源/);
 g.run('resolveTest();finishTest()');assert.deepEqual(g.json('[S.resources,S.actions,S.clues,S.player.assets[0].uses.supplies,S.player.assets[1].exhausted]'),[8,2,0,3,true]);
 g.run('investigate();playerInvestigationTool(S.player.assets[1].instanceId)');assert.equal(g.run('S.test.playerOptions.source'),undefined);assert.match(g.get('modalBox').innerHTML,/此牌已力竭/);g.run('playerInvestigationTool(S.player.assets[0].instanceId);playerInvestigationTool(S.player.assets[0].instanceId);resolveTest();finishTest()');assert.deepEqual(g.json('[S.resources,S.actions,S.clues,S.player.assets[0].uses.supplies]'),[8,1,1,3]);
});
test('资产直接入口列出费用且返回不消费，耗尽力竭及条件不足选项不能通过重复确认发动',()=>{
 const g=game();g.run('S.hand=[];S.hp=8');g.add('01019','assets');g.run('inspectAsset(0)');assert.match(g.get('modalBox').innerHTML,/使用能力 1/);assert.match(g.get('modalBox').innerHTML,/剩余补给 3/);g.pick('返回');assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.supplies,S.hp]'),[3,3,8]);
 g.run('inspectAsset(0)');const nonce=g.run('S.playerChoice.nonce');g.pick('使用能力');g.pick('治疗 1 伤害');g.run(`playerPick(${nonce},0)`);assert.deepEqual(g.json('[S.actions,S.player.assets[0].uses.supplies,S.hp]'),[2,2,9]);
 g.run('S.player.assets[0].uses.supplies=0;inspectAsset(0)');assert.match(g.get('modalBox').innerHTML,/补给不足/);assert.match(g.get('modalBox').innerHTML,/disabled/);const blocked=g.run('S.playerChoice.nonce');g.run(`playerPick(${blocked},0)`);assert.equal(g.run('S.playerChoice.nonce'),blocked);assert.equal(g.run('S.actions'),2);g.pick('返回');
 g.add('01031','assets');g.run('S.player.assets[1].exhausted=true;inspectAsset(1)');assert.match(g.get('modalBox').innerHTML,/此牌已力竭/);g.pick('返回');
 g.add('01017','assets');g.run('inspectAsset(2)');assert.match(g.get('modalBox').innerHTML,/请在对应属性的检定窗口中加值/);g.pick('返回');
 g.add('01076','assets');g.run('S.enemies=[{card:{...ENCOUNTER[0],elite:true},hp:2,location:"study",engaged:true,exhausted:false}];inspectAsset(3)');assert.match(g.get('modalBox').innerHTML,/没有符合条件的敌人/);g.pick('使用能力');assert.equal(g.run('S.player.assets.some(c=>c.code==="01076")'),true);g.pick('返回');
 g.run('resolve("R3","测试终局");reviewLastRun()');assert.equal(g.run('ArkhamPlayerRuntime.canUseAsset(S.player.assets[0].instanceId)'),false);g.run('playerAssetAbilities(S.player.assets[0].instanceId)');assert.equal(g.run('!!S.playerChoice'),false);
});
test('战斗选择保留耗尽武器并说明原因，禁用选项不扣行动或改用徒手',()=>{
 const g=game();g.run('S.hand=[];S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}]');g.add('01016','assets');g.run('S.player.assets[0].uses.ammo=0;fight()');assert.match(g.get('modalBox').innerHTML,/剩余弹药 0/);assert.match(g.get('modalBox').innerHTML,/弹药不足/);const nonce=g.run('S.playerChoice.nonce');g.pick('.45 自动手枪');assert.equal(g.run('S.playerChoice.nonce'),nonce);assert.equal(g.run('S.test'),null);assert.equal(g.run('S.actions'),3);g.pick('返回');
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
test('实际弃牌默认展示已结算弱点插画及效果，不冒充仍在威胁区的弱点',()=>{
 const g=game();g.run('S.deck=[]');g.add('01097','deck');g.run('drawCards(1)');g.add('01098','deck');g.run('drawCards(1)');
 g.run(fs.readFileSync(path.join(root,'discard.js'),'utf8'));g.get('discardPileButton').listeners.click();
 const cards=g.get('discardCards').innerHTML;assert.match(cards,/妄想/);assert.match(cards,/失去全部资源/);assert.match(cards,/discard-art art/);assert.match(g.get('discardCount').textContent,/弱点 1 张/);assert.doesNotMatch(cards,/闹鬼/);
 g.get('discardShowPlayed').listeners.click();assert.doesNotMatch(g.get('discardCards').innerHTML,/妄想/);assert.equal(g.run('S.player.threats[0].code'),'01098');assert.equal(g.run('S.discard[0].code'),'01097');
});
test('失败可返回当前棋盘回看，保留来源与结算状态，不能恢复行动或使用卡牌',()=>{
 const g=game();g.run('S.hand=[];S.hp=1;S.enemies=[{card:ENCOUNTER[0],hp:2,location:"study",engaged:true,exhausted:false}]');g.add('01088');
 g.run('applyPlayerLoss(1,1,"食尸鬼 · 借机攻击")');assert.equal(g.run('S.gameOver'),true);assert.match(g.get('modalBox').innerHTML,/返回查看本局/);
 const snapshot=g.json('[S.chapter,S.location,S.hp,S.sanity,S.resources,S.actions,S.clues,S.doom,S.hand,S.deck,S.discard,S.enemies,S.runOutcome]');
 g.run('reviewLastRun()');assert.equal(g.run('S.reviewingRun'),true);assert.equal(g.run('canAct()'),false);assert.equal(g.get('modal').classList.contains('open'),false);assert.match(g.get('actions').innerHTML,/本局回看 · 只读/);assert.doesNotMatch(g.get('hand').innerHTML,/ disabled/);
 g.run('resource();draw();investigate();doMove("hallway");playerAbilities();onHandCard(0);next()');assert.deepEqual(g.json('[S.chapter,S.location,S.hp,S.sanity,S.resources,S.actions,S.clues,S.doom,S.hand,S.deck,S.discard,S.enemies,S.runOutcome]'),snapshot);
 g.run('showRunReviewSummary()');assert.match(g.get('modalBox').innerHTML,/食尸鬼 · 借机攻击/);assert.match(g.get('modalBox').innerHTML,/生命 −1，理智 −1/);assert.match(g.get('modalBox').innerHTML,/失败原因/);g.run('reviewLastRun()');assert.equal(g.run('S.gameOver'),true);
});
test('议程失败的回看保留章节地点末日，胜利回看不会误报失败，未结束时不能进入',()=>{
 const g=game();g.run('reviewLastRun();showRunReviewSummary()');assert.equal(g.run('!!S.reviewingRun'),false);
 g.run('S.chapter=2;S.location="cellar";S.phase="mythos";S.doom=6;resolve("R2","末日达到上限，封印崩塌。");reviewLastRun();showRunReviewSummary()');assert.match(g.get('modalBox').innerHTML,/末日达到上限/);assert.match(g.get('modalBox').innerHTML,/地下窖室/);assert.match(g.get('modalBox').innerHTML,/神话阶段/);assert.match(g.get('modalBox').innerHTML,/末日 6/);assert.deepEqual(g.json('[S.chapter,S.location,S.doom,S.gameOver]'),[2,'cellar',6,true]);
 const h=game();h.run('resolve("R1","调查完成。");reviewLastRun();showRunReviewSummary()');assert.match(h.get('modalBox').innerHTML,/本局结算/);assert.doesNotMatch(h.get('modalBox').innerHTML,/失败原因/);
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
 const g=game();g.run('S.hand=[];S.resources=10');g.add('01016','assets');g.add('01087','assets');g.add('01074');g.run('onHandCard(0)');g.pick('.45 自动手枪');assert.deepEqual(g.json('[S.resources,S.actions,S.discard.length,S.player.assets.length]'),[10,3,0,2]);g.pick('手电筒');assert.match(g.get('modalBox').innerHTML,/确认替换资产/);assert.match(g.get('modalBox').innerHTML,/将弃置 · .45 自动手枪/);assert.match(g.get('modalBox').innerHTML,/将弃置 · 手电筒/);g.pick('确认替换并装备');assert.equal(g.run('S.player.assets.length'),1);assert.equal(g.run('S.player.assets[0].code'),'01074');assert.equal(g.run('S.discard.length'),2);
 const h=game('daisy');h.run('S.hand=[];S.resources=10');h.add('01008','assets');h.add('01031','assets');h.add('01035','assets');h.add('01074');h.run('onHandCard(0)');assert.equal(h.run('S.player.assets.length'),4);assert.equal(h.run('!!S.playerChoice'),false);
});
test('盟友、身体、饰品与法术槽满时可取消替换，确认前不丢牌扣费且确认只生效一次',()=>{
 for(const [oldCodes,newCode]of [[['01021'],'01018'],[['01072'],'01072'],[['01059'],'01075'],[['01060','01060'],'01061']]){
  const g=game();g.run('S.hand=[];S.resources=10');for(const code of oldCodes)g.add(code,'assets');g.add(newCode);
  const before=g.json('[S.hand,S.player.assets,S.discard,S.resources,S.actions]');g.run('onHandCard(0)');assert.match(g.get('modalBox').innerHTML,/卡槽已满/);g.pick('返回');assert.deepEqual(g.json('[S.hand,S.player.assets,S.discard,S.resources,S.actions]'),before);
  g.run('onHandCard(0)');g.pick(0);assert.match(g.get('modalBox').innerHTML,/确认替换资产/);assert.ok((g.get('modalBox').innerHTML.match(/player-opening-art art/g)||[]).length>=2);g.pick('返回');assert.deepEqual(g.json('[S.hand,S.player.assets,S.discard,S.resources,S.actions]'),before);
  g.run('onHandCard(0)');g.pick(0);const nonce=g.run('S.playerChoice.nonce'),cost=g.run('S.hand[0].cost');g.pick('确认替换并装备');g.run(`playerPick(${nonce},1)`);assert.deepEqual(g.json('[S.resources,S.actions,S.discard.length,S.hand.length]'),[10-cost,2,1,0]);assert.equal(g.run('S.player.assets.at(-1).code'),newCode);
 }
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
