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
  const steps = [
    { target: '.aa', title: '先看这一局的目标', text: '你要调查这座异常的宅邸，在生命或理智耗尽、议程走到终局之前找到真相。', tips: ['先收集 3 个线索，再用「推进幕」花费 3 线索和 1 次行动。', '推进幕后前往阁楼，执行「完成调查」达成胜利。议程旁的末日数字代表逼近的危险。'] },
    { target: '#investigator', title: '人物牌就是你的状态面板', text: '生命、理智和四项属性都在这里。底部统一显示资源、线索、剩余行动和当前位置。', tips: ['资源用于打出卡牌；线索用于推进目标。它们不是同一种东西。', '每个调查阶段有 3 次行动。生命或理智降到 0，就会失败。'] },
    { target: '#scenePanel', title: '去哪里，调查什么？', text: '场景里标出了地点的「遮蔽」和剩余线索。调查成功，会从这里获得 1 个线索。', tips: ['移动只能前往相邻地点。用「移动」按钮探索未揭示的地点；已揭示且相邻的地点也可直接点地图移动。', '调查会用智慧对抗遮蔽，并抽取混沌指示物。加上指示物修正后达到难度才算成功。'] },
    { target: '#actions', title: '每回合只有 3 次行动', text: '抽牌、拿资源、移动、调查、战斗、闪避，以及打出资产或事件，通常各消耗 1 次行动。', tips: ['「资源」行动获得 1 资源；「抽牌」行动抽 1 张牌。同一种行动可以重复做。', '建议先查看手牌需要多少资源，再决定是装备武器、调查，还是补给。没有敌人时，战斗和闪避不可用。'] },
    { target: '#hand', title: '手牌怎么用？', text: '资产打出后留在装备区；事件打出后结算效果。技能牌不能直接打出，要在匹配属性的检定窗口中投入。', tips: ['卡牌上方的数字是资源费用。打出资产或事件除了付资源，还需要 1 次行动。手槽最多放 2 件手部资产。', '检定中可选中技能牌，再抽取混沌指示物，最后点击「确定」结算。起手会避开弱点，之后抽到弱点会受恐惧。'] },
    { target: '.command-panel', title: '遇到敌人，不要只顾调查', text: '战斗和闪避也需要检定。成功战斗通常造成 1 点伤害；成功闪避会使敌人力竭并脱离交缠。', tips: ['与就绪敌人交缠时，做战斗、闪避以外的普通行动，会先受到借机攻击。移动也不例外。', '这局的 .45 自动手枪能提高战斗检定，并让成功攻击额外造成 1 点伤害。没有足够资源或手槽就不能装备。'] },
    { target: '#phasebar', title: '结束回合之后做什么？', text: '点「结束回合」后，按「继续」依次经过敌人、维持、神话阶段，再回到调查阶段。第一回合从调查开始。', tips: ['敌人可能攻击；维持会抽牌、获得资源并恢复敌人；神话会推进末日并抽遭遇。', '新一轮调查阶段恢复 3 次行动。有检定弹窗时先完成检定。准备好了就开始调查；顶栏「?」可以随时重看。'] }
  ];
  let active = false, index = 0, seen = false, lastFocus = null;
  let savedOverflow = '', savedInert = false, savedScroll = [0, 0], target = null;
  let position = null, drag = null;
  try { seen = !!localStorage.getItem(key); } catch (_) {}

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
    if (active || (!force && seen) || game.style.display === 'none') return;
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
    if (remember) { seen = true; try { localStorage.setItem(key,'seen'); } catch (_) {} }
    if (game.style.display === 'none') learn.focus();
    else if (lastFocus && !lastFocus.closest?.('#startOverlay') && lastFocus.isConnected !== false) lastFocus.focus?.();
    else guide.focus();
  }
  start.addEventListener('click',()=>open());
  learn.addEventListener('click',()=>{start.click();open(true);});
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
  document.addEventListener('arkham:menu',()=>close(false));
})();
