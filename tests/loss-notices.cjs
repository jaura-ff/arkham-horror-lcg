const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup({popover=true}={}){
  const nodes=new Map(),timers=new Map();let now=0,seq=0;
  const doc={activeElement:{id:'original'},getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node('')};
  function node(id){const classes=new Set(),n={id,hidden:id==='lossNotice',innerHTML:'',textContent:'',style:{},dataset:{},classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},appendChild(){}};if(popover){n.showPopover=()=>{n.showing=true};n.hidePopover=()=>{n.showing=false}}return n;}
  const context=vm.createContext({document:doc,Math:Object.create(Math),setTimeout(fn,delay){const id=++seq;timers.set(id,{fn,at:now+delay});return id},clearTimeout:id=>timers.delete(id)});context.window=context;
  const run=code=>vm.runInContext(code,context),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'loss-notices.js'),'utf8'));run(`startGame();S.hand=[];S.assets=[];S.enemies=[];S.deck=[{...INVESTIGATOR.deck[0]}];S.chaos=[{label:'0',mod:0}]`);
  function tick(ms){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}}
  return{run,get,tick,timers,doc,el:id=>doc.getElementById(id),amount:()=>doc.getElementById('lossNoticeAmount').textContent};
}
test('生命与理智一起损失显示在同一小提示，3000ms自动关闭',()=>{
  const g=setup();g.run(`applyPlayerLoss(2,1,'敌人攻击')`);assert.equal(g.amount(),'生命 −2 · 理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'敌人攻击');assert.equal(g.el('lossNotice').hidden,false);assert.deepEqual(g.get('[S.hp,S.sanity]'),[7,4]);
  g.tick(2999);assert.equal(g.el('lossNotice').hidden,false);g.tick(1);assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);
});
test('每次受伤排队独立提示，重复渲染不重复或延长通知',()=>{
  const g=setup();g.run(`applyPlayerLoss(1,0,'第一击');applyPlayerLoss(2,0,'第二击');applyPlayerLoss(0,1,'恐惧');render();render()`);
  assert.equal(g.amount(),'生命 −1');assert.equal(g.timers.size,1);g.tick(3000);assert.equal(g.amount(),'生命 −2');assert.equal(g.el('lossNoticeSource').textContent,'第二击');g.tick(3000);assert.equal(g.amount(),'理智 −1');g.tick(3000);assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);
});
test('敌人攻击与借机攻击均显示生命和理智的实际损失',()=>{
  for(const reason of ['攻击','借机攻击']){const g=setup();g.run(`takeEnemyHit({card:{name:'测试敌人',dmg:2,horror:1}},'${reason}')`);assert.equal(g.amount(),'生命 −2 · 理智 −1');assert.equal(g.el('lossNoticeSource').textContent,`测试敌人 · ${reason}`);}
});
test('弱点与牌组耗尽的精神损失均提示',()=>{
  const g=setup();g.run(`S.deck=[{...INVESTIGATOR.deck.find(c=>c.id==='nightmare')}];drawCards(1)`);assert.equal(g.amount(),'理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'缠身梦魇');g.tick(3000);
  g.run(`S.deck=[];S.discard=[{...INVESTIGATOR.deck[0]}];drawCards(1)`);assert.equal(g.amount(),'理智 −1');assert.match(g.el('lossNoticeSource').textContent,/牌组耗尽/);
});
test('混沌符号导致的伤害及恐惧提示，不重复结算',()=>{
  const g=setup();g.run(`startTest('int',2,'测试',()=>{});resolveChaosTokens=()=>({damage:2,horror:1,failHorror:0,mod:0,autofail:false,label:'测试',searchGhoul:false});resolveTest();resolveTest()`);assert.equal(g.amount(),'生命 −2 · 理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'混沌符号效果');assert.deepEqual(g.get('[S.hp,S.sanity]'),[7,4]);assert.equal(g.timers.size,1);
});
test('恐惧低语检定失败的理智损失有提示，成功不提示',()=>{
  for(const success of [true,false]){const g=setup();g.run(`S.chaos=[{label:'修正',mod:${success?0:-5}}];S.encounter=[{id:'whisper-test',name:'恐惧低语',type:'treachery'}];drawEncounter();resolveTest();finishTest(S.testResult)`);assert.equal(g.el('lossNotice').hidden,success);if(!success){assert.equal(g.amount(),'理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'恐惧低语');}}
});
test('提示实际扣除值而非溢出伤害，致命伤后结局与提示同时保留',()=>{
  const g=setup();g.run(`S.hp=1;S.sanity=1;takeEnemyHit({card:{name:'重击',dmg:8,horror:9}},'攻击')`);assert.equal(g.amount(),'生命 −1 · 理智 −1');assert.equal(g.get('S.gameOver'),true);assert.equal(g.el('modal').classList.contains('open'),true);assert.equal(g.el('lossNotice').hidden,false);
});
test('治疗、零伤害与普通渲染不产生掉血提示',()=>{
  const g=setup();g.run(`S.hp=4;applyEvent({id:'aid'});applyPlayerLoss(0,0);applyPlayerLoss(-1,-1);render()`);assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);assert.equal(g.get('S.hp'),6);
});
test('通知不抢焦点、不改变状态或阻挡下一行动，无Popover支持仍可显示',()=>{
  for(const popover of [true,false]){const g=setup({popover});g.run('applyPlayerLoss(1,0)');const before=g.get('S');g.tick(3000);assert.deepEqual(g.get('S'),before);assert.equal(g.doc.activeElement.id,'original');g.run('resource()');assert.equal(g.get('S.resources'),6);assert.equal(g.get('S.actions'),2);}
  const css=fs.readFileSync(path.join(root,'loss-notices.css'),'utf8');assert.match(css,/position:fixed/);assert.match(css,/pointer-events:none/);assert.match(html,/popover="manual" role="status" aria-live="polite"/);
});
test('新游戏和返回菜单清理通知队列，旧回调不会影响新提示',()=>{
  const g=setup();g.run(`applyPlayerLoss(1,0);applyPlayerLoss(2,0)`);const old=[...g.timers.values()][0].fn;g.run(`startGame();applyPlayerLoss(0,1,'新游戏')`);old();assert.equal(g.amount(),'理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'新游戏');assert.equal(g.timers.size,1);
  g.run('requestReturnMenu();confirmReturnMenu()');assert.equal(g.get('S'),null);assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);
});
test('原因文字以纯文本显示，不解析HTML',()=>{
  const g=setup();g.run(`applyPlayerLoss(1,0,'<img src=x onerror=alert(1)>')`);assert.equal(g.el('lossNoticeSource').textContent,'<img src=x onerror=alert(1)>');assert.equal(g.el('lossNoticeSource').innerHTML,'');
});
