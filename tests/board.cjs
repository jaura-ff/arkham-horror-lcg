const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'board.js'),'utf8'),css=fs.readFileSync(path.join(root,'board.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),events={},winEvents={},visualEvents={};let observer;
 function node(id){const values=new Set();const n={id,style:{setProperty(k,v){this[k]=v}},classList:{add:k=>values.add(k),remove:k=>values.delete(k),contains:k=>values.has(k)},listeners:{},inert:false,open:false,innerHTML:'',clientWidth:500,scrolls:[],addEventListener(k,f){this.listeners[k]=f},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()},scrollBy(args){this.scrolls.push(args)}};nodes.set(id,n);return n;}
 const doc={documentElement:node('html'),body:node('body'),activeElement:null,getElementById:id=>nodes.get(id),addEventListener(k,f){(events[k]??=[]).push(f)},querySelector(selector){return selector==='dialog[open]'?[...nodes.values()].find(n=>n.open&&n.id.endsWith('Dialog'))||null:null}};
 for(const id of ['game','playGuide','hand','handPrevious','handNext','boardLogButton','boardLogDialog','boardLogClose','boardLogContent','log','modal'])node(id);
 nodes.get('game').style.display='none';nodes.get('playGuide').open=true;
 const win={innerWidth:1366,innerHeight:768,visualViewport:{width:1366,height:768,scale:1,addEventListener(k,f){visualEvents[k]=f}},addEventListener(k,f){winEvents[k]=f},matchMedia(){return{matches:false}}};
 class Observer{constructor(fn){observer=fn}observe(n,options){this.node=n;this.options=options}}
 vm.runInNewContext(source,{window:win,document:doc,MutationObserver:Observer});
 const fire=k=>(events[k]||[]).forEach(fn=>fn());
 return{nodes,doc,win,winEvents,visualEvents,fire,observe:()=>observer(),start(){nodes.get('game').style.display='block';fire('arkham:game-started')},menu(){nodes.get('game').style.display='none';fire('arkham:menu')},click:id=>nodes.get(id).listeners.click()};
}
test('只在实际游戏启用一屏布局，返回菜单释放页面锁',()=>{
 const g=setup();assert.equal(g.doc.body.classList.contains('game-fit'),false);g.start();assert.equal(g.doc.body.classList.contains('game-fit'),true);assert.equal(g.doc.documentElement.classList.contains('game-fit'),true);assert.equal(g.nodes.get('playGuide').open,false);g.menu();assert.equal(g.doc.body.classList.contains('game-fit'),false);assert.equal(g.doc.documentElement.classList.contains('game-fit'),false);
});
test('电脑、手机横屏、竖屏和极短窗口，桌面几何尺寸均不超出视口',()=>{
 const g=setup();g.start();
 for(const [width,height] of [[1920,1080],[1366,768],[1024,600],[844,390],[667,320],[390,844],[320,240]]){
  Object.assign(g.win.visualViewport,{width,height});g.visualEvents.resize();const style=g.nodes.get('game').style,s=Number(style['--board-scale']);
  assert.ok(s>0&&s<=1);assert.ok(parseFloat(style.width)>=1000-1e-8);assert.ok(parseFloat(style.height)>=800-1e-8);
  assert.ok(Math.abs(parseFloat(style.width)*s-width)<1e-6);assert.ok(Math.abs(parseFloat(style.height)*s-height)<1e-6);
 }
});
test('无visualViewport时窗口缩放仍适配，返回菜单后不改尺寸',()=>{
 const g=setup();g.start();g.win.visualViewport=null;g.win.innerWidth=800;g.win.innerHeight=600;g.winEvents.resize();assert.equal(Number(g.nodes.get('game').style['--board-scale']),.75);g.menu();const width=g.nodes.get('game').style.width;g.win.innerWidth=1600;g.winEvents.resize();assert.equal(g.nodes.get('game').style.width,width);
});
test('用户双指放大不被自动适配抵消',()=>{
 const g=setup();g.start();const style=g.nodes.get('game').style,originalScale=style['--board-scale'],originalWidth=style.width;Object.assign(g.win.visualViewport,{width:683,height:384,scale:2});g.visualEvents.resize();assert.equal(style['--board-scale'],originalScale);assert.equal(style.width,originalWidth);
});
test('游戏显示监听幂等，自己更新尺寸不会循环重置指引',()=>{
 const g=setup();g.nodes.get('game').style.display='block';g.observe();g.nodes.get('playGuide').open=true;g.observe();assert.equal(g.nodes.get('playGuide').open,true);g.nodes.get('game').style.display='none';g.observe();assert.equal(g.doc.body.classList.contains('game-fit'),false);
});
test('左右按钮切换手牌，减少动态效果时禁用平滑滚动',()=>{
 const g=setup();g.start();g.click('handNext');g.click('handPrevious');const hand=g.nodes.get('hand');assert.equal(hand.scrolls[0].left,400);assert.equal(hand.scrolls[1].left,-400);g.win.matchMedia=()=>({matches:true});g.click('handNext');assert.equal(hand.scrolls[2].behavior,'auto');
});
test('完整日志仍保留，查阅只复制到独立弹窗并恢复焦点',()=>{
 const g=setup();g.start();const log=g.nodes.get('log');log.innerHTML='<div>第一回合</div><div>第二回合</div>';g.click('boardLogButton');assert.equal(g.nodes.get('boardLogDialog').open,true);assert.equal(g.nodes.get('boardLogContent').innerHTML,log.innerHTML);assert.equal(g.doc.activeElement.id,'boardLogClose');g.click('boardLogClose');assert.equal(g.doc.activeElement.id,'boardLogButton');assert.equal(log.innerHTML,'<div>第一回合</div><div>第二回合</div>');
});
test('教学或游戏弹窗打开时不叠加记录弹窗，菜单关闭已开记录',()=>{
 const g=setup();g.start();g.nodes.get('game').inert=true;g.click('boardLogButton');assert.equal(g.nodes.get('boardLogDialog').open,false);g.nodes.get('game').inert=false;g.nodes.get('modal').classList.add('open');g.click('boardLogButton');assert.equal(g.nodes.get('boardLogDialog').open,false);g.nodes.get('modal').classList.remove('open');g.click('boardLogButton');g.menu();assert.equal(g.nodes.get('boardLogDialog').open,false);
});
test('一屏布局覆盖旧高度，所有主区域都有固定网格位置，不靠截断整个页面',()=>{
 for(const region of ['#investigator','.command-panel','.goal-panel','.scene-panel','.enemy-panel','.equipment-panel','.hand-panel','.log-panel'])assert.ok(css.includes(region+'{'),region);
 assert.match(css,/grid-template-rows:170px minmax\(0,1fr\) 140px/);assert.match(css,/\.game-fit #game \.scene-panel\{[^}]*min-height:0/);assert.match(css,/\.game-fit #game \.hand\{min-height:0;height:100%/);assert.match(css,/overflow-x:auto;overflow-y:hidden/);assert.match(css,/#playGuide\[open\]\{position:absolute/);
 assert.match(html,/board.css\?v=icon-proportions-3/);assert.match(html,/board.js\?v=spacious-header-4/);
 for(const id of ['boardLogButton','boardLogDialog','boardLogClose','boardLogContent','handPrevious','handNext'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
 assert.match(html,/aria-label="上一组手牌"/);assert.match(html,/aria-label="下一组手牌"/);assert.doesNotMatch(source,/\bS\s*[.=]|requestAction\(|startGame\(|beginPrologue\(/);
});

test('恢复原有三栏与面板顺序，不再把目标和敌人移到记录栏',()=>{
 assert.doesNotMatch(css,/display:contents/);
 assert.match(css,/\.col-left\{display:grid;[^}]*grid-template-rows:170px minmax\(0,1fr\) 140px/);
 assert.match(css,/\.col-center\{display:grid;[^}]*grid-template-rows:minmax\(0,1fr\) auto 62px 140px/);
 assert.match(css,/\.goal-panel\{grid-column:1;grid-row:3\}/);
 assert.match(css,/\.enemy-panel\{[^}]*grid-column:1;grid-row:2;height:70px/);
 const left=html.split('<div class="col-left">')[1].split('<!-- 中央 -->')[0];
 const center=html.split('<div class="col-center">')[1].split('<!-- 右栏 -->')[0];
 assert.ok(left.indexOf('id="investigator"')<left.indexOf('id="commandPanel"'));
 assert.ok(left.indexOf('id="commandPanel"')<left.indexOf('class="panel goal-panel"'));
 for(const [a,b] of [['id="scenePanel"','class="panel enemy-panel"'],['class="panel enemy-panel"','class="panel equipment-panel"'],['class="panel equipment-panel"','class="panel hand-panel"']])assert.ok(center.indexOf(a)<center.indexOf(b));
});

test('阶段栏预留完整双语行高，不再把文字压进26像素窄条',()=>{
 assert.match(css,/#wrap\{[^}]*grid-template-rows:50px 28px minmax\(0,1fr\)/);
 assert.match(css,/#phasebar\{[^}]*height:50px;min-height:50px/);
 assert.match(css,/\.phase\{[^}]*min-height:50px/);
 assert.match(css,/\.phase \.nm\{font-size:13px;line-height:17px/);
 assert.match(css,/\.phase \.en\{font-size:9px;line-height:12px/);
 assert.ok(17+12+2+6*2<=50); // Both text lines, gap and vertical padding fit.
 assert.match(css,/#playGuide\[open\]\{position:absolute;top:62px/);
});

test('人物、卡图、怪物和地图人物标记保持方形，含大屏覆盖规则',()=>{
 for(const [selector,sizes] of [['.portrait',[72,84]],['.card-art',[64,88]],['.asset-icon-art',[36]],['.e-ico',[32]],['.map-player-marker',[42]]]){
  const rules=[...css.matchAll(new RegExp(selector.replace('.', '\\.')+'\\{([^}]+)\\}','g'))];
  assert.ok(rules.length,sizes.join(','));
  for(const rule of rules){const w=rule[1].match(/(?:^|;)width:(\d+)px/),h=rule[1].match(/(?:^|;)height:(\d+)px/);if(w&&h){assert.equal(Number(w[1]),Number(h[1]),selector);assert.ok(sizes.includes(Number(w[1])),selector);}}
 }
 assert.match(css,/grid-template-columns:72px minmax\(0,1fr\);grid-template-rows:36px 36px/);
 assert.match(css,/grid-template-columns:84px minmax\(0,1fr\);grid-template-rows:40px 44px/);
 assert.doesNotMatch(css,/\.card-art\{[^}]*aspect-ratio:auto/);
 assert.doesNotMatch(css,/\.portrait\{[^}]*aspect-ratio:auto/);
});

test('场景信息恢复合理尺寸，手牌预览不再露出被裁切的正文',()=>{
 assert.match(css,/#sceneTitle\{[^}]*font-size:30px/);
 assert.match(css,/#sceneDescription\{font-size:12px/);
 assert.match(css,/\.scene-readout\{display:block;max-width:360px/);
 assert.match(css,/\.map-node\{width:clamp\(110px,22%,160px\)/);
 assert.doesNotMatch(css,/\.cbody\{[^}]*display:block/);
 assert.match(html,/aria-label="\$\{c.name\}[^\n]*\$\{c.text\}/);
});

test('阶段数字保持正向，按钮与手牌箭头使用同一组方形图标',()=>{
 assert.match(css,/\.phase \.step\{[^}]*transform:none/);
 assert.match(css,/\.phase \.step::before\{[^}]*transform:rotate\(45deg\)/);
 assert.match(css,/\.ui-icon\{width:20px;height:20px;aspect-ratio:1/);
 assert.match(css,/\.topstats>\.icon-button\{width:40px;height:40px;min-height:40px/);
 const nav=html.split('class="board-hand-nav"')[1].split('</div>')[0];
 assert.match(nav,/assets\/icons\/ui.svg#back/);assert.match(nav,/assets\/icons\/ui.svg#next/);
});
