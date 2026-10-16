/* Presentation-only pointer to a required continuation, never an automatic click. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),arrow=byId('nextStepArrow'),label=byId('nextStepLabel'),toggle=byId('nextStepToggle');
  if(!arrow || !label || !toggle)return;
  let enabled=true,scheduled=false;
  function choose(){
    if(!enabled || !S || S.gameOver || phaseTransitionActive || byId('game').style.display==='none' || byId('game').inert || !byId('tutorial').hidden || document.querySelector('dialog[open]'))return null;
    if(byId('modal').classList.contains('open')){
      if(S.test)return S.test.resolved?['#testResolveButton','下一步：继续结算']:['#testDrawButton','选择投入牌后，继续检定'];
      if(pendingAction)return ['#actionContinueButton','确认后继续，也可返回'];
      return null;
    }
    if(S.test || S.pendingMove || pendingNavigation || pendingAction)return null;
    if(S.phase==='investigation')return S.actions<=0?['#endTurnButton','行动已用完：结束回合']:null;
    return ['#actions [data-action="next"]','下一步：继续进入下一阶段'];
  }
  function update(){
    scheduled=false;
    const choice=choose(),target=choice && document.querySelector(choice[0]);
    if(!target || target.disabled || target.isConnected===false){arrow.hidden=true;return;}
    const rect=target.getBoundingClientRect();
    if(rect.width<=0 || rect.height<=0){arrow.hidden=true;return;}
    const width=window.innerWidth,height=window.innerHeight;
    let text=choice[1],direction='down';
    if(rect.bottom<=0){text=`向上查看：${choice[1]}`;direction='up';}
    else if(rect.top>=height){text=`向下查看：${choice[1]}`;direction='down';}
    else if(rect.right<=0){text=`向左查看：${choice[1]}`;direction='left';}
    else if(rect.left>=width){text=`向右查看：${choice[1]}`;direction='right';}
    if(label.textContent!==text)label.textContent=text;
    arrow.hidden=false;
    const box=arrow.getBoundingClientRect();
    let x=rect.left+rect.width/2-box.width/2,y=rect.top-box.height-6;
    if(rect.bottom<=0)y=8;
    else if(rect.top>=height)y=height-box.height-8;
    else if(rect.right<=0){x=8;y=rect.top+rect.height/2-box.height/2;}
    else if(rect.left>=width){x=width-box.width-8;y=rect.top+rect.height/2-box.height/2;}
    else if(y<8){direction='up';y=rect.bottom+6;}
    arrow.dataset.direction=direction;
    arrow.style.left=Math.max(8,Math.min(width-box.width-8,x))+'px';
    arrow.style.top=Math.max(8,Math.min(height-box.height-8,y))+'px';
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  toggle.addEventListener('click',()=>{
    enabled=!enabled;toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=`下一步箭头：${enabled?'开':'关'}`;schedule();
  });
  // Do not observe the arrow itself: changing its label/position must not loop.
  const observer=new MutationObserver(schedule);
  for(const node of [byId('game'),byId('modal'),byId('tutorial'),...document.querySelectorAll('dialog')]){
    if(node)observer.observe(node,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','open','inert','disabled']});
  }
  window.addEventListener('resize',schedule);
  window.addEventListener('scroll',schedule,true);
  window.visualViewport?.addEventListener('resize',schedule);
  window.visualViewport?.addEventListener('scroll',schedule);
  document.addEventListener('arkham:phase-ready',schedule);
  document.addEventListener('arkham:menu',schedule);
  schedule();
})();
