const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'hand-hover.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),events={},timers=new Map(),winEvents={};let serial=0,native=false,observer;
 const doc={activeElement:null,getElementById:id=>nodes.get(id),querySelector:()=>native?{}:null,querySelectorAll:()=>[],addEventListener:(k,f)=>events[k]=f};
 function node(id){const n={id,hidden:true,style:{setProperty(k,v){this[k]=v}},dataset:{},attrs:{},listeners:{},isConnected:true,inert:false,classList:{contains:()=>false},addEventListener(k,f){this.listeners[k]=f},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]??null},removeAttribute(k){delete this.attrs[k]},contains:x=>x===n,getBoundingClientRect:()=>id==='handHover'?{width:350,height:260}:{left:30,right:150,top:400,bottom:500,width:120,height:100},closest(){return this.dataset.handIndex!==undefined?this:null}};nodes.set(id,n);return n;}
 for(const id of ['game','hand','handHover','handHoverTitle','handHoverType','handHoverEffect','handHoverUsage','handHoverArt','modal'])node(id);
 const cards=[{id:'percep',name:'感知',type:'skill',text:'投入智慧检定：+2 智慧。',cost:0},{id:'p45',name:'.45 自动手枪',type:'asset',text:'战斗 +1',cost:3}];
 const ctx={document:doc,window:{innerWidth:800,innerHeight:600,addEventListener:(k,f)=>winEvents[k]=f},S:{hand:cards,actions:3,resources:5},phaseTransitionActive:false,CARD_USAGE:{percep:'智慧检定前投入，不额外消耗资源或行动。',p45:'花3资源和1行动装备，占1只手槽。'},CARD_ART:{percep:[100,50],p45:[33.3333,0]},setTimeout:f=>{timers.set(++serial,f);return serial},clearTimeout:id=>timers.delete(id),MutationObserver:class{constructor(f){observer=f}observe(){}}};
 const artHelpers=html.slice(html.indexOf('function cardArtStyle('),html.indexOf('const CARD_USAGE ='));
 vm.runInNewContext(artHelpers+source,ctx);
 function card(index){const n=node('card'+index);n.dataset.handIndex=String(index);n.attrs['aria-describedby']='handInteractionHint';return n;}
 return{nodes,events,winEvents,doc,ctx,card,native:v=>native=v,mutate:()=>observer(),flush(){const callbacks=[...timers.values()];timers.clear();callbacks.forEach(f=>f())},enter(n){nodes.get('hand').listeners.pointerover({target:n,pointerType:'mouse'})}};
}
test('悬停显示对应手牌图文，换牌实时更新，保留并恢复原有辅助说明',()=>{
 const g=setup(),a=g.card(0),b=g.card(1),tip=g.nodes.get('handHover');g.enter(a);
 assert.equal(tip.hidden,false);assert.equal(g.nodes.get('handHoverTitle').textContent,'感知');assert.match(g.nodes.get('handHoverType').textContent,/技能 · 非普通出牌/);assert.match(g.nodes.get('handHoverUsage').textContent,/智慧检定前投入/);assert.equal(g.nodes.get('handHoverArt').style['--art-x'],'100%');assert.equal(a.attrs['aria-describedby'],'handInteractionHint handHover');
 g.enter(b);assert.equal(a.attrs['aria-describedby'],'handInteractionHint');assert.equal(g.nodes.get('handHoverTitle').textContent,'.45 自动手枪');assert.match(g.nodes.get('handHoverType').textContent,/费用 3 资源 \+ 1 行动/);assert.equal(g.nodes.get('handHoverEffect').textContent,'战斗 +1');
 g.nodes.get('hand').listeners.pointerout({relatedTarget:null});g.flush();assert.equal(tip.hidden,true);assert.equal(b.attrs['aria-describedby'],'handInteractionHint');
});
test('说明可移入阅读，Escape关闭，支持键盘焦点，不抢手牌点击或出牌流程',()=>{
 const g=setup(),a=g.card(0),hand=g.nodes.get('hand'),tip=g.nodes.get('handHover');g.enter(a);
 hand.listeners.pointerout({relatedTarget:null});tip.listeners.pointerenter();g.flush();assert.equal(tip.hidden,false);
 g.events.keydown({key:'Escape'});assert.equal(tip.hidden,true);
 g.doc.activeElement=a;hand.listeners.focusin({target:a});assert.equal(tip.hidden,false);
 g.doc.activeElement=null;hand.listeners.focusout({relatedTarget:null});g.flush();assert.equal(tip.hidden,true);
 assert.equal(hand.listeners.click,undefined);assert.equal(hand.listeners.dblclick,undefined);assert.doesNotMatch(source,/inspectHandCard\(|onHandCard\(|toggleCommit\(|preventDefault\(|\.focus\(/);
});
test('弹窗、教学、菜单和倒计时阻止显示，重绘移除旧牌或同索引换牌会隐藏',()=>{
 for(const block of [g=>g.native(true),g=>g.ctx.phaseTransitionActive=true,g=>g.nodes.get('game').inert=true,g=>g.nodes.get('game').style.display='none']){const g=setup();block(g);g.enter(g.card(0));assert.equal(g.nodes.get('handHover').hidden,true);}
 for(const change of [(g,a)=>a.isConnected=false,g=>g.ctx.S.hand.shift(),g=>g.native(true)]){const g=setup(),a=g.card(0);g.enter(a);change(g,a);g.mutate();assert.equal(g.nodes.get('handHover').hidden,true);}
 const g=setup();g.enter(g.card(0));g.events['arkham:menu']();assert.equal(g.nodes.get('handHover').hidden,true);
});
test('只读查看不消耗卡牌行动资源，触屏悬停忽略，焦点仍可查看',()=>{
 const g=setup(),a=g.card(0),before=JSON.stringify(g.ctx.S);g.nodes.get('hand').listeners.pointerover({target:a,pointerType:'touch'});assert.equal(g.nodes.get('handHover').hidden,true);
 g.enter(a);g.events.pointerdown({target:g.nodes.get('game')});assert.equal(g.nodes.get('handHover').hidden,true);assert.equal(JSON.stringify(g.ctx.S),before);
});
test('视口约束与缩放外浮层不改变棋盘，索引钩子保留原有点击处理',()=>{
 const g=setup();g.enter(g.card(0));const tip=g.nodes.get('handHover');assert.ok(parseFloat(tip.style.top)>=12);assert.ok(parseFloat(tip.style.top)+260<=588);assert.ok(parseFloat(tip.style.left)>=12);
 assert.match(html,/data-hand-index="\$\{i\}"/);assert.match(html,/onclick="inspectHandCard\(\$\{i\},event\)"/);assert.match(html,/id="handHover" role="tooltip" hidden/);assert.match(html,/hand-hover.js\?v=faction-1/);
 const css=fs.readFileSync(path.join(root,'hand-hover.css'),'utf8');assert.match(css,/position:fixed/);assert.match(css,/max-width:calc\(100vw - 24px\)/);assert.match(css,/#handHover\[hidden\]\{display:none\}/);assert.doesNotMatch(css,/#hand\s*\{|#game|#wrap/);
});
