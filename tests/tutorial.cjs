const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','tutorial.js'),'utf8');
function setup({saved=null,storageFails=false}={}){
  const nodes=new Map(),events={},winEvents={},storage={value:saved};
  const state={actions:3,resources:5,hp:9,sanity:5,clues:0,location:'study'};
  const doc={body:{style:{overflow:''}},activeElement:null,getElementById:id=>nodes.get(id),querySelector:selector=>targets[selector]||null,addEventListener(name,fn){events[name]=fn}};
  function node(id){const classes=new Set();return{id,style:{},hidden:false,inert:false,disabled:false,isConnected:true,scrollTop:0,textContent:'',innerHTML:'',listeners:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},addEventListener(name,fn){this.listeners[name]=fn},getBoundingClientRect(){return{left:20,top:30,right:320,bottom:230,width:300,height:200}},scrollIntoView(){},focus(){doc.activeElement=this},closest(selector){return selector==='#startOverlay'&&['startButton','learnButton'].includes(id)?{}:null},click(){if(this.disabled)return;if(id==='startButton')nodes.get('game').style.display='block';this.listeners.click?.()}}}
  const ids=['game','tutorial','tutorialPanel','startButton','learnButton','guideButton','tutorialPrev','tutorialNext','tutorialSpotlight','modal','guideStatus','tutorialProgress','tutorialTitle','tutorialText','tutorialTips','tutorialSkip','tutorialClose'];
  ids.forEach(id=>nodes.set(id,node(id)));nodes.get('game').style.display='none';nodes.get('tutorial').hidden=true;
  const targets=Object.fromEntries(['.aa','#investigator','#scenePanel','#actions','#hand','.command-panel','#phasebar'].map(selector=>[selector,node(selector)]));
  const win={innerWidth:844,innerHeight:390,scrollX:0,scrollY:0,scrollTo(x,y){this.scrollX=x;this.scrollY=y},addEventListener(name,fn){winEvents[name]=fn}};
  const localStorage={getItem(){if(storageFails)throw Error('blocked');return storage.value},setItem(_,value){if(storageFails)throw Error('blocked');storage.value=value}};
  vm.runInNewContext(source,{document:doc,window:win,localStorage});
  function click(id){const n=nodes.get(id);doc.activeElement=n;n.click()}
  function key(value,shiftKey=false){let prevented=false;nodes.get('tutorialPanel').listeners.keydown({key:value,shiftKey,preventDefault(){prevented=true}});return prevented}
  return{nodes,targets,doc,win,winEvents,events,storage,state,click,key,open:()=>!nodes.get('tutorial').hidden};
}
test('初次开始自动引导，七步完成不扣资源或行动',()=>{
  const g=setup(),before=JSON.stringify(g.state);g.click('startButton');
  assert.equal(g.open(),true);assert.equal(g.nodes.get('game').inert,true);
  assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 7');
  assert.equal(g.nodes.get('tutorialPrev').disabled,true);
  for(let i=0;i<6;i++)g.click('tutorialNext');
  assert.equal(g.nodes.get('tutorialNext').textContent,'开始调查');g.click('tutorialNext');
  assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);assert.equal(g.doc.body.style.overflow,'');
  assert.equal(g.storage.value,'seen');assert.equal(JSON.stringify(g.state),before);
  assert.equal(g.doc.activeElement.id,'guideButton');
});
test('跳过后不再自动出现，顶栏可随时重看',()=>{
  const g=setup();g.click('startButton');g.click('tutorialSkip');g.click('startButton');assert.equal(g.open(),false);
  g.click('guideButton');assert.equal(g.open(),true);assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 7');
});
test('菜单新人指导可启动并打开已看过的教学',()=>{
  const g=setup({saved:'seen'});g.click('learnButton');assert.equal(g.open(),true);assert.equal(g.nodes.get('game').style.display,'block');
});
test('弹窗进行中不覆盖检定或打开教学',()=>{
  const g=setup({saved:'seen'});g.click('startButton');g.nodes.get('modal').classList.add('open');g.click('guideButton');
  assert.equal(g.open(),false);assert.match(g.nodes.get('guideStatus').textContent,/先完成或关闭/);assert.equal(g.nodes.get('game').inert,false);
});
test('上一步边界和 Escape 退出均安全',()=>{
  const g=setup();g.click('startButton');g.click('tutorialNext');g.click('tutorialPrev');g.click('tutorialPrev');
  assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 7');assert.equal(g.key('Escape'),true);assert.equal(g.open(),false);
});
test('Tab 焦点限制在教学内，关闭后恢复焦点',()=>{
  const g=setup({saved:'seen'});g.click('startButton');g.click('guideButton');g.nodes.get('tutorialNext').focus();
  assert.equal(g.key('Tab'),true);assert.equal(g.doc.activeElement.id,'tutorialClose');
  assert.equal(g.key('Tab',true),true);assert.equal(g.doc.activeElement.id,'tutorialNext');
  g.click('tutorialClose');assert.equal(g.doc.activeElement.id,'guideButton');
});
test('禁用存储仍可使用，返回菜单和旋转会正确清理或重定位',()=>{
  const g=setup({storageFails:true});g.click('startButton');g.win.innerWidth=390;g.win.innerHeight=320;g.winEvents.resize();
  const panel=g.nodes.get('tutorialPanel');assert.ok(parseFloat(panel.style.left)>=12);assert.ok(parseFloat(panel.style.top)>=12);
  g.nodes.get('game').style.display='none';g.events['arkham:menu']();assert.equal(g.open(),false);assert.equal(g.doc.body.style.overflow,'');assert.equal(g.doc.activeElement.id,'learnButton');
});

test('所有步骤固定右下方，不随高亮目标左右跳动',()=>{
  const g=setup();g.win.innerWidth=1440;g.win.innerHeight=900;
  let position=0;
  for(const target of Object.values(g.targets)){
    const left=position++%2?1050:20;
    target.getBoundingClientRect=()=>({left,top:40,right:left+300,bottom:240,width:300,height:200});
  }
  g.click('startButton');
  for(let step=0;step<7;step++){
    const panel=g.nodes.get('tutorialPanel');
    assert.equal(panel.style.left,'1048px');assert.equal(panel.style.top,'688px');
    assert.equal(g.nodes.get('tutorialSpotlight').style.left,step%2?'1045px':'15px');
    if(step<6)g.click('tutorialNext');
  }
  g.winEvents.scroll();assert.equal(g.nodes.get('tutorialPanel').style.left,'1048px');
});

test('右侧引导在窄屏及短横屏保留安全边距',()=>{
  const g=setup();g.click('startButton');
  for(const [width,height] of [[390,844],[568,320],[844,390]]){
    g.win.innerWidth=width;g.win.innerHeight=height;g.winEvents.resize();
    const panel=g.nodes.get('tutorialPanel'),panelWidth=Math.min(380,width-24);
    assert.equal(parseFloat(panel.style.left)+panelWidth,width-12);
    assert.equal(parseFloat(panel.style.top)+200,height-12);
  }
});

test('教学入口与所有目标区域均存在，脚本随游戏本地加载',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  for(const id of ['tutorial','tutorialPanel','tutorialSpotlight','learnButton','guideButton','tutorialClose','tutorialSkip','tutorialPrev','tutorialNext','tutorialTitle','tutorialText','tutorialTips','tutorialProgress','guideStatus','investigator','scenePanel','actions','hand','phasebar'])assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.includes('src="tutorial.js"'));assert.ok(html.includes('class="aa"'));assert.ok(html.includes('class="panel command-panel"'));
});
