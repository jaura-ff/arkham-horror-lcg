/* Read-only hand preview; click/double-click still belong to hand-dialog.js. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),hand=byId('hand'),tip=byId('handHover'),game=byId('game');
  if(!hand||!tip||!game)return;
  let anchor=null,card=null,originalDescription=null,hideTimer=null;
  const trigger=node=>node?.closest?.('#hand [data-hand-index]');
  function blocked(){return !S||game.style.display==='none'||game.inert||phaseTransitionActive||document.querySelector('dialog[open]')||byId('modal')?.classList.contains('open');}
  function cancelHide(){clearTimeout(hideTimer);hideTimer=null;}
  function hide(){
    cancelHide();
    if(anchor){if(originalDescription===null)anchor.removeAttribute('aria-describedby');else anchor.setAttribute('aria-describedby',originalDescription);}
    anchor=null;card=null;originalDescription=null;tip.hidden=true;
  }
  function position(){
    if(!anchor)return;
    if(blocked()||!anchor.isConnected||S.hand[Number(anchor.dataset.handIndex)]!==card){hide();return;}
    const r=anchor.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight;
    if(r.bottom<=0||r.top>=h||r.right<=0||r.left>=w){hide();return;}
    const box=tip.getBoundingClientRect();
    tip.style.left=Math.max(12,Math.min(w-box.width-12,r.left+r.width/2-box.width/2))+'px';
    const above=r.top-box.height-10;
    const y=above>=12?above:r.bottom+10;
    tip.style.top=Math.max(12,Math.min(h-box.height-12,y))+'px';
  }
  function show(node){
    if(!node||blocked())return;
    const next=S.hand[Number(node.dataset.handIndex)];if(!next)return;
    cancelHide();
    if(anchor!==node){hide();anchor=node;originalDescription=node.getAttribute('aria-describedby');}
    card=next;
    const type={asset:'资产',event:'事件',skill:'技能',weak:'弱点'}[card.type]||'卡牌';
    byId('handHoverTitle').textContent=card.name;
    byId('handHoverType').textContent=type+(['skill','weak'].includes(card.type)?' · 非普通出牌':` · 费用 ${card.cost} 资源 + 1 行动`);
    byId('handHoverEffect').textContent=card.text;
    byId('handHoverUsage').textContent=CARD_USAGE[card.id]||card.text;
    const art=CARD_ART[card.id]||[0,0];
    byId('handHoverArt').style.setProperty('--art-x',art[0]+'%');byId('handHoverArt').style.setProperty('--art-y',art[1]+'%');
    anchor.setAttribute('aria-describedby',[originalDescription,'handHover'].filter(Boolean).join(' '));
    tip.hidden=false;position();
  }
  function leave(){cancelHide();hideTimer=setTimeout(()=>{hideTimer=null;if(document.activeElement!==anchor||!anchor?.matches?.(':focus-visible'))hide();},160);}
  hand.addEventListener('pointerover',event=>{if(event.pointerType!=='touch')show(trigger(event.target));});
  hand.addEventListener('pointerout',event=>{if(trigger(event.relatedTarget)!==anchor&&!tip.contains(event.relatedTarget))leave();});
  hand.addEventListener('focusin',event=>show(trigger(event.target)));
  hand.addEventListener('focusout',event=>{if(!tip.contains(event.relatedTarget))leave();});
  tip.addEventListener('pointerenter',cancelHide);
  tip.addEventListener('pointerleave',leave);
  document.addEventListener('pointerdown',event=>{if(!tip.contains(event.target))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  document.addEventListener('arkham:menu',hide);
  document.addEventListener('arkham:game-started',hide);
  window.addEventListener('blur',hide);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  window.visualViewport?.addEventListener('resize',position);
  window.visualViewport?.addEventListener('scroll',position);
  const observer=new MutationObserver(()=>{if(anchor)position();});
  for(const node of [game,byId('modal'),...document.querySelectorAll('dialog')]){
    if(node)observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','open','inert','disabled']});
  }
})();
