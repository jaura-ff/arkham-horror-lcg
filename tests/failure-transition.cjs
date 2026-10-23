const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','failure-transition.js'),'utf8');
function setup(reduced=false){
  const nodes=new Map(),timers=new Map(),listeners={};let seq=0;
  function node(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{hidden:id==='failureAftermath',innerHTML:'',listeners:{},classList:{add(...v){v.forEach(x=>classes.add(x))},remove(...v){v.forEach(x=>classes.delete(x))},contains:x=>classes.has(x)},addEventListener(k,f){this.listeners[k]=f},focus(){this.focused=true}})}return nodes.get(id)}
  const ctx={S:{gameOver:true},document:{getElementById:node,addEventListener(k,f){listeners[k]=f}},setTimeout(f,ms){timers.set(++seq,{f,ms});return seq},clearTimeout(id){timers.delete(id)},uiIcon:()=>'',renderActions(){ctx.renders++},renders:0,stopEndingNarration(){ctx.stops++},stops:0,openModal(html){node('modalBox').innerHTML=html;node('modal').classList.add('open')}};
  ctx.window={matchMedia:()=>({matches:reduced}),addEventListener(k,f){listeners[k]=f}};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const originalOpen=ctx.openModal;ctx.openModal=html=>{ctx.window.resetFailureTransition();originalOpen(html)};
  return {ctx,node,timers,listeners,begin:()=>ctx.window.beginFailureTransition('生命值耗尽'),finish(){const entry=timers.values().next().value;entry?.f()}};
}
test('失败先显示标题，2400ms后显示原因和重新开始，不自动重开',()=>{
  const g=setup();g.begin();assert.equal(g.ctx.S.failureTransitionActive,true);assert.equal(g.node('failureAftermath').hidden,true);assert.match(g.node('modalBox').innerHTML,/游戏失败/);assert.match(g.node('modalBox').innerHTML,/生命值耗尽/);assert.equal([...g.timers.values()][0].ms,2400);g.finish();assert.equal(g.ctx.S.failureTransitionActive,false);assert.equal(g.node('failureAftermath').hidden,false);assert.equal(g.node('failureRestart').focused,true);assert.equal(g.timers.size,0);assert.equal(g.ctx.S.gameOver,true);
});
test('可以跳过动画直接显示结果，取消剩余计时',()=>{const g=setup();g.begin();g.node('failureSkip').listeners.click();assert.equal(g.node('failureAftermath').hidden,false);assert.equal(g.node('failureSkip').hidden,true);assert.equal(g.timers.size,0)});
test('减少动态效果直接显示结果',()=>{const g=setup(true);g.begin();assert.equal(g.timers.size,0);assert.equal(g.node('failureAftermath').hidden,false)});
test('菜单、离开页面、重置均清理计时器和动效',()=>{for(const event of ['arkham:menu','pagehide','reset']){const g=setup();g.begin();const stale=[...g.timers.values()][0].f;(event==='reset'?g.ctx.window.resetFailureTransition:g.listeners[event])();stale();assert.equal(g.timers.size,0);assert.equal(g.ctx.S.failureTransitionActive,false);assert.equal(g.node('modalBox').classList.contains('failure-cinema'),false);assert.equal(g.node('failureAftermath').hidden,true)}});
test('旧结算计时器不能操作新游戏或覆盖新弹窗',()=>{const g=setup();g.begin();g.ctx.S={gameOver:false};g.finish();assert.equal(g.node('failureAftermath').hidden,true);const h=setup();h.begin();h.node('modal').classList.remove('open');h.finish();assert.equal(h.node('failureAftermath').hidden,true)});
test('非结算状态不播放失败转场',()=>{const g=setup();g.ctx.S.gameOver=false;g.begin();assert.equal(g.timers.size,0);assert.equal(g.ctx.renders,0)});
test('打开其他弹窗清理失败转场，旧回调不影响新弹窗',()=>{const g=setup();g.begin();const stale=[...g.timers.values()][0].f;g.ctx.openModal('返回主菜单？');stale();assert.equal(g.node('modalBox').innerHTML,'返回主菜单？');assert.equal(g.node('modalBox').classList.contains('failure-cinema'),false);assert.equal(g.timers.size,0)});
