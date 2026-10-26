const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

test('左栏目标线索进度随持有量更新，超过门槛不会溢出，不消耗资源与行动',()=>{
 for(const [idx,total]of [[0,3],[2,2],[4,2]])for(const clues of [0,1,total,total+3]){
  const g=game();g.run(`S.actIdx=${idx};S.clues=${clues}`);const state=g.get('S');g.run('renderActAgenda()');
  const bar=g.document.getElementById('goalProgress').innerHTML;
  assert.match(bar,new RegExp('aria-valuenow="'+Math.min(clues,total)+'"'));assert.match(bar,new RegExp('aria-valuemax="'+total+'"'));
  if(clues>=total){assert.match(bar,/width:100%/);assert.match(bar,/线索已齐/);}else assert.match(bar,new RegExp('已持有 '+clues+' / '+total));
  assert.deepEqual(g.get('S'),state);
 }
});

test('阁楼与祭坛目标显示目的地进度，不误报不存在的交缠敌人',()=>{
 const g=game();g.run("S.actIdx=1;S.location='hallway';renderActAgenda()");assert.match(g.document.getElementById('goalProgress').innerHTML,/下一站：阁楼/);
 g.run("S.location='attic';renderActAgenda()");assert.match(g.document.getElementById('goalProgress').innerHTML,/已抵达阁楼/);
 g.run("S.actIdx=3;S.location='altar';S.enemies=[];renderActAgenda()");assert.match(g.document.getElementById('goalProgress').innerHTML,/可尝试封印/);assert.doesNotMatch(g.document.getElementById('goalProgress').innerHTML,/先摆脱/);
 g.run("S.enemies=[{card:ENCOUNTER[0],engaged:true,exhausted:false,location:'altar'}];renderActAgenda()");assert.match(g.document.getElementById('goalProgress').innerHTML,/先摆脱交缠敌人/);
});

test('调查成功确认后同步目标进度，取消检定不增加进度',()=>{
 const g=game();g.run("requestAction('investigate');cancelTest();renderActAgenda()");assert.match(g.document.getElementById('goalProgress').innerHTML,/已持有 0 \/ 3/);
 g.run('investigate();resolveTest();finishTest(true)');assert.equal(g.get('S.clues'),1);assert.match(g.document.getElementById('goalProgress').innerHTML,/已持有 1 \/ 3/);
});

function basement(){const g=game();g.run("S.actIdx=1;S.location='attic';finish();continueChapter();beginChapter()");return g;}
function finale(begin=true){
 const g=basement();g.run("S.actIdx=3;S.location='altar';requestAction('finish')");g.finish();g.run('continueChapter()');if(begin)g.run('beginChapter()');return g;
}
function finaleRound(g){g.run('endTurn();next();next();next()');}

test('最终幕须封印成功才能进入，背景确认前禁止行动，重复进入无效',()=>{
 const g=finale(false);assert.deepEqual(g.get('[S.chapter,S.actIdx,S.location,S.chapterIntro,S.actions]'),[3,4,'vestibule',true,3]);
 assert.match(g.document.getElementById('modalBox').innerHTML,/本网页版原创最终幕，非官方剧本/);
 const before=g.get('S');g.run("requestAction('draw');doMove('gallery');continueChapter();advanceAct()");assert.deepEqual(g.get('S'),before);
 g.run('closeModal();renderActions()');assert.match(g.document.getElementById('controls').innerHTML,/开始最终幕/);
 g.run('let calls=0;announcePhase=()=>calls++;beginChapter();beginChapter()');assert.equal(g.get('calls'),1);assert.equal(g.get('canAct()'),true);
 const h=basement();h.run("resolve('R3','失败');continueChapter()");assert.equal(h.get('S.chapter'),2);
});

test('最终幕保留人物状态与所有玩家牌，归档旧敌人，重置末日而不治疗或发牌',()=>{
 const g=basement();g.run("S.hp=5;S.sanity=2;S.resources=4;S.clues=3;S.hand=[{...INVESTIGATOR.deck[2]}];S.discard=[{...INVESTIGATOR.deck[3]}];S.playedCards=[{...INVESTIGATOR.deck[3]}];S.assets=[{card:{...INVESTIGATOR.deck[0]},exhausted:true}];S.doom=2;S.agendaIdx=1;resolve('R1','封印成功')");
 const before=g.get('[S.hp,S.sanity,S.resources,S.clues,S.hand,S.deck,S.discard,S.playedCards,S.assets[0].card,S.difficulty,S.round]');
 g.run('continueChapter()');const after=g.get('[S.hp,S.sanity,S.resources,S.clues,S.hand,S.deck,S.discard,S.playedCards,S.assets[0].card,S.difficulty,S.round-1]');assert.deepEqual(after,before);
 assert.deepEqual(g.get('[S.actions,S.doom,S.agendaIdx,S.assets[0].exhausted,S.canContinue]'),[3,0,0,false,false]);
});

test('最终幕地图只显示三个新地点，保持顺序连接和当前人物标记',()=>{
 const g=finale(),map=g.document.getElementById('mapwrap').innerHTML;
 for(const id of ['vestibule','gallery','gate'])assert.ok(map.includes('data-room="'+id+'"'));
 assert.doesNotMatch(map,/data-room="(?:study|hallway|attic|stairs|cellar|altar)"/);assert.equal((map.match(/<line /g)||[]).length,2);
 assert.equal(g.document.getElementById('sceneTitle').textContent,'破碎门厅');assert.match(g.document.getElementById('sceneKicker').textContent,/最终幕/);
 g.run("doMove('gate')");assert.equal(g.get('S.location'),'vestibule');assert.equal(g.get('S.actions'),3);
});

test('辨明出口可返回，需两条线索与一行动，不能重复消费',()=>{
 const g=finale();g.run("S.clues=1;requestAction('advanceAct');advanceAct()");assert.deepEqual(g.get('[S.clues,S.actIdx,S.actions]'),[1,4,3]);
 g.run("S.clues=2;requestAction('advanceAct');closeModal()");assert.deepEqual(g.get('[S.clues,S.actIdx,S.actions]'),[2,4,3]);
 g.run("requestAction('advanceAct');confirmAction();confirmAction();advanceAct()");assert.deepEqual(g.get('[S.clues,S.actIdx,S.actions]'),[0,5,2]);
});

test('最终守门者首次抵达生成一次，正常攻击击败后不会进入遭遇循环',()=>{
 const g=finale();g.run("S.clues=2;advanceAct();doMove('gallery');doMove('gate')");assert.equal(g.get('S.enemies.length'),1);assert.equal(g.get('S.enemies[0].card.id'),'gate-keeper');
 g.run("S.actions=3;fight()");g.finish();g.run('fight()');g.finish();g.run('fight()');g.finish();
 assert.equal(g.get('S.enemies.length'),0);assert.equal(g.get('S.finalGuardDefeated'),true);assert.equal(g.get("S.encounterDiscard.some(c=>c.id==='gate-keeper')"),false);
 g.run("S.actions=3;doMove('gallery');doMove('gate')");assert.equal(g.get('S.enemies.length'),0);
});

test('未辨明出口、未到铁门或有就绪交缠敌人时，不能直接通关',()=>{
 const g=finale();g.run("finish();requestAction('finish');S.location='gate';finish();requestAction('finish')");assert.equal(g.get('S.gameOver'),false);assert.equal(g.get('S.actions'),3);
 g.run("S.actIdx=5;S.location='vestibule';finish();requestAction('finish')");assert.equal(g.get('S.gameOver'),false);
 g.run("S.location='gate';S.enemies=[{card:{...FINAL_GUARD},hp:3,engaged:true,exhausted:false,location:'gate'}];finish();requestAction('finish')");assert.equal(g.get('S.gameOver'),false);assert.equal(g.get('S.actions'),3);
 assert.match(g.document.getElementById('goalProgress').innerHTML,/下一站|已持有/);
 g.run('renderActAgenda()');assert.match(g.document.getElementById('goalProgress').innerHTML,/先战斗或闪避/);
});

test('闪避失败不会开放逃离，成功后可返回确认且只花一次行动逃离',()=>{
 const g=finale();g.run("S.actIdx=5;doMove('gallery');doMove('gate');S.actions=3;S.chaos=[{label:'失败',autofail:true}];requestAction('evade')");g.finish();g.run("requestAction('finish')");assert.equal(g.get('pendingAction'),null);assert.equal(g.get('S.gameOver'),false);
 g.run("S.chaos=[{label:'0',mod:0}];requestAction('evade')");g.finish();assert.deepEqual(g.get('[S.actions,S.enemies[0].engaged,S.enemies[0].exhausted]'),[1,false,true]);
 g.run("requestAction('finish');closeModal()");assert.equal(g.get('S.actions'),1);assert.equal(g.get('S.gameOver'),false);
 g.run("requestAction('finish');confirmAction();confirmAction();finish();continueChapter()");assert.deepEqual(g.get('[S.actions,S.gameOver,S.canContinue,S.chapter,S.finaleRoute]'),[0,true,false,3,'evaded']);
 assert.match(g.document.getElementById('modalBox').innerHTML,/三幕故事已全部完成/);assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/endingNarration|continueChapter/);
});

test('完整最终幕闪避路线：调查、辨明出口、回合流转、守门者与逃离',()=>{
 const g=finale();g.run("S.encounter=[];S.encounterDiscard=[];investigate()");g.finish();g.run("doMove('gallery');investigate()");g.finish();assert.equal(g.get('S.clues'),2);
 finaleRound(g);g.run("requestAction('advanceAct');confirmAction()");assert.equal(g.get('S.actIdx'),5);
 finaleRound(g);g.run("doMove('gate');requestAction('evade')");g.finish();g.run("requestAction('finish');confirmAction()");
 assert.equal(g.get('S.finaleRoute'),'evaded');assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.canContinue'),false);
 assert.deepEqual(g.get('[S.hp,S.sanity]'),[9,5]);
});

test('完整最终幕战斗路线与最终失败都不出现不存在的第四幕',()=>{
 const g=finale();g.run("S.encounter=[];S.encounterDiscard=[];investigate()");g.finish();g.run("doMove('gallery');investigate()");g.finish();finaleRound(g);
 g.run("advanceAct();doMove('gate');fight()");g.finish();finaleRound(g);g.run('fight()');g.finish();g.run('fight()');g.finish();g.run("requestAction('finish');confirmAction()");
 assert.equal(g.get('S.finaleRoute'),'defeated');assert.equal(g.get('S.canContinue'),false);assert.match(g.document.getElementById('modalBox').innerHTML,/守门者倒在灰烬/);
 const h=finale();h.run("S.hp=1;doMove('gallery');doMove('gate');resource();continueChapter()");assert.equal(h.get('S.gameOver'),true);assert.equal(h.get('S.canContinue'),false);assert.equal(h.get('S.chapter'),3);
});
test('三幕连续通关：书房调查、阁楼、地下封印与最终逃离，牌组和状态持续沿用',()=>{
 const g=game();g.run("S.encounter=[];S.encounterDiscard=[];S.assets=[{card:{...INVESTIGATOR.deck.find(c=>c.id==='p45')},exhausted:false}];investigate()");g.finish();g.run('investigate()');g.finish();g.run("doMove('hallway')");finaleRound(g);
 g.run('investigate()');g.finish();g.run("advanceAct();doMove('attic')");finaleRound(g);g.run('finish();continueChapter();beginChapter();investigate()');g.finish();g.run("doMove('cellar');fight()");g.finish();finaleRound(g);
 g.run('investigate()');g.finish();g.run("advanceAct();doMove('altar')");finaleRound(g);g.run("requestAction('finish')");g.finish();g.run('continueChapter();beginChapter();investigate()');g.finish();g.run("doMove('gallery');investigate()");g.finish();finaleRound(g);
 g.run('advanceAct()');finaleRound(g);g.run("doMove('gate');evade()");g.finish();g.run("requestAction('finish');confirmAction()");
 assert.deepEqual(g.get('[S.chapter,S.gameOver,S.canContinue,S.finaleRoute,S.hp,S.sanity]'),[3,true,false,'evaded',9,5]);assert.equal(g.get('S.assets[0].card.id'),'p45');
});

test('新幕先阅读背景，确认后才允许行动，入口重复确认不重复倒计时',()=>{
 const g=game();g.run("S.actIdx=1;S.location='attic';finish();continueChapter();let announcements=0;announcePhase=()=>{announcements++};requestAction('draw');requestReturnMenu()");
 assert.equal(g.get('S.actions'),3);assert.equal(g.get('pendingNavigation'),false);assert.match(g.document.getElementById('modalBox').innerHTML,/第二幕 · 地板之下/);
 g.run('closeModal();renderActions()');assert.match(g.document.getElementById('controls').innerHTML,/beginChapter/);g.run('beginChapter();beginChapter()');assert.equal(g.get('announcements'),1);assert.equal(g.get('canAct()'),true);
});
test('阁楼完成后提供下一幕入口，关闭结局不会丢失继续入口',()=>{
 const g=game();g.run("S.actIdx=1;S.location='attic';finish()");assert.equal(g.get('S.canContinue'),true);assert.match(g.document.getElementById('modalBox').innerHTML,/继续下一幕/);
 g.run('closeModal();render()');assert.match(g.document.getElementById('controls').innerHTML,/continueChapter/);assert.equal(g.get('S.chapter'),1);
});
test('下一幕保留人物、牌组、装备和难度，不重新发牌或治疗，重复点击无效',()=>{
 const g=game();g.run("S.hp=6;S.sanity=3;S.resources=2;S.clues=1;S.hand=[{...INVESTIGATOR.deck[0]}];S.assets=[{card:{...INVESTIGATOR.deck[1]},exhausted:true}];S.actIdx=1;S.location='attic';finish()");
 const before=g.get('[S.hp,S.sanity,S.resources,S.clues,S.hand,S.deck,S.discard,S.assets[0].card,S.difficulty]');g.run('continueChapter()');
 assert.deepEqual(g.get('[S.hp,S.sanity,S.resources,S.clues,S.hand,S.deck,S.discard,S.assets[0].card,S.difficulty]'),before);
 assert.deepEqual(g.get('[S.chapter,S.location,S.actIdx,S.actions,S.gameOver,S.doom,S.agendaIdx]'),[2,'stairs',2,3,false,0,0]);
 const after=g.get('S');g.run('continueChapter()');assert.deepEqual(g.get('S'),after);
});
test('失败和未完成阁楼时不能进入下一幕，重新开局恢复第一幕',()=>{
 const g=game(),before=g.get('S');g.run('continueChapter()');assert.deepEqual(g.get('S'),before);g.run("resolve('R3','失败');continueChapter()");assert.equal(g.get('S.chapter'),1);
 const h=basement();h.run('startGame()');assert.equal(h.get('S.chapter'),1);assert.equal(h.get('S.canContinue'),false);assert.equal(h.get('S.location'),'study');
});
test('第二幕地图只显示新地点，连线和入口位置正确',()=>{
 const g=basement(),map=g.document.getElementById('mapwrap').innerHTML;
 for(const id of ['stairs','cellar','altar'])assert.ok(map.includes('data-room="'+id+'"'));
 assert.doesNotMatch(map,/data-room="study"|data-room="hallway"|data-room="attic"/);assert.equal((map.match(/<line /g)||[]).length,2);
 assert.equal(g.document.getElementById('sceneTitle').textContent,'石阶入口');
});
test('首次进入窖室生成守门者一次，再次进入不重生',()=>{
 const g=basement();g.run("doMove('cellar')");assert.equal(g.get('S.enemies.length'),1);assert.equal(g.get('S.enemies[0].card.id'),'cellar-keeper');
 g.run("S.enemies=[];S.actions=3;doMove('stairs');doMove('cellar')");assert.equal(g.get('S.enemies.length'),0);assert.ok(g.get('S.cellarGuardSpawned'));
});

test('两幕的剧情守门者击败后均不混入遭遇牌堆，不被再次抽出',()=>{
 for(const chapter of [2,3]){
  const g=chapter===2?basement():finale();g.run(`S.encounter=[];S.encounterDiscard=[];S.assets=[{card:{...INVESTIGATOR.deck.find(c=>c.id==='p45')},exhausted:false}];doMove('${chapter===2?'cellar':'gallery'}');${chapter===3?"doMove('gate');S.actions=3;":''}fight()`);g.finish();if(chapter===3){g.run('fight()');g.finish()}
  assert.equal(g.get('S.enemies.length'),0);assert.equal(g.get('S.encounterDiscard.length'),0);assert.equal(g.get('S.defeatedStoryEnemies.length'),1);g.run('drawEncounter()');assert.equal(g.get('S.enemies.length'),0);
 }
});
test('辨认封印只花两条线索与一个行动，取消和重复推进不额外消费',()=>{
 const g=basement();g.run("S.clues=2;requestAction('advanceAct');closeModal()");assert.deepEqual(g.get('[S.clues,S.actions,S.actIdx]'),[2,3,2]);
 g.run('advanceAct();advanceAct()');assert.deepEqual(g.get('[S.clues,S.actions,S.actIdx]'),[0,2,3]);
});
test('封印检定可取消，失败损失一理智并能重试，成功后提供最终幕入口',()=>{
 const g=basement();g.run("S.actIdx=3;S.location='altar';requestAction('finish');cancelTest()");assert.equal(g.get('S.actions'),3);
 g.run("S.chaos=[{label:'失败',autofail:true}];requestAction('finish')");g.finish();assert.equal(g.get('S.sanity'),4);assert.equal(g.get('S.gameOver'),false);assert.equal(g.get('S.actions'),2);
 g.run("S.chaos=[{label:'0',mod:0}];requestAction('finish')");g.finish();assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.canContinue'),true);assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/endingNarration/);assert.match(g.document.getElementById('modalBox').innerHTML,/继续下一幕 · 黎明之前/);
});
test('祭坛有就绪交缠敌人时不能封印，精神反噬致死保持失败结局',()=>{
 const g=basement();g.run("S.actIdx=3;S.location='altar';S.enemies=[{card:{...ENCOUNTER[0]},hp:2,engaged:true,exhausted:false,location:'altar'}];requestAction('finish')");assert.equal(g.get('S.test'),null);assert.equal(g.get('S.actions'),3);
 g.run("S.enemies=[];S.sanity=1;S.chaos=[{autofail:true,label:'失败'}];requestAction('finish')");g.finish();assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.canContinue'),false);
});
test('实际完成第二幕：调查、移动、守门者、辨认封印、封印成功',()=>{
 const g=basement();g.run('S.assets=[{card:{...INVESTIGATOR.deck[0]},exhausted:false}];investigate()');g.finish();g.run("doMove('cellar');fight()");g.finish();assert.equal(g.get('S.enemies.length'),0);
 g.run("S.phase='mythos';advancePhase();investigate()");g.finish();g.run("advanceAct();doMove('altar')");assert.equal(g.get('S.actIdx'),3);
 g.run("S.phase='mythos';advancePhase();requestAction('finish')");g.finish();assert.equal(g.get('S.gameOver'),true);assert.match(g.document.getElementById('modalBox').innerHTML,/裂缝终于合拢/);
});

test('实际抽牌和出牌各触发一次短音效，资源行动不触发牌声',()=>{
  const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);draw();S.hand=[{...INVESTIGATOR.deck[0]}];onHandCard(0);resource()`);assert.deepEqual(g.get('cues'),['draw','card']);
});
test('取消检定、取消移动与非法出牌不会播放操作音',()=>{
  const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);requestAction('investigate');cancelTest();S.revealed.hallway=true;requestMapMove('hallway');closeModal();S.resources=0;S.hand=[{...INVESTIGATOR.deck[0]}];onHandCard(0)`);assert.deepEqual(g.get('cues'),[]);
});
test('抽取指示物和成功移动仅各播放一次，重复确认无效',()=>{
  const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);investigate();resolveTest();resolveTest();finishTest(true);S.revealed.hallway=true;requestMapMove('hallway');confirmAction();confirmAction()`);assert.deepEqual(g.get('cues'),['token','testSuccess','clue','move']);
});
test('攻击失败专属提示只在实际结算响一次，取消和成功不误报',()=>{
 const g=game();g.enemy();g.run(`let cues=[];playGameSfx=name=>cues.push(name);requestAction('fight');cancelTest()`);assert.deepEqual(g.get('cues'),[]);g.run(`S.chaos=[{label:'失败',autofail:true}];requestAction('fight');resolveTest();finishTest(false);finishTest(false)`);assert.deepEqual(g.get('cues'),['token','testFailure','attackMiss']);
 const h=game();h.enemy();h.run(`let cues=[];playGameSfx=name=>cues.push(name);fight();resolveTest();finishTest(true)`);assert.deepEqual(h.get('cues'),['token','testSuccess']);
});

test('遭遇怪物和混沌搜索生成怪物各有一次提示，空牌堆不误报',()=>{
 const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);S.encounter=[{...ENCOUNTER[0]}];drawEncounter();S.encounter=[];S.encounterDiscard=[];drawEncounter();drawSearchedGhoul()`);assert.deepEqual(g.get('cues'),['ghoul']);assert.equal(g.get('S.enemies.length'),1);
 const h=game();h.run(`let cues=[];playGameSfx=name=>cues.push(name);S.encounter=[{...ENCOUNTER[0]}];S.encounterDiscard=[];drawSearchedGhoul()`);assert.deepEqual(h.get('cues'),['ghoul']);
});

test('食尸鬼仆人与猎手按怪物属性分别出声，非食尸鬼保留通用声',()=>{
 const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);for(const card of ENCOUNTER.filter(c=>c.type==='enemy')){S.encounter=[card];drawEncounter()}monsterSfx({id:'future',name:'未知怪物',type:'enemy',hunter:true});monsterSfx({type:'treachery'});monsterSfx(null)`);assert.deepEqual(g.get('cues'),['ghoul','ghoul','ghoulHunter','monster']);
});

test('混沌搜索猎手使用猎手声，刷新和怪物移动不再次触发出场',()=>{
 const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);S.encounter=[{...ENCOUNTER[2]}];S.encounterDiscard=[];drawSearchedGhoul();render();renderEnemies();engageLocalEnemies();doMove('hallway');renderEnemies()`);assert.deepEqual(g.get('cues'),['ghoulHunter','hurt','sanity','move']);
});

test('新地点和已探索地点移动均提示，确认取消不响',()=>{
 const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);requestMove('hallway');closeModal()`);assert.deepEqual(g.get('cues'),[]);g.run(`requestMove('hallway');confirmAction();confirmAction();requestMove('study');confirmAction()`);assert.deepEqual(g.get('cues'),['move','move']);
});

test('调查只有实际获得线索才响，失败及空地点成功不响线索提示',()=>{
 for(const empty of [false,true])for(const success of [false,true]){const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);S.locClues.study=${empty?0:2};S.chaos=[${success?"{label:'0',mod:0}":"{label:'失败',autofail:true}"}];requestAction('investigate');${empty?'confirmAction();':''}resolveTest();finishTest(S.testResult);finishTest(true)`);assert.deepEqual(g.get('cues'),['token',success?'testSuccess':'testFailure',...(success&&!empty?['clue']:[])]);}
});

test('四属性与遭遇检定成功失败均有对应音效和视觉反馈，重复抽取不重播',()=>{
 for(const skill of ['will','int','combat','agility'])for(const success of [true,false]){
  const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);S.chaos=[${success?"{label:'0',mod:0}":"{label:'自动失败',autofail:true}"}];startTest('${skill}',0,'结果反馈测试',()=>{});resolveTest();resolveTest()`);assert.deepEqual(g.get('cues'),['token',success?'testSuccess':'testFailure']);const markup=g.document.getElementById('modalBox').innerHTML;assert.match(markup,success?/test-feedback test-success/:/test-feedback test-failure/);assert.match(markup,/role="status" aria-live="polite"/);g.run('finishTest(S.testResult);finishTest(true)');assert.equal(g.get('cues.length'),2);
 }
});

test('取消与致命借机攻击不误播结果，减少动态效果时关闭结果动画',()=>{
 const g=game();g.enemy();g.run(`let cues=[];playGameSfx=name=>cues.push(name);requestAction('investigate');cancelTest();S.hp=1;requestAction('investigate');resolveTest()`);assert.deepEqual(g.get('cues'),['hurt','sanity','ghoulHunter']);assert.equal(g.get('S.gameOver'),true);assert.match(html,/@media\(prefers-reduced-motion:reduce\)\{\.test-feedback.test-success,\.test-feedback.test-failure\{animation:none\}\}/);
});

test('实际生命理智损失触发对应音效，零伤害及失效音频不阻断游戏',()=>{
  const g=game();g.run(`let cues=[];playGameSfx=name=>cues.push(name);applyPlayerLoss(2,1);applyPlayerLoss(0,0)`);assert.deepEqual(g.get('cues'),['hurt','sanity']);g.run(`playGameSfx=()=>{throw Error('audio blocked')};resource()`);assert.equal(g.get('S.resources'),6);assert.equal(g.get('S.actions'),2);
});

test('资产说明弹窗只读，关闭及重开不消耗行动或再次装备',()=>{
  const g=game();g.run(`S.assets=[{card:INVESTIGATOR.deck[0],exhausted:false}]`);const before=g.get('S');
  const dialog=g.document.getElementById('assetInfoDialog');let opens=0;dialog.showModal=()=>{dialog.open=true;opens++};
  g.run('inspectAsset(0);inspectAsset(0)');assert.equal(opens,1);assert.match(g.document.getElementById('assetInfoSlot').textContent,/占用 1 只手/);
  assert.equal(g.document.getElementById('assetInfoEffect').textContent,g.get('S.assets[0].card.text'));
  dialog.open=false;g.run('inspectAsset(0)');assert.equal(opens,2);assert.deepEqual(g.get('S'),before);
  assert.match(html,/<dialog id="assetInfoDialog"[^>]*aria-labelledby="assetInfoTitle"/);
});

test('无效资产索引及检定、移动或其他确认中不打开说明',()=>{
  const g=game();g.run('S.assets=[{card:INVESTIGATOR.deck[0]}]');const dialog=g.document.getElementById('assetInfoDialog');dialog.showModal=()=>{throw Error('unexpected dialog')};
  g.run(`inspectAsset(-1);inspectAsset(99);requestAction('resource');inspectAsset(0);closeModal();requestAction('move');inspectAsset(0);closeModal();requestAction('investigate');inspectAsset(0)`);
});

test('已装备资产改为紧凑图标，不在外部铺开效果说明',()=>{
  const g=game();g.run(`S.assets=[{card:INVESTIGATOR.deck.find(c=>c.id==='p45'),exhausted:false}];renderAssets()`);
  const cards=g.document.getElementById('assets').innerHTML;
  assert.match(cards,/<button type="button" class="asset-icon /);assert.match(cards,/asset-icon-art art/);assert.match(cards,/--art-x:33.3333%/);
  assert.match(cards,/\.45 自动手枪/);assert.ok(!cards.includes(g.get("INVESTIGATOR.deck.find(c=>c.id==='p45').text")));
  assert.match(cards,/手部/);assert.match(cards,/就绪/);assert.match(cards,/onclick="inspectAsset\(0\)"/);assert.match(cards,/aria-haspopup="dialog"/);assert.doesNotMatch(cards,/asset-mini|<article|<footer/);
  assert.match(g.document.getElementById('slots').innerHTML,/1\/2/);
});

test('多张资产图标独立显示状态，渲染不改变游戏状态',()=>{
  const g=game();g.run(`S.assets=['p45','machete'].map((id,i)=>({card:INVESTIGATOR.deck.find(c=>c.id===id),exhausted:!!i}));Math.random=()=>{throw Error('unexpected random')}`);
  const before=g.get('S');g.run('renderAssets();renderAssets()');assert.deepEqual(g.get('S'),before);
  const cards=g.document.getElementById('assets').innerHTML;
  assert.equal((cards.match(/<button/g)||[]).length,2);assert.match(cards,/asset-icon is-exhausted/);assert.match(cards,/已力竭/);assert.match(cards,/玛谢特砍刀/);assert.match(cards,/inspectAsset\(1\)/);assert.match(g.document.getElementById('slots').innerHTML,/2\/2/);
});

test('未知资产提供插画与效果缺省，卡牌文字转义',()=>{
  const g=game();g.run(`S.assets=[{card:{id:'unknown',name:'<img src=x>',slot:'<slot>',text:'<script>bad</script>'}}];renderAssets()`);
  let cards=g.document.getElementById('assets').innerHTML;
  assert.match(cards,/asset-icon-no-art/);assert.match(cards,/&lt;img src=x&gt;/);assert.match(cards,/&lt;slot&gt;/);assert.doesNotMatch(cards,/<script>|<img /);
  const dialog=g.document.getElementById('assetInfoDialog');dialog.showModal=()=>{dialog.open=true};
  g.run('inspectAsset(0)');assert.equal(g.document.getElementById('assetInfoEffect').textContent,'<script>bad</script>');
  dialog.open=false;g.run('S.assets[0].card.text=null;inspectAsset(0)');assert.match(g.document.getElementById('assetInfoEffect').textContent,/暂无效果说明/);
});

test('迷你资产为空时保留空状态，不影响新游戏清空',()=>{
  const g=game();g.run('renderAssets()');assert.match(g.document.getElementById('assets').innerHTML,/暂无已打出的资产/);
  g.run(`S.assets=[{card:INVESTIGATOR.deck[0]}];renderAssets();startGame()`);assert.match(g.document.getElementById('assets').innerHTML,/暂无已打出的资产/);
  const css=fs.readFileSync(path.join(__dirname,'..','layout.css'),'utf8');assert.match(css,/flex-wrap:nowrap/);assert.match(css,/overflow-x:auto/);assert.match(css,/max-height:58px/);assert.match(css,/height:48px/);assert.match(css,/width:34px;height:34px/);assert.doesNotMatch(css,/asset-mini/);
});

test('抽牌及资源确认可返回，继续只执行一次，锁住其他行动',()=>{
  for(const action of ['draw','resource']){
    const g=game(),before=g.get('S');g.run(`Math.random=()=>{throw Error('unexpected random')};requestAction('${action}')`);
    assert.deepEqual(g.get('S'),before);assert.match(g.document.getElementById('modalBox').innerHTML,/返回/);assert.match(g.document.getElementById('modalBox').innerHTML,/继续/);
    g.run(`doAction('resource');requestAction('draw');requestReturnMenu();endTurn()`);assert.deepEqual(g.get('S'),before);
    g.run('closeModal()');assert.deepEqual(g.get('S'),before);
    g.run(`requestAction('${action}');confirmAction();confirmAction()`);
    assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.resources'),action==='resource'?6:5);
    assert.equal(g.get('S.hand.length'),action==='draw'?1:0);
  }
});

test('调查返回保留行动和投入牌，不触发借机攻击或随机抽取',()=>{
  const g=game();g.enemy();g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];Math.random=()=>{throw Error('unexpected random')}`);
  const before=g.get('S');g.run(`requestAction('investigate');toggleCommit(0)`);
  assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hp'),9);assert.equal(g.get('S.committed.length'),1);
  assert.match(g.document.getElementById('modalBox').innerHTML,/继续 · 抽取混沌/);
  g.run('cancelTest()');assert.deepEqual(g.get('S'),before);
});

test('调查继续仅扣一次行动与借机攻击，抽取后返回失效',()=>{
  const g=game();g.enemy();g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];requestAction('investigate');toggleCommit(0);resolveTest();resolveTest();cancelTest()`);
  assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.hp'),9-g.get('ENCOUNTER[0].dmg'));
  assert.equal(g.get('S.discard.length'),1);assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('S.test.resolved'),true);
  assert.match(g.document.getElementById('modalBox').innerHTML,/不能返回重抽/);
  g.run('finishTest(true);finishTest(true)');assert.equal(g.get('S.clues'),1);
});

test('借机攻击致命时不抽取指示物，不丢弃投入牌',()=>{
  const g=game();g.enemy();g.run(`S.hp=1;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];requestAction('investigate');toggleCommit(0);Math.random=()=>{throw Error('unexpected random')};resolveTest()`);
  assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.discard.length'),0);assert.equal(g.get('S.hand.length'),1);
});

test('战斗与闪避预览可返回，继续不受借机攻击，闪避加值仅继续时用掉',()=>{
  for(const action of ['fight','evade']){
    const g=game();g.enemy();g.run('S.evadeBonus=2');const before=g.get('S');
    g.run(`requestAction('${action}');cancelTest()`);assert.deepEqual(g.get('S'),before);
    g.run(`requestAction('${action}');resolveTest();resolveTest()`);
    assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.hp'),9);assert.equal(g.get('S.evadeBonus'),action==='evade'?0:2);
    g.run('finishTest(true)');assert.equal(g.get('S.test'),null);
  }
});

test('已触发的强制检定不可返回取消，不额外扣行动',()=>{
  const g=game();g.run(`startTest('will',2,'遭遇',()=>{});cancelTest()`);
  assert.notEqual(g.get('S.test'),null);assert.match(g.document.getElementById('modalBox').innerHTML,/disabled title="已触发的检定不能取消"/);
  g.finish();assert.equal(g.get('S.actions'),3);
});

test('选择移动目的地和地图移动都需确认，返回不揭示房间',()=>{
  const g=game(),before=g.get('S');g.run(`requestAction('move');requestMove('hallway')`);
  assert.deepEqual(g.get('S'),before);assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/走廊/);
  g.run('closeModal()');assert.deepEqual(g.get('S'),before);
  g.run(`requestMapMove('hallway')`);assert.equal(g.get('pendingAction'),null);
  g.run(`requestAction('move');requestMove('hallway');confirmAction();confirmAction()`);assert.equal(g.get('S.location'),'hallway');assert.equal(g.get('S.actions'),2);
  g.run(`requestMapMove('study');closeModal()`);assert.equal(g.get('S.location'),'hallway');
  g.run(`requestMapMove('study');confirmAction()`);assert.equal(g.get('S.location'),'study');assert.equal(g.get('S.actions'),1);
});

test('推进幕和完成调查均可返回，继续才支付费用或结束游戏',()=>{
  const g=game();g.run('S.clues=3');const before=g.get('S');g.run(`requestAction('advanceAct');closeModal()`);assert.deepEqual(g.get('S'),before);
  g.run(`requestAction('advanceAct');confirmAction()`);assert.deepEqual(g.get('[S.clues,S.actIdx,S.actions]'),[0,1,2]);
  g.run(`S.location='attic';requestAction('finish');closeModal()`);assert.equal(g.get('S.gameOver'),false);
  g.run(`requestAction('finish');confirmAction()`);assert.equal(g.get('S.gameOver'),true);
});

test('结束回合与阶段继续可返回，不提前结算敌人或抽牌',()=>{
  const g=game();g.run(`resource()`);const before=g.get('S');g.run(`requestAction('endTurn');closeModal()`);assert.deepEqual(g.get('S'),before);
  g.run(`requestAction('endTurn');confirmAction()`);assert.notEqual(g.get('S.phase'),'investigation');
  const phase=g.get('S');g.run(`requestAction('next');closeModal()`);assert.deepEqual(g.get('S'),phase);
  g.run(`requestAction('next');confirmAction()`);assert.notDeepEqual(g.get('S'),phase);
});

test('新游戏清理行动确认，失效继续不执行旧行动',()=>{
  const g=game();g.run(`requestAction('resource');startGame();confirmAction()`);assert.equal(g.get('S.resources'),5);assert.equal(g.get('S.actions'),3);assert.equal(g.get('pendingAction'),null);
});

function game(){
  const nodes = new Map();
  function element(){
    const classes = new Set();
    return {innerHTML:'',textContent:'',style:{},dataset:{},children:[],classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}},appendChild(x){this.children.push(x)}};
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

test('黑色电影场景信息随移动刷新，不改变移动规则',()=>{
  const g=game();g.run(`renderLocations()`);
  assert.equal(g.document.getElementById('scenePanel').dataset.location,'study');
  assert.equal(g.document.getElementById('sceneTitle').textContent,'书房');
  g.run(`S.revealed.hallway=true;clickNode('hallway')`);
  assert.equal(g.document.getElementById('scenePanel').dataset.location,'hallway');
  assert.equal(g.document.getElementById('sceneTitle').textContent,'走廊');
  assert.match(g.document.getElementById('sceneClues').textContent,/线索 1/);
});

test('人物牌外部统一显示资源、线索、行动和位置，检定时即时刷新',()=>{
  const g=game();g.run(`renderInvestigator()`);
  let summary=g.document.getElementById('investigator').innerHTML;
  assert.match(summary,/data-status="resources">5</);
  assert.match(summary,/data-status="clues">0</);
  assert.match(summary,/data-status="location">书房</);
  assert.match(summary,/data-status="actions"[^>]*>3\/3</);
  g.run(`resource();S.revealed.hallway=true;clickNode('hallway');investigate()`);
  summary=g.document.getElementById('investigator').innerHTML;
  assert.match(summary,/data-status="resources">6</);
  assert.match(summary,/data-status="location">走廊</);
  assert.match(summary,/data-status="actions"[^>]*>0\/3</);
  assert.notEqual(g.get('S.test'),null);
  assert.doesNotMatch(summary,/点击查看/);
});

test('人物状态仍在外部显示，支持键盘放大查阅，受伤后同步',()=>{
  const actor=html.match(/<section[^>]+id="investigator"[^>]*>/)[0];
  assert.doesNotMatch(actor,/onclick|onkeydown|role="button"/);assert.match(actor,/tabindex="0"/);assert.match(actor,/aria-haspopup="dialog"/);
  assert.doesNotMatch(html,/function openInvestigatorModal/);
  const g=game();g.enemy();g.run(`S.hp=1;resource()`);
  assert.equal(g.get('S.gameOver'),true);
  const summary=g.document.getElementById('investigator').innerHTML;
  assert.match(summary,/0\/9/);assert.match(summary,/gauge-percent">0%/);
});

test('返回菜单需确认，取消不改变进度，确认后可重新开始',()=>{
  const g=game();g.run(`resource();requestReturnMenu()`);
  assert.equal(g.get('pendingNavigation'),true);assert.equal(g.get('canAct()'),false);
  assert.match(g.document.getElementById('modalBox').innerHTML,/当前调查进度不会保存/);
  g.run(`doAction('resource');cancelReturnMenu()`);
  assert.equal(g.get('S.resources'),6);assert.equal(g.get('S.actions'),2);assert.equal(g.get('canAct()'),true);
  g.run(`confirmReturnMenu()`);assert.equal(g.get('S.resources'),6);
  g.run(`requestReturnMenu();confirmReturnMenu()`);assert.equal(g.get('S'),null);
  assert.equal(g.document.getElementById('startOverlay').style.display,'flex');
  assert.equal(g.document.getElementById('game').style.display,'none');
  g.run(`startGame()`);assert.equal(g.get('S.resources'),5);assert.equal(g.get('S.actions'),3);
});

test('检定中和移动选择中不能覆盖弹窗返回菜单',()=>{
  const g=game();g.run(`investigate();requestReturnMenu()`);
  assert.equal(g.get('pendingNavigation'),false);assert.notEqual(g.get('S.test'),null);
  g.finish();g.run(`move();requestReturnMenu()`);
  assert.equal(g.get('pendingNavigation'),false);assert.equal(g.get('S.pendingMove'),true);
});

test('本地图标包包含全部常用图标，未知图标不能注入标记',()=>{
  const g=game();const sprite=fs.readFileSync(path.join(__dirname,'..','assets/icons/ui.svg'),'utf8');
  for(const id of ['play','home','restart','close','sound','mute','back','next'])assert.ok(sprite.includes(`id="${id}"`));
  assert.equal(g.get(`uiIcon('<img onerror=alert(1)>')`),'');
  assert.match(g.get(`uiIcon('home')`),/aria-hidden="true"/);
});

test('每张卡牌有独立插画映射，手牌保持语义按钮',()=>{
  const g=game();
  assert.equal(g.get('INVESTIGATOR.deck.every(c=>Array.isArray(CARD_ART[c.id])&&CARD_ART[c.id].length===2)'),true);
  g.run(`S.hand=INVESTIGATOR.deck.map(c=>({...c}));renderHand()`);
  const cards=g.document.getElementById('hand').innerHTML;
  assert.equal((cards.match(/class="card-art art"/g)||[]).length,10);
  assert.match(cards,/aria-label=".45 自动手枪/);
});

test('界面元素 ID 唯一，本地美术和样式资源全部存在',()=>{
  const markup=html.slice(0,html.indexOf('<script>'));
  const ids=[...markup.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  const css=fs.readFileSync(path.join(__dirname,'..','noir.css'),'utf8');
  for(const match of css.matchAll(/url\('([^']+)'\)/g)){
    assert.ok(fs.existsSync(path.join(__dirname,'..',match[1])),match[1]);
  }
  assert.ok(markup.includes('href="noir.css"'));
});

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
  assert.equal(g.get('S.test.skill'),'will');g.run(`doAction('next');next();renderInvestigator()`);
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
test('七张遭遇牌逐一抽取：抽牌本身不直接扣生命理智，也不触发怪物借机攻击',()=>{
 for(const id of ['ghoul1','ghoul2','ghoul3','ancient1','ancient2','whisper1','whisper2']){
  const g=game();g.enemy();g.run(`S.phase='mythos';S.encounter=[{...ENCOUNTER.find(c=>c.id==='${id}')}];mythosPhase()`);
  assert.deepEqual(g.get('[S.hp,S.sanity,S.actions]'),[9,5,3],id);
  assert.equal(g.get('!!S.test'),id.startsWith('whisper'),id);
 }
});

test('恐惧低语弹窗先讲牌面与恐惧含义，只有失败确认时扣一次，不消耗行动',()=>{
 for(const success of [true,false]){
  const g=game();g.enemy();g.run(`S.phase='mythos';S.chaos=[{label:'修正',mod:${success?0:-2}}];S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];mythosPhase()`);
  let box=g.document.getElementById('modalBox').innerHTML;assert.match(box,/遭遇牌：恐惧低语/);assert.match(box,/失败则承受 1 点恐惧/);assert.match(box,/不会立刻扣理智/);assert.match(box,/不会触发借机攻击/);
  g.run('resolveTest();resolveTest()');assert.deepEqual(g.get('[S.hp,S.sanity,S.actions]'),[9,5,3]);
  box=g.document.getElementById('modalBox').innerHTML;assert.match(box,success?/已扣 0 ＋ 待扣 0 = 0/:/已扣 0 ＋ 待扣 1 = 1/);
  if(!success)assert.match(box,/这部分尚未扣除/);
  g.run('finishTest(S.testResult);finishTest(false);resolveTest()');assert.deepEqual(g.get('[S.hp,S.sanity,S.actions]'),[9,success?5:4,3]);assert.equal(g.get('S.encounterDiscard.length'),1);
 }
});

test('异教徒的额外恐惧与低语牌面分开标明，困难连抽不重复扣理智',()=>{
 for(const hard of [false,true]){
  const g=game();g.run(`S.phase='mythos';INVESTIGATOR.will=${hard?3:2};S.difficulty='${hard?'hard':'standard'}';Math.random=()=>0;S.chaos=[{label:'异教徒',symbol:'cultist'}${hard?",{label:'-2',mod:-2}":''}];S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];mythosPhase();resolveTest();resolveTest()`);
  const extra=hard?2:1;assert.equal(g.get('S.sanity'),5-extra);const box=g.document.getElementById('modalBox').innerHTML;
  assert.match(box,new RegExp('已扣 '+extra+' ＋ 待扣 1 = '+(extra+1)));assert.match(box,/异教徒/);assert.match(box,/点击继续不会再次扣除这一部分/);
  g.run('finishTest(S.testResult);finishTest(false)');assert.equal(g.get('S.sanity'),4-extra);
 }
});

test('困难石板即使检定成功也可能损失理智，明示为符号效果而不是遭遇失败',()=>{
 const g=game();g.enemy();g.run("S.phase='mythos';S.difficulty='hard';INVESTIGATOR.will=6;S.chaos=[{label:'石板',symbol:'tablet'}];S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];mythosPhase();resolveTest()");
 assert.equal(g.get('S.testResult'),true);assert.deepEqual(g.get('[S.hp,S.sanity,S.actions]'),[8,4,3]);
 const box=g.document.getElementById('modalBox').innerHTML;assert.match(box,/本牌检定成功/);assert.match(box,/已扣 1 ＋ 待扣 0 = 1/);assert.match(box,/来源：混沌指示物「石板」/);
 g.run('finishTest(true);finishTest(true)');assert.deepEqual(g.get('[S.hp,S.sanity]'),[8,4]);
});

test('遭遇检定进行中重复调用神话或遭遇入口，不再增加末日或偷抽第二张牌',()=>{
 const g=game();g.run("S.phase='mythos';S.encounter=[{...ENCOUNTER[0]},{...ENCOUNTER.find(c=>c.id==='whisper1')}];mythosPhase()");
 const before=g.get('S');g.run('mythosPhase();drawEncounter();mythosPhase()');assert.deepEqual(g.get('S'),before);assert.equal(g.get('S.encounter.length'),1);
 g.finish();g.run('drawEncounter()');assert.equal(g.get('S.enemies.length'),1);
});

test('遭遇说明反复渲染只读，牌名与规则转义，普通调查不会继承遭遇说明',()=>{
 const g=game();g.run("S.encounter=[{id:'whisper-test',name:'<img src=x>',type:'treachery',text:'<script>danger</script>'}];drawEncounter()");
 const before=g.get('S');g.run('testConsequenceInfo(S.test);openTestModal();openTestModal()');assert.deepEqual(g.get('S'),before);
 const box=g.document.getElementById('modalBox').innerHTML;assert.match(box,/&lt;img src=x&gt;/);assert.match(box,/&lt;script&gt;/);assert.doesNotMatch(box,/<script>|<img src=x>/);
 g.finish();g.run("S.phase='investigation';investigate()");assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/遭遇牌：/);
});

test('低语遭遇中符号恐惧致命时停止后续扣除，牌面失败致命时也只结算一次',()=>{
 for(const symbolFatal of [false,true]){
  const g=game();g.run(`let losses=[];showPlayerLoss=loss=>losses.push(loss);S.phase='mythos';S.sanity=1;INVESTIGATOR.will=2;S.chaos=[${symbolFatal?"{label:'异教徒',symbol:'cultist'}":"{label:'-2',mod:-2}"}];S.encounter=[{...ENCOUNTER.find(c=>c.id==='whisper1')}];mythosPhase();resolveTest();finishTest(false);finishTest(false);resolveTest()`);
  assert.deepEqual(g.get('[S.sanity,S.gameOver]'),[0,true]);assert.equal(g.get('losses.length'),1);assert.equal(g.get('losses[0].sanity'),1);
  assert.match(g.get('losses[0].source'),symbolFatal?/异教徒/:/恐惧低语/);assert.equal(g.get('losses[0].phase'),'mythos');assert.match(g.document.getElementById('modalBox').innerHTML,/调查失败/);
 }
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
test('空线索调查确认前及无效推进幕不扣行动、不触发借机攻击',()=>{
  const g=game();g.enemy();g.run(`S.locClues.study=0;investigate();advanceAct()`);
  assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hp'),9);
});

test('零线索地点调查按钮仍可用，警告可返回且不改变状态',()=>{
 const g=game();g.run('S.locClues.study=0;renderActions()');const buttons=g.document.getElementById('actions').innerHTML;assert.match(buttons,/data-action="investigate"[^>]*onclick="requestAction\('investigate'\)" >[^]*?此处无剩余线索/);const before=g.get('S');g.run('requestAction(\'investigate\')');assert.deepEqual(g.get('S'),before);const modal=g.document.getElementById('modalBox').innerHTML;assert.match(modal,/这个地点已经没有线索/);assert.match(modal,/消耗 1 次行动/);assert.match(modal,/返回/);assert.match(modal,/继续/);g.run('closeModal()');assert.deepEqual(g.get('S'),before);assert.equal(g.get('pendingAction'),null);
});

test('确认空线索调查后仍可返回检定，不消耗行动或技能牌',()=>{
 const g=game();g.run(`S.locClues.study=0;S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];requestAction('investigate');confirmAction();confirmAction();toggleCommit(0);cancelTest()`);assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.hand.length'),1);assert.equal(g.get('S.locClues.study'),0);assert.equal(g.get('S.clues'),0);
});

test('空线索调查照常检定并花一次行动，成功失败均不制造线索',()=>{
 for(const success of [true,false]){const g=game();g.run(`S.locClues.study=0;S.clues=2;S.chaos=[${success?"{label:'0',mod:0}":"{label:'自动失败',autofail:true}"}];requestAction('investigate');confirmAction();resolveTest();resolveTest()`);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.testResult'),success);g.run('finishTest(S.testResult);finishTest(true)');assert.equal(g.get('S.locClues.study'),0);assert.equal(g.get('S.clues'),2);assert.equal(g.get('S.actions'),2);}
});

test('空线索调查提示攻击风险，只有实际抽取时受一次借机攻击',()=>{
 const g=game();g.enemy();g.run(`S.locClues.study=0;requestAction('investigate')`);assert.match(g.document.getElementById('modalBox').innerHTML,/借机攻击/);assert.equal(g.get('S.hp'),9);g.run('confirmAction();confirmAction()');assert.equal(g.get('S.hp'),9);g.run('resolveTest();resolveTest()');assert.equal(g.get('S.hp'),9-g.get('ENCOUNTER[0].dmg'));assert.equal(g.get('S.actions'),2);g.run('finishTest(S.testResult)');assert.equal(g.get('S.locClues.study'),0);
});

test('空线索调查仍受阶段行动和确认锁约束，新开局取消旧确认',()=>{
 const g=game();g.run(`S.locClues.study=0;requestAction('investigate');requestAction('resource');resource()`);assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.resources'),5);g.run('startGame();confirmAction()');assert.equal(g.get('S.actions'),3);assert.equal(g.get('S.test'),null);for(const state of ["S.actions=0","S.phase='enemy'","phaseTransitionActive=true"]){const h=game();h.run(`S.locClues.study=0;${state};requestAction('investigate')`);assert.equal(h.get('pendingAction'),null);assert.equal(h.get('S.test'),null);}
});
test('完成调查消耗行动且先处理借机攻击，败北后不能获胜',()=>{
  const g=game();g.run(`S.location='attic';S.actIdx=1;finish()`);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.gameOver'),true);
  const h=game();h.enemy();h.run(`S.location='attic';S.enemies[0].location='attic';S.actIdx=1;S.hp=1;finish()`);
  assert.equal(h.get('S.hp'),0);assert.match(h.document.getElementById('modalBox').innerHTML,/调查失败/);
});
test('行动移到左侧人物牌下方，资产替换中央原行动区',()=>{
  const left=html.split('<!-- 左栏 -->')[1].split('<!-- 中央 -->')[0];
  const center=html.split('<!-- 中央 -->')[1].split('<!-- 右栏 -->')[0];
  assert.ok(left.indexOf('id="investigator"')<left.indexOf('id="actions"'));assert.match(left,/class="panel command-panel"/);assert.match(left,/id="controls"/);
  assert.doesNotMatch(center,/id="actions"|id="controls"/);assert.doesNotMatch(left,/id="assets"/);
  assert.ok(center.indexOf('class="panel enemy-panel"')<center.indexOf('class="panel equipment-panel"'));
  assert.ok(center.indexOf('id="assets"')<center.indexOf('class="bottom"'));
});

test('手牌独占中央底部且资产、槽位与行动入口仍然唯一',()=>{
  const bottom=html.split('<div class="bottom">')[1].split('<!-- 右栏 -->')[0];assert.match(bottom,/id="hand"/);assert.doesNotMatch(bottom,/id="assets"|id="slots"/);
  for(const id of ['actions','actioncount','controls','assets','slots'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
});

test('左侧行动与中央资产的响应式规则已接入',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','layout.css'),'utf8');assert.match(html,/layout.css\?v=asset-icons-1/);
  assert.match(css,/\.col-left \.actions\{grid-template-columns:repeat\(2/);assert.match(css,/orientation:landscape/);assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/\.col-center \.bottom\{display:block;margin:0/);assert.match(css,/min-height:44px/);
});

test('换区后行动与资产渲染仍同步，不改变出牌代价',()=>{
  const g=game();g.run(`S.hand=[{...INVESTIGATOR.deck[0]}];onHandCard(0)`);
  assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.resources'),2);assert.match(g.document.getElementById('assets').innerHTML,/自动手枪/);assert.match(g.document.getElementById('slots').innerHTML,/1\/2/);
  assert.match(g.document.getElementById('actioncount').textContent,/2/);
});

test('地点路线有序斜向居中，连接线只连接真实相邻房间',()=>{
  const g=game();g.run('renderLocations()');const map=g.document.getElementById('mapwrap').innerHTML;
  assert.ok(map.indexOf('data-room="study"')<map.indexOf('data-room="hallway"'));assert.ok(map.indexOf('data-room="hallway"')<map.indexOf('data-room="attic"'));
  for(const [room,x,y] of [['study',20,78],['hallway',50,50],['attic',80,22]])assert.match(map,new RegExp(`data-room="${room}" style="--node-x:${x}%;--node-y:${y}%"`));
  assert.equal((map.match(/<line /g)||[]).length,2);assert.match(map,/data-from="study" data-to="hallway"/);assert.match(map,/data-from="hallway" data-to="attic"/);assert.doesNotMatch(map,/data-from="study" data-to="attic"/);
});

test('地图房间状态和线索敌人数量仍随实际状态刷新',()=>{
  const g=game();g.run(`S.revealed.hallway=true;S.locClues.hallway=0;S.enemies=[{card:ENCOUNTER[0],location:'hallway'}];renderLocations()`);
  let map=g.document.getElementById('mapwrap').innerHTML;assert.match(map,/可前往/);assert.match(map,/敌人 ×1/);
  g.run(`S.enemies=[];S.location='hallway';renderLocations()`);map=g.document.getElementById('mapwrap').innerHTML;
  assert.match(map,/map-node current[^>]*data-room="hallway"/);assert.equal(g.document.getElementById('sceneTitle').textContent,'走廊');
});

test('地图未揭示节点仍不可点击，相邻已揭示节点才提供移动入口',()=>{
  const g=game();g.run('renderLocations()');let map=g.document.getElementById('mapwrap').innerHTML;
  assert.doesNotMatch(map,/onclick="requestMapMove\('hallway'\)"/);
  g.run('S.revealed.hallway=true;S.revealed.attic=true;renderLocations()');map=g.document.getElementById('mapwrap').innerHTML;
  assert.match(map,/onclick="requestMapMove\('hallway'\)"/);assert.doesNotMatch(map,/onclick="requestMapMove\('attic'\)"/);
});

test('路线节点移动仍只扣一次行动，位置刷新且不能跨房间',()=>{
  const g=game();g.run(`S.revealed.hallway=true;S.revealed.attic=true;clickNode('attic')`);assert.equal(g.get('S.actions'),3);
  g.run(`clickNode('hallway')`);assert.equal(g.get('S.actions'),2);assert.equal(g.get('S.location'),'hallway');
  assert.match(g.document.getElementById('mapwrap').innerHTML,/map-node current[^>]*data-room="hallway"/);
});

test('地图样式恢复图标连线及绝对定位，移除底部占位元素',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','map.css'),'utf8');
  assert.match(css,/position:absolute!important;left:var\(--node-x\)!important;top:var\(--node-y\)!important/);
  assert.match(css,/\.map>svg.route-connections\{display:block/);assert.match(css,/\.node-ico\{display:grid/);
  assert.match(css,/@container\(max-width:300px\)/);assert.match(html,/map.css\?v=player-marker-1/);assert.match(html,/class="scene-route"/);assert.doesNotMatch(html,/class="scene-space"/);
});

test('路线几何在窄地图和宽地图中保留房间间距及居中顺序',()=>{
  for(const width of [160,220,280,300,320,420,600,820]){
    const narrow=width<=300,height=narrow?460:320,cardWidth=narrow?Math.min(96,width*0.36):Math.max(86,Math.min(138,width*0.24)),cardHeight=narrow?128:138;
    const points=[[0.2,0.78],[0.5,0.5],[0.8,0.22]].map(([x,y])=>({x:width*x,y:height*y}));
    for(const p of points){assert.ok(p.x-cardWidth/2>=0);assert.ok(p.x+cardWidth/2<=width);assert.ok(p.y-cardHeight/2>=0);assert.ok(p.y+cardHeight/2<=height);}
    for(let i=1;i<points.length;i++)assert.ok(Math.abs(points[i].x-points[i-1].x)>=cardWidth || Math.abs(points[i].y-points[i-1].y)>=cardHeight);
  }
});

test('当前位置以唯一罗兰头像标记替换旧文字标签',()=>{
  const g=game();g.run('renderLocations()');const map=g.document.getElementById('mapwrap').innerHTML;
  assert.equal((map.match(/class="map-player-marker"/g)||[]).length,1);assert.match(map,/aria-label="罗兰·班克斯的当前位置：书房"/);assert.match(map,/class="map-player-portrait art"/);assert.doesNotMatch(map,/class="you"/);
});

test('头像随移动到新地点，不在旧地点留下人物标记',()=>{
  const g=game();g.run(`S.revealed.hallway=true;S.revealed.attic=true;clickNode('hallway')`);let map=g.document.getElementById('mapwrap').innerHTML;
  assert.match(map,/当前位置：走廊/);assert.doesNotMatch(map,/当前位置：书房/);assert.equal((map.match(/class="map-player-marker"/g)||[]).length,1);
  g.run(`clickNode('attic')`);map=g.document.getElementById('mapwrap').innerHTML;assert.match(map,/当前位置：阁楼/);assert.doesNotMatch(map,/当前位置：走廊/);assert.equal(g.get('S.actions'),1);
});

test('地图头像展示不改变状态，房间图标及可前往标签保留',()=>{
  const g=game();g.run('S.revealed.hallway=true');const before=g.get('S');g.run('renderLocations();renderLocations()');assert.deepEqual(g.get('S'),before);
  const map=g.document.getElementById('mapwrap').innerHTML;assert.match(map,/node-ico/);assert.match(map,/可前往/);assert.match(map,/--art-x:0%;--art-y:0%/);
});

test('头像在卡片外悬浮，尺寸适配且不拦截地图点击',()=>{
  const css=fs.readFileSync(path.join(__dirname,'..','map.css'),'utf8');assert.match(css,/\.map-player-marker\{position:absolute;top:-23px/);assert.match(css,/pointer-events:none;z-index:4/);assert.match(css,/width:42px;height:42px/);
  assert.match(html,/role="img" aria-label="罗兰·班克斯的当前位置/);
});

test('四档混沌袋与原版战役配置完全一致，实例互不污染',()=>{
  const g=game();
  const numeric={easy:[1,1,0,0,0,-1,-1,-1,-2,-2],standard:[1,0,0,-1,-1,-1,-2,-2,-3,-4],hard:[0,0,0,-1,-1,-2,-2,-3,-3,-4,-5],expert:[0,-1,-1,-2,-2,-3,-3,-4,-4,-5,-6,-8]};
  for(const [key,numbers] of Object.entries(numeric)){
    const bag=g.get(`makeChaosBag('${key}')`);assert.deepEqual(bag.filter(t=>'mod'in t).map(t=>t.mod),numbers);
    assert.equal(bag.filter(t=>t.symbol==='skull').length,2);assert.equal(bag.filter(t=>t.symbol==='cultist').length,1);assert.equal(bag.filter(t=>t.symbol==='tablet').length,1);
    assert.equal(bag.filter(t=>t.autofail).length,1);assert.equal(bag.filter(t=>t.elder).length,1);assert.equal(bag.length,numbers.length+6);
  }
  g.run(`const isolated=makeChaosBag('easy');isolated[0].mod=99`);assert.equal(g.get(`makeChaosBag('easy')[0].mod`),1);
});

test('选择只在开局生效，默认标准，起始数值不随难度变动',()=>{
  const g=game();assert.equal(g.get('S.difficulty'),'standard');
  for(const key of ['easy','standard','hard','expert','invalid','__proto__']){
    g.document.getElementById('difficultySelect').value=key;g.run('startGame()');
    assert.equal(g.get('S.difficulty'),['invalid','__proto__'].includes(key)?'standard':key);
    assert.deepEqual(g.get('[S.resources,S.hp,S.sanity,S.actions,S.hand.length]'),[5,9,5,3,5]);
    const before=g.get('S.chaos');g.document.getElementById('difficultySelect').value='easy';g.run('updateDifficultyPreview();render()');assert.deepEqual(g.get('S.chaos'),before);
  }
});

test('简单标准骷髅只按同地点食尸鬼数量扣值，包含力竭敌人',()=>{
  const g=game();g.enemy();g.run(`S.enemies[0].exhausted=true;S.enemies.push({...S.enemies[0],location:'attic'});S.chaos=[{label:'骷髅',symbol:'skull'}]`);
  for(const key of ['easy','standard']){g.run(`S.difficulty='${key}'`);assert.equal(g.get('resolveChaosTokens().mod'),-1);}
  g.run(`S.enemies[0].card={type:'enemy',name:'老鼠'};S.enemies[1].card=S.enemies[0].card`);assert.equal(g.get('resolveChaosTokens().mod'),0);
});

test('简单标准异教徒失败才受恐惧，成功不受，不能重复结算',()=>{
  for(const difficulty of [2,5]){
    const g=game();g.run(`S.chaos=[{label:'异教徒',symbol:'cultist'}];startTest('will',${difficulty},'测试',()=>{});resolveTest()`);
    assert.equal(g.get('S.sanity'),difficulty===5?4:5);g.run('resolveTest()');assert.equal(g.get('S.sanity'),difficulty===5?4:5);
  }
});

test('困难专家异教徒继续抽取且不放回，失败额外两恐惧',()=>{
  for(const key of ['hard','expert']){
    const g=game();g.run(`S.difficulty='${key}';Math.random=()=>0;S.chaos=[{label:'异教徒',symbol:'cultist'},{label:'-2',mod:-2}];startTest('will',2,'测试',()=>{});resolveTest()`);
    assert.equal(g.get('S.testResult'),false);assert.equal(g.get('S.sanity'),3);assert.equal(g.get('S.chaos.length'),2);
    assert.match(g.document.getElementById('modalBox').innerHTML,/异教徒 → -2/);
  }
});

test('困难异教徒接上古印记成功不扣恐惧，接自动失败仍失败',()=>{
  for(const autofail of [false,true]){
    const g=game();g.run(`S.difficulty='hard';Math.random=()=>0;S.chaos=[{label:'异教徒',symbol:'cultist'},{label:'后续',elder:${!autofail},autofail:${autofail}}];startTest('will',2,'测试',()=>{});resolveTest()`);
    assert.equal(g.get('S.testResult'),!autofail);assert.equal(g.get('S.sanity'),autofail?3:5);
  }
});

test('石板按参考卡两面结算，同地点没有食尸鬼时不受伤',()=>{
  for(const hard of [false,true])for(const local of [false,true]){
    const g=game();if(local)g.enemy();
    g.run(`S.difficulty='${hard?'hard':'standard'}';S.chaos=[{label:'石板',symbol:'tablet'}];startTest('will',0,'测试',()=>{});resolveTest()`);
    assert.equal(g.get('S.hp'),local?8:9);assert.equal(g.get('S.sanity'),local&&hard?4:5);
    assert.equal(g.get('S.testResult'),true); // Tablet damage is independent of passing.
  }
});

test('符号致命伤害或恐惧时立即终止检定，不覆盖失败弹窗',()=>{
  for(const token of ['tablet','cultist']){
    const g=game();g.enemy();g.run(`S.difficulty='hard';S.hp=1;S.sanity=1;S.chaos=[{label:'符号',symbol:'${token}'},{label:'-8',mod:-8}];Math.random=()=>0;startTest('will',9,'测试',()=>{S.resources=999});resolveTest();finishTest(false)`);
    assert.equal(g.get('S.gameOver'),true);assert.equal(g.get('S.resources'),5);assert.match(g.document.getElementById('modalBox').innerHTML,/调查失败/);
  }
});

test('上古印记按当前地点线索加值，不保证成功且不回血',()=>{
  for(const clues of [0,2]){
    const g=game();g.run(`S.hp=6;S.locClues.study=${clues};S.chaos=[{label:'上古印记',elder:true}];startTest('int',5,'测试',()=>{});resolveTest()`);
    assert.equal(g.get('S.testResult'),clues===2);assert.equal(g.get('S.hp'),6);
  }
});

test('自动失败即使难度零也失败，负技能值最低为零',()=>{
  const g=game();g.run(`S.chaos=[{label:'自动失败',autofail:true}];startTest('int',0,'测试',()=>{});resolveTest()`);assert.equal(g.get('S.testResult'),false);
  assert.match(g.document.getElementById('modalBox').innerHTML,/最终智慧能力：<b>0<\/b>/);
  const h=game();h.run(`S.chaos=[{label:'-8',mod:-8}];startTest('int',0,'测试',()=>{});resolveTest()`);assert.equal(h.get('S.testResult'),true);
});

test('困难骷髅失败在检定结束后按玩家选择从弃牌堆抽取食尸鬼',()=>{
  const g=game();g.run(`S.difficulty='hard';S.encounter=[{...ENCOUNTER[0]}];S.encounterDiscard=[{...ENCOUNTER[2]}];S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('int',4,'测试',()=>{S.resources++});resolveTest()`);
  assert.equal(g.get('S.enemies.length'),0);assert.match(g.document.getElementById('modalBox').innerHTML,/ghoulSearchChoice/);
  g.document.getElementById('ghoulSearchChoice').value='ghoul3';g.run('finishTest(false);finishTest(false)');
  assert.equal(g.get('S.enemies.length'),1);assert.equal(g.get('S.enemies[0].card.id'),'ghoul3');assert.equal(g.get('S.enemies[0].engaged'),true);assert.equal(g.get('S.encounterDiscard.length'),0);assert.equal(g.get('S.resources'),6);
});

test('困难骷髅成功不找敌人，无可搜索敌人或检定致死均安全',()=>{
  const g=game();g.run(`S.difficulty='expert';S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('combat',1,'测试',()=>{});resolveTest();finishTest(true)`);assert.equal(g.get('S.enemies.length'),0);
  const h=game();h.run(`S.difficulty='hard';S.encounter=[];S.encounterDiscard=[];S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('int',5,'测试',()=>{});resolveTest();finishTest(false)`);assert.equal(h.get('S.enemies.length'),0);
  const j=game();j.run(`S.difficulty='hard';S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('int',5,'测试',()=>{S.hp=0;checkDefeat()});resolveTest();finishTest(false)`);assert.equal(j.get('S.enemies.length'),0);
});

test('开始页难度入口、参考袋详情和局内难度显示均存在',()=>{
  for(const id of ['difficultySelect','difficultyPreview','difficultyBag','difficultyScope','currentDifficulty'])assert.ok(html.includes(`id="${id}"`));
  assert.match(html,/option value="standard" selected/);assert.match(html,/updateDifficultyPreview\(\);/);
  assert.match(html,/并非完整官方战役/);
});

test('三线索推进幕后移动至阁楼可达成胜利结算',()=>{
  const g=game();g.run(`S.clues=3;S.location='hallway';advanceAct();doMove('attic');finish()`);
  assert.deepEqual(g.get('[S.actIdx,S.clues,S.location,S.actions,S.gameOver]'),[1,0,'attic',0,true]);
  assert.match(g.document.getElementById('modalBox').innerHTML,/调查成功/);
});

function testLesson(g){return g.document.getElementById('modalBox').innerHTML.match(/<section class="test-learning"[\s\S]*?<\/section>/)?.[0]||'';}
test('首关调查说明用基础智慧对比遮蔽，抽取前达标不等于已成功',()=>{
 const g=game();g.run("requestAction('investigate')");const lesson=testLesson(g);
 assert.match(lesson,/用人物牌上的「智慧」对比地点的「遮蔽值」 2/);
 assert.match(lesson,/data-part="base">基础智慧<b>3<\/b>/);assert.match(lesson,/data-part="before">当前调查能力<b>3<\/b>/);
 assert.match(lesson,/平手也算；自动失败除外/);assert.match(g.document.getElementById('modalBox').innerHTML,/抽取前足够，尚未结算/);assert.equal(g.get('S.actions'),3);
});
test('四种属性的说明来自实际人物值，遭遇难度不会误称地点遮蔽',()=>{
 for(const [skill,name,value]of [['will','意志',3],['int','智慧',3],['combat','战斗',4],['agility','敏捷',2]]){
  const g=game();g.run(`startTest('${skill}',4,'遭遇检定',()=>{})`);const lesson=testLesson(g);
  assert.ok(lesson.includes(`基础${name}<b>${value}</b>`));assert.match(lesson,/对比当前效果要求的「检定目标值」 4/);assert.doesNotMatch(lesson,/地点的「遮蔽值」/);
 }
});
test('投入和取消投入实时更新卡牌加成，不提前消耗卡牌或行动',()=>{
 const g=game();g.run("S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];requestAction('investigate');toggleCommit(0)");
 assert.match(testLesson(g),/data-part="committed">投入卡牌<b>2<\/b>/);assert.match(testLesson(g),/data-part="before">当前调查能力<b>5<\/b>/);
 g.run('toggleCommit(0)');assert.match(testLesson(g),/data-part="committed">投入卡牌<b>0<\/b>/);assert.equal(g.get('S.hand.length'),1);assert.equal(g.get('S.actions'),3);
});
test('装备战斗加成和闪避效果分别展示，后者消耗后结果仍显示本次真实加成',()=>{
 const g=game();g.enemy();g.run("S.assets=[{card:{...INVESTIGATOR.deck.find(c=>c.id==='p45')},exhausted:false}];requestAction('fight')");assert.match(testLesson(g),/对比敌人的「战斗值」 2/);assert.match(testLesson(g),/data-part="bonus">装备／效果<b>1<\/b>/);assert.match(testLesson(g),/data-part="before">当前战斗能力<b>5<\/b>/);
 const h=game();h.enemy();h.run("S.evadeBonus=2;requestAction('evade');resolveTest()");assert.equal(h.get('S.evadeBonus'),0);assert.match(testLesson(h),/对比敌人的「闪避值」 2/);assert.match(testLesson(h),/data-part="bonus">装备／效果<b>2<\/b>/);assert.match(testLesson(h),/4（抽取前） \+ 0（混沌修正） = 4/);
});
test('抽取后展示完整算式和比较，平手成功且投入已弃置仍保留加成解释',()=>{
 const g=game();g.run("S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];S.chaos=[{label:'-3',mod:-3}];requestAction('investigate');toggleCommit(0);resolveTest()");
 assert.match(testLesson(g),/5（抽取前） − 3（混沌修正） = 2/);assert.match(testLesson(g),/最终 2 ≥ 遮蔽值 2：成功/);assert.match(testLesson(g),/投入卡牌<b>2<\/b>/);assert.equal(g.get('S.testResult'),true);assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('S.discard.length'),1);
});
test('自动失败不使用普通比较解释，负值归零后难度0可正常成功',()=>{
 const g=game();g.run("S.chaos=[{label:'自动失败',autofail:true}];startTest('int',0,'调查',()=>{});resolveTest()");assert.match(testLesson(g),/不比较数值，本次直接失败/);assert.doesNotMatch(testLesson(g),/最终 0 ≥ 遮蔽值 0：成功/);assert.equal(g.get('S.testResult'),false);
 const h=game();h.run("S.chaos=[{label:'-8',mod:-8}];startTest('int',0,'调查',()=>{});resolveTest()");assert.match(testLesson(h),/= -5，最低按 0 计算/);assert.match(testLesson(h),/最终 0 ≥ 遮蔽值 0：成功/);assert.equal(h.get('S.testResult'),true);
});
test('符号指示物展示实际结算修正，包含上古印记和困难连抽',()=>{
 const g=game();g.run("S.chaos=[{label:'上古印记',elder:true}];startTest('int',5,'调查',()=>{});resolveTest()");assert.match(testLesson(g),/3（抽取前） \+ 2（混沌修正） = 5/);
 const h=game();h.run("S.difficulty='hard';S.chaos=[{label:'异教徒',symbol:'cultist'},{label:'-2',mod:-2}];Math.random=()=>0;startTest('int',2,'调查',()=>{});resolveTest()");assert.match(testLesson(h),/3（抽取前） − 2（混沌修正） = 1/);assert.match(testLesson(h),/最终 1 ＜ 遮蔽值 2：失败/);
});
test('检定讲解只读，不改变随机和游戏状态，样式只作用于弹窗内说明',()=>{
 const g=game();g.run("requestAction('investigate');Math.random=()=>{throw Error('must not draw')}");const before=g.get('S');g.run("testLearningInfo(S.test);testLearningInfo(S.test,{mod:-1,autofail:false})");assert.deepEqual(g.get('S'),before);
 assert.match(html,/test-learning.css\?v=encounter-context-3/);const css=fs.readFileSync(path.join(__dirname,'..','test-learning.css'),'utf8');assert.match(css,/flex-wrap:wrap/);assert.match(css,/orientation:landscape/);assert.doesNotMatch(css,/#game|#wrap|body\s*\{|\.main\s*\{/);
});

test('调查准备、投入后和结果统一使用遮蔽值与调查能力',()=>{
 const g=game();g.run("S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='percep')}];requestAction('investigate')");
 let box=g.document.getElementById('modalBox').innerHTML;
 assert.match(box,/遮蔽值：<b>2<\/b>　当前调查能力：<b>3<\/b>/);assert.doesNotMatch(box,/难度|当前合计|抽取前合计/);
 g.run('toggleCommit(0)');assert.match(g.document.getElementById('modalBox').innerHTML,/当前调查能力：<b>5<\/b>/);
 g.run('resolveTest()');box=g.document.getElementById('modalBox').innerHTML;
 assert.match(box,/最终调查能力：<b>5<\/b> vs 遮蔽值 2/);assert.doesNotMatch(box,/难度|当前合计|抽取前合计/);
});

test('战斗闪避和遭遇检定按实际属性显示目标值与当前能力，结果用语一致',()=>{
 for(const [skill,label,target,ability,value]of [['combat','战斗 手枪','敌人战斗值','战斗',4],['agility','闪避','敌人闪避值','闪避',2],['will','抵抗恐惧低语','检定目标值','意志',3],['int','遭遇检定','检定目标值','智慧',3]]){
  const g=game();g.run(`startTest('${skill}',2,'${label}',()=>{})`);let box=g.document.getElementById('modalBox').innerHTML;
  assert.ok(box.includes(`${target}：<b>2</b>　当前${ability}能力：<b>${value}</b>`));assert.ok(testLesson(g).includes(`当前${ability}能力<b>${value}</b>`));assert.doesNotMatch(box,/难度|当前合计|抽取前合计/);
  g.run('resolveTest()');box=g.document.getElementById('modalBox').innerHTML;assert.ok(box.includes(`最终${ability}能力：<b>${value}</b> vs ${target} 2`));assert.doesNotMatch(box,/难度|当前合计|抽取前合计/);
 }
});

test('五种可投入牌使用对应小图、牌名、属性加成和可访问选中按钮，投入取消不消耗行动资源',()=>{
 for(const [id,skill]of [['percep','int'],['courage','combat'],['guts','will'],['manual','agility'],['dodge','agility']]){
  const g=game();g.run(`S.hand=[{...INVESTIGATOR.deck.find(c=>c.id==='${id}')}];startTest('${skill}',2,'检定',()=>{})`);
  let box=g.document.getElementById('modalBox').innerHTML;const art=g.get(`CARD_ART.${id}`),name=g.get('S.hand[0].name');
  assert.match(box,/<button type="button" id="commitCard0" class="commit-card /);assert.match(box,/aria-pressed="false"/);assert.ok(box.includes(`--art-x:${art[0]}%;--art-y:${art[1]}%`));assert.ok(box.includes(`<b>${name}</b>`));assert.match(box,/class="commit-bonus">.* \+2/);
  const before=g.get('[S.resources,S.actions,S.hand.length]');g.run('toggleCommit(0)');box=g.document.getElementById('modalBox').innerHTML;assert.match(box,/aria-pressed="true"/);assert.match(box,/已投入 · 点击取消/);assert.equal(g.get('S.committed.length'),1);assert.deepEqual(g.get('[S.resources,S.actions,S.hand.length]'),before);
  g.run('toggleCommit(0)');assert.equal(g.get('S.committed.length'),0);assert.deepEqual(g.get('[S.resources,S.actions,S.hand.length]'),before);
 }
});

test('每种检定结果都有旋转揭晓标记，重复抽取不会重抽或重结算',()=>{
 for(const [skill,label]of [['int','调查'],['combat','战斗'],['agility','闪避'],['will','抵抗恐惧低语']]){
  const g=game();g.run(`startTest('${skill}',2,'${label}',()=>{});resolveTest()`);const box=g.document.getElementById('modalBox').innerHTML;
  assert.match(box,/class="test-reveal"/);assert.match(box,/class="chaos reveal-token"><span class="reveal-token-face">0<\/span>/);assert.match(box,/class="center test-reveal-summary"/);
  const before=g.get('S');g.run('resolveTest()');assert.deepEqual(g.get('S'),before);assert.equal(g.document.getElementById('modalBox').innerHTML,box);
 }
});

test('线索动画仅用于成功且有线索的调查，点击继续前不发放，继续仅结算一次',()=>{
 for(const empty of [false,true])for(const success of [false,true]){
  const g=game();g.run(`S.locClues.study=${empty?0:2};S.chaos=[${success?"{label:'0',mod:0}":"{label:'自动失败',autofail:true}"}];requestAction('investigate');${empty?'confirmAction();':''}resolveTest()`);
  const box=g.document.getElementById('modalBox').innerHTML;assert.equal(box.includes('class="test-clue-preview"'),success&&!empty);assert.equal(g.get('S.clues'),0);
  if(success&&!empty){assert.match(box,/发现 1 条线索/);assert.match(box,/点击继续后获得/);}
  g.run('finishTest(S.testResult);finishTest(true)');assert.equal(g.get('S.clues'),success&&!empty?1:0);assert.equal(g.get('S.locClues.study'),empty?0:success?1:2);
 }
 const g=game();g.run("startTest('combat',0,'战斗',()=>{});resolveTest()");assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/test-clue-preview/);
});

test('旋转、结果和线索依次呈现，减少动态偏好立即展示，不引入阻塞或额外抽取',()=>{
 const css=fs.readFileSync(path.join(__dirname,'..','test-reveal.css'),'utf8');assert.match(html,/test-reveal.css\?v=spin-1/);
 assert.match(css,/chaos-token-spin 700ms/);assert.match(css,/chaos-token-face 180ms ease-out 650ms/);assert.match(css,/chaos-result-reveal 220ms ease-out 820ms/);assert.match(css,/chaos-clue-rise 320ms ease-out 1000ms/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(css,/animation:none;opacity:1;transform:none/);assert.doesNotMatch(css,/infinite|position:fixed/);
 for(const line of css.split('\n').filter(line=>line.startsWith('@keyframes')))assert.doesNotMatch(line,/(?:width|height|top|left|margin|padding):/);
 const g=game();g.run("requestAction('investigate');resolveTest();finishTest(S.testResult)");assert.equal(g.get('S.test'),null);assert.equal(g.get('S.clues'),1);
});

function symbolLesson(g){return g.document.getElementById('modalBox').innerHTML.match(/<section class="token-explanation"[\s\S]*?<\/section>/)?.[0]||'';}
test('骷髅说明按同地点食尸鬼数量解释实际修正，而非自动失败',()=>{
 for(const count of [0,1,2]){
  const g=game();g.run(`S.enemies=Array.from({length:${count}},()=>({card:{...ENCOUNTER[0]},hp:2,location:'study',engaged:false,exhausted:false}));S.enemies.push({card:{...ENCOUNTER[0]},location:'hallway'});S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('int',2,'调查',()=>{});resolveTest()`);
  const lesson=symbolLesson(g);assert.match(lesson,/不是自动失败/);assert.ok(lesson.includes(`本地点有 ${count} 名食尸鬼，本枚修正 ${count===0?0:-count}`));assert.match(lesson,/assets\/tokens\/skull.svg/);assert.equal(g.get('S.testResult'),count<=1);
 }
});
test('困难骷髅说明区分成功与失败，不提前抽取食尸鬼',()=>{
 for(const passed of [true,false]){
  const g=game();g.run(`S.difficulty='hard';S.chaos=[{label:'骷髅',symbol:'skull'}];startTest('int',${passed?1:2},'调查',()=>{});resolveTest()`);
  const lesson=symbolLesson(g);assert.match(lesson,/困难／专家/);assert.match(lesson,/修正 −2/);assert.match(lesson,passed?/本次成功，不触发/:/点击继续结算后处理寻找食尸鬼/);assert.equal(g.get('S.enemies.length'),0);
 }
});
test('异教徒说明展示最终失败恐惧，困难连抽逐枚解释并保留实际顺序',()=>{
 for(const passed of [true,false]){
  const g=game();g.run(`S.chaos=[{label:'异教徒',symbol:'cultist'}];startTest('int',${passed?2:3},'调查',()=>{});resolveTest()`);assert.match(symbolLesson(g),/修正 −1/);assert.match(symbolLesson(g),passed?/不承受这枚的失败恐惧/:/这枚造成 1 点恐惧（已结算）/);assert.equal(g.get('S.sanity'),passed?5:4);
 }
 const g=game();g.run("S.difficulty='hard';S.chaos=[{label:'异教徒',symbol:'cultist'},{label:'异教徒',symbol:'cultist'},{label:'-4',mod:-4}];Math.random=()=>0;startTest('int',2,'调查',()=>{});resolveTest()");
 const lesson=symbolLesson(g);assert.match(lesson,/1\. 异教徒/);assert.match(lesson,/2\. 异教徒/);assert.match(lesson,/3\. -4/);assert.match(lesson,/继续抽取另一枚/);assert.equal((lesson.match(/这枚造成 2 点恐惧（已结算）/g)||[]).length,2);assert.match(lesson,/本次累计修正：-4/);assert.equal(g.get('S.sanity'),1);
});
test('石板说明区分难度与同地点食尸鬼条件，额外伤害与成功无关',()=>{
 for(const hard of [false,true])for(const local of [false,true]){
  const g=game();if(local)g.enemy();g.run(`S.difficulty='${hard?'hard':'standard'}';S.chaos=[{label:'石板',symbol:'tablet'}];startTest('combat',0,'战斗',()=>{});resolveTest()`);
  const lesson=symbolLesson(g);assert.match(lesson,hard?/修正 −4/:/修正 −2/);assert.match(lesson,/与成功失败无关/);assert.match(lesson,local?/1 伤害/:/没有食尸鬼，不触发/);assert.equal(g.get('S.hp'),local?8:9);assert.equal(g.get('S.sanity'),local&&hard?4:5);assert.equal(g.get('S.testResult'),true);
 }
});
test('上古印记说明使用罗兰抽取时的地点线索，自动失败说明不比较数值',()=>{
 for(const clues of [0,2]){
  const g=game();g.run(`S.locClues.study=${clues};S.chaos=[{label:'上古印记',elder:true}];startTest('int',5,'调查',()=>{});resolveTest()`);assert.match(symbolLesson(g),/不是自动成功/);assert.ok(symbolLesson(g).includes(`有 ${clues} 条线索，本枚修正 ${clues?'+'+clues:0}`));assert.equal(g.get('S.testResult'),clues===2);
 }
 const g=game();g.run("S.chaos=[{label:'自动失败',autofail:true}];startTest('int',0,'调查',()=>{});resolveTest()");assert.match(symbolLesson(g),/无论能力多高、目标值多低/);assert.match(symbolLesson(g),/其他指示物的加值也不能抵消/);assert.equal(g.get('S.testResult'),false);
});
test('符号说明只读、使用抽取快照，不额外随机或改动牌袋；普通数字不加冗余说明',()=>{
 const g=game();g.enemy();g.run("S.chaos=[{label:'骷髅',symbol:'skull'}];const captured=resolveChaosTokens();S.enemies=[];Math.random=()=>{throw Error('no redraw')}");
 const before=g.get('S'),lesson=g.run('chaosTokenExplanation(captured,true)');assert.match(lesson,/本地点有 1 名食尸鬼，本枚修正 -1/);assert.deepEqual(g.get('S'),before);
 const h=game();h.run("startTest('int',2,'调查',()=>{});resolveTest()");assert.equal(symbolLesson(h),'');
 for(const art of ['skull','cultist','tablet','elder','autofail','minus4'])assert.ok(fs.existsSync(path.join(__dirname,'..','assets','tokens',art+'.svg')));
 assert.match(html,/token-explanation.css\?v=symbols-1/);
});
test('符号伤害致死时保留失败界面并附上符号原因，不覆盖为普通检定结果',()=>{
 const g=game();g.enemy();g.run("S.hp=1;S.chaos=[{label:'石板',symbol:'tablet'}];startTest('int',0,'调查',()=>{});resolveTest()");assert.equal(g.get('S.gameOver'),true);assert.match(g.document.getElementById('modalBox').innerHTML,/调查失败/);assert.match(symbolLesson(g),/石板/);assert.match(symbolLesson(g),/1 伤害已结算/);assert.doesNotMatch(g.document.getElementById('modalBox').innerHTML,/class="test-reveal"/);
});

test('调查胜利结局响一次成功提示，重复结算和重绘不重播，失败不播放成功音',()=>{
 const g=game();g.run("let endingCues=[];playGameSfx=name=>endingCues.push(name);resolve('R1','你在阁楼的旧箱中找到了真相——这场聚会背后的邪恶仪式。你决定阻止它。');resolve('R1','重复');render()");
 assert.deepEqual(g.get('endingCues'),['victory']);assert.match(g.document.getElementById('modalBox').innerHTML,/你决定阻止它/);assert.match(g.document.getElementById('modalBox').innerHTML,/调查成功/);
 const h=game();h.run("let endingCues=[];playGameSfx=name=>endingCues.push(name);resolve('R2','失败结局');resolve('R2','重复')");assert.deepEqual(h.get('endingCues'),['ghoulHunter']);
});

