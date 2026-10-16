const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'next-step.js'),'utf8');
function setup(){
  const nodes=new Map(),selectors=new Map(),frames=[],observed=[],events={},winEvents={};let observerCallback,nativeOpen=false;
  function node(id){const classes=new Set();return{id,hidden:false,style:{},dataset:{},textContent:'',disabled:false,isConnected:true,listeners:{},rect:{left:100,top:300,right:270,bottom:348,width:170,height:48},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},getBoundingClientRect(){return this.rect},addEventListener(k,fn){this.listeners[k]=fn},setAttribute(k,v){this[k]=v},click(){throw Error('must not click target')},focus(){throw Error('must not steal focus')}};}
  const doc={activeElement:{id:'player-focus'},getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},querySelector(q){return q==='dialog[open]'?(nativeOpen?{}:null):selectors.get(q)||null},querySelectorAll(){return[doc.getElementById('assetInfoDialog')]},addEventListener(k,fn){events[k]=fn}};
  doc.getElementById('tutorial').hidden=true;doc.getElementById('game').style.display='block';doc.getElementById('nextStepArrow').rect={width:200,height:72};
  for(const s of ['#endTurnButton','#testDrawButton','#testResolveButton','#actionContinueButton','#actions [data-action="next"]'])selectors.set(s,node(s));
  const win={innerWidth:1024,innerHeight:768,addEventListener(k,fn){winEvents[k]=fn}};
  const context=vm.createContext({document:doc,window:win,S:{actions:3,phase:'investigation',gameOver:false,test:null,pendingMove:false},phaseTransitionActive:false,pendingAction:null,pendingNavigation:false,requestAnimationFrame(fn){frames.push(fn)},MutationObserver:class{constructor(fn){observerCallback=fn}observe(n){observed.push(n.id)}}});
  vm.runInContext(source,context);
  const flush=()=>{const list=frames.splice(0);list.forEach(fn=>fn())};flush();
  return{context,doc,win,winEvents,events,frames,observed,selectors,flush,el:id=>doc.getElementById(id),mutate:()=>observerCallback(),update(){observerCallback();flush()},native(value){nativeOpen=value}};
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
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'next-step.css'),'utf8');for(const id of ['endTurnButton','actionContinueButton','testDrawButton','testResolveButton','nextStepArrow','nextStepToggle'])assert.ok(html.includes(`id="${id}"`),id);assert.match(css,/position:fixed/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/animation:/);assert.match(html,/next-step.js\?v=arrow-1/);
});
