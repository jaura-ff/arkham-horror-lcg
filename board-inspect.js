/* Central inspections: consume only the inspection click, never an action click. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),game=byId('game'),dialog=byId('boardInspectDialog'),content=byId('boardInspectContent'),action=byId('boardInspectAction');
  if(!game||!dialog||!content||!action)return;
  let origin=null,pending=null,state=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const paragraph=text=>`<p class="inspect-text">${esc(text)}</p>`;
  function art(coords){return coords?`<div class="art inspect-art" aria-hidden="true" style="--art-x:${coords[0]}%;--art-y:${coords[1]}%"></div>`:'';}
  function blocked(){return !S||game.style.display==='none'||game.inert||S.test||S.pendingMove||pendingNavigation||pendingAction||phaseTransitionActive||byId('modal')?.classList.contains('open')||document.querySelector('dialog[open]');}
  function room(id){
    const location=LOCATIONS[id];if(!location)return null;
    if(!S.revealed[id])return{title:location.name,body:paragraph('尚未探索。放大查看不会揭示地点，也不会移动。')};
    const from=S.location;
    return{title:location.name,body:`<div class="inspect-scene" data-room="${esc(id)}" aria-hidden="true"></div>`+paragraph(location.desc)+paragraph(`遮蔽值 ${location.shroud} · 剩余线索 ${S.locClues[id]}\n${id===from?'你在这里。':'当前不在此地。'}\n连接：${location.conn.map(key=>LOCATIONS[key].name).join('、')}`),label:from!==id&&LOCATIONS[from].conn.includes(id)&&canAct()?'前往此地':null,run:()=>{if(S.location===from&&canAct()&&S.revealed[id]&&LOCATIONS[from].conn.includes(id))requestMapMove(id);}};
  }
  function describe(node){
    if(node.matches('.map-node'))return room(node.dataset.room);
    if(node.id==='scenePanel')return room(S.location);
    if(node.id==='investigator')return{title:INVESTIGATOR.name,body:art([0,0])+paragraph(INVESTIGATOR.title)+paragraph(`意志 ${INVESTIGATOR.will}　智慧 ${INVESTIGATOR.int}　战斗 ${INVESTIGATOR.combat}　敏捷 ${INVESTIGATOR.agility}`)+paragraph(`生命 ${S.hp}/${INVESTIGATOR.maxHp}　理智 ${S.sanity}/${INVESTIGATOR.maxSanity}\n资源 ${S.resources}　线索 ${S.clues}　剩余行动 ${S.actions}/3\n当前位置：${LOCATIONS[S.location].name}`)};
    if(node.matches('.side.act')){const index=S.actIdx,card=ACT_DECK[index];return{title:'幕 · '+card.id,body:paragraph(card.text)+paragraph(`当前线索：${S.clues}\n${index===0?'需要 3 条线索和 1 次行动推进幕。':'前往阁楼，执行「完成调查」。'}`),label:index===0&&S.clues>=3&&canAct()?'继续 · 推进幕':null,run:()=>{if(S.actIdx===index)requestAction('advanceAct');}};}
    if(node.matches('.side.agenda')){const card=AGENDA_DECK[S.agendaIdx];return{title:'议程 · '+card.id,body:paragraph(card.text)+paragraph(`当前末日：${S.doom}${card.threshold>0?' / '+card.threshold:''}\n神话阶段增加末日，达到门槛会推进议程。查看不会推进议程。`)};}
    if(node.matches('.enemy')){const index=[...byId('enemies').children].indexOf(node),enemy=S.enemies[index];if(!enemy)return null;const c=enemy.card;return{title:c.name,body:art([100,100])+paragraph(`战斗 ${c.fight}　生命 ${enemy.hp}/${c.hp}　闪避 ${c.evade}\n攻击：${c.dmg} 伤害、${c.horror} 恐惧\n${enemy.exhausted?'已力竭':enemy.engaged?'与你交缠':'游荡'} · ${LOCATIONS[enemy.location]?.name||'未知地点'}${c.hunter?'\n猎手：敌人阶段会向你移动。':''}`)};}
    if(node.matches('.asset-icon')){const index=[...byId('assets').children].indexOf(node),asset=S.assets[index];if(!asset)return null;const c=asset.card;return{title:c.name,body:art(CARD_ART[c.id])+paragraph(c.text)+paragraph(`${asset.exhausted?'已力竭':'就绪'} · ${c.slot==='hand'?'占用 '+(c.slots||1)+' 只手':'无手部占用'}\n${CARD_USAGE[c.id]||''}`)};}
    const title=node.querySelector('h2,summary')?.textContent?.trim()||'区域详情';
    return{title,body:paragraph(node.innerText||node.textContent||'当前暂无内容。')};
  }
  function show(node){
    const view=describe(node);if(!view)return;
    origin=node;state=S;pending=view.label?view.run:null;
    byId('boardInspectTitle').textContent=view.title;content.innerHTML=view.body;
    action.hidden=!pending;action.textContent=view.label||'';
    dialog.showModal();dialog.scrollTop=0;byId('boardInspectClose').focus();
  }
  function activate(event){
    const target=event.target;if(!target?.closest||blocked())return;
    const handCard=target.closest('#hand [data-hand-index]');
    const special=handCard||target.closest('.map-node,.asset-icon');
    if(!special&&target.closest('button,a,input,select,textarea,summary,[role="button"]'))return;
    const node=special||target.closest('#investigator,.side.act,.side.agenda,.enemy,.panel');if(!node||!game.contains(node))return;
    if(event.type==='keydown'){if(!['Enter',' '].includes(event.key)||target!==node)return;}
    event.preventDefault();event.stopImmediatePropagation();
    if(handCard){if(!handCard.disabled)inspectHandCard(Number(handCard.dataset.handIndex),{detail:0});return;}
    show(node);
  }
  game.addEventListener('click',activate,true);
  game.addEventListener('keydown',activate,true);
  byId('boardInspectClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(!event.target.closest('button,a,input,select,textarea')&&!window.getSelection()?.toString())dialog.close();});
  action.addEventListener('click',()=>{const run=pending,same=S===state;pending=null;dialog.close();if(same&&run&&!blocked())run();});
  dialog.addEventListener('close',()=>{pending=null;state=null;content.replaceChildren();if(origin?.isConnected&&game.style.display!=='none'&&!game.inert&&!byId('modal')?.classList.contains('open')&&!document.querySelector('dialog[open]'))origin.focus?.({preventScroll:true});origin=null;});
  // The existing hand confirmation remains the only route that can play a card.
  for(const id of ['handCardDialog','assetInfoDialog']){
    const existing=byId(id);existing?.addEventListener('click',event=>{if(!event.target.closest('button,a,input,select,textarea')&&!window.getSelection()?.toString())existing.close();});
  }
  document.addEventListener('arkham:menu',()=>{if(dialog.open)dialog.close();});
})();
