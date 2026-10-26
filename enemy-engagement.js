/* Read-only, manually dismissed warnings for newly engaged enemies. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('enemyEngagementDialog');
  if(!dialog)return;
  let state=null,previous=new Map(),queue=[],active=null,timer=null,revision=0,lastFocus=null;
  const engaged=e=>!!e.engaged&&e.location===S?.location;
  const present=e=>S?.enemies.includes(e)&&engaged(e);
  const eligible=e=>present(e)&&!e.exhausted;
  function schedule(delay=0){
    if(timer!==null||dialog.open||!queue.length)return;
    const ticket=revision;
    timer=setTimeout(()=>{if(ticket!==revision)return;timer=null;flush();},delay);
  }
  window.resetEnemyEngagement=()=>{
    revision++;if(timer!==null)clearTimeout(timer);
    timer=null;queue=[];previous.clear();active=null;state=null;lastFocus=null;
    if(dialog.open)dialog.close();
  };
  function flush(){
    if(!S||S!==state||S.gameOver){window.resetEnemyEngagement();return;}
    queue=queue.filter(present);
    if(!queue.length||dialog.open)return;
    const ready=queue.findIndex(eligible);
    if(ready<0)return; // Readying/rendering will retry; no idle polling for exhausted enemies.
    // Finish mandatory tests and phase effects first; never replace their UI.
    if(document.hidden||S.test||S.chapterIntro||S.pendingMove||pendingAction||pendingNavigation||phaseTransitionActive||byId('modal').classList.contains('open')||document.querySelector('dialog[open]')){schedule(200);return;}
    [active]=queue.splice(ready,1);
    const card=active.card,name=card.name||'未知怪物',art=byId('enemyEngagementArt');
    byId('enemyEngagementTitle').textContent=name;
    byId('enemyEngagementHp').textContent=`${active.hp}/${card.hp}`;
    byId('enemyEngagementFight').textContent=String(card.fight);
    byId('enemyEngagementEvade').textContent=String(card.evade);
    byId('enemyEngagementAttackStats').textContent=`每次造成 ${card.dmg||0} 伤害、${card.horror||0} 恐惧。`;
    byId('enemyEngagementTrait').textContent=card.hunter?'猎手：就绪且未交缠时，敌人阶段会向你移动一个相邻地点。':'非猎手：不会主动跨地点追赶；同地点就绪时仍会与你交缠。';
    byId('enemyEngagementAttack').textContent=`它的每次攻击：${card.dmg||0} 伤害、${card.horror||0} 恐惧。`;
    const ghoul=card.name?.includes('食尸鬼')||card.traits?.includes('Ghoul')||card.id==='cellar-keeper';
    const picture=typeof CARD_ART!=='undefined'?CARD_ART[card.code||card.id]:null;
    art.classList.toggle('art',ghoul||!!picture);art.textContent=ghoul||picture?'':name.slice(0,1);
    if(picture)setCardArt(art,picture);else{art.style.setProperty('--art-x','100%');art.style.setProperty('--art-y','100%');art.style.setProperty('--art-image',"url('assets/images/noir-atlas.webp')");}
    art.setAttribute('aria-label',`${name}的缩略图`);
    lastFocus=document.activeElement;
    try{dialog.showModal();byId('enemyEngagementConfirm').focus();}
    catch(_){active=null;schedule(200);} // Unsupported modal APIs must not block play.
  }
  window.syncEnemyEngagement=()=>{
    if(!S||S.gameOver){window.resetEnemyEngagement();return;}
    if(state!==S){window.resetEnemyEngagement();state=S;}
    const current=new Map();
    for(const enemy of S.enemies){
      const now=engaged(enemy);
      if(now&&!previous.get(enemy)&&!queue.includes(enemy)&&active!==enemy)queue.push(enemy);
      current.set(enemy,now);
    }
    previous=current;
    queue=queue.filter(present);
    if(active&&!eligible(active)&&dialog.open)dialog.close();
    schedule();
  };
  for(const id of ['enemyEngagementClose','enemyEngagementConfirm'])byId(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    if(dialog.open)return; // Ignore an old asynchronous close event after a new opening.
    active=null;
    if(S&&!S.gameOver&&!byId('modal').classList.contains('open')&&!document.querySelector('dialog[open]')){
      if(lastFocus?.isConnected&&!lastFocus.closest?.('[inert]'))lastFocus.focus?.();
      else byId('menuButton')?.focus?.();
    }
    lastFocus=null;schedule();
  });
  document.addEventListener('arkham:menu',window.resetEnemyEngagement);
  window.addEventListener('pagehide',window.resetEnemyEngagement);
})();
