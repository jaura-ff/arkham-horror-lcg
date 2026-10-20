/* Local, situation-aware suggestions only; never take an action for the player. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),arrow=byId('nextStepArrow'),label=byId('nextStepLabel'),toggle=byId('nextStepToggle');
  if(!arrow || !label || !toggle)return;
  let enabled=true,scheduled=false;
  const highlight=byId('nextStepTarget');
  const action=(name,text)=>[`#actions [data-action="${name}"]`,text];
  function destination(){
    const locations=typeof LOCATIONS==='undefined'?{}:LOCATIONS;
    const start=S.location,seen=new Set([start]);
    const queue=(locations[start]?.conn||[]).map(id=>({id,first:id}));
    while(queue.length){
      const {id,first}=queue.shift();if(seen.has(id))continue;seen.add(id);
      const useful=S.actIdx>=1?id==='attic':(!S.revealed?.[id] || (S.locClues?.[id]||0)>0);
      if(useful)return first;
      for(const next of locations[id]?.conn||[])if(!seen.has(next))queue.push({id:next,first});
    }
    return null;
  }
  function investigation(){
    if(S.actions<=0)return ['#endTurnButton','行动已用完：结束回合'];
    const threats=(S.enemies||[]).filter(e=>e.engaged&&!e.exhausted&&e.location===S.location);
    if(threats.length){
      const damage=threats.reduce((n,e)=>n+(e.card?.dmg||0),0),horror=threats.reduce((n,e)=>n+(e.card?.horror||0),0);
      const danger=S.hp<=damage+1 || S.sanity<=horror+1;
      const choices=danger?[action('evade','状态危险：先尝试闪避，成功才能脱离'),action('fight','先战斗，处理交缠的敌人')]:[action('fight','先战斗，避免其他行动触发借机攻击'),action('evade','可以尝试闪避，成功后再行动')];
      return choices.find(choice=>{const button=document.querySelector(choice[0]);return button&&!button.disabled;})||null;
    }
    if(S.actIdx===0 && S.clues>=3)return action('advanceAct','线索已足够：点击「推进幕」');
    if(S.actIdx>=1){
      if(S.location==='attic')return action('finish','已到阁楼：点击「完成调查」');
      return action('move','目标在阁楼：点击「移动」继续前进');
    }
    if((S.locClues?.[S.location]||0)>0)return action('investigate',S.round===1&&S.actions===3&&S.clues===0?'先点「调查」，尝试找到第一条线索':'这里还有线索，建议继续调查');
    if(destination())return action('move','这里已无线索：移动到相邻地点继续探索');
    if(S.location && S.hand?.length<8 && (S.deck?.length||S.discard?.length))return action('draw','暂无线索可找：可以抽牌补充手牌');
    if(S.location)return action('resource','可以先拿 1 资源，为后续出牌做准备');
    return null;
  }
  function choose(){
    if(!enabled || !S || S.gameOver || phaseTransitionActive || byId('game').style.display==='none' || byId('game').inert || !byId('tutorial').hidden || document.querySelector('dialog[open]'))return null;
    if(byId('modal').classList.contains('open')){
      if(S.test)return S.test.resolved?['#testResolveButton','下一步：继续结算']:['#testDrawButton','选择投入牌后，继续检定'];
      if(pendingAction)return ['#actionContinueButton','确认后继续，也可返回'];
      if(S.pendingMove){
        const locations=typeof LOCATIONS==='undefined'?{}:LOCATIONS;
        const id=destination()||locations[S.location]?.conn?.[0];
        if(id)return [`#modal .move-btn[data-move-target="${id}"]`,S.revealed?.[id]?`建议前往${locations[id]?.name||'相邻地点'}；也可以返回`:'选择这个相邻地点，继续探索；也可以返回'];
      }
      return null;
    }
    if(S.test || S.pendingMove || pendingNavigation || pendingAction)return null;
    if(S.phase==='investigation')return investigation();
    return ['#actions [data-action="next"]','下一步：继续进入下一阶段'];
  }
  function update(){
    scheduled=false;
    const choice=choose(),target=choice && document.querySelector(choice[0]);
    if(!target || target.disabled || target.isConnected===false){arrow.hidden=true;if(highlight)highlight.hidden=true;return;}
    const rect=target.getBoundingClientRect();
    if(rect.width<=0 || rect.height<=0){arrow.hidden=true;if(highlight)highlight.hidden=true;return;}
    const width=window.innerWidth,height=window.innerHeight;
    let text=choice[1],direction='down';
    if(rect.bottom<=0){text=`向上查看：${choice[1]}`;direction='up';}
    else if(rect.top>=height){text=`向下查看：${choice[1]}`;direction='down';}
    else if(rect.right<=0){text=`向左查看：${choice[1]}`;direction='left';}
    else if(rect.left>=width){text=`向右查看：${choice[1]}`;direction='right';}
    if(label.textContent!==text)label.textContent=text;
    arrow.hidden=false;
    arrow.dataset.direction=direction;
    const box=arrow.getBoundingClientRect();
    let x=rect.left+rect.width/2-box.width/2,y=rect.top-box.height-6;
    if(rect.bottom<=0)y=8;
    else if(rect.top>=height)y=height-box.height-8;
    else if(rect.right<=0){x=8;y=rect.top+rect.height/2-box.height/2;}
    else if(rect.left>=width){x=width-box.width-8;y=rect.top+rect.height/2-box.height/2;}
    else if(y<8){direction='up';y=rect.bottom+6;}
    arrow.dataset.direction=direction;
    const left=Math.max(8,Math.min(width-box.width-8,x));
    arrow.style.left=left+'px';
    arrow.style.top=Math.max(8,Math.min(height-box.height-8,y))+'px';
    arrow.style.setProperty('--tip-offset',Math.max(0,Math.min(box.width-26,rect.left+rect.width/2-left-13))+'px');
    if(highlight){
      highlight.hidden=rect.bottom<=0||rect.top>=height||rect.right<=0||rect.left>=width;
      Object.assign(highlight.style,{left:Math.max(1,rect.left-3)+'px',top:Math.max(1,rect.top-3)+'px',width:Math.max(0,Math.min(width-1,rect.right+3)-Math.max(1,rect.left-3))+'px',height:Math.max(0,Math.min(height-1,rect.bottom+3)-Math.max(1,rect.top-3))+'px'});
    }
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  toggle.addEventListener('click',()=>{
    enabled=!enabled;toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=`智能指导：${enabled?'开':'关'}`;schedule();
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
  document.addEventListener('arkham:game-started',schedule);
  document.addEventListener('arkham:menu',schedule);
  schedule();
})();
