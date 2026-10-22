const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'phase-help.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),events={},timers=new Map();let serial=0,native=false,observer;
 const doc={activeElement:null,getElementById:id=>nodes.get(id),querySelector:()=>native?{}:null,querySelectorAll:()=>[],addEventListener:(key,f)=>events[key]=f};
 function node(id){const n={id,hidden:true,style:{},dataset:{},attrs:{},listeners:{},isConnected:true,inert:false,classList:{contains:()=>false},addEventListener(key,f){this.listeners[key]=f},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},contains:x=>x===n,getBoundingClientRect:()=>({left:20,top:90,bottom:140,width:200,height:180}),closest(){return this.dataset.phase?this:null}};nodes.set(id,n);return n;}
 for(const id of ['game','phasebar','phaseHelp','phaseHelpTitle','phaseHelpText','modal'])node(id);
 const ctx={document:doc,window:{innerWidth:500,innerHeight:400,addEventListener(){}},phaseTransitionActive:false,setTimeout:f=>{timers.set(++serial,f);return serial},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(f){observer=f}observe(){}}};
 vm.runInNewContext(source,ctx);
 return{nodes,events,doc,ctx,node,native:v=>native=v,mutate:()=>observer(),flush(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(f=>f())},enter(phase){const n=node(phase);n.dataset.phase=phase;nodes.get('phasebar').listeners.pointerover({target:n,pointerType:'mouse'});return n}};
}
test('四阶段均为可聚焦原生按钮，说明在缩放游戏外，保留唯一当前阶段标记',()=>{
 assert.match(html,/type="button" class="phase \$\{active\}" data-phase="\$\{p.id\}"/);
 assert.match(html,/aria-current="step"/);assert.match(html,/id="phaseHelp" role="tooltip" hidden/);
 assert.match(html,/phase-help.css\?v=hover-1/);assert.match(html,/phase-help.js\?v=hover-1/);
});
test('悬停显示对应规则，移开隐藏；不推进阶段或改变游戏状态',()=>{
 const g=setup(),tip=g.nodes.get('phaseHelp');
 for(const [phase,rule] of [['mythos','首回合开局跳过'],['investigation','3 次行动'],['enemy','没有敌人时也会经过'],['upkeep','自动弃至 8 张']]){
  const n=g.enter(phase);assert.equal(tip.hidden,false);assert.ok(g.nodes.get('phaseHelpText').textContent.includes(rule));assert.equal(n.attrs['aria-describedby'],'phaseHelp');
  g.nodes.get('phasebar').listeners.pointerout({relatedTarget:null});g.flush();assert.equal(tip.hidden,true);assert.equal(n.attrs['aria-describedby'],undefined);
 }
 assert.doesNotMatch(source,/advancePhase\(|requestAction\(|S\.\w+\s*=|\.focus\(/);
});
test('移入说明可继续阅读，Escape可关闭，键盘聚焦和手机点击均可查看',()=>{
 const g=setup(),n=g.enter('enemy'),bar=g.nodes.get('phasebar'),tip=g.nodes.get('phaseHelp');
 bar.listeners.pointerout({relatedTarget:null});tip.listeners.pointerenter();g.flush();assert.equal(tip.hidden,false);
 g.events.keydown({key:'Escape'});assert.equal(tip.hidden,true);
 g.doc.activeElement=n;bar.listeners.focusin({target:n});assert.equal(tip.hidden,false);
 g.doc.activeElement=null;bar.listeners.focusout({relatedTarget:null});g.flush();assert.equal(tip.hidden,true);
 bar.listeners.click({target:n});assert.equal(tip.hidden,false);
 g.events.pointerdown({target:g.nodes.get('game')});assert.equal(tip.hidden,true);
});
test('弹窗、阶段倒计时、菜单、教学时不叠加；重绘移除触发点时清除旧说明',()=>{
 for(const block of [g=>g.native(true),g=>g.ctx.phaseTransitionActive=true,g=>g.nodes.get('game').inert=true,g=>g.nodes.get('game').style.display='none']){
  const g=setup();block(g);g.enter('upkeep');assert.equal(g.nodes.get('phaseHelp').hidden,true);
 }
 const g=setup(),n=g.enter('enemy');n.isConnected=false;g.mutate();assert.equal(g.nodes.get('phaseHelp').hidden,true);
 g.enter('enemy');g.native(true);g.mutate();assert.equal(g.nodes.get('phaseHelp').hidden,true);
});
test('浮层位置限制在视口内，窄屏不横向溢出',()=>{
 const g=setup();g.enter('enemy');const tip=g.nodes.get('phaseHelp');assert.ok(parseFloat(tip.style.left)>=12);assert.ok(parseFloat(tip.style.top)>=12);
 const css=fs.readFileSync(path.join(root,'phase-help.css'),'utf8');assert.match(css,/position:fixed/);assert.match(css,/max-width:calc\(100vw - 24px\)/);assert.match(css,/#phaseHelp\[hidden\]\{display:none\}/);
});
