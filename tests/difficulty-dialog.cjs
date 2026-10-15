const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
function setup(){
  const nodes=new Map();
  const doc={body:{style:{overflow:'auto'}},activeElement:null,createElement:()=>node(''),getElementById(id){if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id)}};
  function node(id){const classes=new Set();return{id,style:{},value:id==='difficultySelect'?'standard':'',hidden:id==='tutorial',open:false,isConnected:true,textContent:'',children:[],listeners:{},classList:{contains:c=>classes.has(c),add:c=>classes.add(c)},setAttribute(name,value){this[name]=value},append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},addEventListener(event,fn){this.listeners[event]=fn},showModal(){this.open=true;this.shows=(this.shows||0)+1},close(){this.open=false;this.listeners.close?.()},focus(){doc.activeElement=this}};}
  const context=vm.createContext({document:doc});const run=code=>vm.runInContext(code,context);
  run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  run(fs.readFileSync(path.join(root,'difficulty-dialog.js'),'utf8'));
  const get=id=>doc.getElementById(id);
  const choose=key=>{get('difficultySelect').value=key;get('difficultySelect').focus();get('difficultySelect').listeners.change()};
  const click=id=>{get(id).focus();get(id).listeners.click()};
  return{get,run,choose,click,doc};
}
test('页面加载不弹出，切换四档难度时显示实际袋子分组和总数',()=>{
  const g=setup();assert.equal(g.get('difficultyInfo').open,false);
  for(const [key,name,total] of [['easy','简单',16],['standard','标准',16],['hard','困难',17],['expert','专家',18]]){
    g.choose(key);assert.equal(g.get('difficultyInfo').open,true);assert.match(g.get('difficultyInfoTitle').textContent,new RegExp(name));
    assert.match(g.get('difficultyInfoSummary').textContent,new RegExp(`${total} 枚`));
    const actual=Object.fromEntries(g.get('difficultyInfoTokens').children.map(n=>[n.children[0].textContent,Number(n.children[1].textContent.slice(2))]));
    const expected=JSON.parse(g.run(`JSON.stringify(makeChaosBag('${key}').reduce((out,t)=>{out[t.label]=(out[t.label]||0)+1;return out},{}))`));
    assert.deepEqual(actual,expected);g.click('difficultyInfoConfirm');
  }
});
test('默认标准可通过查看按钮重看，不需要切换难度',()=>{
  const g=setup();g.click('difficultyInfoButton');assert.match(g.get('difficultyInfoTitle').textContent,/标准/);assert.equal(g.get('difficultyInfoTokens').children.find(n=>n.children[0].textContent==='骷髅').children[1].textContent,'× 2');
  g.click('difficultyInfoClose');g.click('difficultyInfoButton');assert.equal(g.get('difficultyInfo').shows,2);
});
test('弹窗和页面共用符号规则，困难面及简单面正确切换',()=>{
  const g=setup();
  for(const key of ['hard','expert','easy','standard']){
    g.choose(key);assert.equal(g.get('difficultyInfoRules').textContent,g.run(`difficultySymbolText('${key}')`));
    assert.ok(g.get('difficultyBag').textContent.includes(g.get('difficultyInfoRules').textContent));
    assert.match(g.get('difficultyInfoSide').textContent,['hard','expert'].includes(key)?/困难／专家/:/简单／标准/);
    g.get('difficultyInfo').close();
  }
});
test('确认、关闭和原生关闭事件均保留选择并恢复滚动焦点',()=>{
  for(const method of ['difficultyInfoConfirm','difficultyInfoClose','native']){
    const g=setup();g.choose('expert');assert.equal(g.doc.body.style.overflow,'hidden');assert.equal(g.doc.activeElement.id,'difficultyInfoClose');
    if(method==='native')g.get('difficultyInfo').close();else g.click(method);
    assert.equal(g.get('difficultySelect').value,'expert');assert.equal(g.doc.body.style.overflow,'auto');assert.equal(g.doc.activeElement.id,'difficultySelect');
  }
});
test('查看不启动游戏、不随机抽取、不变更进行中的状态',()=>{
  const g=setup();g.run('Math.random=()=>{throw Error("unexpected randomness")};S={actions:2,resources:7,chaos:[{label:"0",mod:0}]}');const before=g.run('JSON.stringify(S)');
  g.choose('hard');g.click('difficultyInfoConfirm');assert.equal(g.run('JSON.stringify(S)'),before);
  g.run('S=null');g.choose('easy');assert.equal(g.run('S'),null);
});
test('已有弹窗、教学或进行中的游戏不叠加难度说明，非法值安全回退',()=>{
  for(const block of ['atlas','modal','tutorial','game']){
    const g=setup();if(block==='atlas')g.get('cardAtlas').open=true;if(block==='modal')g.get('modal').classList.add('open');if(block==='tutorial')g.get('tutorial').hidden=false;if(block==='game')g.get('startOverlay').style.display='none';
    g.choose('hard');assert.equal(g.get('difficultyInfo').open,false);
  }
  const g=setup();g.choose('__proto__');assert.match(g.get('difficultyInfoTitle').textContent,/标准/);
});
test('弹窗使用原生模态、标题关联和按钮入口，样式带视口高度限制',()=>{
  assert.match(html,/<dialog id="difficultyInfo"[^>]*aria-labelledby="difficultyInfoTitle"/);
  assert.match(html,/id="difficultyInfoButton"[^>]*aria-haspopup="dialog"/);
  assert.match(html,/src="difficulty-dialog.js\?v=token-art-1"/);
  const css=fs.readFileSync(path.join(root,'atlas.css'),'utf8');assert.match(css,/max-height:calc\(100dvh - 24px\)/);assert.match(css,/difficulty-info-actions .*min-height:44px/);
});

test('四档每类指示物均有本地图形和可读标签，数量不变',()=>{
  const g=setup();
  for(const key of ['easy','standard','hard','expert']){
    g.choose(key);
    for(const tile of g.get('difficultyInfoTokens').children){
      const label=tile.children[0],picture=label.children[0];
      assert.ok(label.textContent);assert.match(picture.src,/^assets\/tokens\/[a-z0-9]+\.svg$/);
      assert.ok(fs.existsSync(path.join(root,picture.src)),picture.src);assert.equal(picture.width,72);assert.equal(picture.height,72);assert.equal(picture.alt,'');assert.equal(picture['aria-hidden'],'true');
    }
    g.get('difficultyInfo').close();
  }
});

test('五种特殊符号对应独立插画，所有素材无外链及脚本',()=>{
  const g=setup();g.choose('expert');
  const tiles=g.get('difficultyInfoTokens').children;
  for(const [label,id] of Object.entries({'骷髅':'skull','异教徒':'cultist','石板':'tablet','自动失败':'autofail','上古印记':'elder'})){
    assert.equal(tiles.find(t=>t.children[0].textContent===label).children[0].children[0].src,`assets/tokens/${id}.svg`);
  }
  const files=fs.readdirSync(path.join(root,'assets/tokens')).filter(f=>f.endsWith('.svg'));assert.equal(files.length,14);
  for(const file of files){const svg=fs.readFileSync(path.join(root,'assets/tokens',file),'utf8');assert.match(svg,/viewBox="0 0 100 100"/);assert.doesNotMatch(svg,/<script|<foreignObject|href=|onload=/);}
});

test('图形布局使用自适应网格，资源带版本避免复用旧文字样式',()=>{
  const css=fs.readFileSync(path.join(root,'atlas.css'),'utf8');
  assert.match(css,/grid-template-columns:repeat\(auto-fit,minmax\(100px,1fr\)\)/);assert.match(css,/\.difficulty-token img/);
  assert.match(html,/href="atlas.css\?v=[a-z0-9-]+"/);
});
