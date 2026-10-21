const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'game-header.js'),'utf8'),css=fs.readFileSync(path.join(root,'game-header.css'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),events={};let otherDialog=false;
 function node(id){const classes=new Set();const n={id,style:{},inert:false,isConnected:true,open:false,scrollTop:0,shows:0,listeners:{},classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},addEventListener(k,f){this.listeners[k]=f},focus(){doc.activeElement=this},showModal(){this.open=true;this.shows++},close(){this.open=false;this.listeners.close?.()}};nodes.set(id,n);return n;}
 const doc={activeElement:null,getElementById:id=>nodes.get(id),querySelector:()=>otherDialog?{}:null,addEventListener(k,f){events[k]=f}};
 for(const id of ['gameSettingsButton','gameSettingsDialog','gameSettingsClose','game','modal','startButton','soundToggle','soundVolume','ambientToggle'])node(id);
 nodes.get('game').style.display='block';const state={actions:3,resources:5};const context={document:doc,S:state,phaseTransitionActive:false};vm.runInNewContext(source,context);
 return{doc,nodes,events,context,state,click:()=>nodes.get('gameSettingsButton').listeners.click(),native:value=>{otherDialog=value}};
}
test('顶栏留出页面边距，操作和状态分行，不再塞进44像素窄行',()=>{
 assert.match(css,/padding: max\(16px,env\(safe-area-inset-top\)\)/);assert.match(css,/grid-template-rows:96px minmax\(0,1fr\)/);assert.match(css,/grid-template-rows:44px 24px;gap:8px/);assert.match(css,/header-actions\{[^}]*gap:10px/);assert.match(css,/header-status\{[^}]*gap:22px/);assert.match(css,/icon-button\{width:44px;height:44px/);
 const header=html.split('<header class="topbar">')[1].split('</header>')[0];assert.match(header,/<nav class="header-actions"/);assert.match(header,/class="header-status"/);assert.doesNotMatch(header,/type="range"|id="soundToggle"|id="ambientToggle"/);
});
test('声音原控件只存在一份且位于独立弹窗，主页和音频引擎仍可按原ID访问',()=>{
 const dialog=html.split('<dialog id="gameSettingsDialog"')[1].split('</dialog>')[0];
 for(const id of ['soundToggle','soundVolume','ambientToggle','soundStatus']){assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);assert.ok(dialog.includes(`id="${id}"`));}
 assert.match(html,/aria-controls="gameSettingsDialog"/);assert.match(html,/game-header.css\?v=spacious-1/);assert.match(html,/game-header.js\?v=spacious-1/);
 assert.match(css,/sound-controls input\{width:100%;min-height:44px/);assert.match(css,/sound-controls label[^}]*position:static/);assert.doesNotMatch(source,/\.click\(|playGameSfx|AudioContext|\.volume\s*=/);
});
test('点击声音设置打开原生弹窗，返回或原生Escape关闭时恢复入口焦点',()=>{
 const g=setup();g.click();const dialog=g.nodes.get('gameSettingsDialog');assert.equal(dialog.open,true);assert.equal(g.doc.activeElement.id,'gameSettingsClose');g.nodes.get('gameSettingsClose').listeners.click();assert.equal(dialog.open,false);assert.equal(g.doc.activeElement.id,'gameSettingsButton');g.click();dialog.close();assert.equal(g.doc.activeElement.id,'gameSettingsButton');
});
test('教学、菜单、阶段提示或其他弹窗期间不叠加设置窗口',()=>{
 const conditions=[g=>{g.nodes.get('game').inert=true},g=>{g.nodes.get('game').style.display='none'},g=>{g.context.phaseTransitionActive=true},g=>{g.nodes.get('modal').classList.add('open')},g=>{g.native(true)}];
 for(const block of conditions){const g=setup();block(g);g.click();assert.equal(g.nodes.get('gameSettingsDialog').shows,0);}
 const g=setup();g.click();g.click();assert.equal(g.nodes.get('gameSettingsDialog').shows,1);
});
test('返回菜单关闭声音窗口，不把焦点拉回隐藏游戏；迟到close不抢新窗口焦点',()=>{
 const g=setup();g.click();g.nodes.get('game').style.display='none';g.nodes.get('startButton').focus();g.events['arkham:menu']();assert.equal(g.nodes.get('gameSettingsDialog').open,false);assert.equal(g.doc.activeElement.id,'startButton');
 g.nodes.get('game').style.display='block';g.click();g.nodes.get('gameSettingsDialog').listeners.close();assert.equal(g.doc.activeElement.id,'gameSettingsClose');
});
test('设置窗口只管理显示，不修改行动、资源或绑定第二套音频处理器',()=>{
 const g=setup(),before=JSON.stringify(g.state);g.click();g.nodes.get('gameSettingsClose').listeners.click();assert.equal(JSON.stringify(g.state),before);for(const id of ['soundToggle','soundVolume','ambientToggle'])assert.equal(Object.keys(g.nodes.get(id).listeners).length,0);
});
