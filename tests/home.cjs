const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'home.css'),'utf8'),source=fs.readFileSync(path.join(root,'home-dialogs.js'),'utf8');
test('首页四个小框固定两列，点击不内联展开',()=>{
 const nav=html.match(/<nav class="home-options"[^>]*>([\s\S]*?)<\/nav>/)[1];assert.equal((nav.match(/class="home-tile"/g)||[]).length,4);for(const label of ['难度设置','游戏设置','选择角色','图鉴'])assert.ok(nav.includes(label));assert.doesNotMatch(nav,/<details|<summary/);assert.match(css,/home-options\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('弹窗保留标题确认、原ID唯一、音量代理与横屏焦点适配',()=>{
 for(const id of ['homeDifficultyDialog','homeSettingsDialog','homeCharacterDialog'])assert.match(html,new RegExp('<dialog id="'+id+'" class="home-dialog" aria-labelledby="'+id+'Title">'));for(const id of ['startButton','learnButton','menuAtlasButton','difficultySelect','soundToggle','menuSoundToggle','menuAmbientToggle','menuSoundVolume','atlasConfirm'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);assert.match(html,/id="atlasConfirm"[^>]*>确定/);assert.match(html,/id="learnButton"[^>]*>开始教学/);assert.match(html,/home.css\?v=character-1/);assert.match(html,/home-dialogs.js\?v=character-1/);assert.match(html,/document.getElementById\('soundVolume'\).dispatchEvent/);assert.match(css,/home-dialog\{[^}]*max-height:calc\(100dvh - 32px\)/);assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/orientation:landscape/);
});
function setup(){
 const nodes=new Map(),doc={body:{style:{overflow:'auto'}},activeElement:null,listeners:{},getElementById:id=>get(id),addEventListener(k,fn){this.listeners[k]=fn}};
 function get(id){if(!nodes.has(id)){const button={focus(){doc.activeElement=this},listeners:{},addEventListener(k,fn){this.listeners[k]=fn}};nodes.set(id,{id,open:false,isConnected:true,style:{},listeners:{},scrollTop:99,addEventListener(k,fn){this.listeners[k]=fn},showModal(){this.open=true},close(){this.open=false},focus(){doc.activeElement=this},querySelector(){return button},querySelectorAll(){return[button]},closeButton:button});}return nodes.get(id);}
 const win={};vm.runInNewContext(source,{window:win,document:doc});const click=id=>{doc.activeElement=get(id);get(id).listeners.click()};return{doc,win,get,click};
}
test('三个入口只开对应弹窗，确定和Escape恢复滚动焦点',()=>{
 for(const [button,dialog]of [['menuDifficultyButton','homeDifficultyDialog'],['menuSettingsButton','homeSettingsDialog'],['menuCharacterButton','homeCharacterDialog']]){const g=setup();g.click(button);assert.equal(g.get(dialog).open,true);assert.equal(g.doc.body.style.overflow,'hidden');g.get(dialog).closeButton.listeners.click();assert.equal(g.get(dialog).open,false);assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,button);g.click(button);let prevented=false;g.get(dialog).listeners.cancel({preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(g.get(dialog).open,false);}
});
test('不重复叠加，游戏中和已有图鉴时不打开首页设置',()=>{
 const g=setup();g.click('menuSettingsButton');g.click('menuDifficultyButton');assert.equal(g.get('homeDifficultyDialog').open,false);g.win.closeHomeDialogs();g.get('startOverlay').style.display='none';g.click('menuSettingsButton');assert.equal(g.get('homeSettingsDialog').open,false);g.get('startOverlay').style.display='flex';g.get('cardAtlas').open=true;g.click('menuSettingsButton');assert.equal(g.get('homeSettingsDialog').open,false);
});
test('教学前同步关闭旧弹窗，迟到close不覆盖前序滚动锁',()=>{
 const g=setup();g.click('menuCharacterButton');g.win.closeHomeDialogs();assert.equal(g.doc.body.style.overflow,'auto');g.doc.body.style.overflow='hidden';g.get('homeCharacterDialog').listeners.close();assert.equal(g.doc.body.style.overflow,'hidden');assert.match(fs.readFileSync(path.join(root,'tutorial.js'),'utf8'),/window.closeHomeDialogs\?\.\(\);if\(typeof beginPrologue/);
});
test('原生关闭及返回菜单均清理首页弹窗',()=>{
 const g=setup();g.click('menuDifficultyButton');g.get('homeDifficultyDialog').close();g.get('homeDifficultyDialog').listeners.close();assert.equal(g.doc.body.style.overflow,'auto');g.click('menuSettingsButton');g.doc.listeners['arkham:menu']();assert.equal(g.get('homeSettingsDialog').open,false);assert.equal(g.doc.body.style.overflow,'auto');
});
