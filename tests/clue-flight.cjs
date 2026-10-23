const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup({reduced=false,unsupported=false,popoverError=false,animationError=false}={}){
  const nodes=new Map(),timers=new Map(),effects=[],animations=[],listeners={};let seq=0,now=0;
  const animate=(frames,options)=>{if(animationError)throw Error('animation failure');const a={frames,options,cancelled:false,cancel(){this.cancelled=true}};animations.push(a);return a};
  function node(id){const classes=new Set();return{id,hidden:false,innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(...v){v.forEach(x=>classes.add(x))},remove(...v){v.forEach(x=>classes.delete(x))},contains:x=>classes.has(x)},appendChild(){},setAttribute(){},removeAttribute(){},showPopover(){if(popoverError)throw Error('popover failure')},hidePopover(){},remove(){this.removed=true},getBoundingClientRect:()=>({left:400,top:300,width:100,height:60}),...(unsupported?{}:{animate})}}
  const doc={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)},createElement:()=>node(''),querySelector(selector){if(selector==='#modalBox .test-clue-preview')return this.getElementById('preview');if(selector==='#investigator [data-status="clues"]')return this.getElementById('clueValue');return null},body:{appendChild(n){effects.push(n)}},addEventListener(k,f){listeners[k]=f}};
  doc.getElementById('clueValue').getBoundingClientRect=()=>({left:80,top:200,width:20,height:20});
  const ctx=vm.createContext({document:doc,Math:Object.create(Math),setTimeout(fn,ms){timers.set(++seq,{fn,at:now+ms});return seq},clearTimeout(id){timers.delete(id)},matchMedia:()=>({matches:reduced}),addEventListener(k,f){listeners[k]=f}});ctx.window=ctx;
  const run=code=>vm.runInContext(code,ctx),get=code=>JSON.parse(run(`JSON.stringify(${code})`));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'clue-flight.js'),'utf8'));
  run("startGame();S.hand=[];S.assets=[];S.enemies=[];S.chaos=[{label:'0',mod:0}]");
  return {run,get,doc,effects,animations,timers,listeners,el:id=>doc.getElementById(id),tick(ms){now+=ms;for(const[id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn()}}};
}
test('抽取成功时先不飞，点击继续实际获得线索后飞向人物线索数字',()=>{
  const g=setup();g.run('investigate();resolveTest()');assert.equal(g.get('S.clues'),0);assert.equal(g.effects.length,0);
  g.run('finishTest(true)');assert.equal(g.get('S.clues'),1);assert.equal(g.get('S.locClues.study'),1);assert.equal(g.effects.length,4);assert.equal(g.animations.length,4);
  const main=g.effects[3],motion=g.animations[3];assert.equal(main.style.left,'450px');assert.equal(main.style.top,'330px');assert.match(motion.frames.at(-1).transform,/-360px/);assert.match(motion.frames.at(-1).transform,/-120px/);assert.equal(motion.options.duration,780);assert.deepEqual(g.animations.slice(0,3).map(a=>a.options.delay),[90,60,30]);
  const state=g.get('S');g.run('finishTest(true);render();render()');assert.equal(g.effects.length,4);g.tick(900);assert.ok(g.effects.every(n=>n.removed));assert.equal(g.animations.length,5);assert.equal(g.animations[4].options.duration,420);g.tick(450);assert.equal(g.timers.size,0);assert.ok(g.animations.every(a=>a.cancelled));assert.deepEqual(g.get('S'),state);
});
test('失败、无剩余线索、取消调查均不播放获得动画',()=>{
  for(const mode of ['failure','empty','cancel']){const g=setup();if(mode==='failure')g.run("S.chaos=[{label:'失败',autofail:true}];investigate();resolveTest();finishTest(true)");else if(mode==='empty')g.run('S.locClues.study=0;investigate(false,true);resolveTest();finishTest(true)');else g.run("requestAction('investigate');cancelTest()");assert.equal(g.get('S.clues'),0);assert.equal(g.effects.length,0);assert.equal(g.timers.size,0);}
});
test('显示实际获得数量而非固定加一，动效不修改数据',()=>{const g=setup();g.run("startTest('int',0,'调查',()=>{S.clues+=2;render()});resolveTest();finishTest(true)");assert.equal(g.get('S.clues'),2);assert.equal(g.effects.length,4);g.run('resetClueFlight()');assert.equal(g.get('S.clues'),2)});
test('新局和返回菜单取消拖尾，旧回调不能取消新的飞行',()=>{
  const g=setup();g.run('investigate();resolveTest();finishTest(true)');const old=[...g.timers.values()][0].fn;g.run('startGame();S.enemies=[];S.chaos=[{label:"0",mod:0}];investigate();resolveTest();finishTest(true)');old();assert.ok(g.effects.slice(0,4).every(n=>n.removed));assert.ok(g.effects.slice(4).every(n=>!n.removed));assert.equal(g.timers.size,1);g.run('requestReturnMenu();confirmReturnMenu()');assert.equal(g.get('S'),null);assert.ok(g.effects.every(n=>n.removed));assert.equal(g.timers.size,0);
});
test('减少动态效果、无动画API、接口异常都不影响线索结算且不留节点',()=>{
  for(const config of [{reduced:true},{unsupported:true},{animationError:true},{popoverError:true}]){const g=setup(config);g.run('investigate();resolveTest();finishTest(true)');assert.equal(g.get('S.clues'),1);g.tick(900);g.tick(450);assert.ok(g.effects.every(n=>n.removed));assert.equal(g.timers.size,0);}
});
test('窗口缩放、离开页面或切至后台即时清理',()=>{for(const event of ['resize','pagehide','visibilitychange']){const g=setup();g.run('investigate();resolveTest();finishTest(true)');if(event==='visibilitychange')g.doc.hidden=true;g.listeners[event]();assert.ok(g.effects.every(n=>n.removed));assert.equal(g.timers.size,0)}});
test('目标丢失或隐藏页面不飞行，脚本和样式均接入',()=>{const g=setup();g.el('clueValue').getBoundingClientRect=()=>({width:0,height:0});g.run('investigate();resolveTest();finishTest(true)');assert.equal(g.effects.length,0);g.doc.hidden=true;g.run('showClueGain(1,{x:450,y:330})');assert.equal(g.effects.length,0);assert.match(html,/clue-flight.js\?v=1/);assert.match(html,/clue-flight.css\?v=1/);const css=fs.readFileSync(path.join(root,'clue-flight.css'),'utf8');assert.match(css,/pointer-events:none/);assert.match(css,/prefers-reduced-motion:reduce/)});
