const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=fs.readFileSync(path.join(root,'enemy-damage.js'),'utf8');
function game(){
 const nodes=new Map(),enemyNodes=new Map(),timers=new Map(),events={},windowEvents={};let seq=0,now=0;
 function node(id=''){const classes=new Set();return{id,innerHTML:'',textContent:'',style:{},dataset:{},attrs:{},children:[],isConnected:true,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(n){this.children.push(n);n.parent=this},setAttribute(k,v){this.attrs[k]=v},remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this)},focus(){}}}
 function el(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)}
 const doc={hidden:false,body:node('body'),createElement:()=>node(),getElementById:el,addEventListener(k,f){events[k]=f},querySelector(selector){
  const key=selector.match(/\[data-enemy-key="([^"]+)"\]/)?.[1];if(!key)return null;
  const keys=[...el('enemies').innerHTML.matchAll(/data-enemy-key="([^"]+)"/g)].map(m=>m[1]),index=keys.indexOf(key);if(index<0)return null;
  if(!enemyNodes.has(key))enemyNodes.set(key,{getBoundingClientRect(){return this.rect}});
  const n=enemyNodes.get(key);if(!n.fixedRect)n.rect={left:350,top:200+index*90,width:340,height:78};return n;
 }};
 const ctx=vm.createContext({document:doc,Math:Object.create(Math),setTimeout(f,ms){const id=++seq;timers.set(id,{f,at:now+ms});return id},clearTimeout:id=>timers.delete(id),innerWidth:1280,innerHeight:900,addEventListener(k,f){windowEvents[k]=f}});ctx.window=ctx;
 const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(source);
 run("startGame();S.hand=[];S.assets=[];S.enemies=[{card:{...ENCOUNTER[0],hp:4},hp:4,location:'study',engaged:true,exhausted:false}];S.chaos=[{label:'0',mod:0}];render()");
 return{run,get,el,doc,timers,events,windowEvents,enemyNodes,effects:()=>doc.body.children,finish(){run('resolveTest();finishTest(S.testResult)')},tick(ms){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.f()}}};
}

test('攻击预览和检定成功预告不扣血，确认结算后目标怪物出现小型失血提示',()=>{
 const g=game();g.run("requestAction('fight')");assert.equal(g.effects().length,0);g.run('resolveTest()');assert.equal(g.effects().length,0);assert.equal(g.get('S.enemies[0].hp'),4);
 g.run('finishTest(true)');assert.equal(g.get('S.enemies[0].hp'),3);assert.equal(g.effects().length,1);const effect=g.effects()[0];assert.match(effect.innerHTML,/−1 生命/);assert.match(effect.innerHTML,/4 → 3/);assert.equal(effect.style.left,'350px');assert.equal(effect.style.top,'200px');assert.match(effect.attrs['aria-label'],/失去 1 点生命/);
 const state=g.get('S');g.tick(950);assert.equal(g.effects().length,0);assert.deepEqual(g.get('S'),state);assert.equal(g.timers.size,0);
});

test('武器命中显示实际两点伤害，并同步桌面剩余生命',()=>{
 const g=game();g.run("S.assets=[{card:{...INVESTIGATOR.deck.find(c=>c.id==='p45')}}];fight()");g.finish();assert.equal(g.get('S.enemies[0].hp'),2);assert.match(g.effects()[0].innerHTML,/−2 生命/);assert.match(g.effects()[0].innerHTML,/4 → 2/);assert.match(g.el('enemies').innerHTML,/生命 <b>2\/4/);
});

test('击败怪物立即移除游戏对象，原位置仍有短暂死亡反馈，过量伤害不显示负血量',()=>{
 const g=game();g.run("S.enemies[0].hp=1;S.assets=[{card:{...INVESTIGATOR.deck.find(c=>c.id==='p45')}}];render();fight()");g.finish();assert.equal(g.get('S.enemies.length'),0);assert.equal(g.get('S.encounterDiscard.length'),1);
 assert.match(g.effects()[0].className,/is-defeated/);assert.match(g.effects()[0].innerHTML,/−1 生命/);assert.match(g.effects()[0].innerHTML,/1 → 0/);assert.match(g.effects()[0].innerHTML,/已被击败/);assert.equal(g.effects()[0].style.top,'200px');g.tick(950);assert.equal(g.effects().length,0);
});

test('同名同牌ID的多个怪物有独立视觉标识，连续命中只替换同一目标的动效',()=>{
 const g=game();g.run("S.enemies.push({card:{...ENCOUNTER[0],hp:4},hp:4,location:'study',engaged:true,exhausted:false});render();fight()");g.finish();const first=g.effects()[0],firstKey=first.dataset.enemyKey;
 g.run('S.enemies[0].engaged=false;S.enemies[0].exhausted=true;fight()');g.finish();assert.equal(g.effects().length,2);const second=g.effects()[1];assert.notEqual(second.dataset.enemyKey,firstKey);assert.equal(second.style.top,'290px');
 g.run('S.enemies[0].engaged=true;S.enemies[0].exhausted=false;S.enemies[1].engaged=false;fight()');g.finish();assert.equal(first.isConnected,false);assert.equal(second.isConnected,true);assert.equal(g.effects().length,2);assert.equal(g.timers.size,2);assert.deepEqual(g.get('S.enemies.map(e=>e.hp)'),[2,3]);
});

test('击败前排怪物后，失血反馈仍指向旧目标而不是移上来的同名怪物',()=>{
 const g=game();g.run("S.enemies[0].hp=1;S.enemies.push({card:{...ENCOUNTER[0]},hp:2,location:'study',engaged:true,exhausted:false});render();let firstKey=enemyVisualKey(S.enemies[0]),secondKey=enemyVisualKey(S.enemies[1]);fight()");g.finish();assert.equal(g.get('S.enemies.length'),1);assert.equal(g.get('S.enemies[0].hp'),2);assert.equal(g.effects()[0].dataset.enemyKey,g.get('firstKey'));assert.notEqual(g.effects()[0].dataset.enemyKey,g.get('secondKey'));assert.match(g.effects()[0].className,/is-defeated/);
});

test('攻击失败、取消和重复确认不会出现失血特效或重复扣怪物血量',()=>{
 const g=game();g.run("requestAction('fight');cancelTest();S.chaos=[{label:'失败',autofail:true}];fight()");g.finish();assert.equal(g.effects().length,0);assert.equal(g.get('S.enemies[0].hp'),4);
 g.run("S.chaos=[{label:'0',mod:0}];fight()");g.finish();g.run('finishTest(true);resolveTest()');assert.equal(g.effects().length,1);assert.equal(g.get('S.enemies[0].hp'),3);
});

test('窗口滚动、缩放、离开页面、后台或返回菜单均清理特效，不影响战斗结果',()=>{
 for(const kind of ['scroll','resize','pagehide','menu','hidden']){
  const g=game();g.run('fight()');g.finish();const state=g.get('S');if(kind==='menu')g.events['arkham:menu']();else if(kind==='hidden'){g.doc.hidden=true;g.events.visibilitychange()}else g.windowEvents[kind]();assert.equal(g.effects().length,0,kind);assert.equal(g.timers.size,0,kind);assert.deepEqual(g.get('S'),state,kind);
 }
});

test('新游戏与游戏结局清理旧特效，过期回调不污染新状态',()=>{
 for(const kind of ['start','end']){
  const g=game();g.run('fight()');g.finish();const stale=[...g.timers.values()][0].f;g.run(kind==='start'?'startGame()':"resolve('R3','测试失败')");const state=g.get('S');stale();assert.deepEqual(g.get('S'),state);assert.equal(g.effects().length,0);assert.equal(g.timers.size,0);
 }
});

test('怪物在屏幕外或没有合法定位时不把伤害显示到其它怪物，动效报错不阻断结算',()=>{
 const g=game();const key=g.run('enemyVisualKey(S.enemies[0])'),n=g.enemyNodes.get(key)||g.doc.querySelector(`#enemies [data-enemy-key="${key}"]`);n.fixedRect=true;n.rect={left:100,top:1500,width:300,height:70};g.run('fight()');g.finish();assert.equal(g.effects().length,0);assert.equal(g.get('S.enemies[0].hp'),3);
 const h=game();h.run("captureEnemyHitOrigin=()=>{throw Error('capture failed')};showEnemyDamage=()=>{throw Error('effect failed')};fight()");h.finish();assert.equal(h.get('S.enemies[0].hp'),3);assert.equal(h.get('S.test'),null);
});

test('失血反馈只读且转义怪物名，CSS不占布局、不拦截点击并支持减少动态效果',()=>{
 const g=game();g.run("S.enemies[0].card.name='<img src=x>';render();fight()");g.finish();const effect=g.effects()[0];assert.match(effect.attrs['aria-label'],/<img src=x>/);assert.doesNotMatch(effect.innerHTML,/<img src=x>/);
 const state=g.get('S');g.tick(2000);assert.deepEqual(g.get('S'),state);const css=fs.readFileSync(path.join(root,'enemy-damage.css'),'utf8');assert.match(css,/position:fixed/);assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/);assert.doesNotMatch(css,/infinite|#wrap|\.main\s*\{/);assert.match(html,/enemy-damage.js\?v=1/);assert.match(html,/enemy-damage.css\?v=1/);
});
