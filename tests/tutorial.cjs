const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','tutorial.js'),'utf8');
test('实际开局事件在阶段提示后启动教学，并保留强制重看请求',()=>{
  const g=setup({saved:'seen',transition:true});g.nodes.get('game').style.display='block';g.events['arkham:game-started']({detail:{tutorial:true}});assert.equal(g.open(),false);g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),true);
});
test('普通前序结束后不会开启教学',()=>{
  const g=setup({saved:'seen'});g.nodes.get('game').style.display='block';g.events['arkham:game-started']({detail:{tutorial:false}});assert.equal(g.open(),false);
});

test('首次访问、已看过或存储不可用，普通开始和阶段完成均不打开教学',()=>{
  for(const saved of [null,'seen'])for(const storageFails of [false,true])for(const transition of [false,true]){
    const g=setup({saved,storageFails,transition});g.click('startButton');assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);
    g.events['arkham:game-started']({detail:{tutorial:false}});g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),false);
    g.events['arkham:game-started']({});g.events['arkham:phase-ready']();assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);
    g.click('guideButton');assert.equal(g.open(),true);
  }
});

test('取消教学排队后普通开局不遗留引导，后来仍可主动重开',()=>{
  const g=setup({transition:true});g.click('learnButton');g.events['arkham:menu']();g.click('startButton');g.events['arkham:game-started']({detail:{tutorial:false}});g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),false);g.click('guideButton');assert.equal(g.open(),true);
});

test('主动教学等待阶段提示完成才打开',()=>{
  const g=setup({transition:true});g.click('learnButton');assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),true);g.click('tutorialSkip');g.events['arkham:phase-ready']();assert.equal(g.open(),false);
});
test('已看过不自动排队，手动教学可延后，菜单清理排队',()=>{
  const g=setup({saved:'seen',transition:true});g.click('startButton');g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),false);
  g.setPhasePending(true);g.click('guideButton');assert.equal(g.open(),false);g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),true);g.click('tutorialClose');g.setPhasePending(true);g.click('guideButton');g.events['arkham:menu']();g.setPhasePending(false);g.events['arkham:phase-ready']();assert.equal(g.open(),false);
});
function setup({saved=null,storageFails=false,transition=false}={}){
  const nodes=new Map(),events={},winEvents={},storage={value:saved};
  const state={actions:3,resources:5,hp:9,sanity:5,clues:0,location:'study'};
  const doc={body:{style:{overflow:''}},activeElement:null,getElementById:id=>nodes.get(id),querySelector:selector=>targets[selector]||null,addEventListener(name,fn){events[name]=fn}};
  function node(id){const classes=new Set();return{id,style:{},hidden:false,inert:false,disabled:false,isConnected:true,scrollTop:0,textContent:'',innerHTML:'',listeners:{},classList:{contains:x=>classes.has(x),add:x=>classes.add(x),remove:x=>classes.delete(x)},addEventListener(name,fn){this.listeners[name]=fn},getBoundingClientRect(){return{left:20,top:30,right:320,bottom:230,width:300,height:200}},scrollIntoView(){},focus(){doc.activeElement=this},closest(selector){return selector==='#startOverlay'&&['startButton','learnButton'].includes(id)?{}:null},click(){if(this.disabled)return;if(id==='startButton')nodes.get('game').style.display='block';this.listeners.click?.()}}}
  const ids=['game','tutorial','tutorialPanel','startButton','learnButton','guideButton','tutorialPrev','tutorialNext','tutorialSpotlight','modal','guideStatus','tutorialProgress','tutorialTitle','tutorialText','tutorialTips','tutorialVisual','tutorialSkip','tutorialClose'];
  ids.push('tutorialDrag');
  ids.forEach(id=>nodes.set(id,node(id)));nodes.get('game').style.display='none';nodes.get('tutorial').hidden=true;
  const handle=nodes.get('tutorialDrag');
  handle.setPointerCapture=id=>{handle.captured=id};
  handle.hasPointerCapture=id=>handle.captured===id;
  handle.releasePointerCapture=()=>{handle.captured=null};
  const targets=Object.fromEntries(['#scenePanel','#actions','#hand','.command-panel','#phasebar'].map(selector=>[selector,node(selector)]));
  const win={innerWidth:844,innerHeight:390,scrollX:0,scrollY:0,scrollTo(x,y){this.scrollX=x;this.scrollY=y},addEventListener(name,fn){winEvents[name]=fn}};
  const localStorage={getItem(){if(storageFails)throw Error('blocked');return storage.value},setItem(_,value){if(storageFails)throw Error('blocked');storage.value=value}};
  const runtime={document:doc,window:win,localStorage,phaseTransitionActive:transition};
  vm.runInNewContext(source,runtime);
  function click(id){const n=nodes.get(id);doc.activeElement=n;n.click()}
  function key(value,shiftKey=false){let prevented=false;nodes.get('tutorialPanel').listeners.keydown({key:value,shiftKey,preventDefault(){prevented=true}});return prevented}
  return{nodes,targets,doc,win,winEvents,events,storage,state,click,key,setPhasePending:value=>{runtime.phaseTransitionActive=value},open:()=>!nodes.get('tutorial').hidden};
}
test('主动选择新人指导，六步完成不扣资源或行动',()=>{
  const g=setup(),before=JSON.stringify(g.state);g.click('learnButton');
  assert.equal(g.open(),true);assert.equal(g.nodes.get('game').inert,true);
  assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 6');
  assert.equal(g.nodes.get('tutorialPrev').disabled,true);
  for(let i=0;i<5;i++)g.click('tutorialNext');
  assert.equal(g.nodes.get('tutorialNext').textContent,'开始实操');g.click('tutorialNext');
  assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);assert.equal(g.doc.body.style.overflow,'');
  assert.equal(g.storage.value,'seen');assert.equal(JSON.stringify(g.state),before);
  assert.equal(g.doc.activeElement.id,'guideButton');
});
test('跳过后不再自动出现，顶栏可随时重看',()=>{
  const g=setup();g.click('learnButton');g.click('tutorialSkip');g.click('startButton');assert.equal(g.open(),false);
  g.click('guideButton');assert.equal(g.open(),true);assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 6');
});
test('菜单新人指导可启动并打开已看过的教学',()=>{
  const g=setup({saved:'seen'});g.click('learnButton');assert.equal(g.open(),true);assert.equal(g.nodes.get('game').style.display,'block');
});
test('弹窗进行中不覆盖检定或打开教学',()=>{
  const g=setup({saved:'seen'});g.click('startButton');g.nodes.get('modal').classList.add('open');g.click('guideButton');
  assert.equal(g.open(),false);assert.match(g.nodes.get('guideStatus').textContent,/先完成或关闭/);assert.equal(g.nodes.get('game').inert,false);
});
test('上一步边界和 Escape 退出均安全',()=>{
  const g=setup();g.click('learnButton');g.click('tutorialNext');g.click('tutorialPrev');g.click('tutorialPrev');
  assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 1 / 6');assert.equal(g.key('Escape'),true);assert.equal(g.open(),false);
});
test('Tab 焦点限制在教学内，关闭后恢复焦点',()=>{
  const g=setup({saved:'seen'});g.click('startButton');g.click('guideButton');g.nodes.get('tutorialNext').focus();
  assert.equal(g.key('Tab'),true);assert.equal(g.doc.activeElement.id,'tutorialDrag');
  assert.equal(g.key('Tab',true),true);assert.equal(g.doc.activeElement.id,'tutorialNext');
  g.click('tutorialClose');assert.equal(g.doc.activeElement.id,'guideButton');
});
test('禁用存储仍可使用，返回菜单和旋转会正确清理或重定位',()=>{
  const g=setup({storageFails:true});g.click('learnButton');g.win.innerWidth=390;g.win.innerHeight=320;g.winEvents.resize();
  const panel=g.nodes.get('tutorialPanel');assert.ok(parseFloat(panel.style.left)>=12);assert.ok(parseFloat(panel.style.top)>=12);
  g.nodes.get('game').style.display='none';g.events['arkham:menu']();assert.equal(g.open(),false);assert.equal(g.doc.body.style.overflow,'');assert.equal(g.doc.activeElement.id,'learnButton');
});

test('默认位置居中偏右，不随高亮目标左右跳动',()=>{
  const g=setup();g.win.innerWidth=1440;g.win.innerHeight=900;
  let position=0;
  for(const target of Object.values(g.targets)){
    const left=position++%2?1050:20;
    target.getBoundingClientRect=()=>({left,top:40,right:left+300,bottom:240,width:300,height:200});
  }
  g.click('learnButton');
  for(let step=0;step<6;step++){
    const panel=g.nodes.get('tutorialPanel');
    assert.equal(parseFloat(panel.style.left),(1440-380)*0.66);assert.equal(panel.style.top,'350px');
    assert.equal(g.nodes.get('tutorialSpotlight').style.left,step%2?'1045px':'15px');
    if(step<5)g.click('tutorialNext');
  }
  g.winEvents.scroll();assert.equal(parseFloat(g.nodes.get('tutorialPanel').style.left),(1440-380)*0.66);
});

test('右侧引导在窄屏及短横屏保留安全边距',()=>{
  const g=setup();g.click('learnButton');
  for(const [width,height] of [[390,844],[568,320],[844,390]]){
    g.win.innerWidth=width;g.win.innerHeight=height;g.winEvents.resize();
    const panel=g.nodes.get('tutorialPanel'),panelWidth=Math.min(380,width-24);
    assert.ok(parseFloat(panel.style.left)>=12);assert.ok(parseFloat(panel.style.left)+panelWidth<=width-12);
    assert.ok(parseFloat(panel.style.top)>=12);assert.ok(parseFloat(panel.style.top)+200<=height-12);
  }
});

function pointer(g,type,x,y,extra={}){
  let prevented=false;
  g.nodes.get('tutorialDrag').listeners[type]({pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,preventDefault(){prevented=true},...extra});
  return prevented;
}

test('鼠标及触摸拖动标题栏，切步骤、滚动和重开保留位置',()=>{
  for(const pointerType of ['mouse','touch']){
    const g=setup();g.win.innerWidth=1440;g.win.innerHeight=900;g.click('learnButton');
    const panel=g.nodes.get('tutorialPanel'),before=JSON.stringify(g.state),x=parseFloat(panel.style.left),y=parseFloat(panel.style.top);
    assert.equal(pointer(g,'pointerdown',x+20,y+20,{pointerType}),true);
    assert.equal(g.nodes.get('tutorialDrag').captured,1);
    pointer(g,'pointermove',x+120,y+80,{pointerType});
    assert.equal(parseFloat(panel.style.left),x+100);assert.equal(parseFloat(panel.style.top),y+60);
    pointer(g,'pointerup',0,0);assert.equal(g.nodes.get('tutorialDrag').captured,null);
    const placed={...panel.style};g.click('tutorialNext');g.winEvents.scroll();assert.deepEqual(panel.style,placed);
    g.click('tutorialClose');g.click('guideButton');assert.deepEqual(panel.style,placed);assert.equal(JSON.stringify(g.state),before);
  }
});

test('拖动不能出屏，旋转及内容增高后重新约束位置',()=>{
  const g=setup();g.click('learnButton');const panel=g.nodes.get('tutorialPanel');
  pointer(g,'pointerdown',100,100);pointer(g,'pointermove',9999,9999);
  assert.equal(panel.style.left,'452px');assert.equal(panel.style.top,'178px');
  pointer(g,'pointermove',-9999,-9999);assert.equal(panel.style.left,'12px');assert.equal(panel.style.top,'12px');
  pointer(g,'pointermove',9999,9999);
  g.win.innerWidth=390;g.win.innerHeight=320;g.winEvents.resize();
  assert.equal(panel.style.left,'12px');assert.equal(panel.style.top,'108px');assert.equal(g.nodes.get('tutorialDrag').captured,null);
  panel.getBoundingClientRect=()=>({height:296});g.click('tutorialNext');assert.equal(panel.style.top,'12px');
});

test('取消、丢失捕获、关闭会停止拖动，忽略右键及其他手指',()=>{
  for(const ending of ['pointercancel','lostpointercapture','close']){
    const g=setup();g.click('learnButton');const panel=g.nodes.get('tutorialPanel'),before={...panel.style};
    pointer(g,'pointerdown',100,100,{button:2});pointer(g,'pointermove',200,200);assert.deepEqual(panel.style,before);
    pointer(g,'pointerdown',100,100);pointer(g,'pointermove',200,200,{pointerId:2});assert.deepEqual(panel.style,before);
    if(ending==='close')g.click('tutorialClose');else pointer(g,ending,100,100);
    pointer(g,'pointermove',200,200);assert.deepEqual(panel.style,before);assert.equal(g.nodes.get('tutorialDrag').captured,null);
  }
});

test('标题栏方向键移动，Home 复位，不截获正文及按钮点击',()=>{
  const g=setup();g.click('learnButton');const panel=g.nodes.get('tutorialPanel'),handle=g.nodes.get('tutorialDrag'),before={...panel.style};
  const key=(value,shiftKey=false)=>handle.listeners.keydown({key:value,shiftKey,preventDefault(){}});
  key('ArrowLeft');assert.equal(parseFloat(panel.style.left),parseFloat(before.left)-16);
  key('ArrowDown',true);assert.equal(parseFloat(panel.style.top),parseFloat(before.top)+40);
  key('Home');assert.deepEqual(panel.style,before);assert.equal(panel.listeners.pointerdown,undefined);
  g.click('tutorialNext');assert.equal(g.nodes.get('tutorialProgress').textContent,'新人指导 2 / 6');
});

test('六步均配本地图示，正文保持简短且每步只有一条提醒',()=>{
  const g=setup();g.click('learnButton');const visuals=[];
  for(let i=0;i<6;i++){
    const text=g.nodes.get('tutorialText').textContent;
    const tips=g.nodes.get('tutorialTips').innerHTML;
    const visual=g.nodes.get('tutorialVisual').innerHTML;
    assert.ok(text.length<=50,text);assert.equal((tips.match(/<li>/g)||[]).length,1);
    assert.ok(visual.length>0);assert.doesNotMatch(visual,/https?:/);visuals.push(visual);
    for(const [,asset] of visual.matchAll(/src="([^"]+)"/g))assert.ok(fs.existsSync(path.join(__dirname,'..',asset)),asset);
    if(i<5)g.click('tutorialNext');
  }
  assert.equal(new Set(visuals).size,6);assert.equal(g.nodes.get('tutorialNext').textContent,'开始实操');
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  assert.ok(html.includes('id="tutorialVisual" class="tutorial-visual" aria-hidden="true"'));
  assert.ok(html.includes('tutorial.css?v=illustrated-five-1'));assert.ok(!html.includes('七步'));
  assert.ok(fs.existsSync(path.join(__dirname,'..','assets/images/noir-atlas.webp')));
  const css=fs.readFileSync(path.join(__dirname,'..','tutorial.css'),'utf8');
  assert.match(css,/@media\(orientation:landscape\) and \(max-height:440px\)/);
});

test('最后新增鼓励实操页，可返回回合说明，开始实操仅退出引导',()=>{
  const g=setup(),before=JSON.stringify(g.state);g.click('learnButton');
  for(let i=0;i<4;i++)g.click('tutorialNext');
  assert.equal(g.nodes.get('tutorialNext').textContent,'下一步');g.click('tutorialNext');
  assert.match(g.nodes.get('tutorialText').textContent,/还没完全理解也没关系/);
  assert.equal(g.nodes.get('tutorialNext').textContent,'开始实操');
  g.click('tutorialPrev');assert.match(g.nodes.get('tutorialTitle').textContent,/下一轮/);
  g.click('tutorialNext');g.click('tutorialNext');
  assert.equal(g.open(),false);assert.equal(g.nodes.get('game').inert,false);
  assert.equal(JSON.stringify(g.state),before);
});

test('教学入口与所有目标区域均存在，脚本随游戏本地加载',()=>{
  const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
  for(const id of ['tutorial','tutorialPanel','tutorialSpotlight','learnButton','guideButton','tutorialClose','tutorialSkip','tutorialPrev','tutorialNext','tutorialTitle','tutorialText','tutorialTips','tutorialProgress','guideStatus','investigator','scenePanel','actions','hand','phasebar'])assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.includes('src="tutorial.js?v=practice-outro-1"'));assert.ok(html.includes('class="aa"'));assert.ok(html.includes('class="panel command-panel"'));
  assert.ok(html.includes('id="tutorialDrag"'));assert.ok(html.includes('拖动调整位置'));
});
