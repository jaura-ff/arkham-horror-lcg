const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),source=fs.readFileSync(path.join(root,'atlas.js'),'utf8');
function setup(official=true){
  const nodes=new Map();
  const doc={body:{style:{overflow:'auto'}},activeElement:null,createElement(){return{innerHTML:'',className:''}},getElementById(id){
    if(!nodes.has(id)){
      const classes=new Set(),n={id,style:{},dataset:{},attrs:{},innerHTML:'',textContent:'',value:'',hidden:id==='tutorial',open:false,isConnected:true,listeners:{},setAttribute(k,v){this.attrs[k]=v},appendChild(){},classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)},addEventListener(k,fn){this.listeners[k]=fn},focus(){doc.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.listeners.close?.()}};
      nodes.set(id,n);
    }return nodes.get(id);
  }};
  const ctx=vm.createContext({document:doc,Math:Object.create(Math),structuredClone}),run=code=>vm.runInContext(code,ctx),json=code=>JSON.parse(run('JSON.stringify('+code+')'));
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  if(official)for(const f of ['official-core.js','official-cards.js','official-card-rules.js','official-decks.js','player-catalogue.js','card-art.js'])run(fs.readFileSync(path.join(root,f),'utf8'));
  const categories=[...html.matchAll(/<button[^>]*data-atlas-type="([^"]+)"[^>]*>([^<]+)<\/button>/g)].map(m=>{const n=doc.getElementById('category-'+m[1]);n.dataset.atlasType=m[1];return n;});
  const list=doc.getElementById('atlasCards');doc.getElementById('atlasCategories').querySelectorAll=()=>categories;
  const heroNode=id=>{const n=doc.getElementById('hero-'+id);n.dataset.atlasInvestigator=id;n.parent=list;return n;};
  list.contains=n=>n.parent===list;
  list.querySelector=selector=>{const id=selector.match(/data-atlas-investigator="([^"]+)"/)?.[1];return id&&list.innerHTML.includes('data-atlas-investigator="'+id+'"')?heroNode(id):null;};
  run(source);
  const node=id=>doc.getElementById(id),click=id=>{node(id).focus();node(id).listeners.click();};
  const select=type=>click('category-'+type);
  const search=text=>{node('atlasSearch').value=text;node('atlasSearch').listeners.input();return list.innerHTML;};
  const hero=id=>list.listeners.click({target:{closest:()=>heroNode(id)}});
  return {run,json,node,doc,click,select,search,hero,categories,list};
}
const names=['罗兰·班克斯','黛西·沃克','斯基兹','艾格尼丝·贝克','温蒂·亚当斯'];
test('第一级仅有全部、调查员、敌人，全部先列人物入口与敌人，不平铺玩家牌',()=>{
 const g=setup();g.click('menuAtlasButton');assert.deepEqual(g.categories.map(n=>n.dataset.atlasType),['all','investigator','enemy']);
 for(const name of names)assert.ok(g.list.innerHTML.includes(name),name);
 assert.match(g.node('atlasCount').textContent,/5 位调查员 · 7 名敌人/);assert.equal(g.node('atlasDeckNav').hidden,true);
 assert.doesNotMatch(g.list.innerHTML,/\.45 自动手枪|<small>资产|<small>地点/);
 assert.match(html,/atlas.js\?v=card-art-1/);assert.match(html,/atlas.css\?v=investigator-decks-1/);
});
test('调查员与敌人分类独立切换，含基础弱点敌人的属性说明',()=>{
 const g=setup();g.click('atlasButton');g.select('investigator');assert.equal((g.list.innerHTML.match(/class="atlas-investigator"/g)||[]).length,5);assert.doesNotMatch(g.list.innerHTML,/class="atlas-card"/);
 g.select('enemy');assert.equal((g.list.innerHTML.match(/class="atlas-card"/g)||[]).length,7);
 for(const word of ['食尸鬼','黑帮打手','顽固的侦探','战斗值','攻击伤害','攻击恐惧'])assert.ok(g.list.innerHTML.includes(word),word);
 assert.equal(g.node('category-enemy').attrs['aria-pressed'],'true');assert.equal(g.node('category-investigator').attrs['aria-pressed'],'false');
});
test('每位调查员点击后展示准确的32张固定配牌与1张随机基础弱点，不混入其他角色专属牌',()=>{
 const g=setup();g.click('menuAtlasButton');
 for(const id of ['roland','daisy','skids','agnes','wendy']){
  g.select('investigator');g.hero(id);assert.equal(g.node('atlasDeckNav').hidden,false);assert.match(g.node('atlasCount').textContent,/配牌 33 张/);
  const fixed=g.list.innerHTML.split('<details class="atlas-weakness-pool">')[0];
  const actual=[...fixed.matchAll(/<dd>(01\d{3})<\/dd>/g)].map(m=>m[1]).sort();
  assert.deepEqual(actual,g.json('Object.keys(ArkhamOfficialCore.starterManifest("'+id+'").counts)').sort(),id);
  const copies=[...fixed.matchAll(/牌组中 ×(\d+)/g)].reduce((n,m)=>n+Number(m[1]),0);assert.equal(copies,32,id);
  assert.match(g.list.innerHTML,/随机基础弱点 ×1/);assert.match(g.list.innerHTML,/可能的 8 种弱点/);
 }
});
test('共用牌出现在对应角色的牌组中，带张数；切换角色不残留上一角色卡牌',()=>{
 const g=setup();g.click('menuAtlasButton');g.hero('daisy');assert.match(g.list.innerHTML,/黛西的手提袋|古老智慧之书/);assert.doesNotMatch(g.list.innerHTML,/温蒂的护符|罗兰的 .38/);
 assert.match(g.list.innerHTML,/牌组中 ×2/);g.click('atlasBack');assert.equal(g.node('atlasDeckNav').hidden,true);assert.equal(g.doc.activeElement.id,'hero-daisy');
 g.hero('wendy');assert.match(g.list.innerHTML,/温蒂的护符/);assert.doesNotMatch(g.list.innerHTML,/黛西的手提袋|死灵之书/);
});
test('角色牌组内按资产、事件、技能、弱点分组；顶级不恢复卡牌类型和地点按钮',()=>{
 const g=setup();g.click('menuAtlasButton');g.hero('roland');
 for(const type of ['资产','事件','技能','弱点'])assert.ok(g.list.innerHTML.includes('atlas-section-title">'+type),type);
 const primary=html.match(/<nav id="atlasCategories"[\s\S]*?<\/nav>/)[0];assert.doesNotMatch(primary,/地点|资产|事件|技能|弱点|诡计/);
});
test('地点、幕、议程不进入任何图鉴结果，游戏定义与目标推进数据仍保留',()=>{
 const g=setup();g.click('menuAtlasButton');assert.match(g.search('破碎门厅'),/没有匹配/);assert.match(g.search('幕 3a'),/没有匹配/);
 g.search('');g.select('enemy');assert.match(g.list.innerHTML,/首次进入宅邸铁门时出现/);assert.match(g.list.innerHTML,/不重复生成/);
 assert.equal(g.run('Object.keys(LOCATIONS).length'),9);assert.equal(g.run('ACT_DECK.length'),6);assert.equal(g.run('AGENDA_DECK.length'),3);
 assert.doesNotMatch(source,/Object\.entries\(LOCATIONS\)/);
});
test('顶级搜索牌名会定位拥有该牌的角色，牌组内搜索只筛选该角色的牌',()=>{
 const g=setup();g.click('menuAtlasButton');const found=g.search('死灵之书');assert.match(found,/黛西·沃克/);assert.doesNotMatch(found,/data-atlas-investigator="wendy"/);
 g.hero('daisy');assert.equal(g.node('atlasSearch').value,'');assert.match(g.search('死灵之书'),/上古印记视为自动失败/);assert.doesNotMatch(g.list.innerHTML,/温蒂的护符/);
 assert.match(g.search('温蒂的护符'),/没有匹配/);assert.match(g.search('<img onerror=alert(1)>'),/没有匹配/);assert.doesNotMatch(g.list.innerHTML,/<img onerror/);
});
test('返回、切换第一级和重新打开都能正确离开牌组并恢复导航状态',()=>{
 const g=setup();g.click('menuAtlasButton');g.hero('skids');g.select('enemy');assert.equal(g.node('atlasDeckNav').hidden,true);assert.match(g.node('atlasCount').textContent,/0 位调查员 · 7 名敌人/);
 g.select('investigator');g.hero('agnes');g.search('法术');g.click('atlasConfirm');assert.equal(g.node('cardAtlas').open,false);assert.equal(g.doc.activeElement.id,'menuAtlasButton');assert.equal(g.doc.body.style.overflow,'auto');
 g.click('menuAtlasButton');assert.equal(g.node('atlasSearch').value,'');assert.equal(g.node('atlasDeckNav').hidden,true);assert.equal(g.node('category-all').attrs['aria-pressed'],'true');
});
test('只读浏览不组牌、不抽随机弱点，不改变当前游戏人物、牌组与行动',()=>{
 const g=setup();g.run('startGame()');const before=g.run('JSON.stringify(S)'),defs=g.run('JSON.stringify(INVESTIGATOR)');g.run('Math.random=()=>{throw Error("Atlas must not randomize")}');
 g.click('atlasButton');g.hero('wendy');g.search('护符');g.click('atlasBack');g.select('enemy');g.click('atlasClose');
 assert.equal(g.run('JSON.stringify(S)'),before);assert.equal(g.run('JSON.stringify(INVESTIGATOR)'),defs);assert.equal(g.doc.activeElement.id,'atlasButton');
});
test('当前强制检定、教学阻止打开图鉴，Escape关闭恢复焦点和滚动',()=>{
 const g=setup();g.run('startGame();investigate()');g.click('atlasButton');assert.equal(g.node('cardAtlas').open,false);assert.match(g.node('guideStatus').textContent,/先完成或关闭/);
 g.run('S.test=null;closeModal()');g.node('tutorial').hidden=false;g.click('atlasButton');assert.equal(g.node('cardAtlas').open,false);
 g.node('tutorial').hidden=true;g.click('atlasButton');g.node('cardAtlas').close();assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,'atlasButton');
});
test('外部伪造的调查员节点不会触发导航，旧环境仍能查看罗兰简化牌组',()=>{
 const g=setup();g.click('menuAtlasButton');const before=g.list.innerHTML;g.list.listeners.click({target:{closest:()=>({dataset:{atlasInvestigator:'daisy'}})}});assert.equal(g.list.innerHTML,before);
 const h=setup(false);h.click('menuAtlasButton');h.hero('roland');assert.match(h.node('atlasCount').textContent,/配牌 10 张/);assert.match(h.list.innerHTML,/不计弹药/);assert.doesNotMatch(h.list.innerHTML,/atlas-weakness-pool/);
});
test('布局使用响应式卡组网格和原生可键盘操作的调查员按钮',()=>{
 const css=fs.readFileSync(path.join(root,'atlas.css'),'utf8');assert.match(css,/atlas-card-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(css,/@media\(max-width:650px\)\{\.atlas-card-grid\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/atlas-deck-nav\[hidden\]\{display:none\}/);assert.match(html,/id="atlasBack"/);
 const g=setup();g.click('menuAtlasButton');assert.match(g.list.innerHTML,/<button type="button" class="atlas-investigator"/);assert.match(g.list.innerHTML,/aria-controls="atlasCards"/);
});
