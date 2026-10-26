const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'board-inspect.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
 const nodes=new Map(),events={},calls=[];let native=false,selection='';
 const doc={activeElement:null,getElementById:id=>nodes.get(id),querySelector:()=>native||[...nodes.values()].some(n=>n.open)?{}:null,addEventListener:(k,f)=>events[k]=f};
 function node(id,classes=[],tag='div',parent=null){
  const list=new Set(classes),n={id,tag,parent,children:[],style:{},dataset:{},open:false,inert:false,hidden:false,disabled:false,isConnected:true,innerHTML:'',textContent:'',listeners:{},classList:{contains:k=>list.has(k),add:k=>list.add(k)},matches(sel){return sel.split(',').some(raw=>{const s=raw.trim();if(s==='#hand [data-hand-index]')return this.dataset.handIndex!==undefined;if(s==='[role="button"]')return this.role==='button';if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return s.slice(1).split('.').every(k=>list.has(k));return this.tag===s;});},closest(sel){for(let x=this;x;x=x.parent)if(x.matches(sel))return x;return null;},contains(x){for(;x;x=x.parent)if(x===this)return true;return false;},querySelector:()=>null,addEventListener(k,f){this.listeners[k]=f},focus(){doc.activeElement=this},replaceChildren(){this.innerHTML='';this.children=[]},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};
  if(parent)parent.children.push(n);nodes.set(id,n);return n;
 }
 for(const id of ['game','modal','boardInspectDialog','boardInspectTitle','boardInspectContent','boardInspectAction','boardInspectClose','handCardDialog','assetInfoDialog','enemies','assets'])node(id,[],['boardInspectAction','boardInspectClose'].includes(id)?'button':'div');
 const game=nodes.get('game'),dialog=nodes.get('boardInspectDialog');for(const id of ['boardInspectTitle','boardInspectContent','boardInspectAction','boardInspectClose'])nodes.get(id).parent=dialog;for(const id of ['assets','enemies'])nodes.get(id).parent=game;
 const ctx={document:doc,window:{getSelection:()=>({toString:()=>selection})},S:{location:'study',actions:3,resources:5,clues:3,hp:9,sanity:5,doom:1,actIdx:0,agendaIdx:0,hand:[],assets:[],enemies:[],revealed:{study:true,hallway:true,attic:false},locClues:{study:2,hallway:1,attic:2}},INVESTIGATOR:{name:'罗兰',title:'联邦探员',will:3,int:3,combat:4,agility:2,maxHp:9,maxSanity:5},LOCATIONS:{study:{name:'书房',desc:'熟悉的书房',shroud:2,conn:['hallway']},hallway:{name:'走廊',desc:'门后低语',shroud:2,conn:['study','attic']},attic:{name:'阁楼',desc:'SECRET',shroud:3,conn:['hallway']}},ACT_DECK:[{id:'1a',text:'收集3线索'}],AGENDA_DECK:[{id:'1a',text:'黑暗蔓延',threshold:3}],CARD_ART:{p45:[33.3333,0]},CARD_USAGE:{p45:'战斗加值'},phaseTransitionActive:false,pendingNavigation:false,pendingAction:null,canAct:()=>ctx.S.actions>0,requestMapMove:id=>calls.push(['move',id]),requestAction:id=>calls.push(['action',id]),inspectHandCard:(index,event)=>{calls.push(['hand',index,event.detail]);nodes.get('handCardDialog').open=true}};
 vm.runInNewContext(source,ctx);
 return{ctx,nodes,events,calls,doc,node:(id,classes=[],tag='div',parent=game)=>node(id,classes,tag,parent),native:v=>native=v,selection:v=>selection=v,click(target,type='click',key){const e={target,type,key,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};game.listeners[type](e);return e;},close:()=>nodes.get('boardInspectClose').listeners.click(),action:()=>nodes.get('boardInspectAction').listeners.click(),contentClick(target){dialog.listeners.click({target})}};
}
test('人物、幕和议程居中只读展示，再点内容关闭并恢复焦点',()=>{
 for(const [id,classes,title]of [['investigator',['panel'],'罗兰'],['act-side',['side','act'],'幕 · 1a'],['agenda-side',['side','agenda'],'议程 · 1a']]){
  const g=setup(),n=g.node(id,classes),before=JSON.stringify(g.ctx.S),e=g.click(n);assert.equal(e.stopped,true);assert.equal(g.nodes.get('boardInspectDialog').open,true);assert.equal(g.nodes.get('boardInspectTitle').textContent,title);assert.equal(JSON.stringify(g.ctx.S),before);
  g.contentClick(g.nodes.get('boardInspectContent'));assert.equal(g.nodes.get('boardInspectDialog').open,false);assert.equal(g.doc.activeElement,n);assert.equal(g.calls.length,0);
 }
});
test('地点查看不移动、不揭示暗面；确认按钮才调用原移动确认入口',()=>{
 const g=setup(),n=g.node('hall',['map-node']);n.dataset.room='hallway';g.click(n);assert.equal(g.calls.length,0);assert.match(g.nodes.get('boardInspectContent').innerHTML,/门后低语/);assert.equal(g.nodes.get('boardInspectAction').textContent,'前往此地');g.action();assert.deepEqual(g.calls,[['move','hallway']]);
 const h=setup(),unknown=h.node('attic',['map-node']);unknown.dataset.room='attic';h.click(unknown);assert.doesNotMatch(h.nodes.get('boardInspectContent').innerHTML,/SECRET|遮蔽值|剩余线索/);assert.equal(h.nodes.get('boardInspectAction').hidden,true);assert.equal(h.ctx.S.revealed.attic,false);
});
test('幕按钮只在可推进时出现，并重新验证原状态，普通行动按钮不被拦截',()=>{
 const g=setup(),n=g.node('act-side',['side','act']);g.click(n);assert.equal(g.calls.length,0);g.action();assert.deepEqual(g.calls,[['action','advanceAct']]);
 const h=setup();h.ctx.S.clues=0;h.click(h.node('act-side',['side','act']));assert.equal(h.nodes.get('boardInspectAction').hidden,true);h.action();assert.equal(h.calls.length,0);
 const j=setup(),panel=j.node('commandPanel',['panel']),button=j.node('draw',[],'button',panel),e=j.click(button);assert.equal(e.stopped,undefined);assert.equal(j.nodes.get('boardInspectDialog').open,false);
});
test('最终幕的放大目标显示出口规则而不是祭坛，并沿用行动确认入口',()=>{
 const g=setup();g.ctx.ACT_DECK[4]={id:'3a',text:'辨明出口'};g.ctx.ACT_DECK[5]={id:'3b',text:'最终逃离'};g.ctx.S.actIdx=4;g.ctx.S.clues=2;
 const n=g.node('act-side',['side','act']);g.click(n);assert.match(g.nodes.get('boardInspectContent').innerHTML,/辨明出口/);assert.doesNotMatch(g.nodes.get('boardInspectContent').innerHTML,/祭坛/);g.action();assert.deepEqual(g.calls,[['action','advanceAct']]);
 g.ctx.S.actIdx=5;g.click(n);assert.match(g.nodes.get('boardInspectContent').innerHTML,/击败或闪避守门者/);assert.equal(g.nodes.get('boardInspectAction').hidden,true);
});

test('手牌单击接入已有详情和确认，不直接出牌；卡面再点关闭，不拦截出牌按钮',()=>{
 const g=setup(),hand=g.node('hand0',[],'button');hand.dataset.handIndex='0';g.click(hand);assert.deepEqual(g.calls,[['hand',0,0]]);assert.equal(g.nodes.get('boardInspectDialog').open,false);
 const existing=g.nodes.get('handCardDialog'),button=g.node('play',[],'button',existing);existing.listeners.click({target:button});assert.equal(existing.open,true);const image=g.node('card-art',[], 'div',existing);existing.listeners.click({target:image});assert.equal(existing.open,false);
});
test('资产和敌人展示真实卡面与当前数值，通用区域只读且转义文本',()=>{
 const g=setup();g.ctx.S.assets=[{card:{id:'p45',name:'.45',text:'武器效果',slot:'hand',slots:1},exhausted:false}];const asset=g.node('asset0',['asset-icon'],'button',g.nodes.get('assets'));g.click(asset);assert.match(g.nodes.get('boardInspectContent').innerHTML,/inspect-art/);assert.match(g.nodes.get('boardInspectContent').innerHTML,/武器效果/);g.close();
 g.ctx.S.enemies=[{card:{name:'食尸鬼',hp:2,fight:2,evade:2,dmg:1,horror:1,hunter:true},hp:1,location:'study',engaged:true}];const enemy=g.node('enemy0',['enemy'],'div',g.nodes.get('enemies'));g.nodes.get('enemies').parent=g.nodes.get('game');g.nodes.get('assets').parent=g.nodes.get('game');g.click(enemy);assert.match(g.nodes.get('boardInspectContent').innerHTML,/生命 1\/2/);g.close();
 const panel=g.node('generic',['panel']);panel.textContent='<script>not executable</script>';g.click(panel);assert.match(g.nodes.get('boardInspectContent').innerHTML,/&lt;script&gt;/);
});
test('桌面怪物再次放大时也讲解战斗门槛、当前生命和伤害恐惧的区别',()=>{
 const g=setup();g.ctx.S.enemies=[{card:{name:'食尸鬼',hp:3,fight:2,evade:2,dmg:1,horror:2},hp:1,location:'study',engaged:true}];
 const enemy=g.node('enemy0',['enemy'],'div',g.nodes.get('enemies'));g.click(enemy);const body=g.nodes.get('boardInspectContent').innerHTML;
 assert.match(body,/生命 1\/3/);assert.match(body,/命中门槛，不是伤害/);assert.match(body,/1 伤害（减少生命）和 2 恐惧（减少理智）/);assert.match(body,/刚出现时不会立刻攻击/);assert.equal(g.calls.length,0);
});

test('教学、原生弹窗、阶段倒计时及未完成操作期间不叠加放大窗口',()=>{
 for(const block of [g=>g.native(true),g=>g.nodes.get('game').inert=true,g=>g.ctx.phaseTransitionActive=true,g=>g.ctx.S.test={},g=>g.ctx.S.pendingMove=true,g=>g.ctx.pendingNavigation=true,g=>g.ctx.pendingAction={},g=>g.nodes.get('game').style.display='none',g=>g.nodes.get('modal').classList.add('open')]){
  const g=setup();block(g);g.click(g.node('investigator',['panel']));assert.equal(g.nodes.get('boardInspectDialog').open,false);
 }
});
test('键盘支持放大，返回菜单关闭且不拉回隐藏游戏，样式不改变原棋盘布局',()=>{
 const g=setup(),n=g.node('investigator',['panel']);g.click(n,'keydown','Enter');assert.equal(g.nodes.get('boardInspectDialog').open,true);g.nodes.get('game').style.display='none';g.events['arkham:menu']();assert.equal(g.nodes.get('boardInspectDialog').open,false);assert.notEqual(g.doc.activeElement,n);
 assert.match(html,/<dialog id="boardInspectDialog"[^>]*aria-labelledby=/);const css=fs.readFileSync(path.join(root,'board-inspect.css'),'utf8');assert.match(css,/position:fixed;inset:0/);assert.match(css,/max-height:calc\(100dvh - 28px\)/);assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.doesNotMatch(css,/\.main\s*\{|#wrap\s*\{|\.col-left\s*\{/);
});
