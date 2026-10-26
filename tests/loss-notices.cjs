const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup({popover=true}={}){
  const nodes=new Map(),timers=new Map();let now=0,seq=0;
  const doc={activeElement:{id:'original'},listeners:{},addEventListener(k,fn,capture){this.listeners[k]={fn,capture}},getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node('')};
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
test('维持抽弱点的伤害提示标记发生阶段，进入神话也不会被误标为遭遇损失',()=>{
 const g=setup();g.run("S.phase='upkeep';S.deck=[{...INVESTIGATOR.deck.find(c=>c.id==='nightmare')}];upkeepPhase();S.phase='mythos';S.encounter=[{...ENCOUNTER[0]}];mythosPhase()");
 assert.equal(g.amount(),'理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'缠身梦魇');assert.match(g.el('lossNoticePhase').textContent,/维持阶段/);assert.equal(g.get('S.sanity'),4);
});

test('排队损失保留各自发生阶段，重开清空阶段记录',()=>{
 const g=setup();g.run("S.phase='upkeep';applyPlayerLoss(0,1,'弱点');S.phase='mythos';applyPlayerLoss(0,1,'恐惧低语')");assert.match(g.el('lossNoticePhase').textContent,/维持阶段/);
 g.tick(3000);assert.match(g.el('lossNoticePhase').textContent,/神话阶段/);assert.equal(g.el('lossNoticeSource').textContent,'恐惧低语');g.run('resetLossNotices()');assert.equal(g.el('lossNoticePhase').textContent,'');
});

test('混沌符号导致的伤害及恐惧提示，不重复结算',()=>{
  const g=setup();g.run(`startTest('int',2,'测试',()=>{});resolveChaosTokens=()=>({damage:2,horror:1,failHorror:0,mod:0,autofail:false,label:'测试',searchGhoul:false});resolveTest();resolveTest()`);assert.equal(g.amount(),'生命 −2 · 理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'混沌指示物「测试」');assert.deepEqual(g.get('[S.hp,S.sanity]'),[7,4]);assert.equal(g.timers.size,1);
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
test('生命、理智与同时受损使用不同图示类型，对应状态条高亮',()=>{
 for(const [hp,sanity,kind,title] of [[1,0,'hp','遭受伤害'],[0,1,'sanity','精神受创'],[1,1,'both','生命与理智受损']]){
  const g=setup();g.run(`applyPlayerLoss(${hp},${sanity},'测试')`);assert.equal(g.el('lossNotice').dataset.kind,kind);assert.equal(g.el('lossNoticeTitle').textContent,title);
  assert.equal(g.el('investigator').classList.contains('is-loss-hp'),hp>0);assert.equal(g.el('investigator').classList.contains('is-loss-sanity'),sanity>0);
  assert.ok(g.el('lossNotice').classList.contains('loss-enter'));g.tick(3000);assert.equal(g.el('investigator').classList.contains('is-loss-hp'),false);assert.equal(g.el('investigator').classList.contains('is-loss-sanity'),false);
 }
});
test('连续伤害使用每次扣除后的剩余值快照，不被后续扣血或治疗覆盖',()=>{
 const g=setup();g.run("applyPlayerLoss(2,0,'第一击');applyPlayerLoss(1,1,'第二击');S.hp=9;S.sanity=5");
 assert.equal(g.el('lossNoticeRemaining').textContent,'剩余生命 7');g.tick(3000);assert.equal(g.el('lossNoticeRemaining').textContent,'剩余生命 6　/　剩余理智 4');
});
test('Popover调用抛错不影响实际扣血、后续渲染和通知清理',()=>{
 const g=setup();g.el('lossNotice').showPopover=()=>{throw Error('unavailable')};g.el('lossNotice').hidePopover=()=>{throw Error('unavailable')};
 g.run('applyPlayerLoss(1,0);render()');assert.equal(g.get('S.hp'),8);assert.equal(g.el('lossNotice').hidden,false);g.run('resetLossNotices()');assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);
});
test('视觉反馈居中放大、带图标，支持减少动态效果且不拦截操作',()=>{
 const css=fs.readFileSync(path.join(root,'loss-notices.css'),'utf8');assert.match(css,/left:50%/);assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/pointer-events:none/);
 assert.match(html,/class="loss-heart"/);assert.match(html,/class="loss-mind"/);assert.match(html,/data-vital="hp"/);assert.match(html,/data-vital="sanity"/);
 assert.match(html,/loss-notices.js\?v=phase-source-5/);assert.match(html,/loss-notices.css\?v=return-trail-3/);
});
function motion(g,{reduced=false,fail=false}={}){
 const animations=[],ghosts=[],targets=[];g.run('window.matchMedia=()=>({matches:false})');if(reduced)g.run('window.matchMedia=()=>({matches:true})');
 const animate=(frames,options)=>{if(fail)throw Error('animation unavailable');const a={frames,options,cancelled:false,cancel(){this.cancelled=true}};animations.push(a);return a;};
 const rect={left:400,top:100,width:360,height:150};g.el('lossNotice').getBoundingClientRect=()=>rect;g.el('lossNotice').animate=animate;
 const panel=g.el('investigator');panel.getBoundingClientRect=()=>({left:20,top:120,width:180,height:240});panel.animate=animate;
 panel.querySelector=selector=>{targets.push(selector);return {getBoundingClientRect:()=>({left:30,top:selector.includes('hp')?220:260,width:160,height:20}),animate}};
 g.doc.body={appendChild(ghost){ghosts.push(ghost)}};
 g.el('lossNotice').cloneNode=()=>({classList:{add(){}},hidden:false,setAttribute(){},removeAttribute(){},querySelectorAll:()=>[],showPopover(){},hidePopover(){},animate,removed:false,remove(){this.removed=true}});
 return {animations,ghosts,targets};
}
test('停留三秒后沿弧线收拢飞向状态条，三道延迟拖尾和本体全部清理',()=>{
 const g=setup(),m=motion(g);g.run("applyPlayerLoss(2,0,'攻击')");const state=g.get('S');g.tick(3000);
 assert.equal(g.el('lossNotice').hidden,false);assert.ok(g.el('lossNotice').classList.contains('loss-flying'));assert.deepEqual(m.targets,['[data-vital="hp"]']);
 assert.equal(m.ghosts.length,3);assert.equal(m.animations.length,4);assert.equal(m.animations[3].options.duration,720);assert.ok(m.animations[0].options.delay>0);
 assert.match(m.animations[3].frames.at(-1).transform,/-470px/);g.tick(839);assert.equal(g.el('lossNotice').hidden,false);g.tick(1);
 assert.equal(g.el('lossNotice').hidden,true);assert.ok(m.ghosts.every(x=>x.removed));assert.ok(m.animations.slice(0,4).every(a=>a.cancelled));assert.equal(m.animations.length,5);assert.deepEqual(g.get('S'),state);
});
test('理智损失落向理智条，同时受损汇入人物牌，排队期间不会抢占当前飞行',()=>{
 for(const [hp,sanity,selector]of [[0,1,'[data-vital="sanity"]'],[1,1,null]]){
  const g=setup(),m=motion(g);g.run(`applyPlayerLoss(${hp},${sanity});applyPlayerLoss(1,0,'后续攻击')`);g.tick(3000);
  assert.deepEqual(m.targets,selector?[selector]:[]);assert.notEqual(g.el('lossNoticeSource').textContent,'后续攻击');g.tick(840);assert.equal(g.el('lossNoticeSource').textContent,'后续攻击');assert.equal(g.timers.size,1);
 }
});
test('新游戏取消飞行和拖尾，旧退场回调不能隐藏新通知',()=>{
 const g=setup(),m=motion(g);g.run('applyPlayerLoss(1,0)');g.tick(3000);const old=[...g.timers.values()][0].fn;
 g.run("startGame();applyPlayerLoss(0,1,'新局')");old();assert.equal(g.amount(),'理智 −1');assert.equal(g.el('lossNoticeSource').textContent,'新局');assert.equal(g.el('lossNotice').hidden,false);
 assert.ok(m.ghosts.every(x=>x.removed));assert.ok(m.animations.every(x=>x.cancelled));assert.equal(g.timers.size,1);
});
test('减少动态效果或动画API报错时安全退场，不留下幽灵节点',()=>{
 for(const config of [{reduced:true},{fail:true}]){
  const g=setup(),m=motion(g,config);g.run('applyPlayerLoss(1,0)');g.tick(3000);assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);assert.ok(m.ghosts.every(x=>x.removed));
 }
});

test('点击继续可在三秒前收起伤害提示，保留人物状态条拖尾',()=>{
 const g=setup(),m=motion(g);g.run('applyPlayerLoss(1,1)');g.tick(200);const state=g.get('S');
 assert.equal(g.doc.listeners.click.capture,true);g.doc.listeners.click.fn({target:{closest:()=>({disabled:false})}});
 assert.ok(g.el('lossNotice').classList.contains('loss-flying'));assert.equal(m.ghosts.length,3);assert.equal(g.timers.size,1);
 g.tick(840);assert.equal(g.el('lossNotice').hidden,true);assert.ok(m.ghosts.every(n=>n.removed));assert.deepEqual(g.get('S'),state);
});

test('重复点击继续不重播拖尾，旧三秒回调不能干扰下一条提示',()=>{
 const g=setup(),m=motion(g);g.run("applyPlayerLoss(1,0,'第一击');applyPlayerLoss(0,1,'第二击')");const old=[...g.timers.values()][0].fn;
 g.run('dismissPlayerLoss();dismissPlayerLoss()');assert.equal(m.ghosts.length,3);old();assert.equal(m.ghosts.length,3);
 g.tick(840);assert.equal(g.el('lossNoticeSource').textContent,'第二击');old();assert.equal(g.el('lossNoticeSource').textContent,'第二击');assert.equal(g.el('lossNotice').classList.contains('loss-flying'),false);assert.equal(g.timers.size,1);
});

test('无关或禁用按钮不收起，键盘触发的继续点击也可收起',()=>{
 const g=setup();g.run('applyPlayerLoss(1,0)');const click=g.doc.listeners.click.fn;
 click({target:{closest:()=>null}});click({target:{closest:()=>({disabled:true})}});assert.equal(g.el('lossNotice').hidden,false);
 click({detail:0,target:{closest:()=>({disabled:false})}});assert.equal(g.el('lossNotice').hidden,true);assert.equal(g.timers.size,0);
});

test('先收起当前提示后，本次继续造成的新伤害仍正常显示',()=>{
 const g=setup();g.run("applyPlayerLoss(1,0,'旧伤害')");g.doc.listeners.click.fn({target:{closest:()=>({disabled:false})}});
 g.run("applyPlayerLoss(0,2,'继续后的伤害')");assert.equal(g.el('lossNoticeSource').textContent,'继续后的伤害');assert.equal(g.amount(),'理智 −2');assert.equal(g.el('lossNotice').hidden,false);g.tick(2999);assert.equal(g.el('lossNotice').hidden,false);g.tick(1);assert.equal(g.el('lossNotice').hidden,true);
});

test('减少动态效果时点击继续直接收起，重开后不受旧回调影响',()=>{
 const g=setup();motion(g,{reduced:true});g.run('applyPlayerLoss(1,0)');const old=[...g.timers.values()][0].fn;g.run('dismissPlayerLoss()');assert.equal(g.el('lossNotice').hidden,true);
 g.run("startGame();applyPlayerLoss(0,1,'新局')");old();assert.equal(g.el('lossNoticeSource').textContent,'新局');assert.equal(g.el('lossNotice').hidden,false);assert.equal(g.timers.size,1);
});
