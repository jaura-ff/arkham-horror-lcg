const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'next-step.js'),'utf8');
function setup(){
  const nodes=new Map(),selectors=new Map(),frames=[],observed=[],events={},winEvents={};let observerCallback,nativeOpen=false,now=0,timerId=0;const timers=new Map();
  function node(id){const classes=new Set();return{id,hidden:false,style:{setProperty(k,v){this[k]=v}},dataset:{},textContent:'',disabled:false,isConnected:true,listeners:{},rect:{left:100,top:300,right:270,bottom:348,width:170,height:48},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},getBoundingClientRect(){return this.rect},addEventListener(k,fn){this.listeners[k]=fn},setAttribute(k,v){this[k]=v},click(){throw Error('must not click target')},focus(){throw Error('must not steal focus')}};}
  const doc={activeElement:{id:'player-focus'},getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},querySelector(q){return q==='dialog[open]'?(nativeOpen?{}:null):selectors.get(q)||null},querySelectorAll(){return[doc.getElementById('assetInfoDialog')]},addEventListener(k,fn){events[k]=fn}};
  doc.getElementById('tutorial').hidden=true;doc.getElementById('game').style.display='block';doc.getElementById('nextStepArrow').rect={width:200,height:72};
  for(const s of ['#endTurnButton','#testDrawButton','#testResolveButton','#actionContinueButton','#actions [data-action="next"]'])selectors.set(s,node(s));
  const win={innerWidth:1024,innerHeight:768,addEventListener(k,fn){winEvents[k]=fn}};
  const context=vm.createContext({document:doc,window:win,S:{actions:3,phase:'investigation',gameOver:false,test:null,pendingMove:false},phaseTransitionActive:false,pendingAction:null,pendingNavigation:false,setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,at:now+delay});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(fn){frames.push(fn)},MutationObserver:class{constructor(fn){observerCallback=fn}observe(n){observed.push(n.id)}}});
  vm.runInContext(source,context);
  const flush=()=>{const list=frames.splice(0);list.forEach(fn=>fn())};flush();
  return{context,doc,win,winEvents,events,frames,observed,selectors,flush,timers,advance(ms){now+=ms;for(const[id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}},el:id=>doc.getElementById(id),mutate:()=>observerCallback(),update(){observerCallback();flush()},native(value){nativeOpen=value}};
}
test('行动未用完不催结束，用完才指向结束回合',()=>{
  const g=setup();assert.equal(g.el('nextStepArrow').hidden,true);g.context.S.actions=1;g.update();assert.equal(g.el('nextStepArrow').hidden,true);g.context.S.actions=0;g.update();assert.equal(g.el('nextStepArrow').hidden,false);assert.match(g.el('nextStepLabel').textContent,/行动已用完/);assert.equal(g.el('nextStepArrow').style.top,'222px');
});
test('非调查阶段指向继续，阶段倒计时隐藏后恢复',()=>{
  const g=setup();g.context.S.phase='enemy';g.update();assert.match(g.el('nextStepLabel').textContent,/进入下一阶段/);g.context.phaseTransitionActive=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);g.context.phaseTransitionActive=false;g.events['arkham:phase-ready']();g.flush();assert.equal(g.el('nextStepArrow').hidden,false);
});
test('检定前后分别指向抽取和结算按钮，不指定投入哪张牌',()=>{
  const g=setup();g.context.S.test={resolved:false};g.el('modal').classList.add('open');g.update();assert.match(g.el('nextStepLabel').textContent,/选择投入牌后，继续检定/);g.selectors.get('#testDrawButton').rect.top=400;g.update();assert.equal(g.el('nextStepArrow').style.top,'322px');g.context.S.test.resolved=true;g.update();assert.match(g.el('nextStepLabel').textContent,/继续结算/);assert.equal(g.el('nextStepArrow').style.top,'222px');
});
test('行动确认提供可返回的提示，移动和退出菜单不替玩家选择',()=>{
  const g=setup();g.el('modal').classList.add('open');g.context.pendingAction={};g.update();assert.match(g.el('nextStepLabel').textContent,/也可返回/);g.context.pendingAction=null;g.context.S.pendingMove=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);g.context.S.pendingMove=false;g.context.pendingNavigation=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);
});
test('教学、原生弹窗、结局和菜单期间不覆盖其他界面',()=>{
  const g=setup();g.context.S.actions=0;
  for(const[set,reset]of [[()=>{g.el('tutorial').hidden=false},()=>{g.el('tutorial').hidden=true}],[()=>{g.native(true)},()=>{g.native(false)}],[()=>{g.el('game').inert=true},()=>{g.el('game').inert=false}],[()=>{g.context.S.gameOver=true},()=>{g.context.S.gameOver=false}],[()=>{g.el('game').style.display='none'},()=>{g.el('game').style.display='block'}]]){set();g.update();assert.equal(g.el('nextStepArrow').hidden,true);reset();g.update();assert.equal(g.el('nextStepArrow').hidden,false);}
  g.context.S=null;g.events['arkham:menu']();g.flush();assert.equal(g.el('nextStepArrow').hidden,true);
});
test('无目标、目标禁用、移除或尺寸为0都隐藏，重新渲染重新定位',()=>{
  const g=setup();g.context.S.actions=0;const button=g.selectors.get('#endTurnButton');button.disabled=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);button.disabled=false;button.isConnected=false;g.update();assert.equal(g.el('nextStepArrow').hidden,true);button.isConnected=true;button.rect.width=0;g.update();assert.equal(g.el('nextStepArrow').hidden,true);g.selectors.delete('#endTurnButton');g.update();assert.equal(g.el('nextStepArrow').hidden,true);
  g.selectors.set('#endTurnButton',{...button,rect:{left:300,top:200,right:470,bottom:248,width:170,height:48}});g.update();assert.equal(g.el('nextStepArrow').style.left,'285px');
});
test('滚动和横竖屏尺寸变化时重新定位，提示不超出屏幕',()=>{
  const g=setup();g.context.S.actions=0;g.win.innerWidth=320;g.win.innerHeight=390;const button=g.selectors.get('#endTurnButton');button.rect={left:260,top:10,right:320,bottom:58,width:60,height:48};g.winEvents.resize();g.flush();assert.equal(g.el('nextStepArrow').dataset.direction,'up');assert.equal(g.el('nextStepArrow').style.left,'112px');assert.equal(g.el('nextStepArrow').style.top,'64px');
  button.rect={left:10,top:200,right:180,bottom:248,width:170,height:48};g.winEvents.scroll();g.flush();assert.equal(g.el('nextStepArrow').style.left,'8px');assert.equal(g.el('nextStepArrow').dataset.direction,'down');
});
test('目标在屏幕外给出对应方向提示，不自动滚动',()=>{
  const g=setup();g.context.S.actions=0;const button=g.selectors.get('#endTurnButton');
  for(const[rect,text,direction]of [[{left:100,top:-100,right:270,bottom:-52,width:170,height:48},'向上','up'],[{left:100,top:900,right:270,bottom:948,width:170,height:48},'向下','down'],[{left:-200,top:300,right:-30,bottom:348,width:170,height:48},'向左','left'],[{left:1100,top:300,right:1270,bottom:348,width:170,height:48},'向右','right']]){button.rect=rect;g.update();assert.ok(g.el('nextStepLabel').textContent.startsWith(text));assert.equal(g.el('nextStepArrow').dataset.direction,direction);}
});
test('开关仅改变显示，不改变游戏状态、点击按钮或抢焦点',()=>{
  const g=setup();g.context.S.actions=0;const before=JSON.stringify(g.context.S);g.update();g.el('nextStepToggle').listeners.click();g.flush();assert.equal(g.el('nextStepArrow').hidden,true);assert.equal(g.el('nextStepToggle')['aria-pressed'],'false');g.el('nextStepToggle').listeners.click();g.flush();assert.equal(g.el('nextStepArrow').hidden,false);assert.equal(JSON.stringify(g.context.S),before);assert.equal(g.doc.activeElement.id,'player-focus');
});
test('观察器不观察箭头自身，不形成重绘循环，批量变更合并一帧',()=>{
  const g=setup();assert.ok(g.observed.includes('game'));assert.ok(g.observed.includes('modal'));assert.ok(g.observed.includes('assetInfoDialog'));assert.ok(!g.observed.includes('nextStepArrow'));g.mutate();g.mutate();g.mutate();assert.equal(g.frames.length,1);g.flush();assert.equal(g.frames.length,0);
});
test('标记存在、箭头不占布局且鼠标触摸可穿透，无闪烁动画',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'next-step.css'),'utf8');for(const id of ['endTurnButton','actionContinueButton','testDrawButton','testResolveButton','nextStepArrow','nextStepToggle'])assert.ok(html.includes(`id="${id}"`),id);assert.match(css,/position:fixed/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/infinite/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(html,/next-step.js\?v=chapter-2/);
});

function smart(){
 const g=setup();Object.assign(g.context.S,{round:1,location:'study',hp:9,sanity:5,clues:0,actIdx:0,locClues:{study:2,hallway:1,attic:2},revealed:{study:true,hallway:false,attic:false},enemies:[],hand:[],deck:[{}],discard:[]});
 g.context.LOCATIONS={study:{name:'书房',conn:['hallway']},hallway:{name:'走廊',conn:['study','attic']},attic:{name:'阁楼',conn:['hallway']}};
 for(const name of ['investigate','move','advanceAct','finish','fight','evade','draw','resource']){const key=`#actions [data-action="${name}"]`;g.selectors.set(key,{...g.selectors.get('#endTurnButton'),id:key});}
 for(const id of ['study','hallway','attic']){const key=`#modal .move-btn[data-move-target="${id}"]`;g.selectors.set(key,{...g.selectors.get('#endTurnButton'),id:key});}
 g.update();return g;
}
test('完整开局即建议调查，阶段提示结束和游戏开始事件触发指引',()=>{
 const g=smart();assert.equal(g.el('nextStepArrow').hidden,false);assert.match(g.el('nextStepLabel').textContent,/第一条线索/);assert.equal(g.el('nextStepTarget').hidden,false);
 g.context.phaseTransitionActive=true;g.update();assert.equal(g.el('nextStepTarget').hidden,true);g.context.phaseTransitionActive=false;g.events['arkham:game-started']();g.flush();assert.equal(g.el('nextStepArrow').hidden,false);
});
test('地下室智能指引按线索、封印和祭坛切换，不再指向阁楼',()=>{
 const g=smart();Object.assign(g.context.S,{chapter:2,actIdx:2,location:'stairs',clues:0,locClues:{stairs:1,cellar:2,altar:0}});g.update();assert.match(g.el('nextStepLabel').textContent,/调查地下室/);
 g.context.S.clues=2;g.update();assert.match(g.el('nextStepLabel').textContent,/辨认封印/);
 g.context.S.actIdx=3;g.context.S.location='altar';g.update();assert.match(g.el('nextStepLabel').textContent,/封印裂隙/);
});
test('线索耗尽推荐移动，移动弹窗指向相邻探索入口且不泄露未揭示名字',()=>{
 const g=smart();g.context.S.locClues.study=0;g.update();assert.match(g.el('nextStepLabel').textContent,/这里已无线索/);
 g.el('modal').classList.add('open');g.context.S.pendingMove=true;g.update();assert.match(g.el('nextStepLabel').textContent,/这个相邻地点/);assert.doesNotMatch(g.el('nextStepLabel').textContent,/走廊/);
 g.selectors.get('#modal .move-btn[data-move-target="hallway"]').disabled=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);
});
test('有3线索时建议推进幕，不再继续消耗行动调查',()=>{
 const g=smart();g.context.S.clues=3;g.update();assert.match(g.el('nextStepLabel').textContent,/推进幕/);g.context.S.actions=0;g.update();assert.match(g.el('nextStepLabel').textContent,/结束回合/);
});
test('推进幕后经相邻路线去阁楼，到达后提示完成调查',()=>{
 const g=smart();g.context.S.actIdx=1;g.update();assert.match(g.el('nextStepLabel').textContent,/目标在阁楼/);g.context.S.location='hallway';g.context.S.revealed.hallway=true;g.context.S.pendingMove=true;g.el('modal').classList.add('open');
 g.selectors.get('#modal .move-btn[data-move-target="attic"]').rect.top=420;g.update();assert.equal(g.el('nextStepArrow').style.top,'342px');
 g.context.S.location='attic';g.context.S.pendingMove=false;g.el('modal').classList.remove('open');g.update();assert.match(g.el('nextStepLabel').textContent,/完成调查/);
});
test('交缠敌人优先于线索目标，危险状态提示闪避且不保证成功',()=>{
 const g=smart();g.context.S.clues=3;g.context.S.enemies=[{engaged:true,exhausted:false,location:'study',card:{dmg:1,horror:1}}];g.update();assert.match(g.el('nextStepLabel').textContent,/先战斗/);
 g.context.S.hp=2;g.update();assert.match(g.el('nextStepLabel').textContent,/先尝试闪避/);assert.match(g.el('nextStepLabel').textContent,/成功才能/);
 g.selectors.get('#actions [data-action="evade"]').disabled=true;g.update();assert.match(g.el('nextStepLabel').textContent,/先战斗/);
 g.selectors.get('#actions [data-action="fight"]').disabled=true;g.update();assert.equal(g.el('nextStepArrow').hidden,true);
});
test('力竭或别处的敌人不误导玩家战斗',()=>{
 const g=smart();g.context.S.enemies=[{engaged:true,exhausted:true,location:'study'},{engaged:true,exhausted:false,location:'attic'}];g.update();assert.match(g.el('nextStepLabel').textContent,/调查/);
});
test('没有可探索地点时才建议补给，手牌已满时不建议继续抽牌',()=>{
 const g=smart();g.context.S.locClues={study:0,hallway:0,attic:0};g.context.S.revealed={study:true,hallway:true,attic:true};g.update();assert.match(g.el('nextStepLabel').textContent,/抽牌补充/);g.context.S.hand=Array(8).fill({});g.update();assert.match(g.el('nextStepLabel').textContent,/拿 1 资源/);
});
test('调查到检定再回到下一行动，推荐随结算更新且不改变游戏状态',()=>{
 const g=smart();g.context.S.test={resolved:false};g.el('modal').classList.add('open');g.update();assert.match(g.el('nextStepLabel').textContent,/继续检定/);g.context.S.test.resolved=true;g.update();assert.match(g.el('nextStepLabel').textContent,/继续结算/);
 g.context.S.test=null;g.el('modal').classList.remove('open');g.context.S.clues=1;g.context.S.locClues.study=1;g.context.S.actions=2;const before=JSON.stringify(g.context.S);g.update();assert.match(g.el('nextStepLabel').textContent,/继续调查/);assert.equal(JSON.stringify(g.context.S),before);
});
test('提示贴到屏幕边缘时箭头尖端仍对准按钮，不误指相邻按钮',()=>{
 const g=smart(),button=g.selectors.get('#actions [data-action="investigate"]');button.rect={left:8,top:220,right:78,bottom:260,width:70,height:40};g.update();assert.equal(g.el('nextStepArrow').style.left,'8px');assert.equal(g.el('nextStepArrow').style['--tip-offset'],'9px');assert.equal(g.el('nextStepTarget').style.left,'5px');
 g.context.S.gameOver=true;g.update();assert.equal(g.el('nextStepTarget').hidden,true);
});
test('智能指导开关在顶栏独立可见，无需展开指引，也不影响布局和操作',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),header=html.split('<header class="topbar">')[1].split('</header>')[0];assert.match(header,/id="nextStepToggle"/);assert.match(header,/智能指导：开/);assert.equal((html.match(/id="nextStepToggle"/g)||[]).length,1);assert.match(html,/data-move-target="\$\{id\}"/);assert.match(html,/id="nextStepTarget"[^>]*aria-hidden="true"/);
});

test('动态提示只显示4.8秒，到时箭头和目标描边一同消失',()=>{
 const g=smart();assert.equal(g.timers.size,1);assert.equal(g.el('nextStepArrow').classList.contains('is-cue-active'),true);g.advance(4799);assert.equal(g.el('nextStepArrow').hidden,false);g.advance(1);assert.equal(g.el('nextStepArrow').hidden,true);assert.equal(g.el('nextStepTarget').hidden,true);assert.equal(g.timers.size,0);
});
test('同一步的重绘、滚动和窗口变化不重播，也不延长显示时间',()=>{
 const g=smart();g.advance(3000);for(let i=0;i<5;i++){g.update();g.winEvents.scroll();g.winEvents.resize();g.flush();}g.advance(1800);assert.equal(g.el('nextStepArrow').hidden,true);g.update();g.winEvents.resize();g.flush();assert.equal(g.el('nextStepArrow').hidden,true);assert.equal(g.timers.size,0);
});
test('完成操作或推荐目标改变时播放新的一次提示',()=>{
 const g=smart();g.advance(4800);g.context.S.actions=2;g.context.S.clues=1;g.context.S.locClues.study=1;g.update();assert.equal(g.el('nextStepArrow').hidden,false);assert.match(g.el('nextStepLabel').textContent,/继续调查/);g.advance(2000);g.context.S.locClues.study=0;g.update();g.advance(2800);assert.equal(g.el('nextStepArrow').hidden,false);g.advance(2000);assert.equal(g.el('nextStepArrow').hidden,true);
});
test('关闭、返回菜单、页面离开清理计时，重开可再看当前步骤',()=>{
 for(const event of ['off','menu','pagehide']){const g=smart();if(event==='off')g.el('nextStepToggle').listeners.click();else if(event==='menu')g.events['arkham:menu']();else g.winEvents.pagehide();assert.equal(g.el('nextStepArrow').hidden,true);assert.equal(g.timers.size,0);}
 const g=smart();g.advance(4800);g.el('nextStepToggle').listeners.click();g.flush();g.el('nextStepToggle').listeners.click();g.flush();assert.equal(g.el('nextStepArrow').hidden,false);assert.equal(g.timers.size,1);
});
test('连续切换步骤只保留一个计时器，提示期间不改游戏或抢焦点',()=>{
 const g=smart();for(let i=0;i<20;i++){g.context.S.round=i+1;const before=JSON.stringify(g.context.S);g.update();assert.equal(g.timers.size,1);assert.equal(JSON.stringify(g.context.S),before);}assert.equal(g.doc.activeElement.id,'player-focus');
});
test('大号实心图标和短时动效仅使用变换与透明度，尊重减少动态效果',()=>{
 const css=fs.readFileSync(path.join(root,'next-step.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),svg=fs.readFileSync(path.join(root,'assets/icons/ui.svg'),'utf8');
 assert.match(css,/\.next-step-arrow \.ui-icon\{width:52px;height:52px/);assert.match(css,/guide-pointer-nudge 650ms ease-in-out 6/);assert.match(css,/guide-cue-life 4800ms/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)[^\n]*animation:none!important/);assert.doesNotMatch(css,/infinite/);
 assert.match(html,/ui.svg\?v=guide-pointer-1#guide-pointer/);assert.match(svg,/<symbol id="guide-pointer" viewBox="0 0 48 48">/);
 for(const rule of css.matchAll(/@keyframes[^}]+\{([\s\S]*?)\}\}/g))assert.doesNotMatch(rule[1],/(?:width|height|left|top|margin|padding):/);
});
