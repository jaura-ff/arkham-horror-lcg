/* Read-only onboarding for this simplified single-scenario game. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const game = byId('game'), overlay = byId('tutorial'), panel = byId('tutorialPanel');
  const start = byId('startButton'), learn = byId('learnButton'), guide = byId('guideButton');
  const previous = byId('tutorialPrev'), next = byId('tutorialNext');
  const spotlight = byId('tutorialSpotlight');
  const handle = byId('tutorialDrag');
  if (!game || !overlay || !panel || !start || !learn || !guide || !previous || !next || !spotlight) return;
  const key = 'arkham-tutorial-v1';
  // Local game artwork plus simple diagrams; no downloads or tutorial-only assets.
  const art = (x,y,label) => `<span class="tutorial-art art" style="--art-x:${x}%;--art-y:${y}%"></span><b>${label}</b>`;
  const steps = [
    { target: '#scenePanel', title: '找线索，揭开真相', text: '调查收集 3 个线索 → 推进幕 → 前往阁楼完成调查。', tips: ['移动只能去相邻地点；生命或理智归零会失败。'], visual: '<img class="tutorial-room" src="assets/images/noir-study.webp" alt="" width="344" height="104"><div class="tutorial-route"><b>调查</b><span>→</span><b>3 线索</b><span>→</span><b>阁楼</b></div>' },
    { target: '#actions', title: '每回合，3 次行动', text: '调查、移动、抽牌、拿资源、出牌等，通常各花 1 次行动。', tips: ['先看剩余行动，再决定下一步。'], visual: '<div class="tutorial-action-row"><span><i>1</i>调查</span><span><i>2</i>移动</span><span><i>3</i>补给</span></div><small class="tutorial-caption">举例：你也可以重复同一种行动</small>' },
    { target: '#hand', title: '先看卡，再出牌', text: '双击手牌看效果，再确认出牌；技能牌在检定时投入。', tips: ['资产留在场上；事件结算后弃置。'], visual: `<div class="tutorial-card-pair"><div>${art(33.3333,0,'资产 · 装备武器')}</div><span>／</span><div>${art(100,50,'技能 · 帮助检定')}</div></div>` },
    { target: '.command-panel', title: '遇到敌人，先处理', text: '选择战斗造成伤害，或闪避让敌人力竭并脱离交缠。', tips: ['交缠中的就绪敌人，会对多数其他行动借机攻击。'], visual: `<div class="tutorial-card-pair"><div>${art(66.6667,0,'战斗 · 击败敌人')}</div><span>／</span><div>${art(33.3333,50,'闪避 · 暂时脱身')}</div></div>` },
    { target: '#phasebar', title: '行动结束，继续下一轮', text: '点「结束回合」，再按「继续」走完后续阶段。', tips: ['新的调查阶段恢复 3 行动；顶栏「?」可重看。'], visual: '<div class="tutorial-phase-flow"><span><i>Ⅰ</i>敌人<small>攻击</small></span><b>→</b><span><i>Ⅱ</i>维持<small>补给</small></span><b>→</b><span><i>Ⅲ</i>神话<small>遭遇</small></span></div>' }
  ];
  let active = false, index = 0, lastFocus = null;
  let savedOverflow = '', savedInert = false, savedScroll = [0, 0], target = null;
  let position = null, drag = null;

  function movePanel(x, y) {
    const width = Math.min(380, window.innerWidth - 24);
    const height = panel.getBoundingClientRect().height;
    const point = {
      x: Math.max(12, Math.min(window.innerWidth - width - 12, x)),
      y: Math.max(12, Math.min(window.innerHeight - height - 12, y))
    };
    Object.assign(panel.style, {left:point.x+'px',top:point.y+'px',right:'auto',bottom:'auto'});
    return point;
  }
  function place() {
    if (!active) return;
    const width = window.innerWidth, height = window.innerHeight;
    const rect = target?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      const left = Math.max(5, Math.min(width - 5, rect.left - 5));
      const top = Math.max(5, Math.min(height - 5, rect.top - 5));
      spotlight.hidden = false;
      Object.assign(spotlight.style, {left:left+'px',top:top+'px',width:Math.max(0,Math.min(width-5,rect.right+5)-left)+'px',height:Math.max(0,Math.min(height-5,rect.bottom+5)-top)+'px'});
    } else spotlight.hidden = true;
    const box = panel.getBoundingClientRect();
    const panelWidth = Math.min(380, width - 24), panelHeight = box.height;
    // Start centre-right, away from both edges; user placement survives step changes.
    const point = movePanel(position?.x ?? (width-panelWidth)*0.66,
      position?.y ?? (height-panelHeight)*0.5);
    if (position) position = point;
  }
  function endDrag() {
    if (!drag) return;
    const pointerId = drag.id;
    drag = null;
    panel.classList.remove('is-dragging');
    if (handle?.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  }
  handle?.addEventListener('pointerdown',event=>{
    if (!active || drag || event.isPrimary === false || (event.button != null && event.button !== 0)) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,left:parseFloat(panel.style.left),top:parseFloat(panel.style.top)};
    handle.setPointerCapture(event.pointerId);
    panel.classList.add('is-dragging');
    handle.focus();
    event.preventDefault();
  });
  handle?.addEventListener('pointermove',event=>{
    if (!drag || event.pointerId !== drag.id) return;
    position = movePanel(drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);
    event.preventDefault();
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) {
    handle?.addEventListener(name,event=>{if (drag && event.pointerId === drag.id) endDrag();});
  }
  handle?.addEventListener('keydown',event=>{
    if (!active) return;
    const delta = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if (event.key === 'Home') { endDrag(); position = null; place(); }
    else if (delta) {
      const amount = event.shiftKey ? 40 : 16;
      position = movePanel(parseFloat(panel.style.left)+delta[0]*amount,parseFloat(panel.style.top)+delta[1]*amount);
    } else return;
    event.preventDefault();
  });
  function render() {
    const step = steps[index];
    byId('tutorialProgress').textContent = `新人指导 ${index+1} / ${steps.length}`;
    byId('tutorialTitle').textContent = step.title;
    byId('tutorialVisual').innerHTML = step.visual;
    byId('tutorialText').textContent = step.text;
    byId('tutorialTips').innerHTML = step.tips.map(tip=>`<li>${tip}</li>`).join('');
    previous.disabled = index === 0;
    next.textContent = index === steps.length-1 ? '开始调查' : '下一步';
    target = document.querySelector(step.target);
    target?.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
    panel.scrollTop = 0;
    place();
    if (document.activeElement === previous && previous.disabled) next.focus();
  }
  function open(force = false) {
    if (!force || active || game.style.display === 'none') return;
    if(typeof phaseTransitionActive!=='undefined' && phaseTransitionActive){queuedOpen=queuedOpen===true || force;return;}
    if (byId('modal').classList.contains('open')) {
      byId('guideStatus').textContent = '请先完成或关闭当前游戏弹窗，再打开新人指导。'; return;
    }
    active = true; index = 0; lastFocus = document.activeElement;
    savedOverflow = document.body.style.overflow; savedInert = game.inert;
    savedScroll = [window.scrollX,window.scrollY];
    document.body.style.overflow = 'hidden'; game.inert = true;
    overlay.hidden = false; render(); next.focus();
  }
  function close(remember = true) {
    if (!active) return;
    endDrag();
    active = false; overlay.hidden = true; target = null;
    document.body.style.overflow = savedOverflow; game.inert = savedInert;
    window.scrollTo(...savedScroll);
    if (remember) { try { localStorage.setItem(key,'seen'); } catch (_) {} }
    if (game.style.display === 'none') learn.focus();
    else if (lastFocus && !lastFocus.closest?.('#startOverlay') && lastFocus.isConnected !== false) lastFocus.focus?.();
    else guide.focus();
  }
  let queuedOpen=null;
  document.addEventListener('arkham:phase-ready',()=>{if(queuedOpen!==null){const force=queuedOpen;queuedOpen=null;open(force);}});
  // Only an explicit Learn entry requests onboarding; normal starts never do.
  document.addEventListener('arkham:game-started',event=>{queuedOpen=null;if(event.detail?.tutorial===true)open(true);});
  learn.addEventListener('click',()=>{window.closeHomeDialogs?.();if(typeof beginPrologue==='function'){beginPrologue(true);return;}start.click();open(true);});
  guide.addEventListener('click',()=>open(true));
  previous.addEventListener('click',()=>{if(active && index>0){index--;render();}});
  next.addEventListener('click',()=>{if(!active)return;if(index===steps.length-1)close();else{index++;render();}});
  byId('tutorialSkip').addEventListener('click',()=>close());
  byId('tutorialClose').addEventListener('click',()=>close());
  panel.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const buttons=[handle,byId('tutorialClose'),byId('tutorialSkip'),previous,next].filter(button=>button && !button.disabled);
    const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  });
  window.addEventListener('resize',()=>{endDrag();place();});
  window.addEventListener('scroll',place,true);
  document.addEventListener('arkham:menu',()=>{queuedOpen=null;close(false);});
})();
