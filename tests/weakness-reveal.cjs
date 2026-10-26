const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function game({presentation=true}={}){
 const nodes=new Map(),timers=new Map(),events={},windowEvents={};let now=0,seq=0;
 function el(id=''){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{id,innerHTML:'',textContent:'',children:[],style:{},dataset:{},listeners:{},open:false,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(n){this.children.push(n)},focus(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false},addEventListener(k,f){this.listeners[k]=f}})}return nodes.get(id)}
 const document={hidden:false,getElementById(id){if(id==='weaknessReveal'&&!el('modalBox').innerHTML.includes('id="weaknessReveal"'))return null;return el(id)},querySelector(){return null},createElement:()=>({innerHTML:'',className:''}),addEventListener(k,f){events[k]=f},dispatchEvent(e){events[e.type]?.(e)}};
 const ctx=vm.createContext({document,Math:Object.create(Math),Event:class{constructor(type){this.type=type}},setTimeout(f,ms){const id=++seq;timers.set(id,{f,at:now+ms});return id},clearTimeout:id=>timers.delete(id),addEventListener(k,f){windowEvents[k]=f}});ctx.window=ctx;
 const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);if(presentation)run(fs.readFileSync(path.join(root,'weakness-reveal.js'),'utf8'));
 run("startGame();S.hand=[];S.assets=[];S.enemies=[];S.deck=[{...INVESTIGATOR.deck.find(c=>c.id==='nightmare')}]");
 return{run,get,el,document,events,windowEvents,timers,tick(ms){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.f()}},box:()=>el('modalBox').innerHTML};
}

test('抽到弱点立即展示卡面和强制规则，2.2秒后才自动扣理智并进入弃牌堆',()=>{
 const g=game();g.run('draw()');assert.match(g.box(),/缠身梦魇/);assert.match(g.box(),/weakness-art/);assert.match(g.box(),/66.6667%/);assert.match(g.box(),/弱点牌必须立即展示并结算/);assert.match(g.box(),/不能留在手牌/);
 assert.deepEqual(g.get('[S.sanity,S.actions,S.hand.length,S.discard.length,S.drawingCards]'),[5,2,0,0,true]);assert.equal(g.get('S.weaknessReveal.id'),'nightmare');
 g.tick(2199);assert.equal(g.get('S.sanity'),5);g.tick(1);assert.deepEqual(g.get('[S.sanity,S.actions,S.hand.length,S.discard.length,S.drawingCards,S.weaknessReveal]'),[4,2,0,1,false,null]);assert.equal(g.get('S.discard[0].id'),'nightmare');assert.equal(g.el('modal').classList.contains('open'),false);assert.equal(g.get('S.playedCards.length'),0);assert.equal(g.timers.size,0);
});

test('展示期间拒绝出牌、移动、关窗、退出、重复抽牌和阶段推进',()=>{
 const g=game();g.run('draw()');const before=g.get('S');g.run("requestAction('resource');draw();resource();requestMove('hallway');requestReturnMenu();endTurn();next();enterPhase();mythosPhase();drawEncounter();upkeepPhase();closeModal();startTest('will',2,'测试',()=>{});drawCards(1)");assert.deepEqual(g.get('S'),before);assert.equal(g.el('modal').classList.contains('open'),true);assert.equal(g.get('canAct()'),false);
 g.tick(2200);assert.equal(g.get('canAct()'),true);
});

test('维持阶段弱点展示结束后才获得资源，不能提前进入神话',()=>{
 const g=game();g.run("S.phase='upkeep';upkeepPhase()");assert.deepEqual(g.get('[S.sanity,S.resources,S.phase]'),[5,5,'upkeep']);g.run('next();next()');assert.equal(g.get('S.phase'),'upkeep');
 g.tick(2200);assert.deepEqual(g.get('[S.sanity,S.resources,S.phase]'),[4,6,'upkeep']);g.run('S.encounter=[];S.encounterDiscard=[];next()');assert.equal(g.get('S.phase'),'mythos');
});

test('实际阶段倒计时进入维持后仍展示弱点，过期阶段回调不提前推进或扣点',()=>{
 const g=game();g.run(fs.readFileSync(path.join(root,'phase-transition.js'),'utf8'));g.run("S.phase='enemy';next()");assert.equal(g.el('phaseAnnouncement').open,true);
 const stale=[...g.timers.values()].map(t=>t.f);g.el('phaseAnnouncementSkip').listeners.click();assert.match(g.box(),/弱点牌必须立即展示并结算/);assert.equal(g.el('modal').classList.contains('open'),true);assert.equal(g.el('phaseAnnouncement').open,false);
 stale.forEach(f=>f());g.run('next();next()');assert.deepEqual(g.get('[S.phase,S.sanity,S.resources]'),['upkeep',5,5]);
 g.tick(2200);assert.deepEqual(g.get('[S.phase,S.sanity,S.resources]'),['upkeep',4,6]);g.run('S.encounter=[];S.encounterDiscard=[];next()');g.el('phaseAnnouncementSkip').listeners.click();assert.equal(g.get('S.phase'),'mythos');
});

test('弱点结算致命时已进入弃牌，维持资源及后续抽牌不再执行',()=>{
 const g=game();g.run("S.phase='upkeep';S.sanity=1;upkeepPhase()");assert.equal(g.get('S.gameOver'),false);g.tick(2200);assert.deepEqual(g.get('[S.gameOver,S.sanity,S.resources,S.discard.length]'),[true,0,5,1]);assert.match(g.box(),/调查失败/);assert.equal(g.timers.size,0);
});

test('连续抽牌遇到多个弱点逐张展示，全部结算后只回调一次',()=>{
 const g=game();g.run("S.deck=[{...INVESTIGATOR.deck[0]},{...INVESTIGATOR.deck.find(c=>c.id==='nightmare'),name:'第二张弱点'},{...INVESTIGATOR.deck.find(c=>c.id==='nightmare')}];let completed=0;drawCards(3,()=>completed++)");
 assert.match(g.box(),/缠身梦魇/);g.tick(2200);assert.equal(g.get('S.sanity'),4);assert.match(g.box(),/第二张弱点/);assert.equal(g.get('S.hand.length'),0);assert.equal(g.get('completed'),0);
 g.tick(2200);assert.deepEqual(g.get('[S.sanity,S.hand.length,S.discard.length,completed]'),[3,1,2,1]);g.tick(10000);assert.equal(g.get('completed'),1);
});

test('过期展示回调不重复扣点，也不会污染新游戏或覆盖失败界面',()=>{
 for(const mode of ['settled','restart','defeat']){
  const g=game();g.run('draw()');const stale=[...g.timers.values()][0].f;
  if(mode==='settled')g.tick(2200);if(mode==='restart')g.run('startGame()');if(mode==='defeat')g.run("resolve('R3','提前失败')");const before=g.get('S'),box=g.box();stale();stale();assert.deepEqual(g.get('S'),before);assert.equal(g.box(),box);assert.equal(g.timers.size,0);
 }
});

test('后台暂停展示倒计时，回到前台仍能看清规则，往返缓存不会卡住抽牌',()=>{
 const g=game();g.run('draw()');g.document.hidden=true;g.events.visibilitychange();g.tick(5000);assert.equal(g.get('S.sanity'),5);assert.equal(g.timers.size,0);
 g.document.hidden=false;g.events.visibilitychange();g.tick(2199);assert.equal(g.get('S.sanity'),5);g.tick(1);assert.equal(g.get('S.sanity'),4);
 const h=game();h.run('draw()');h.windowEvents.pagehide();h.tick(9000);assert.equal(h.get('S.sanity'),5);h.windowEvents.pageshow();h.tick(2200);assert.equal(h.get('S.drawingCards'),false);
});

test('起手过滤弱点不展示也不受伤，普通玩家牌仍即时抽取',()=>{
 const g=game();g.run('startGame()');assert.equal(g.timers.size,0);assert.equal(g.get('S.sanity'),5);assert.equal(g.get('S.hand.some(c=>c.type===\'weak\')'),false);
 g.run('S.deck=[{...INVESTIGATOR.deck[0]}];draw()');assert.equal(g.get('S.drawingCards'),false);assert.equal(g.timers.size,0);assert.equal(g.get('S.hand.length'),6);
});

test('展示模块缺失或异常时也能安全结算，不把弱点留在手牌或卡住流程',()=>{
 for(const mode of ['missing','error']){
  const g=game({presentation:false});if(mode==='error')g.run("revealWeakness=()=>{throw Error('presentation failed')}");g.run('draw()');assert.deepEqual(g.get('[S.sanity,S.hand.length,S.discard.length,S.drawingCards]'),[4,0,1,false]);
 }
});

test('同一弱点的展示完成回调只消费一次，后续阶段不能重复扣理智',()=>{
 const g=game();g.run("let completionCount=0;drawCards(1,()=>completionCount++)");const stale=[...g.timers.values()][0].f;g.tick(2200);stale();stale();g.run("S.phase='mythos';S.encounter=[];S.encounterDiscard=[];mythosPhase()");assert.deepEqual(g.get('[S.sanity,S.discard.length,completionCount]'),[4,1,1]);
});

test('弱点牌名和效果转义，不提供出牌或跳过按钮，减少动态效果可关闭动画',()=>{
 const g=game();g.run("S.deck=[{id:'unknown',name:'<img src=x>',text:'<script>bad</script>',type:'weak'}];draw()");assert.match(g.box(),/&lt;img src=x&gt;/);assert.match(g.box(),/&lt;script&gt;/);assert.doesNotMatch(g.box(),/<script>|<img src=x>|<button/);assert.match(g.box(),/weakness-no-art/);
 const css=fs.readFileSync(path.join(root,'weakness-reveal.css'),'utf8');assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/max-height:440px/);assert.match(html,/weakness-reveal.js\?v=card-art-1/);assert.match(html,/weakness-reveal.css\?v=1/);
});
