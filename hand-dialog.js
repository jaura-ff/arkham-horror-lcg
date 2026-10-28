/* Two activations inspect; only an explicit confirmation plays the same physical card. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('handCardDialog');
  if(!dialog)return;
  let lastTap=0,pending=null,lastFocus=null,savedOverflow='';
  function blocked(card){
    if(S?.gameOver)return '本局已结束，仅可查看卡牌。';
    if(!S || !S.hand.includes(card))return '手牌已变化，请关闭后重新选择。';
    if(S.player&&window.ArkhamPlayerRuntime)return window.ArkhamPlayerRuntime.playable(card);
    if(card.type==='skill')return '技能牌不能直接出牌，请在对应属性的检定弹窗中投入。';
    if(card.type==='weak')return '弱点不能主动出牌，抽到时自动结算。';
    if(!canAct())return S.actions<=0?'本回合行动已用完，当前不能出牌。':'当前不在可出牌的调查阶段，或有未完成的操作。';
    if(S.resources<card.cost)return `资源不足：需要 ${card.cost}，当前只有 ${S.resources}。`;
    if(card.slot==='hand' && S.assets.filter(a=>a.card.slot==='hand').length>=2)return '手槽已满（2/2），无法装备此资产。';
    return '';
  }
  function refresh(){
    const reason=blocked(pending),button=byId('handCardPlay');button.disabled=!!reason;
    button.textContent=reason?'当前无法出牌':'继续 · 出牌';
    const enemies=S?.enemies.filter(e=>e.engaged&&!e.exhausted)||[];
    const exempt=pending.rules?.play?.timing==='fast'||['fight','evade','automatic-evade-all-local'].includes(pending.rules?.play?.effect);
    byId('handCardWarning').textContent=reason || (enemies.length&&!exempt?`注意：出牌会触发 ${enemies.length} 名敌人的借机攻击（共 ${enemies.reduce((n,e)=>n+e.card.dmg,0)} 伤害、${enemies.reduce((n,e)=>n+e.card.horror,0)} 恐惧）。若被击败，卡牌效果不会执行。`:'确认出牌才消耗费用；关闭或取消不消耗资源和行动。');
  }
  function open(card){
    pending=card;lastFocus=document.activeElement;savedOverflow=document.body.style.overflow;
    dialog.dataset.faction=card.faction_code||'neutral';byId('handCardTitle').textContent=card.name;
    byId('handCardType').textContent=(card.factionLabel?card.factionLabel+' · ':'')+{asset:'资产 / ASSET',event:'事件 / EVENT',skill:'技能 / SKILL',weak:'弱点 / WEAKNESS'}[card.type];
    byId('handCardEffect').textContent=card.text;
    byId('handCardUsage').textContent=CARD_USAGE[card.id]||card.text;
    byId('handCardCost').textContent=['skill','weak'].includes(card.type)&&card.code!=='01013'?'此牌不使用普通出牌行动。':`出牌费用：${card.cost} 资源 + ${card.rules?.play?.timing==='fast'?0:1} 行动。当前：${S.resources} 资源，${S.actions} 行动。${card.slot==='hand'?`占用 ${card.slots||1} 只手槽。`:''}`;
    const art=CARD_ART[card.id]||[0,0];setCardArt(byId('handCardArt'),art);
    if(card.code){byId('handCardArt').classList.toggle('art',!!CARD_ART[card.id]);byId('handCardArt').classList.toggle('player-card-stamp',!CARD_ART[card.id]);byId('handCardArt').textContent=CARD_ART[card.id]?'':({asset:'资产',event:'事件',skill:'技能',weak:'弱点'}[card.type]);}
    refresh();dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;byId('handCardClose').focus();
  }
  window.inspectHandCard=(index,event)=>{
    if(!S || (S.gameOver&&!S.reviewingRun) || S.test || S.pendingMove || pendingNavigation || byId('game').inert || dialog.open || byId('modal').classList.contains('open') || byId('cardAtlas').open)return;
    const card=S.hand[index];if(!card)return;
    const now=Date.now(),second=selectedHandCard===card && (now-lastTap<500 || event?.detail>=2);
    selectedHandCard=card;lastTap=now;
    if(event?.detail===0 || second){lastTap=0;open(card);return;}
    renderHand();byId(`hand-card-${index}`)?.focus();
    byId('guideStatus').textContent=`已选中${card.name}，再次快速点击查看效果，或用 Enter 打开。`;
  };
  for(const id of ['handCardClose','handCardCancel'])byId(id).addEventListener('click',()=>dialog.close());
  byId('handCardPlay').addEventListener('click',()=>{
    if(!dialog.open || !pending)return;
    if(blocked(pending)){refresh();return;}
    const index=S.hand.indexOf(pending);
    pending=null;dialog.close();onHandCard(index);
  });
  dialog.addEventListener('close',()=>{
    pending=null;lastTap=0;document.body.style.overflow=savedOverflow;
    if(byId('modal').classList.contains('open'))return;
    if(lastFocus?.isConnected)lastFocus.focus();
    else (document.querySelector('#hand button')||byId('menuButton'))?.focus();
  });
})();
