/* Presentation only: inspecting a phase never executes a game action. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),bar=byId('phasebar'),tip=byId('phaseHelp'),game=byId('game');
  if(!bar||!tip||!game)return;
  const rules={
    mythos:['神话阶段','末日 +1 → 检查议程 → 抽取并处理遭遇牌。\n危险会在这个阶段逼近；首回合开局跳过此阶段，从调查阶段开始。'],
    investigation:['调查阶段','每回合有 3 次行动，可调查、移动、战斗、闪避、抽牌、获取资源或打出卡牌，通常每次花费 1 行动。\n有就绪敌人交缠时，调查、移动、抽牌、资源和出牌会触发借机攻击；战斗、闪避不会。完成后点击「结束回合」。'],
    enemy:['敌人阶段','猎手敌人先移动，随后就绪且与你交缠的敌人攻击，攻击后力竭。已力竭的敌人不会攻击。\n没有敌人时也会经过此阶段，只是不发生攻击；随后进入维持阶段。'],
    upkeep:['维持阶段','力竭的敌人和资产恢复就绪 → 抽 1 张玩家牌 → 获得 1 资源。\n手牌超过 8 张时，本网页会自动弃至 8 张。这些结算不消耗行动；随后进入下一轮的神话阶段。']
  };
  let anchor=null,hideTimer=null;
  const trigger=node=>node?.closest?.('#phasebar [data-phase]');
  function blocked(){return game.style.display==='none'||game.inert||(typeof phaseTransitionActive!=='undefined'&&phaseTransitionActive)||document.querySelector('dialog[open]')||byId('modal')?.classList.contains('open');}
  function cancelHide(){clearTimeout(hideTimer);hideTimer=null;}
  function hide(){cancelHide();anchor?.removeAttribute('aria-describedby');anchor=null;tip.hidden=true;}
  function position(){
    if(!anchor)return;
    if(blocked()||!anchor.isConnected){hide();return;}
    const r=anchor.getBoundingClientRect(),box=tip.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight;
    tip.style.left=Math.max(12,Math.min(w-box.width-12,r.left+r.width/2-box.width/2))+'px';
    const y=r.bottom+10+box.height<=h-12?r.bottom+10:r.top-box.height-10;
    tip.style.top=Math.max(12,Math.min(h-box.height-12,y))+'px';
  }
  function show(node){
    if(!node||!rules[node.dataset.phase]||blocked())return;
    cancelHide();if(anchor!==node)anchor?.removeAttribute('aria-describedby');anchor=node;
    const [title,text]=rules[node.dataset.phase];byId('phaseHelpTitle').textContent=title;byId('phaseHelpText').textContent=text;
    node.setAttribute('aria-describedby','phaseHelp');tip.hidden=false;position();
  }
  function leave(){cancelHide();hideTimer=setTimeout(()=>{
    hideTimer=null;
    if(anchor&&document.activeElement===anchor)return;
    hide();
  },160);}
  bar.addEventListener('pointerover',event=>{if(event.pointerType!=='touch')show(trigger(event.target));});
  bar.addEventListener('pointerout',event=>{
    if(trigger(event.relatedTarget)===anchor||tip.contains(event.relatedTarget))return;
    leave();
  });
  bar.addEventListener('focusin',event=>show(trigger(event.target)));
  bar.addEventListener('focusout',event=>{if(!tip.contains(event.relatedTarget))leave();});
  // Native buttons also support Enter/Space; a tap outside dismisses on phones.
  bar.addEventListener('click',event=>show(trigger(event.target)));
  tip.addEventListener('pointerenter',cancelHide);
  tip.addEventListener('pointerleave',leave);
  document.addEventListener('pointerdown',event=>{if(!trigger(event.target)&&!tip.contains(event.target))hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
  document.addEventListener('arkham:menu',hide);
  document.addEventListener('arkham:game-started',hide);
  window.addEventListener('blur',hide);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  window.visualViewport?.addEventListener('resize',position);
  window.visualViewport?.addEventListener('scroll',position);
  // A rerender removes the old trigger; dialogs/inert states dismiss stale help.
  const observer=new MutationObserver(()=>{if(anchor)position();});
  for(const node of [game,byId('modal'),...document.querySelectorAll('dialog')]){
    if(node)observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','open','inert']});
  }
})();
