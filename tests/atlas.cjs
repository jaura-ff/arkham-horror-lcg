const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
  const nodes=new Map();
  const doc={body:{style:{overflow:'auto'}},activeElement:null,createElement(){return{innerHTML:'',className:''}},getElementById(id){
    if(!nodes.has(id)){
      const classes=new Set();
      const n={id,style:{},dataset:{},innerHTML:'',textContent:'',value:'',hidden:id==='tutorial',open:false,isConnected:true,listeners:{},appendChild(){},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},addEventListener(name,fn){this.listeners[name]=fn},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};
      nodes.set(id,n);
    }return nodes.get(id);
  }};
  const ctx=vm.createContext({document:doc,Math});
  const run=code=>vm.runInContext(code,ctx);
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  run(fs.readFileSync(path.join(root,'atlas.js'),'utf8'));
  const node=id=>doc.getElementById(id);
  const click=id=>{node(id).focus();node(id).listeners.click()};
  const query=(text='',type='all')=>{node('atlasSearch').value=text;node('atlasFilter').value=type;node('atlasSearch').listeners.input();return node('atlasCards').innerHTML};
  return{node,run,click,query,doc};
}
test('菜单可直接阅读全部卡牌而不开始游戏，含官方来源和简化说明',()=>{
  const g=setup();g.click('menuAtlasButton');assert.equal(g.run('S'),null);assert.equal(g.node('cardAtlas').open,true);
  assert.match(g.node('atlasCount').textContent,/35 \/ 35/);
  assert.match(html,/附录 IV，第 28–31 页/);assert.match(html,/不等同|不是官方完整卡库/);
  assert.match(html,/atlas.css/);assert.ok(html.includes('src="atlas.js?v=chapter-3"'));
});
test('图鉴确定按钮关闭并回到首页图鉴入口，不开局',()=>{
 const g=setup();g.click('menuAtlasButton');g.click('atlasConfirm');assert.equal(g.node('cardAtlas').open,false);assert.equal(g.doc.activeElement.id,'menuAtlasButton');assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.run('S'),null);
});

test('卡牌来自游戏定义，同名遭遇去重，覆盖所有分类',()=>{
  const g=setup();g.click('atlasButton');
  for(const [type,count] of Object.entries({investigator:1,asset:2,event:3,skill:4,weak:1,enemy:4,treachery:2,location:9,act:6,agenda:3})){
    const content=g.query('',type);assert.equal((content.match(/class="atlas-card"/g)||[]).length,count,type);
  }
  g.run(`INVESTIGATOR.deck[0].cost=8`); // Catalogue snapshot remains read-only.
  assert.match(g.query('.45'),/3 资源/);
});
test('最终幕的三个地点、唯一守门者和两张幕牌都有对应说明',()=>{
 const g=setup();g.click('menuAtlasButton');
 for(const name of ['破碎门厅','灰烬回廊','宅邸铁门'])assert.match(g.query(name,'location'),new RegExp(name));
 assert.match(g.query('食尸鬼·守门者','enemy'),/首次进入宅邸铁门时出现/);assert.match(g.query('食尸鬼·守门者','enemy'),/不重复生成/);
 assert.match(g.query('幕 3a','act'),/原创最终幕/);assert.match(g.query('幕 3b','act'),/至少 2 行动/);
});

test('搜索名称、类型、数值和用法，特殊字符无 HTML 注入',()=>{
  const g=setup();g.click('menuAtlasButton');assert.match(g.query('弹药'),/自动手枪/);
  assert.match(g.query('感知'),/智慧 \+2/);assert.match(g.query('食尸鬼'),/攻击恐惧/);
  assert.match(g.query('<img onerror=alert(1)>'),/没有匹配/);assert.doesNotMatch(g.node('atlasCards').innerHTML,/<img/);
  assert.match(g.query('感知','enemy'),/没有匹配/);
});
test('查看、筛选及关闭不会改变牌组、行动、检定或随机状态',()=>{
  const g=setup();g.run('startGame();investigate()');const before=g.run('JSON.stringify(S)');
  // Active game modal blocks the atlas rather than replacing the test.
  g.click('atlasButton');assert.equal(g.node('cardAtlas').open,false);assert.match(g.node('guideStatus').textContent,/先完成或关闭/);
  assert.equal(g.run('JSON.stringify(S)'),before);
  g.run('S.test=null;closeModal()');const ready=g.run('JSON.stringify(S)');g.click('atlasButton');g.query('勇气');g.click('atlasClose');
  assert.equal(g.run('JSON.stringify(S)'),ready);assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,'atlasButton');
});
test('教学中不覆盖引导，关闭事件（含原生 Escape）恢复滚动和焦点',()=>{
  const g=setup();g.node('tutorial').hidden=false;g.click('menuAtlasButton');assert.equal(g.node('cardAtlas').open,false);
  g.node('tutorial').hidden=true;g.click('menuAtlasButton');assert.equal(g.doc.body.style.overflow,'hidden');assert.equal(g.doc.activeElement.id,'atlasClose');
  g.node('cardAtlas').close();assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,'menuAtlasButton');
});
test('本作关键差异说明存在，图鉴中没有打出卡牌或抽牌操作',()=>{
  const g=setup();g.click('atlasButton');const content=g.query();
  for(const text of ['不计弹药','不增加伤害','不是免行动操作','不是剩余线索','不能主动打出','不是当前剩余状态'])assert.ok(content.includes(text),text);
  assert.doesNotMatch(content,/onclick=|onHandCard|drawCards/);
  assert.match(html,/<dialog id="cardAtlas"/);assert.match(html,/aria-labelledby="atlasTitle"/);
});
