/* Single-investigator UI bridge for the Standard Core player rules. Scenario
 * maps, encounter references and the three adapted chapters remain separate.
 * Every optional reaction pauses for a real player choice. No network calls. */
(() => {
  'use strict';
  const catalog=ArkhamPlayers,core=ArkhamOfficialCore,session=ArkhamOfficialSession,tests=ArkhamOfficialTests;
  const byId=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mapSkill={will:'willpower',int:'intellect',combat:'combat',agility:'agility'};
  Object.assign(CARD_ART,{'01016':CARD_ART.p45,'01020':CARD_ART.machete,'01088':CARD_ART.resource,'01023':CARD_ART.dodge,'01089':CARD_ART.guts,'01090':CARD_ART.percep,'01091':CARD_ART.courage,'01092':CARD_ART.manual});
  const original={startGame,drawOpeningHand,canAct,renderActions,renderInvestigator,renderLocations,renderAssets,renderActAgenda,skillValue,commitBonus,toggleCommit,openTestModal,startTest,resolveTest,finishTest,cancelTest,drawCards,onHandCard,applyPlayerLoss,closeModal,doMove,finish,advanceAct,endTurn,enterPhase,enemyPhase,upkeepPhase,mythosPhase,drawEncounter,beginAction,inspectAsset,resolve,continueChapter,investigate,fight,evade,requestAction,draw,resource,difficultySymbolText,requestReturnMenu,testLearningInfo};
  let selected='roland',pendingSelection='roland',ticket=0,executing=false,prepaid=false;
  const active=()=>!!S?.player;
  const p=()=>S.player;
  const has=code=>p().assets.some(c=>c.code===code);
  const blank=()=>S.enemies.some(e=>e.card.code==='01103'&&e.location===S.location);
  const local=()=>S.enemies.filter(e=>e.location===S.location);
  const ownWindow=()=>active()&&!S.gameOver&&!S.playerBusy&&!S.playerChoice&&!S.test&&!S.chapterIntro&&!phaseTransitionActive&&!pendingAction&&!pendingNavigation&&!S.pendingMove&&S.phase==='investigation';
  const playerWindow=()=>active()&&!S.gameOver&&!S.playerBusy&&!S.playerChoice&&!S.test&&!S.chapterIntro&&!phaseTransitionActive&&!pendingAction&&!pendingNavigation&&!S.pendingMove;
  const series=(items,fn,done)=>{let i=0;function next(){if(!active()||S.gameOver){done?.();return;}if(i>=items.length){done?.();return;}fn(items[i++],next);}next();};
  function sync(){
    if(!active())return;
    if(S.playerLeoGranted&&!has('01048')){S.actions=Math.max(0,S.actions-1);S.turnActions=Math.max(3,S.turnActions-1);S.playerLeoGranted=false;}
    S.assets=p().assets.map(card=>({card,get exhausted(){return card.exhausted;},set exhausted(value){card.exhausted=value;}}));
  }
  function job(fn){
    if(!active()||S.playerBusy||S.gameOver)return;
    const state=S;state.playerBusy=true;let complete=false;
    fn(()=>{if(complete||S!==state)return;complete=true;state.playerBusy=false;sync();render();});
  }
  function choose(title,copy,options,done){
    if(S.gameOver)return;
    const state=S,nonce=++ticket;
    state.playerChoice={nonce,options,done};
    openModal(`<section class="player-choice"><h3>${esc(title)}</h3><p>${esc(copy)}</p><div class="player-options">${options.map((o,i)=>`<button class="btn ${o.primary?'primary':''}" type="button" onclick="playerPick(${nonce},${i})">${esc(o.label)}</button>`).join('')}</div></section>`);
    sync();renderActions();
    byId('modalBox').querySelector('.player-options button')?.focus();
  }
  window.playerPick=(nonce,index)=>{
    if(!active()||S.gameOver)return;const choice=S.playerChoice;
    if(!choice||choice.nonce!==nonce||!choice.options[index])return;
    const option=choice.options[index];S.playerChoice=null;byId('modal').classList.remove('open');choice.done(option.value);
  };
  closeModal=function(){if(active()&&S.playerChoice&&!S.gameOver)return;return original.closeModal();};
  function optional(title,copy,fn,done){choose(title,copy,[{label:'发动',value:true,primary:true},{label:'不发动',value:false}],yes=>yes?fn(done):done());}
  function pickEnemy(title,enemies,done,skip=false){
    if(!enemies.length){done(null);return;}
    choose(title,'选择一个目标。',enemies.map(e=>({label:`${e.card.name} · 生命 ${e.hp}/${e.card.hp}`,value:e})).concat(skip?[{label:'不发动',value:null}]:[]),done);
  }
  function discard(card){
    if(!card)return;const s=p();s.assets=s.assets.filter(c=>c!==card);s.threats=s.threats.filter(c=>c!==card);S.hand=S.hand.filter(c=>c!==card);
    if(!S.discard.includes(card))S.discard.push(card);sync();
  }
  function eventDestination(card){
    if(has('01014'))S.deck.unshift(card);else if(!S.discard.includes(card))S.discard.push(card);
  }
  function loss(damage,horror,source,done,direct=false,attacker=null){
    if(S.gameOver){done();return;}
    const s=p(),beforeHp=S.hp,beforeSan=S.sanity,allocation=[];
    const capacities=s.assets.filter(c=>(c.health||0)>c.damage||(c.sanity||0)>c.horror);
    function settle(){
      const dogs=allocation.filter(a=>a.damage>0&&s.assets.find(c=>c.instanceId===a.instanceId)?.code==='01021');
      if(!session.assignLoss(s,damage,horror,allocation,direct))throw Error('Invalid player loss allocation');
      const info={hp:beforeHp-S.hp,sanity:beforeSan-S.sanity,source,phase:S.phase,round:S.round};
      if(info.hp)gameSfx('hurt');if(info.sanity)gameSfx('sanity');
      if((info.hp||info.sanity)&&typeof showPlayerLoss==='function')showPlayerLoss(info);
      log(`${esc(source)}：本人受到 ${info.hp} 伤害、${info.sanity} 恐惧${allocation.length?'；其余已分配给资产':''}。`,'bad');
      sync();checkDefeat();if(S.gameOver){done();return;}
      const extra=[];
      if(info.sanity)for(const c of s.threats.filter(c=>c.code==='01099'))extra.push(n=>loss(1,0,c.name,n,true));
      if(info.hp)for(const c of s.threats.filter(c=>c.code==='01100'))extra.push(n=>loss(0,1,c.name,n,true));
      if(attacker&&dogs.length&&S.enemies.includes(attacker))extra.push(n=>optional('看门狗反击','攻击伤害分配给了看门狗。对攻击它的敌人造成 1 伤害？',k=>damageEnemy(attacker,1,k),n));
      if(info.sanity&&!blank()&&s.investigator==='agnes'&&s.ability.agnesPhase!==phaseKey()&&local().length)extra.push(n=>pickEnemy('艾格尼丝 · 恐惧反击',local(),enemy=>{
        if(!enemy){n();return;}s.ability.agnesPhase=phaseKey();damageEnemy(enemy,1,n);
      },true));
      series(extra,(fn,n)=>fn(n),done);
    }
    function allocate(kind,left,after){
      if(!left){after();return;}
      const targets=capacities.filter(c=>{
        const a=allocation.find(a=>a.instanceId===c.instanceId);return (kind==='damage'?c.health:c.sanity)-(c[kind==='damage'?'damage':'horror']||0)-(a?.[kind]||0)>0;
      });
      if(!targets.length){after();return;}
      choose('分配'+(kind==='damage'?'伤害':'恐惧'),`${source}：还有 ${left} 点待分配。资产满额后会弃置；直接伤害／恐惧不能分配给资产。`,[
        {label:'剩余全部由本人承受',value:null},...targets.map(c=>({label:`分配 1 点给 ${c.name}`,value:c}))
      ],card=>{if(!card){after();return;}let a=allocation.find(a=>a.instanceId===card.instanceId);if(!a){a={instanceId:card.instanceId,damage:0,horror:0};allocation.push(a);}a[kind]++;allocate(kind,left-1,after);});
    }
    if(direct||!capacities.length)settle();else allocate('damage',damage,()=>allocate('horror',horror,settle));
  }
  const phaseKey=()=>`${S.chapter}:${S.round}:${S.phase}`;
  function discover(amount,done){
    const count=Math.min(Math.max(0,amount),S.locClues[S.location]||0);
    if(!count){done();return;}
    const cover=p().threats.find(c=>c.code==='01007'&&c.clues>0);
    const gain=()=>{const origin=typeof captureClueOrigin==='function'?captureClueOrigin():null;S.locClues[S.location]-=count;S.clues+=count;gameSfx('clue');log(`发现 ${count} 条线索！`,'good');if(typeof showClueGain==='function')showClueGain(count,origin);done();};
    if(cover)choose('掩盖真相','选择发现地点线索，或改为移除「掩盖真相」上的线索（地点线索不会减少）。',[
      {label:`发现 ${count} 条地点线索`,value:false},{label:`移除 ${Math.min(count,cover.clues)} 条弱点线索`,value:true}
    ],yes=>{if(yes){cover.clues=Math.max(0,cover.clues-count);done();}else gain();});else gain();
  }
  function reactions(list,done){series(list,(r,n)=>optional(r.title,r.copy,r.run,n),done);}
  function afterDefeat(enemy,done){
    const list=[],s=p();
    if(s.investigator==='roland'&&!blank()&&s.ability.rolandRound!==S.round&&S.locClues[S.location]>0)list.push({title:'罗兰 · 发现线索',copy:'本轮一次，击败本地点敌人后发现 1 条线索？',run:n=>{s.ability.rolandRound=S.round;discover(1,n);}});
    const evidence=eventCards().filter(c=>c.code==='01022'&&S.resources>=c.cost);
    for(const card of evidence)list.push({title:card.name,copy:`花 ${card.cost} 资源，发现本地点 1 条线索？`,run:n=>{if(!eventCards().includes(card)||S.resources<card.cost||!S.locClues[S.location]){n();return;}playFast(card,()=>discover(1,n));}});
    reactions(list,done);
  }
  function damageEnemy(enemy,amount,done){
    if(!S.enemies.includes(enemy)||amount<=0){done();return;}
    const before=enemy.hp;let origin=null;try{origin=typeof captureEnemyHitOrigin==='function'?captureEnemyHitOrigin(enemy):null;}catch(_){}
    enemy.hp=Math.max(0,enemy.hp-amount);log(`${enemy.card.name} 受到 ${before-enemy.hp} 伤害。`,'good');
    const killed=enemy.hp===0;
    if(killed){
      S.enemies=S.enemies.filter(e=>e!==enemy);log(`${enemy.card.name} 被击败。`,'gold');
      if(enemy.card.code)S.discard.push(catalog.card(enemy.card));
      else if([CELLAR_GUARD.id,FINAL_GUARD.id].includes(enemy.card.id)){(S.defeatedStoryEnemies??=[]).push(enemy.card);if(enemy.card.id===FINAL_GUARD.id)S.finalGuardDefeated=true;}
      else if(enemy.card.victory>0)S.victory.push(enemy.card);else S.encounterDiscard.push(enemy.card);
    }
    render();if(typeof showEnemyDamage==='function')showEnemyDamage({enemy,damage:before-enemy.hp,before,remaining:enemy.hp,origin});
    if(killed)afterDefeat(enemy,done);else done();
  }
  function hit(enemy,reason,done){
    if(!S.enemies.includes(enemy)||S.gameOver){done();return;}
    if(S.playerPreventAttacks&&!enemy.card.elite){log(`${enemy.card.name} 的攻击被「潜逃」阻止。`);done();return;}
    const dodges=eventCards().filter(c=>c.code==='01023'&&S.resources>=c.cost);
    const attack=()=>loss(enemy.card.dmg||0,enemy.card.horror||0,`${enemy.card.name} · ${reason}`,()=>{if(enemy.card.code==='01102')S.doom++;done();},false,enemy);
    if(dodges.length)choose('敌人即将攻击',`${enemy.card.name}：${enemy.card.dmg||0} 伤害、${enemy.card.horror||0} 恐惧。`,[{label:'承受攻击',value:null},...dodges.map(c=>({label:`打出闪躲 · ${c.cost} 资源`,value:c}))],c=>c?playFast(c,done):attack());else attack();
  }
  function prepare(cost={},source,exempt,done){
    const s=p(),paid={...cost};delete paid.horror;
    if(cost.actions&&S.phase!=='investigation'){done(false);return;}
    if(!session.pay(s,paid,source)){log('无法支付行动、资源、使用次数或力竭费用。','bad');done(false);return;}
    if(cost.actions)S.playerActionsTaken+=cost.actions;
    sync();
    const attacks=cost.actions&&!exempt?S.enemies.filter(e=>e.engaged&&!e.exhausted):[];
    const after=()=>series(attacks,(e,n)=>hit(e,'借机攻击',n),()=>done(!S.gameOver));
    if(cost.horror)loss(0,cost.horror,source?.name||'能力费用',after);else after();
  }
  function playFast(card,done){
    S.resources-=card.cost;S.hand=S.hand.filter(c=>c!==card);S.discard=S.discard.filter(c=>c!==card);S.playedCards.push({card,round:S.round});eventDestination(card);gameSfx('card');
    done();
  }
  function weakReveal(card,done){
    const settle=()=>{
      S.weaknessReveal=null;
      const s=p(),code=card.code;
      if(['01007','01009','01011','01098','01099','01100'].includes(code)){
        if(code==='01007')card.clues=3;if(code==='01009')card.horror=3;if(code==='01011'){card.resources=0;card.payments=0;}
        s.threats.push(card);if(code==='01009')replaceSlots(null,()=>done());else done();
      }else if(code==='01013'){S.hand.push(card);done();}
      else if(code==='01015')loss(0,2,card.name,()=>{s.removed.push(...S.discard);S.discard=[];S.discard.push(card);done();},true);
      else if(code==='01097'){S.resources=0;S.discard.push(card);done();}
      else if(code==='01096'){
        const cards=S.hand.filter(c=>c.type!=='weak');
        if(cards.length<=1){S.discard.push(card);done();return;}
        choose('失忆 · 保留一张手牌','弱点手牌不受这次弃牌影响。',cards.map(c=>({label:c.name,value:c})),keep=>{const lost=S.hand.filter(c=>c.type!=='weak'&&c!==keep);S.hand=S.hand.filter(c=>c.type==='weak'||c===keep);S.discard.push(...lost,card);done();});
      }else if(['01101','01102','01103'].includes(code)){
        const enemyCard={...card,type:'enemy',fight:card.enemy_fight,hp:card.health,evade:card.enemy_evade,dmg:card.enemy_damage||0,horror:card.enemy_horror||0,hunter:true,victory:0};
        S.enemies.push({card:enemyCard,hp:enemyCard.hp,location:S.location,engaged:true,exhausted:false});monsterSfx(enemyCard);done();
      }else throw Error('Unimplemented weakness '+code);
    };
    S.weaknessReveal=card;
    log(`抽到弱点 ${card.name}：立刻展示并按牌面结算。`,'bad');
    if(typeof revealWeakness==='function'&&revealWeakness(card,settle))return;
    settle();
  }
  function drawPlayer(count,done){
    if(!count||S.gameOver){done();return;}
    const next=()=>{
      if(!S.deck.length){if(!S.discard.length){done();return;}S.deck=shuffle(S.discard);S.discard=[];loss(0,1,'牌组耗尽',()=>drawPlayer(count,done));return;}
      const card=S.deck.pop();
      if(card.type==='weak')weakReveal(card,()=>drawPlayer(count-1,done));else{S.hand.push(card);gameSfx('draw');drawPlayer(count-1,done);}
    };next();
  }
  function replaceSlots(newCard,done){
    const s=p(),extra=s.threats.filter(c=>c.type_code==='asset');
    const fits=()=>session.fits([...s.assets,...extra,...(newCard?[newCard]:[])]);
    if(fits()){done();return;}
    // Discard only an asset whose removal reduces an overflowing slot. Player
    // decides which one; no unrelated voluntary discards or hidden replacement.
    const usage=session.slotUsage([...s.assets,...extra,...(newCard?[newCard]:[])]),bonus=s.assets.some(c=>c.code==='01008')?2:0;
    const overflowing=new Set();if(usage.Hand+Math.max(0,usage.TomeHand-bonus)>2)overflowing.add('hand');
    for(const slot of ['Arcane','Body','Ally','Accessory'])if(usage[slot]>(slot==='Arcane'?2:1))overflowing.add(slot.toLowerCase());
    const choices=s.assets.filter(c=>overflowing.has(c.slot)&&!(c.rules.cannotLeaveWith&&c[c.rules.cannotLeaveWith]>0));
    if(!choices.length)throw Error('No legal slot replacement');
    choose('槽位不足 · 替换资产','选择弃置一个占用超额槽位的资产。',choices.map(c=>({label:`弃置 ${c.name}`,value:c})),c=>{discard(c);replaceSlots(newCard,done);});
  }
  function initialize(){
    const spec=catalog.investigator(selected),s={investigator:selected,spec,stage:'mulligan',round:1,phase:'investigation',turn:1,assets:[],threats:[],enemies:[],ability:core.initialAbilityState(),pending:null,defeated:false,events:[],removed:[],mentalTrauma:0,physicalTrauma:0,experiencePenalty:0,mulliganUsed:false};
    for(const key of ['hand','deck','discard','resources','actions','clues','round','phase','location','chaos'])Object.defineProperty(s,key,{get:()=>S[key],set:v=>{S[key]=v;},configurable:true});
    Object.defineProperty(s,'damage',{get:()=>spec.health-S.hp,set:v=>{S.hp=Math.max(0,spec.health-v);}});
    Object.defineProperty(s,'horror',{get:()=>spec.sanity-S.sanity,set:v=>{S.sanity=Math.max(0,spec.sanity-v);}});
    Object.defineProperty(s,'localClues',{get:()=>S.locClues[S.location]||0});
    Object.defineProperty(s,'enemies',{get:()=>S.enemies.map(e=>({...e.card,location:e.location}))});
    S.player=s;S.initialPlayerDeck=S.deck.map(c=>structuredClone(c)).sort((a,b)=>a.code.localeCompare(b.code));S.playerTurn=1;S.turnActions=3;S.playerActionsTaken=0;S.deferredPlayerLoss=[];S.playerBusy=false;
    original.drawOpeningHand();sync();
  }
  drawOpeningHand=function(){if(INVESTIGATOR.officialId)initialize();else original.drawOpeningHand();};
  startGame=function(){
    const spec=catalog.investigator(selected);
    Object.assign(INVESTIGATOR,{officialId:selected,name:spec.name,title:spec.title,will:spec.skills[0],int:spec.skills[1],combat:spec.skills[2],agility:spec.skills[3],maxHp:spec.health,maxSanity:spec.sanity,deck:catalog.assemble(selected)});
    for(const card of INVESTIGATOR.deck)CARD_USAGE[card.id]=card.text;
    original.startGame();
    if(typeof resetPhaseAnnouncement==='function')resetPhaseAnnouncement();phaseTransitionActive=false;
    job(done=>mulligan(done));
  };
  function mulligan(done){
    const state=S,rejected=new Set();
    function show(){
      choose('准备起手牌','起手 5 张牌；可选择任意张换牌一次。弱点不会进入起手牌。选好后点击开始调查。',S.hand.map(c=>({label:`${rejected.has(c.instanceId)?'☑ 换掉':'□ 保留'} ${c.name}`,value:c.instanceId})).concat([{label:'开始调查 · 确认起手',value:'confirm',primary:true}]),id=>{
        if(id==='confirm'){session.mulligan(state.player,[...rejected]);session.begin(state.player);S.playerTurn=state.player.turn;done();if(typeof announcePhase==='function')announcePhase('investigation',()=>{});if(typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('arkham:player-ready'));return;}
        if(rejected.has(id))rejected.delete(id);else rejected.add(id);show();
      });
    }show();
  }
  canAct=function(ignoreTest=false){return original.canAct(ignoreTest)&&(!active()||executing||(!S.playerBusy&&!S.playerChoice));};
  skillValue=function(skill){
    if(!active())return original.skillValue(skill);
    return tests.value(p(),mapSkill[skill],S.test?.playerContext||'effect')+(p().temporary?.[skill]||0);
  };
  testLearningInfo=function(t,token=null){
    if(!active())return original.testLearningInfo(t,token);
    const labels=testValueLabels(t),base=INVESTIGATOR[t.skill],equipment=skillValue(t.skill)-base+t.bonus,committed=S.committed.reduce((n,c)=>n+commitBonus(c),0),before=base+equipment+committed;
    const explanation=token?(token.autofail?'自动失败：本次直接失败。':token.automaticSuccess?'上古印记能力使本次自动成功。':`抽取前 ${before} ＋ 混沌修正 ${token.mod} ＝ ${Math.max(0,before+token.mod)}；与${labels.target} ${t.difficulty} 比较。`):'再抽混沌指示物并加入修正。最终值达到目标即成功，平手也算；自动失败除外。';
    return `<section class="test-learning" aria-label="检定数值讲解"><h4>本次用什么检定？</h4><p>用「${SKILL[t.skill]}」对比${labels.target} ${t.difficulty}。</p><div class="test-learning-formula"><span>人物基础<b>${base}</b></span><i>+</i><span>装备／效果<b>${equipment}</b></span><i>+</i><span>投入卡牌<b>${committed}</b></span><i>=</i><span>${labels.before}<b>${before}</b></span></div><p>${explanation}</p></section>`;
  };
  commitBonus=function(card){if(!active())return original.commitBonus(card);if(!S.test||card.type==='weak')return 0;return (card.skills?.[mapSkill[S.test.skill]]||0)+(card.skills?.wild||0);};
  toggleCommit=function(index){
    if(!active())return original.toggleCommit(index);
    if(!S.test||S.test.resolved||S.playerBusy)return;
    const card=S.hand[index];if(card&&tests.commit(p(),card.instanceId)){S.committed=p().test.committed;openTestModal();}
  };
  renderInvestigator=function(){
    original.renderInvestigator();if(!active())return;
    const spec=catalog.investigator(p().investigator),el=byId('investigator');
    if(p().investigator!=='roland'){const art=INVESTIGATOR_ART[p().investigator];el.innerHTML=el.innerHTML.replace(/<div class="portrait art"[^>]*><\/div>/,art?`<div class="portrait art" role="img" aria-label="${esc(spec.name)}肖像" style="${cardArtStyle(art)}"></div>`:`<div class="portrait player-medallion" role="img" aria-label="${esc(spec.name)}职业标记">${spec.symbol}</div>`);}
    el.innerHTML=el.innerHTML.replace(`${S.actions}/3`,`${S.actions}/${S.turnActions}`).replace('共 3 次','共 '+S.turnActions+' 次');
  };
  renderLocations=function(){original.renderLocations();if(active()){
    const spec=catalog.investigator(p().investigator),el=byId('mapwrap');el.innerHTML=el.innerHTML.replace('罗兰·班克斯的当前位置',spec.name+'的当前位置');
    if(p().investigator!=='roland'){const art=INVESTIGATOR_ART[p().investigator];el.innerHTML=el.innerHTML.replace(/<span class="map-player-portrait art"[^>]*><\/span>/,art?`<span class="map-player-portrait art" aria-hidden="true" style="${cardArtStyle(art)}"></span>`:`<span class="map-player-portrait player-medallion" aria-hidden="true">${spec.symbol}</span>`);}
  }};
  renderAssets=function(){if(!active())return original.renderAssets();sync();original.renderAssets();
    const used=session.slotUsage([...p().assets,...p().threats.filter(c=>c.type_code==='asset')]);
    byId('slots').textContent=`手槽 ${used.Hand+Math.max(0,used.TomeHand-(has('01008')?2:0))}/2 · 法术槽 ${used.Arcane}/2`;
    let index=0;byId('assets').innerHTML=byId('assets').innerHTML.replace(/<small>(就绪|已力竭)<\/small>/g,(match,state)=>{
      const c=p().assets[index++],uses=Object.entries(c?.uses||{}).map(([key,value])=>`${{ammo:'弹药',charges:'充能',supplies:'补给',secrets:'秘密'}[key]} ${value}`).join(' · ');
      return `<small>${state}${uses?' · '+uses:''}${c?.doom?' · 末日 '+c.doom:''}</small>`;
    });
  };
  renderActAgenda=function(){original.renderActAgenda();if(active()){
    const attached=p().assets.reduce((n,c)=>n+(c.doom||0),0),threshold=AGENDA_DECK[S.agendaIdx].threshold;
    if(attached&&threshold>0)byId('doomcount').textContent=` ${S.doom+attached}/${threshold}（资产 ${attached}）`;
  }};
  renderActions=function(){
    original.renderActions();if(!active()||S.gameOver)return;
    const el=byId('actions');
    if(S.playerBusy||S.playerChoice)byId('menuButton').disabled=true;
    if(S.playerBusy){el.innerHTML='';byId('controls').innerHTML='<span role="status">请完成当前牌面效果或选择。</span>';return;}
    if(S.phase==='investigation'&&!S.test&&!S.chapterIntro){
      el.innerHTML+=`<button class="btn action-btn player-ability-button" type="button" onclick="playerAbilities()">角色与资产能力<small>${esc(catalog.investigator(p().investigator).role)} · 查看可发动能力</small></button>`;
      byId('controls').innerHTML='<button id="endTurnButton" class="btn" type="button" onclick="requestAction(\'endTurn\')">结束回合 →</button>';
      byId('actioncount').textContent=`剩余 ${S.actions}/${S.turnActions}`;
    }
    if(S.phase!=='investigation'&&!S.test&&!S.chapterIntro)el.innerHTML+='<button class="btn action-btn" type="button" onclick="playerAbilities()">快速能力<small>阶段间的玩家窗口</small></button>';
    if(S.playerBusy||S.playerChoice)byId('menuButton').disabled=true;
  };
  applyPlayerLoss=function(damage=0,horror=0,source=''){
    if(!active())return original.applyPlayerLoss(damage,horror,source);
    S.deferredPlayerLoss.push(n=>loss(damage,horror,source,n));
    if(!S.playerBusy)job(done=>drain(done));
  };
  function drain(done){const steps=S.deferredPlayerLoss.splice(0);series(steps,(fn,n)=>fn(n),()=>S.deferredPlayerLoss.length?drain(done):done());}
  beginAction=function(exempt=false,staged=null){if(!active())return original.beginAction(exempt,staged);return prepaid&&!S.gameOver;};
  function legacyAction(fn,exempt=false){
    if(!ownWindow()||S.actions<1)return;
    job(done=>prepare({actions:1},null,exempt,ok=>{
      if(!ok){done();return;}executing=true;prepaid=true;S.actions++;try{fn();}finally{S.actions--;executing=false;prepaid=false;}sync();drain(done);
    }));
  }
  doMove=function(id){if(!active())return original.doMove(id);if(!LOCATIONS[S.location].conn.includes(id))return;const from=S.location;legacyAction(()=>{original.doMove(id);if(S.location!==from)leaveLocation(from);});};
  advanceAct=function(){if(!active())return original.advanceAct();if(!((S.actIdx===0&&S.clues>=3)||([2,4].includes(S.actIdx)&&S.clues>=2)))return;legacyAction(()=>original.advanceAct());};
  finish=function(preview=false){
    if(!active())return original.finish(preview);
    if(S.actIdx===3&&S.location==='altar'){if(!ownWindow()||hasEngagedReadyEnemy())return;playerTest('will',3,'封印裂隙',{cost:{actions:1},exempt:false},(r,data,n)=>{
      if(r.success){resolve('R1','你念完最后一个字，门后的低语骤然中断。裂隙终于合拢，但你还必须离开宅邸。');n();}else loss(0,1,'封印反噬',n);
    });return;}
    if((S.actIdx===1&&S.location==='attic')||(S.actIdx===5&&S.location==='gate'&&!hasEngagedReadyEnemy()))legacyAction(()=>original.finish());
  };
  drawCards=function(count,onComplete=null){if(!active())return original.drawCards(count,onComplete);if(S.playerBusy)return;job(done=>drawPlayer(count,()=>{onComplete?.();done();}));};
  draw=function(){if(!active())return original.draw();if(!ownWindow()||S.actions<1)return;job(done=>prepare({actions:1},null,false,ok=>ok?drawPlayer(1,done):done()));};
  resource=function(){if(!active())return original.resource();if(!ownWindow()||S.actions<1)return;job(done=>prepare({actions:1},null,false,ok=>{if(ok)S.resources++;done();}));};
  function playerTest(skill,difficulty,label,options,onDone){
    if(!active()||S.gameOver||S.test)return;
    const context=options.context||'effect';
    if(!tests.begin(p(),{skill:mapSkill[skill],difficulty,context,bonus:options.bonus||0}))return;
    original.startTest(skill,difficulty,label,()=>{},options.bonus||0,options.cost?.actions?!!options.exempt:null);
    S.test.playerOptions=options;S.test.playerContext=context;S.test.playerDone=onDone;S.test.cancelable=!!options.cost;
    openTestModal();
  }
  startTest=function(skill,difficulty,label,onDone,bonus=0,actionExempt=null,onStart=null,encounter=null){
    if(!active())return original.startTest(skill,difficulty,label,onDone,bonus,actionExempt,onStart,encounter);
    playerTest(skill,difficulty,label,{bonus,cost:actionExempt===null?null:{actions:1},exempt:!!actionExempt},(r,data,n)=>{onDone(r.success);drain(n);});
    if(S.test)S.test.encounter=encounter;
  };
  openTestModal=function(){
    original.openTestModal();if(!active()||!S.test||S.test.resolved)return;
    const t=S.test,boosts=p().assets.flatMap(c=>(c.rules.abilities||[]).filter(a=>a.effect==='boost-test'&&a.skill===mapSkill[t.skill]).map(a=>({c,a})));
    byId('modalBox').innerHTML=byId('modalBox').innerHTML.replace(`（基础 ${skillValue(t.skill)}）`,`（人物基础 ${INVESTIGATOR[t.skill]}，含装备加值见下方）`);
    let extra='';
    if(boosts.length)extra+=`<div class="player-test-tools">${boosts.map(({c})=>`<button class="btn" ${S.resources<(t.playerOptions?.cost?.resources||0)+(t.pendingBoostCost||0)+1?'disabled':''} onclick="playerBoost('${c.instanceId}')">${esc(c.name)} · 1 资源换 +1</button>`).join('')}</div><p class="player-cost-note">已选加值费用 ${t.pendingBoostCost||0} 资源；确认抽取时一并支付，返回则取消。</p>`;
    if(S.playerMindOverMatter&&['combat','agility'].includes(t.skill))extra+='<button class="btn" onclick="playerSubstitute()">心胜于物 · 改用智慧</button>';
    extra+='<button class="btn" type="button" onclick="playerTestAbilities()">检定玩家窗口 · 快速能力</button>';
    if(t.playerOptions?.source)extra+=`<p class="player-cost-note">使用 ${esc(t.playerOptions.source.name)}：抽取前支付所列行动／使用次数。取消不消耗弹药或充能。</p>`;
    if(extra)byId('modalBox').innerHTML+=extra;
  };
  window.playerBoost=id=>{
    if(!active()||S.playerBusy||!S.test||S.test.resolved||S.resources<(S.test.playerOptions?.cost?.resources||0)+(S.test.pendingBoostCost||0)+1)return;
    const card=p().assets.find(c=>c.instanceId===id);
    if(!card?.rules.abilities?.some(a=>a.effect==='boost-test'&&a.skill===mapSkill[S.test.skill]))return;
    S.test.pendingBoostCost=(S.test.pendingBoostCost||0)+1;S.test.bonus++;p().test.bonus++;openTestModal();
  };
  window.playerSubstitute=()=>{
    if(!active()||!S.test||S.test.resolved||!S.playerMindOverMatter||!['combat','agility'].includes(S.test.skill))return;
    S.test.skill='int';p().test.skill='intellect';p().test.committed=[];S.committed=[];openTestModal();
  };
  window.playerTestAbilities=()=>{
    if(!active()||S.gameOver||S.playerBusy||S.playerChoice||!S.test||S.test.resolved)return;
    const t=S.test,entries=[];
    for(const card of [...p().assets,...p().threats])for(const a of card.rules.abilities||[])if(a.timing==='fast'&&a.window==='player-window'&&availableAbility(card,a))entries.push({label:`${card.name} · ${card.text}`,value:n=>ability(card,a,n)});
    for(const card of S.hand)if(card.type==='asset'&&card.rules.play?.timing==='fast'&&S.resources>=card.cost&&session.fits([...p().assets.filter(c=>!c.slot),...p().threats.filter(c=>c.type_code==='asset'),card]))entries.push({label:`打出 ${card.name} · ${card.cost} 资源 · 快速`,value:n=>resolvePlay(card,n)});
    for(const card of eventCards())if(card.rules.play?.timing==='fast'&&S.phase==='investigation'&&card.rules.play.window==='own-turn'&&S.resources>=card.cost)entries.push({label:`打出 ${card.name} · 快速`,value:n=>resolvePlay(card,n)});
    job(done=>choose('检定中的玩家窗口','快速能力不消耗普通行动，但仍支付其资源、力竭或使用次数。完成后返回当前检定。',entries.concat([{label:'返回检定',value:null}]),run=>{
      const finish=()=>{done();if(S.test===t&&!S.gameOver)openTestModal();};if(run)run(finish);else finish();
    }));
  };
  cancelTest=function(){
    if(!active())return original.cancelTest();
    if(!S.test||S.test.resolved||S.test.resolving||!S.test.cancelable||S.playerBusy)return;
    p().test=null;S.test=null;S.committed=[];byId('modal').classList.remove('open');render();
  };
  function testSymbols(token,s){
    const hard=DIFFICULTIES[difficultyKey(S.difficulty)].hard,ghouls=local().filter(e=>isGhoul(e.card)).length;
    if(token.symbol==='skull')return {modifier:hard?-2:-ghouls,onFailure:hard?{effect:'search-ghoul'}:null};
    if(token.symbol==='cultist')return {modifier:hard?0:-1,drawAgain:hard,onFailure:{effect:'loss',damage:0,horror:hard?2:1}};
    if(token.symbol==='tablet')return {modifier:hard?-4:-2,loss:ghouls?{damage:1,horror:hard?1:0}:null};
    throw Error('Unknown scenario symbol');
  }
  function testReady(){
    const t=S.test,options=t.playerOptions||{},s=p();
    const cost={...(options.cost||{})};
    cost.resources=(cost.resources||0)+(t.pendingBoostCost||0);
    const start=()=>prepare(cost,options.source,!!options.exempt,ok=>{
      if(!ok){t.resolving=false;S.playerBusy=false;openTestModal();render();return;}
      if(options.playCard){const c=options.playCard;S.hand=S.hand.filter(x=>x!==c);S.discard=S.discard.filter(x=>x!==c);S.playedCards.push({card:c,round:S.round});}
      t.resolved=true;tests.reveal(s);revealChoice();
    });
    if(cost.actions&&options.source?.traits?.includes('Tome')&&s.investigator==='daisy'&&!blank()&&s.ability.daisyTurn!==S.playerTurn){
      choose('黛西 · 典籍行动','使用每回合一次的典籍专用额外行动，或支付普通行动。',[
        {label:'使用典籍额外行动',value:true},...(S.actions>=cost.actions?[{label:'支付普通行动',value:false}]:[])
      ],yes=>{if(yes){s.ability.daisyTurn=S.playerTurn;S.playerActionsTaken++;cost.actions=0;}start();});
    }else start();
  }
  resolveTest=function(){
    if(!active())return original.resolveTest();
    if(!S.test||S.test.resolved||S.test.resolving||S.playerBusy||S.gameOver)return;
    S.test.resolving=true;S.playerBusy=true;testReady();
  };
  function revealChoice(){
    const s=p(),t=S.test,token=s.test.current.token;
    const cards=S.hand.filter(c=>c.type!=='weak'&&!s.test.committed.includes(c));
    if(s.investigator==='wendy'&&!blank()&&!s.test.wendyUsed&&cards.length){
      choose('温蒂 · 是否取消这枚指示物？',`揭示：${token.label}。弃置一张手牌后，将这枚指示物放回混沌袋，再抽一枚；每次检定一次。`,[
        {label:'保留指示物',value:null},...cards.map(c=>({label:`弃置 ${c.name}，重新抽取`,value:c.instanceId}))
      ],id=>{if(id){if(!tests.redraw(s,id))throw Error('Invalid Wendy redraw');revealChoice();}else acceptToken();});
    }else acceptToken();
  }
  function acceptToken(){
    if(!tests.accept(p(),testSymbols))throw Error('Token could not be accepted');
    if(p().test.stage==='draw-next'){tests.reveal(p());revealChoice();return;}
    luckyWindow();
  }
  function luckyWindow(){
    const s=p(),result=tests.result(s),cards=eventCards().filter(c=>c.code==='01080'&&!s.test.committed.includes(c)&&S.resources>=c.cost);
    if(!result.success&&!result.autofail&&cards.length)choose('好运 · 当前将失败',`当前 ${result.total}，目标 ${result.difficulty}。可以花 1 资源打出好运，本次能力 +2。`,[
      {label:'不打出，接受结果',value:null},...cards.map(c=>({label:'打出好运 · +2',value:c}))
    ],c=>{if(c){if(!S.hand.includes(c)){S.discard=S.discard.filter(x=>x!==c);S.hand.push(c);}if(!tests.lucky(s,c.instanceId))throw Error('Lucky payment failed');S.playedCards.push({card:c,round:S.round});S.test.bonus+=2;luckyWindow();}else showResult();});else showResult();
  }
  function showResult(){
    const t=S.test,s=p(),r=tests.result(s);tests.finalize(s);t.playerResult=r;S.testResult=r.success;t.resolving=false;S.playerBusy=false;
    const tokens=s.test.tokens,elder=tokens.some(token=>token.elder),spec=catalog.investigator(s.investigator);
    gameSfx('token');gameSfx(r.success?'testSuccess':'testFailure');
    const explanations=tokens.filter(token=>token.symbol||token.elder||token.autofail).map(token=>{
      const text=token.elder?`${spec.name}：${spec.elder}${s.threats.some(c=>c.code==='01009')?' 死灵之书使上古印记改为自动失败。':''}`:token.autofail?'自动失败：本次检定失败，能力再高也不能抵消。':token.symbol==='skull'?(DIFFICULTIES[S.difficulty].hard?'−2；失败后寻找食尸鬼。':'−同地点食尸鬼数量。'):token.symbol==='cultist'?(DIFFICULTIES[S.difficulty].hard?'再抽一枚；失败承受 2 恐惧。':'−1；失败承受 1 恐惧。'):(DIFFICULTIES[S.difficulty].hard?'−4；同地点有食尸鬼时承受 1 伤害、1 恐惧。':'−2；同地点有食尸鬼时承受 1 伤害。');
      return `<p><b>${esc(token.label)}</b>：${esc(text)}</p>`;
    }).join('');
    byId('modalBox').innerHTML=`<h3>检定结果</h3><div class="test-reveal">${testLearningInfo(t,{mod:s.test.modifier,autofail:r.autofail,automaticSuccess:r.automaticSuccess})}<div class="chaos reveal-token"><span class="reveal-token-face">${tokens.map(c=>esc(c.label)).join(' → ')}</span></div><section class="token-explanation">${explanations}</section><p>${testValueLabels(t).final} <b>${r.total}</b> ／ ${testValueLabels(t).target} <b>${r.difficulty}</b></p><div class="test-feedback ${r.success?'test-success':'test-failure'}">${r.success?'检定成功':'检定失败'}</div>${elder?`<p>${esc(spec.elder)}</p>`:''}<p>点击继续，结算结果、卡牌与指示物后果。已抽取的检定不能撤销。</p><button id="testResolveButton" class="btn primary" onclick="finishTest()">继续 · 结算结果 →</button></div>`;
    byId('modal').classList.add('open');renderActions();
  }
  finishTest=function(){
    if(!active())return original.finishTest(...arguments);
    const t=S.test;if(!t?.playerResult||t.finishing||S.playerBusy)return;t.finishing=true;
    const r=tests.finish(p());if(!r)return;
    const options=t.playerOptions||{},tokens=r.tokens,extraDamage=r.effects.filter(e=>e.effect==='attack-extra-damage').reduce((n,e)=>n+e.amount,0),extraClues=r.effects.filter(e=>e.effect==='discover-additional-clues').reduce((n,e)=>n+e.amount,0);
    S.test=null;S.committed=[];byId('modal').classList.remove('open');
    job(done=>{
      const effects=r.effects.filter(e=>['loss','search-ghoul'].includes(e.effect));
      const bad=tokens.some(token=>token.autofail||['skull','cultist','tablet','elder_thing'].includes(token.symbol));
      if(options.onSymbols&&bad){if(options.onSymbols.horror)effects.push({effect:'loss',damage:0,horror:options.onSymbols.horror});if(options.onSymbols.loseTurnActions)S.actions=Math.max(0,S.actions-options.onSymbols.loseTurnActions);}
      series(effects,(effect,n)=>{
        if(effect.effect==='loss')loss(effect.damage||0,effect.horror||0,'混沌指示物／法术后果',n);
        else choose('骷髅 · 寻找食尸鬼','从遭遇牌组或弃牌堆选择一名食尸鬼。',availableGhouls().length?availableGhouls().map(c=>({label:c.name,value:c.id})):[{label:'没有可寻找的食尸鬼',value:null}],id=>{if(id)drawSearchedGhoul(id);n();});
      },()=>{
        if(S.gameOver){if(options.playCard)eventDestination(options.playCard);done();return;}
        t.playerDone(r,{extraDamage,extraClues,tokens},()=>{
          const after=r.effects.filter(e=>!['loss','search-ghoul','attack-extra-damage','discover-additional-clues'].includes(e.effect));
          series(after,(e,n)=>{
            if(e.effect==='draw')optional('检定成功 · 抽牌',`是否抽 ${e.amount} 张牌？`,k=>drawPlayer(e.amount,k),n);
            else if(e.effect==='gain-resources'){S.resources+=e.amount;n();}
            else if(e.effect==='heal-horror'){S.sanity=Math.min(INVESTIGATOR.maxSanity,S.sanity+e.amount);n();}
            else if(e.effect==='survival-instinct-choice')choose('生存本能','可脱离其他敌人，并移动到相邻地点。',[
              {label:'不发动',value:null},{label:'脱离其他敌人，保持原位',value:'stay'},...LOCATIONS[S.location].conn.map(id=>({label:`脱离并移动到 ${LOCATIONS[id].name}`,value:id}))
            ],id=>{if(id){S.enemies.forEach(e=>e.engaged=false);if(id!=='stay')freeMove(id);}n();});else throw Error('Unimplemented test effect '+e.effect);
          },()=>{
            if(options.discardOnSymbols&&tokens.some(token=>options.discardOnSymbols.includes(token.autofail?'autofail':token.symbol)))discard(options.source);
            if(options.playCard)eventDestination(options.playCard);
            const rabbit=!r.success?p().assets.filter(c=>c.code==='01075'&&!c.exhausted):[];
            reactions(rabbit.map(c=>({title:c.name,copy:'使兔脚力竭，抽 1 张牌？',run:n=>{c.exhausted=true;drawPlayer(1,n);}})),()=>options.playCard?spellReaction(options.playCard,()=>drain(done)):drain(done));
          });
        });
      });
    });
  };
  function investigateTest(options={},done=null){
    const shroud=Math.max(0,LOCATIONS[S.location].shroud+(options.shroudModifier||0));
    playerTest('int',shroud,'调查',{cost:{actions:1,...options.cost},source:options.source,context:'investigate',exempt:false},(r,data,next)=>{
      const afterClues=()=>{
        const list=[];
        if(r.success)for(const c of p().assets.filter(c=>c.code==='01033'))list.push({title:c.name,copy:'调查成功，获得 1 资源？',run:n=>{S.resources++;n();}});
        if(r.success&&r.margin>=2)for(const c of p().assets.filter(c=>c.code==='01073'&&!c.exhausted))list.push({title:c.name,copy:'调查成功差值至少 2。使拾荒力竭，从弃牌堆取回 1 张物品？',run:n=>{
          const cards=S.discard.filter(c=>c.traits?.includes('Item'));if(!cards.length){n();return;}
          choose('拾荒 · 取回物品','选择加入手牌的物品。',cards.map(card=>({label:card.name,value:card})),card=>{c.exhausted=true;S.discard=S.discard.filter(x=>x!==card);S.hand.push(card);n();});
        }});
        reactions(list,()=>{done?.();next();});
      };
      if(r.success){if(options.resourcesInstead){S.resources+=3;afterClues();}else discover(1+data.extraClues,afterClues);}
      else {
        const cards=eventCards().filter(c=>c.code==='01079'&&S.resources>=c.cost&&r.margin>=-2&&S.locClues[S.location]>0);
        if(cards.length)choose('调查未成功','失败差值不超过 2，可打出「看我发现了什么！」发现 2 条线索。',[
          {label:'不打出',value:null},...cards.map(c=>({label:`打出 ${c.name} · ${c.cost} 资源`,value:c}))
        ],c=>c?playFast(c,()=>discover(2,afterClues)):afterClues());else afterClues();
      }
    });
  }
  investigate=function(preview=true,emptyConfirmed=false){
    if(!active())return originalInvestigate(preview,emptyConfirmed);
    if(!ownWindow()||S.actions<1)return;
    if(!S.locClues[S.location]&&!emptyConfirmed){showActionConfirmation('此处没有线索','仍然调查会消耗行动，但无法发现线索。',()=>investigate(true,true),actionRisk());return;}
    investigateTest();
  };
  function launchAttack(source,ability,card=null){
    pickEnemy('选择攻击目标',local(),enemy=>{
      if(!enemy)return;
      let bonus=ability.bonus||0;if(ability.bonusWithLocalClue&&S.locClues[S.location]>0)bonus=ability.bonusWithLocalClue;
      const cost=card?{actions:1,resources:card.cost}:ability.cost||{actions:1};
      playerTest(({willpower:'will',intellect:'int',combat:'combat',agility:'agility'})[ability.skill||'combat'],enemy.card.fight,'战斗',{
        cost,source,playCard:card,bonus,context:'attack',exempt:true,onSymbols:ability.onRevealedSymbols,discardOnSymbols:ability.afterResolveDiscardOnSymbols
      },(r,data,n)=>{
        if(!r.success){gameSfx('attackMiss');n();return;}
        let damage=ability.damage||1;
        if(ability.extraDamageIfOnlyEngagedTarget&&enemy.engaged&&S.enemies.filter(e=>e.engaged).length===1)damage+=ability.extraDamageIfOnlyEngagedTarget;
        if(ability.succeedBy&&r.margin>=ability.succeedBy)damage+=ability.additionalDamage||0;
        damageEnemy(enemy,damage+data.extraDamage,n);
      });
    });
  }
  const originalFight=original.fight,originalEvade=original.evade,originalInvestigate=original.investigate;
  // Basic combat never stacks every equipped weapon. The player selects one
  // printed weapon ability (and its costs), or a basic unarmed attack.
  fight=function(){if(!active())return originalFight(...arguments);if(!ownWindow()||S.actions<1||!local().length)return;
    const choices=[{label:'徒手战斗 · 1 行动 · 1 伤害',value:{source:null,ability:{skill:'combat',damage:1,cost:{actions:1}}}}];
    for(const c of p().assets)for(const a of c.rules.abilities||[])if(a.effect==='fight'&&affordable(a.cost,c))choices.push({label:`${c.name} · ${a.cost.ammo?'消耗 1 弹药':a.cost.charges?'消耗 1 充能':a.cost.discardSelf?'弃置武器':'不消耗使用次数'}`,value:{source:c,ability:a}});
    choose('选择战斗方式','一次只发动一种武器能力。取消后不花费行动、弹药或资源。',choices.concat([{label:'返回',value:null}]),choice=>{if(choice)launchAttack(choice.source,choice.ability);});
  };
  function evadeTest(ability={skill:'agility',cost:{actions:1}},card=null){
    pickEnemy('选择闪避目标',local().filter(e=>e.engaged&&!e.exhausted),enemy=>{
      if(!enemy)return;
      playerTest(ability.skill==='willpower'?'will':'agility',enemy.card.evade,'闪避',{context:'evade',exempt:true,cost:card?{actions:1,resources:card.cost}:ability.cost,playCard:card,onSymbols:ability.onRevealedSymbols},(r,data,n)=>{
        if(!r.success){n();return;}enemy.exhausted=true;enemy.engaged=false;
        const after=()=>afterEvade(n);
        if(ability.successDamage)damageEnemy(enemy,ability.successDamage,after);else after();
      });
    });
  }
  evade=function(){if(!active())return originalEvade(...arguments);if(ownWindow()&&S.actions>0)evadeTest();};
  function eventCards(){
    const cards=S.hand.filter(c=>c.type_code==='event');
    if(has('01014')){const top=[...S.discard].reverse().find(c=>c.type_code==='event');if(top&&top.type!=='weak')cards.push(top);}
    return cards;
  }
  function affordable(cost={},source=null){
    if(S.resources<(cost.resources||0)||S.actions<(cost.actions||0))return false;
    if(cost.exhaustSelf&&source?.exhausted)return false;
    for(const k of ['ammo','charges','secrets','supplies'])if(cost[k]&&!(source?.uses[k]>=cost[k]))return false;
    return true;
  }
  function availableAbility(card,a){
    if(a.timing==='action'&&S.phase!=='investigation')return false;
    const cost={...a.cost};
    if(a.timing==='action'&&card.traits?.includes('Tome')&&p().investigator==='daisy'&&!blank()&&p().ability.daisyTurn!==S.playerTurn)cost.actions=0;
    if(!affordable(cost,card))return false;
    if(a.effect==='boost-test')return false;
    if(a.effect==='pay-hospital-debt'&&(card.paymentsRound===S.round?card.payments:0)>=2)return false;
    if(['damage-local-enemy','automatic-evade'].includes(a.effect)&&!local().some(e=>!a.targetMustBeExhausted||e.exhausted))return false;
    if(a.effect==='fight'&&!local().length)return false;
    return ['action','fast'].includes(a.timing);
  }
  function searchDraw(source,trait,top,shuffleAll,done){
    const visible=top?S.deck.slice(-top):S.deck.slice();
    const choices=visible.filter(c=>!trait||c.traits?.split('.').map(x=>x.trim()).includes(trait));
    if(!choices.length){shuffle(S.deck);log('没有找到符合条件的卡牌。','dim');done();return;}
    choose(source.name,'选择 1 张加入手牌。被搜索到的弱点只加入手牌，不执行抽牌揭示。其余按牌面洗回。',choices.map(c=>({label:c.name,value:c})).concat(trait?[{label:'不拿取',value:null}]:[]),card=>{
      if(card){S.deck=S.deck.filter(c=>c!==card);S.hand.push(card);}shuffle(S.deck);done();
    });
  }
  function lookReorder(card,done){
    choose('占卜 · 选择牌组','查看顶端 3 张，不是抽取；按你选择的顺序放回，第一张将最先抽到。',[
      {label:'自己的牌组',value:'deck'},{label:'遭遇牌组',value:'encounter'}
    ],key=>{
      const top=S[key].slice(-3).reverse(),ordered=[];
      function pick(){
        if(!top.length){S[key].splice(Math.max(0,S[key].length-ordered.length),ordered.length,...ordered.slice().reverse());done();return;}
        choose('占卜 · 排列顺序',`选择第 ${ordered.length+1} 张被抽到的牌。`,top.map(c=>({label:c.name,value:c})),c=>{top.splice(top.indexOf(c),1);ordered.push(c);pick();});
      }pick();
    });
  }
  function leaveLocation(from){
    const attachments=p().attachments||[];
    for(const c of attachments.filter(c=>c.location===from)){p().attachments=attachments.filter(x=>x!==c);eventDestination(c);}
  }
  function freeMove(id){
    const from=S.location;S.location=id;S.revealed[id]=true;leaveLocation(from);engageLocalEnemies();gameSfx('move');
    if(S.chapter===2&&id==='cellar'&&!S.cellarGuardSpawned){S.cellarGuardSpawned=true;S.enemies.push({card:{...CELLAR_GUARD},hp:CELLAR_GUARD.hp,engaged:true,exhausted:false,location:id});monsterSfx(CELLAR_GUARD);}
    if(S.chapter===3&&id==='gate'&&!S.finalGuardSpawned){S.finalGuardSpawned=true;S.enemies.push({card:{...FINAL_GUARD},hp:FINAL_GUARD.hp,engaged:true,exhausted:false,location:id});monsterSfx(FINAL_GUARD);}
    if(typeof gameNarrator!=='undefined')gameNarrator.enter(id);render();
  }
  function ability(card,a,done){
    if(a.effect==='fight'){done();launchAttack(card,a);return;}
    if(a.effect==='investigate'){done();investigateTest({cost:a.cost,source:card,shroudModifier:a.shroudModifier||0,resourcesInstead:a.discoverClues===false});return;}
    if(a.effect==='medical-test'){done();playerTest('int',2,'医学文献',{source:card,cost:a.cost,context:'effect'},(r,data,n)=>{
      if(r.success){S.hp=Math.min(INVESTIGATOR.maxHp,S.hp+1);n();}else loss(1,0,card.name,n);
    });return;}
    const pay=()=>prepare(a.cost,card,false,ok=>{
      if(!ok){done();return;}
      switch(a.effect){
        case 'search-draw':searchDraw(card,a.trait,a.top,a.shuffle==='deck',done);break;
        case 'look-reorder':lookReorder(card,done);break;
        case 'heal-investigator':choose(card.name,'选择治疗类型。',[{label:'治疗 1 伤害',value:'hp'},{label:'治疗 1 恐惧',value:'sanity'}],key=>{S[key]=Math.min(key==='hp'?INVESTIGATOR.maxHp:INVESTIGATOR.maxSanity,S[key]+1);done();});break;
        case 'gain-resources':S.resources+=a.amount;done();break;
        case 'damage-local-enemy':pickEnemy(card.name,local().filter(e=>!a.targetMustBeExhausted||e.exhausted),e=>e?damageEnemy(e,a.amount,done):done());break;
        case 'automatic-evade':pickEnemy(card.name,local().filter(e=>!e.card.elite),e=>{if(e){e.engaged=false;e.exhausted=true;afterEvade(done);}else done();});break;
        case 'discard-self':discard(card);done();break;
        case 'move-threat-horror-to-investigator':card.horror--;loss(0,1,card.name,()=>{if(card.horror===0)discard(card);done();});break;
        case 'pay-hospital-debt':card.resources=(card.resources||0)+1;card.payments=card.paymentsRound===S.round?(card.payments||0)+1:1;card.paymentsRound=S.round;done();break;
        default:throw Error('Unimplemented ability '+a.effect);
      }
    });
    if(a.cost.actions&&card.traits?.includes('Tome')&&p().investigator==='daisy'&&!blank()&&p().ability.daisyTurn!==S.playerTurn){
      choose('黛西 · 典籍额外行动','是否使用本回合的典籍专用额外行动？',[{label:'使用典籍额外行动',value:true},...(S.actions>=a.cost.actions?[{label:'使用普通行动',value:false}]:[])],yes=>{
        if(yes){p().ability.daisyTurn=S.playerTurn;S.playerActionsTaken++;const free={...a,cost:{...a.cost,actions:0}};ability(card,free,done);}else pay();
      });
    }else pay();
  }
  window.playerAbilities=()=>{
    if(!playerWindow())return;
    const entries=[],spec=catalog.investigator(p().investigator);
    if(S.phase==='investigation'&&p().investigator==='skids'&&!blank()&&p().ability.skidsTurn!==S.playerTurn&&S.resources>=2)entries.push({label:'斯基兹 · 2 资源换 1 行动',value:n=>{S.resources-=2;S.actions++;S.turnActions++;p().ability.skidsTurn=S.playerTurn;n();}});
    if(S.phase==='investigation'&&p().investigator==='daisy'&&!blank()&&p().ability.daisyTurn!==S.playerTurn)entries.push({label:'黛西 · 典籍额外行动尚可使用（在典籍能力中选择）',value:n=>n()});
    for(const card of [...p().assets,...p().threats])for(const a of card.rules.abilities||[])if(availableAbility(card,a))entries.push({label:`${card.name} · ${a.timing==='action'?'行动':'快速'} · ${card.text}`,value:n=>ability(card,a,n)});
    for(const card of eventCards())if(card.rules.play?.timing==='fast'&&(card.rules.play.window==='player-window'||S.phase==='investigation'&&['own-turn','after-own-turn-begins'].includes(card.rules.play.window))&&S.resources>=card.cost&&!(card.code==='01010'&&S.playerActionsTaken>0))entries.push({label:`打出 ${card.name} · ${card.cost} 资源 · 快速`,value:n=>resolvePlay(card,n)});
    if(S.phase==='investigation'&&has('01014')){const card=[...S.discard].reverse().find(c=>c.type_code==='event');if(card&&card.type!=='weak'&&card.rules.play?.timing!=='fast'&&S.resources>=card.cost&&S.actions>0)entries.push({label:`护符重打 ${card.name} · ${card.cost} 资源`,value:n=>resolvePlay(card,n)});}
    for(const e of local().filter(e=>e.card.code==='01101'))if(S.phase==='investigation'&&S.actions>0&&S.resources>=4)entries.push({label:'黑帮打手 · 1 行动、4 资源谈判',value:n=>prepare({actions:1,resources:4},null,true,ok=>{if(ok){S.enemies=S.enemies.filter(x=>x!==e);S.discard.push(catalog.card(e.card));}n();})});
    job(done=>choose(spec.name+' · 能力',spec.ability+' 上古印记：'+spec.elder,entries.concat([{label:'返回游戏',value:null}]),run=>run?run(done):done()));
  };
  function spellReaction(card,done){
    if(S.gameOver){done();return;}
    if(card.traits?.includes('Spell')&&has('01012'))optional('传家宝','你刚打出法术，抽 1 张牌？',n=>drawPlayer(1,n),done);else done();
  }
  function resolvePlay(card,done){
    const s=p(),a=card.rules.play;
    if(card.type==='asset'){
      const cost={resources:card.cost,actions:a?.timing==='fast'?0:1};
      prepare(cost,null,false,ok=>{
        if(!ok){done();return;}replaceSlots(card,()=>{
          card.uses=structuredClone(card.rules.uses||{});card.damage=0;card.horror=0;card.exhausted=false;card.doom=0;
          S.hand=S.hand.filter(c=>c!==card);s.assets.push(card);S.playedCards.push({card,round:S.round});gameSfx('card');sync();
          if(card.code==='01048'){S.actions++;S.turnActions++;S.playerLeoGranted=true;}
          if(card.code==='01063')card.doom=1;
          if(card.code==='01032')optional(card.name,'入场后搜寻 1 张典籍？',n=>searchDraw(card,'Tome',null,true,n),done);
          else spellReaction(card,done);
        });
      });return;
    }
    if(!a){log('技能或此弱点不能作为普通牌打出。');done();return;}
    if(a.effect==='fight'){done();launchAttack(null,a,card);return;}
    if(a.effect==='evade'){done();evadeTest(a,card);return;}
    const fast=a.timing==='fast',cost={actions:fast?0:1,resources:card.cost};
    const consume=()=>{S.hand=S.hand.filter(c=>c!==card);S.discard=S.discard.filter(c=>c!==card);S.playedCards.push({card,round:S.round});gameSfx('card');};
    const finish=()=>{eventDestination(card);spellReaction(card,done);};
    const resolve=()=>prepare(cost,null,a.effect==='automatic-evade-all-local',ok=>{
      if(!ok){done();return;}consume();
      switch(a.effect){
        case 'gain-resources':S.resources+=a.amount;finish();break;
        case 'add-agenda-doom':S.doom++;checkDoom();finish();break;
        case 'prevent-nonelite-attacks':S.playerPreventAttacks=true;finish();break;
        case 'allow-skill-substitution':S.playerMindOverMatter=true;finish();break;
        case 'discover-local-clues':discover(a.amount,finish);break;
        case 'attach-to-location':(s.attachments??=[]).push({...card,location:S.location});spellReaction(card,done);break;
        case 'automatic-evade-all-local':{const enemies=local();enemies.forEach(e=>{e.engaged=false;e.exhausted=true;});series(enemies,(e,n)=>afterEvade(n),finish);break;}
        case 'damage-local-enemy':pickEnemy(card.name,local().filter(e=>e.exhausted),e=>e?damageEnemy(e,a.amount,finish):finish());break;
        case 'disengage-and-move':{
          const ids=Object.keys(S.revealed).filter(id=>S.revealed[id]&&!S.enemies.some(e=>e.location===id));
          choose(card.name,'脱离所有敌人，并移动到一个已揭示、没有敌人的地点。',ids.map(id=>({label:LOCATIONS[id].name,value:id})),id=>{S.enemies.forEach(e=>e.engaged=false);freeMove(id);finish();});break;
        }
        case 'damage-all-at-location':choose(card.name,'对所选地点所有敌人和调查员各造成 3 伤害。', [S.location,...LOCATIONS[S.location].conn].map(id=>({label:LOCATIONS[id].name+(id===S.location?' · 你也会受伤':''),value:id})),id=>{
          const enemies=S.enemies.filter(e=>e.location===id);
          series(enemies,(e,n)=>damageEnemy(e,a.amount,n),()=>id===S.location?loss(a.amount,0,card.name,finish):finish());
        });break;
        case 'draw-encounter-then-discover':encounter(()=>S.gameOver?finish():discover(2,finish));break;
        default:throw Error('This event requires its reaction window: '+a.effect);
      }
    });resolve();
  }
  const allowedHandEvents=new Set(['01010','01013','01024','01036','01037','01038','01050','01051','01052','01064','01066','01078','01088']);
  function playable(card){
    if(!active())return '';
    if(!S.hand.includes(card))return '这张牌已不在手中。';
    if(card.type==='skill')return '技能牌只能投入检定。';
    if(card.type==='weak'&&card.code!=='01013')return '此弱点不能主动打出，请使用威胁区能力。';
    if(!playerWindow()||S.phase!=='investigation'&&!(card.type==='asset'&&card.rules.play?.timing==='fast'))return '当前不能主动出牌。';
    if(card.type!=='asset'&&!allowedHandEvents.has(card.code))return '这张快速反应牌在对应时机由系统提示打出。';
    if(S.resources<card.cost)return `资源不足，需要 ${card.cost}。`;
    if(card.type==='asset'&&!session.fits([...p().assets.filter(c=>!c.slot),...p().threats.filter(c=>c.type_code==='asset'),card]))return '固定弱点占用槽位，即使替换普通资产也无法装备此牌。请先处理威胁区的弱点。';
    if(card.rules.play?.timing!=='fast'&&S.actions<1)return '没有普通行动。';
    if(card.code==='01010'&&S.playerActionsTaken>0)return '潜逃只能在自己的回合开始后打出。';
    if(['01051','01052'].includes(card.code)&&!local().some(e=>card.code!=='01052'||e.exhausted))return '没有符合条件的敌人。';
    if(card.code==='01066'&&!local().some(e=>e.engaged&&!e.exhausted))return '没有可闪避的交缠敌人。';
    if(card.code==='01050'&&!Object.keys(S.revealed).some(id=>S.revealed[id]&&!S.enemies.some(e=>e.location===id)))return '没有已揭示且无敌人的目的地。';
    return '';
  }
  onHandCard=function(index){if(!active())return original.onHandCard(index);const card=S.hand[index];if(!card)return;const reason=playable(card);if(reason){log(esc(reason),'bad');return;}job(done=>resolvePlay(card,done));};
  requestReturnMenu=function(){if(active()&&(S.playerBusy||S.playerChoice))return;return original.requestReturnMenu();};
  function afterEvade(done){reactions(p().assets.filter(c=>c.code==='01046'&&!c.exhausted).map(c=>({title:c.name,copy:'使扒窃力竭，抽 1 张牌？',run:n=>{c.exhausted=true;drawPlayer(1,n);}})),done);}
  requestAction=function(fn){
    if(!active())return original.requestAction(fn);
    if(S.playerBusy||S.playerChoice)return;
    if(fn==='endTurn'){if(ownWindow())showActionConfirmation('结束回合',`放弃剩余 ${S.actions} 次普通行动，结算回合结束效果，再进入敌人阶段。`,endTurn);return;}
    return original.requestAction(fn);
  };
  endTurn=function(){
    if(!active())return original.endTurn();if(!ownWindow())return;
    job(done=>series(S.hand.filter(c=>c.code==='01013'),(c,n)=>loss(0,2,c.name+' · 回合结束',n),()=>{S.actions=0;done();if(!S.gameOver)advancePhase();}));
  };
  function checkDoom(){
    const attached=p().assets.reduce((n,c)=>n+(c.doom||0),0),agenda=AGENDA_DECK[S.agendaIdx];
    if(agenda.threshold>0&&S.doom+attached>=agenda.threshold){p().assets.forEach(c=>c.doom=0);advanceAgenda();}
  }
  function encounter(done){
    if(!S.encounter.length){S.encounter=shuffle(S.encounterDiscard);S.encounterDiscard=[];}
    const card=S.encounter.pop();if(!card){done();return;}
    if(card.type==='enemy'){
      const barricade=p().attachments?.some(c=>c.code==='01038'&&c.location===S.location);
      if(barricade&&!card.elite){S.encounterDiscard.push(card);log(`${card.name} 无法进入有路障的地点，未生成。`,'dim');done();return;}
      S.enemies.push({card,hp:card.hp,engaged:true,exhausted:false,location:S.location});monsterSfx(card);log(`遭遇：${card.name} 出现并与你交缠。`,'bad');done();return;
    }
    const resolve=()=>{
      S.encounterDiscard.push(card);
      if(card.id.startsWith('ancient')){S.doom++;checkDoom();done();}
      else {
        // Leave the effect job while the required test owns the modal. Resume
        // this continuation exactly once after the player settles that test.
        S.playerBusy=false;
        playerTest('will',2,'抵抗恐惧低语',{},(r,data,n)=>{
          const after=()=>{done();n();};if(r.success)after();else loss(0,1,card.name,after);
        });
      }
    };
    const ward=eventCards().find(c=>c.code==='01065'&&S.resources>=c.cost);
    if(ward)choose('守护之咒 · 取消遭遇？',`${card.name}：${card.text} 花 1 资源打出守护之咒，取消揭示效果，然后承受 1 恐惧。`,[
      {label:'不打出，结算遭遇',value:false},{label:'打出守护之咒',value:true}
    ],yes=>{if(yes){S.encounterDiscard.push(card);playFast(ward,()=>loss(0,1,ward.name,()=>spellReaction(ward,done)));}else resolve();});else resolve();
  }
  enemyPhase=function(){if(!active())return original.enemyPhase();if(S.playerBusy)return;
    job(done=>{
      for(const e of S.enemies)if(e.card.hunter&&!e.engaged&&!e.exhausted&&e.location!==S.location){
        const id=hunterStep(e.location,S.location),blocked=p().attachments?.some(c=>c.location===id&&c.code==='01038')&&!e.card.elite;if(!blocked)e.location=id;
      }
      engageLocalEnemies();series(S.enemies.filter(e=>e.engaged&&!e.exhausted),(e,n)=>hit(e,'敌人阶段攻击',()=>{e.exhausted=true;n();}),done);
    });
  };
  upkeepPhase=function(){if(!active())return original.upkeepPhase();if(S.playerBusy)return;
    job(done=>{
      p().assets.forEach(c=>c.exhausted=false);S.enemies.forEach(e=>e.exhausted=false);engageLocalEnemies();
      drawPlayer(1,()=>{if(!S.gameOver)S.resources++;
        function limit(){
          if(S.hand.length<=8||S.gameOver){done();return;}
          const cards=S.hand.filter(c=>c.type!=='weak');if(!cards.length){done();return;}
          choose('手牌上限 · 弃至 8 张','选择一张非弱点手牌弃置。',cards.map(c=>({label:c.name,value:c})),c=>{discard(c);limit();});
        }limit();
      });
    });
  };
  mythosPhase=function(){if(!active())return original.mythosPhase();if(S.playerBusy)return;
    S.playerMindOverMatter=false;S.playerPreventAttacks=false;S.doom++;checkDoom();if(!S.gameOver)job(done=>encounter(done));
  };
  drawEncounter=function(){if(!active())return original.drawEncounter();if(!S.playerBusy&&!S.test)job(done=>encounter(done));};
  enterPhase=function(){
    if(!active())return original.enterPhase();if(S.playerBusy||S.playerChoice||S.test||S.gameOver||phaseTransitionActive||pendingAction||pendingNavigation)return;
    if(S.phase==='investigation'){S.phase='enemy';enemyPhase();}
    else if(S.phase==='enemy'){S.phase='upkeep';upkeepPhase();}
    else if(S.phase==='upkeep'){S.phase='mythos';S.round++;mythosPhase();}
    else if(S.phase==='mythos'){
      S.phase='investigation';S.playerTurn++;p().turn=S.playerTurn;S.playerActionsTaken=0;S.turnActions=3+(has('01048')?1:0);S.actions=S.turnActions;
    }
    render();
  };
  resolve=function(code,text){
    if(active()){
      S.playerChoice=null;S.playerBusy=false;ticket++;
      if((code!=='R1'||S.chapter===3)&&!p().scenarioFinished){
        p().scenarioFinished=true;
        for(const c of p().threats){if(c.code==='01007'&&c.clues>0)p().mentalTrauma++;if(c.code==='01011'&&(c.resources||0)<6)p().experiencePenalty+=2;}
        if(S.hp<=0)p().physicalTrauma++;if(S.sanity<=0)p().mentalTrauma++;
        log(`本局结算记录：肉体创伤 ${p().physicalTrauma}，精神创伤 ${p().mentalTrauma}，经验惩罚 ${p().experiencePenalty}。本网页未接入官方战役存档。`,'gold');
      }
    }
    return original.resolve(code,text);
  };
  continueChapter=function(){const state=S,chapter=S?.chapter,from=S?.location;original.continueChapter();if(active()&&S===state&&S.chapter!==chapter){leaveLocation(from);S.playerTurn++;p().turn=S.playerTurn;S.playerActionsTaken=0;S.turnActions=3+(has('01048')?1:0);S.actions=S.turnActions;sync();render();}};
  function renderCharacters(){
    const list=byId('playerCharacterList');if(!list)return;
    list.innerHTML=catalog.ids.map(id=>{const c=catalog.investigator(id),art=INVESTIGATOR_ART[id];return `<button type="button" class="player-character" aria-pressed="${pendingSelection===id}" onclick="playerSelect('${id}')">${art?`<span class="player-emblem art" aria-hidden="true" style="${cardArtStyle(art)}"></span>`:`<span class="player-emblem" aria-hidden="true">${c.symbol}</span>`}<span><b>${esc(c.name)}</b><small>${esc(c.role)} · ${esc(c.title)}</small><small>意志 ${c.skills[0]} / 智慧 ${c.skills[1]} / 战斗 ${c.skills[2]} / 敏捷 ${c.skills[3]} · 生命 ${c.health} / 理智 ${c.sanity}</small></span></button>`;}).join('');
    const c=catalog.investigator(pendingSelection);byId('playerCharacterDetails').innerHTML=`<h3>${esc(c.name)} · 人物能力</h3><p>${esc(c.ability)}</p><p><b>上古印记：</b>${esc(c.elder)}</p><p>基础盒标准版起始牌组：30 张普通卡＋1 张专属牌＋1 张专属弱点＋1 张随机基础弱点。开局可换牌一次。</p><details><summary>查看起始牌组（不含随机基础弱点）</summary><ul>${Object.entries(core.starterManifest(pendingSelection).counts).map(([code,count])=>`<li>${esc(catalog.names[Number(code.slice(2))])} ×${count}</li>`).join('')}</ul></details>`;
    byId('playerCharacterConfirm').textContent='确定 · 使用'+c.name;
    const label=byId('menuCharacterName');if(label)label.textContent='当前：'+catalog.investigator(selected).name;
  }
  window.playerSelect=id=>{if(S||!catalog.ids.includes(id))return;pendingSelection=id;renderCharacters();};
  difficultySymbolText=function(key){const text=original.difficultySymbolText(key);return text.replace('上古印记：按罗兰当前地点的每个线索 +1，不保证成功。','上古印记：'+catalog.investigator(active()?p().investigator:selected).elder);};
  byId('playerCharacterConfirm')?.addEventListener('click',()=>{if(S)return;selected=pendingSelection;renderCharacters();updateDifficultyPreview();});
  byId('menuCharacterButton')?.addEventListener('click',()=>{pendingSelection=selected;renderCharacters();});
  renderCharacters();
  const runtime={active,selected:()=>selected,select:id=>{if(S||!catalog.ids.includes(id))return false;selected=id;pendingSelection=id;renderCharacters();return true;},spec:()=>catalog.investigator(selected)};
  Object.assign(runtime,{playable,draw:drawPlayer,loss,discover,damageEnemy,prepare,card:code=>catalog.card(ArkhamOfficialDecks.normalize(code)),abilities:()=>p().assets.flatMap(c=>(c.rules.abilities||[]).map(a=>({card:c,ability:a}))),eventCards});
  window.ArkhamPlayerRuntime=runtime;
})();
