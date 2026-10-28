/* Read-only played history and actual player discard; never mixes their meanings. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('discardDialog');
  if(!dialog)return;
  let view='pile',lastFocus=null,savedOverflow='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const played=view==='played',deck=view==='deck';
    byId('discardShowPlayed').setAttribute('aria-pressed',String(played));
    byId('discardShowPile').setAttribute('aria-pressed',String(view==='pile'));
    byId('discardShowDeck').setAttribute('aria-pressed',String(deck));
    byId('discardDescription').textContent=deck?(S.player?`${INVESTIGATOR.name}的本局完整初始配牌：33 张，含专属牌、专属弱点与本局随机基础弱点。按编号展示，不透露当前抽牌顺序。`:`${INVESTIGATOR.name}的角色配牌总览：展示本网页版配置的完整初始牌组，包括尚未抽到、当前手持、已经使用及弱点卡。不是仅当前手牌，也不是官方完整预组牌；这里不透露抽牌顺序。`):played?'按最近打出优先，记录本局每次成功打出的资产与事件。装备中的资产也记在这里，但仍留在装备区，不算弃牌。技能投入和抽到的弱点不属于“出牌”。':'这里只显示当前玩家弃牌堆，包括结算后的事件、投入过的技能和已结算弱点等。洗回牌组后会从此处消失，出牌历史则保留。不包含遭遇弃牌。';
    const entries=deck?(S.initialPlayerDeck||INVESTIGATOR.deck).map(card=>({card})):(played?S.playedCards:S.discard.map(card=>({card}))).slice().reverse();
    const composition=deck?Object.entries({asset:'资产',event:'事件',skill:'技能',weak:'弱点'}).map(([type,label])=>`${label} ${entries.filter(e=>e.card.type===type).length}`).join(' · '):'';
    byId('discardCount').textContent=deck?`${INVESTIGATOR.name} · 配牌共 ${entries.length} 张（含弱点） · ${composition}`:played?`本局已打出 ${entries.length} 次`:`当前弃牌 ${entries.length} 张 · 弱点 ${entries.filter(e=>e.card.type==='weak'||['weakness','basicweakness'].includes(e.card.subtype_code)).length} 张`;
    byId('discardCards').innerHTML=entries.length?entries.map(({card,round})=>{
      const art=CARD_ART[card.id]||[0,0],type={asset:'资产',event:'事件',skill:'技能',weak:'弱点'}[card.type]||card.type;
      const cost=['skill','weak'].includes(card.type)&&card.code!=='01013'?'不使用普通出牌费用':`${card.cost} 资源 + ${card.rules?.play?.timing==='fast'?0:1} 行动${card.slot==='hand'?` · ${card.slots||1} 只手槽`:''}`;
      return `<article class="discard-entry" data-faction="${esc(card.faction_code||'neutral')}">${card.code&&!CARD_ART[card.id]?`<div class="discard-art player-card-stamp" aria-hidden="true">${esc(type)}</div>`:`<div class="discard-art art" aria-hidden="true" style="${cardArtStyle(art)}"></div>`}<div><small>${esc(type)}${card.factionLabel?' · '+esc(card.factionLabel):''}${played?` · 第 ${esc(round)} 回合打出`:''}</small><h3>${esc(card.name)}</h3>${deck?`<p class="atlas-source">${esc(cost)}</p>`:''}<p>${esc(card.text)}</p><details><summary>查看用法</summary><p>${esc(CARD_USAGE[card.id]||card.text)}</p></details></div></article>`;
    }).join(''):`<p class="atlas-empty">${deck?'该角色当前没有配置卡牌。':played?'本局还没有打出过卡牌。':'当前弃牌堆为空。'}</p>`;
  }
  byId('discardPileButton').addEventListener('click',()=>{
    if(!S || dialog.open || byId('game').style.display==='none')return;
    if(byId('modal').classList.contains('open') || byId('handCardDialog').open || byId('cardAtlas').open || !byId('tutorial').hidden){
      byId('guideStatus').textContent='请先完成或关闭当前弹窗，再查看弃牌区。';return;
    }
    view='pile';render();lastFocus=document.activeElement;savedOverflow=document.body.style.overflow;
    dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;byId('discardClose').focus();
  });
  byId('discardShowPlayed').addEventListener('click',()=>{if(dialog.open&&S){view='played';render();}});
  byId('discardShowPile').addEventListener('click',()=>{if(dialog.open&&S){view='pile';render();}});
  byId('discardShowDeck').addEventListener('click',()=>{if(dialog.open&&S){view='deck';render();}});
  byId('discardClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.style.overflow=savedOverflow;if(lastFocus?.isConnected!==false)lastFocus?.focus();});
})();
