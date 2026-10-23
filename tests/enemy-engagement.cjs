const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),timers=new Map(),events={};let seq=0,now=0;
 const doc={hidden:false,activeElement:null,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node(''),querySelector(selector){return selector==='dialog[open]'?[...nodes.values()].find(n=>n.open)||null:null},addEventListener(type,fn){events[type]=fn},dispatchEvent(e){events[e.type]?.(e)}};
 function node(id){const classes=new Set();return{id,innerHTML:'',textContent:'',style:{setProperty(k,v){this[k]=v}},dataset:{},children:[],isConnected:true,open:false,hidden:id==='tutorial',listeners:{},classList:{add(...v){v.forEach(c=>classes.add(c))},remove(...v){v.forEach(c=>classes.delete(c))},contains:c=>classes.has(c),toggle(c,force){if(force)classes.add(c);else classes.delete(c)}},setAttribute(k,v){this[k]=v},appendChild(n){this.children.push(n)},addEventListener(type,fn){this.listeners[type]=fn},focus(){doc.activeElement=this},showModal(){this.open=true;this.shows=(this.shows||0)+1},close(){if(this.open){this.open=false;this.listeners.close?.()}},closest:()=>null};}
 const ctx=vm.createContext({document:doc,Math:Object.create(Math),Event:class{constructor(type){this.type=type}},addEventListener(type,fn){events[type]=fn},setTimeout(fn,ms){timers.set(++seq,{fn,at:now+ms});return seq},clearTimeout(id){timers.delete(id)}});ctx.window=ctx;
 const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
 run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'enemy-engagement.js'),'utf8'));run('startGame();S.enemies=[];S.hand=[];S.assets=[];S.chaos=[{label:"0",mod:0}]');doc.activeElement=doc.getElementById('menuButton');
 return{run,get,doc,timers,events,el:id=>doc.getElementById(id),tick(ms=0){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}},spawn(){run("S.encounter=[{...ENCOUNTER[0]}];drawEncounter();render()")},close(){doc.getElementById('enemyEngagementConfirm').listeners.click()}};
}
test('新怪物交缠后显示名称、小图与实际攻击数值，无自动关闭计时',()=>{
 const g=setup();g.spawn();const before=g.get('S');g.tick();const d=g.el('enemyEngagementDialog');assert.equal(d.open,true);assert.equal(g.el('enemyEngagementTitle').textContent,'食尸鬼·仆人');assert.match(g.el('enemyEngagementAttack').textContent,/1 伤害、1 恐惧/);assert.ok(g.el('enemyEngagementArt').classList.contains('art'));assert.equal(g.el('enemyEngagementArt').style['--art-x'],'100%');assert.match(g.el('enemyEngagementArt')['aria-label'],/食尸鬼/);assert.equal(g.timers.size,0);g.tick(60000);assert.equal(d.open,true);assert.deepEqual(g.get('S'),before);g.close();assert.equal(d.open,false);assert.equal(g.doc.activeElement.id,'menuButton');
});
test('同次交缠反复重绘不再提示，解除后重新交缠会再次提示',()=>{
 const g=setup();g.spawn();g.tick();g.close();g.run('render();renderEnemies();render()');g.tick();assert.equal(g.el('enemyEngagementDialog').shows,1);
 g.run('S.enemies[0].engaged=false;S.enemies[0].exhausted=true;render();S.enemies[0].exhausted=false;engageLocalEnemies();render()');g.tick();assert.equal(g.el('enemyEngagementDialog').shows,2);
});
test('其它地点、游荡、未就绪的怪物不会弹出误导警告',()=>{
 const g=setup();g.run("S.enemies=[{card:{...ENCOUNTER[0]},hp:2,location:'hallway',engaged:false,exhausted:false}];render()");g.tick();assert.equal(g.el('enemyEngagementDialog').open,false);
 g.run("S.enemies[0].location='study';S.enemies[0].engaged=true;S.enemies[0].exhausted=true;render()");g.tick();assert.equal(g.el('enemyEngagementDialog').open,false);assert.equal(g.timers.size,0);
 g.run('S.enemies[0].exhausted=false;render()');g.tick();assert.equal(g.el('enemyEngagementDialog').open,true);
});
test('检定、阶段提示与其它弹窗完成前不覆盖，完成后再手动阅读',()=>{
 for(const block of ['test','phase','modal','dialog','chapter']){
  const g=setup();if(block==='test')g.run("startTest('int',0,'测试',()=>{})");if(block==='phase')g.run('phaseTransitionActive=true');if(block==='modal')g.run("openModal('原弹窗')");if(block==='dialog')g.el('handCardDialog').open=true;if(block==='chapter')g.run('S.chapterIntro=true');
  g.spawn();g.tick();assert.equal(g.el('enemyEngagementDialog').open,false,block);
  if(block==='test')g.run('resolveTest();finishTest(true)');if(block==='phase')g.run('phaseTransitionActive=false');if(block==='modal')g.run('closeModal()');if(block==='dialog')g.el('handCardDialog').open=false;if(block==='chapter')g.run('S.chapterIntro=false');g.tick(200);assert.equal(g.el('enemyEngagementDialog').open,true,block);
 }
});
test('多个交缠怪物依次提示，一次关闭只确认当前怪物',()=>{
 const g=setup();g.spawn();g.run('S.encounter=[{...ENCOUNTER[2]}];drawEncounter();render()');g.tick();assert.equal(g.el('enemyEngagementTitle').textContent,'食尸鬼·仆人');g.close();g.tick();assert.equal(g.el('enemyEngagementTitle').textContent,'食尸鬼·猎手');assert.equal(g.el('enemyEngagementDialog').open,true);g.close();g.tick();assert.equal(g.el('enemyEngagementDialog').open,false);assert.equal(g.timers.size,0);
});
test('新游戏、返回菜单、失败结局清除弹窗和旧回调',()=>{
 for(const mode of ['start','menu','defeat']){
  const g=setup();g.spawn();const old=[...g.timers.values()][0].fn;if(mode==='start')g.run('startGame()');if(mode==='menu')g.run('requestReturnMenu();confirmReturnMenu()');if(mode==='defeat')g.run("resolve('R2','测试失败')");old();assert.equal(g.el('enemyEngagementDialog').open,false,mode);assert.equal(g.timers.size,0,mode);
 }
 const g=setup();g.spawn();g.tick();g.run('startGame()');assert.equal(g.el('enemyEngagementDialog').open,false);
});
test('等待期间怪物被移除或解除交缠，不再弹出过期提示',()=>{
 for(const remove of [true,false]){const g=setup();g.spawn();g.run(remove?'S.enemies=[];render()':'S.enemies[0].engaged=false;render()');g.tick();assert.equal(g.el('enemyEngagementDialog').open,false);assert.equal(g.timers.size,0)}
});
test('名称纯文本展示，未知怪物使用名称字标，不会套用食尸鬼图',()=>{
 const g=setup();g.spawn();g.run("S.enemies[0].card.name='<img src=x>';render()");g.tick();assert.equal(g.el('enemyEngagementTitle').textContent,'<img src=x>');assert.equal(g.el('enemyEngagementTitle').innerHTML,'');assert.equal(g.el('enemyEngagementArt').classList.contains('art'),false);g.el('enemyEngagementClose').listeners.click();assert.equal(g.el('enemyEngagementDialog').open,false);
});
test('搜索食尸鬼及下一幕窖室守门者均显示对应怪物提示',()=>{
 const g=setup();g.run("S.encounter=[{...ENCOUNTER[0]}];S.encounterDiscard=[];drawSearchedGhoul('ghoul1');render()");g.tick();assert.equal(g.el('enemyEngagementDialog').open,true);
 const h=setup();h.run("S.actIdx=1;S.location='attic';finish();continueChapter();beginChapter();doMove('cellar')");h.tick();assert.equal(h.el('enemyEngagementTitle').textContent,h.get('CELLAR_GUARD.name'));assert.ok(h.el('enemyEngagementArt').classList.contains('art'));
});
test('弹窗展示不会重复播放怪物音效，关闭和刷新也不重复扣血',()=>{
 const g=setup();g.run('let cues=[];playGameSfx=name=>cues.push(name)');g.spawn();g.tick();const hp=g.get('[S.hp,S.sanity,S.actions]');g.close();g.run('render()');g.tick();assert.deepEqual(g.get('cues'),['ghoul']);assert.deepEqual(g.get('[S.hp,S.sanity,S.actions]'),hp);
});
test('弹窗与资源已接入，移动端可滚动且按钮可键盘访问',()=>{
 assert.match(html,/enemy-engagement.js\?v=1/);assert.match(html,/enemy-engagement.css\?v=1/);assert.match(html,/<dialog id="enemyEngagementDialog"[^>]*aria-labelledby="enemyEngagementTitle"/);assert.match(html,/<button id="enemyEngagementConfirm" type="button"/);const css=fs.readFileSync(path.join(root,'enemy-engagement.css'),'utf8');assert.match(css,/100dvh/);assert.match(css,/overflow:auto/);assert.match(css,/:focus-visible/);assert.ok(fs.existsSync(path.join(root,'assets/images/noir-atlas.webp')));
});
