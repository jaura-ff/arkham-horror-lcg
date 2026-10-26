const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),cards=require('../official-cards.js');
function setup(){
 const nodes=new Map(),doc={getElementById(id){if(!nodes.has(id)){const classes=new Set();nodes.set(id,{style:{setProperty(k,v){this[k]=v}},dataset:{},innerHTML:'',textContent:'',hidden:true,classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k)},appendChild(){}});}return nodes.get(id)},createElement:()=>({})};
 const ctx=vm.createContext({document:doc,Math,structuredClone}),run=s=>vm.runInContext(s,ctx),json=s=>JSON.parse(run('JSON.stringify('+s+')'));
 run(html.match(/<script>([\s\S]*?)<\/script>/)[1]);run(fs.readFileSync(path.join(root,'card-art.js'),'utf8'));
 return {run,json,node:id=>doc.getElementById(id)};
}
test('所有76张玩家牌都有插画，68张新增图各有独立格子，旧8张保留原图',()=>{
 const g=setup(),mapped=g.json('CARD_ART'),coordinates=[];
 for(const code of Object.keys(cards)){
  const art=mapped[code];assert.ok(art,code);assert.ok(art[0]>=0&&art[0]<=100&&art[1]>=0&&art[1]<=100,code);
  if(art[2]){assert.ok(fs.existsSync(path.join(root,art[2])),art[2]);coordinates.push(art.join('|'));}
 }
 assert.equal(coordinates.length,68);assert.equal(new Set(coordinates).size,68);assert.deepEqual(mapped['01016'],mapped.p45);assert.deepEqual(mapped['01090'],mapped.percep);
});
test('四名新增调查员有独立肖像，罗兰保留原肖像，图集顺序与图片比例一致',()=>{
 const g=setup(),arts=g.json('INVESTIGATOR_ART');assert.deepEqual(arts.roland,[0,0]);
 for(const [i,id] of ['daisy','skids','agnes','wendy'].entries())assert.deepEqual(arts[id],[i*100/3,0,'assets/images/noir-core-1-v1.webp']);
 for(let i=1;i<=6;i++){
  const file=path.join(root,'assets/images/noir-core-'+i+'-v1.webp'),b=fs.readFileSync(file);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(b.length<500000);
  const chunk=b.toString('ascii',12,16);let width,height;
  if(chunk==='VP8 '){width=b.readUInt16LE(26)&0x3fff;height=b.readUInt16LE(28)&0x3fff;}
  else if(chunk==='VP8X'){width=b.readUIntLE(24,3)+1;height=b.readUIntLE(27,3)+1;}
  else if(chunk==='VP8L'){const bits=b.readUInt32LE(21);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;}
  else assert.fail('Unsupported WebP frame '+chunk);
  assert.equal(width,1448);assert.equal(height,1086);
 }
});
test('统一样式映射可切换图集，切回旧牌会重置图片，拒绝非本地图片路径',()=>{
 const g=setup();assert.match(g.run('cardArtStyle(CARD_ART["01060"])'),/noir-core-4-v1.webp/);
 g.run('setCardArt(document.getElementById("image"),CARD_ART["01060"])');assert.match(g.node('image').style['--art-image'],/noir-core-4-v1.webp/);
 g.run('setCardArt(document.getElementById("image"),CARD_ART.p45)');assert.equal(g.node('image').style['--art-image'],"url('assets/images/noir-atlas.webp')");
 assert.doesNotMatch(g.run('cardArtStyle([0,0,"https://example.com/image.png"])'),/https|example/);
});
test('手牌、装备和投入牌渲染使用同一图片，不回退到文字方块，浏览不改游戏状态',()=>{
 const g=setup();for(const f of ['official-core.js','official-cards.js','official-card-rules.js','official-decks.js','player-catalogue.js'])g.run(fs.readFileSync(path.join(root,f),'utf8'));
 g.run('startGame();S.hand=Object.values(ArkhamOfficialCards).map(c=>ArkhamPlayers.card(ArkhamOfficialDecks.normalize(c.code)))');const before=g.run('JSON.stringify(S)');g.run('renderHand()');const hand=g.node('hand').innerHTML;
 assert.equal((hand.match(/class="card-art art"/g)||[]).length,76);assert.doesNotMatch(hand,/player-card-stamp/);assert.equal((hand.match(/--art-image:url/g)||[]).length,68);assert.equal(g.run('JSON.stringify(S)'),before);
 g.run('S.assets=[{card:S.hand.find(c=>c.code==="01074"),exhausted:false}];renderAssets()');assert.match(g.node('assets').innerHTML,/noir-core-5-v1.webp/);
 for(const file of ['atlas.js','board-inspect.js','discard.js','weakness-reveal.js'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/cardArtStyle/);
 for(const file of ['hand-dialog.js','hand-hover.js'])assert.match(fs.readFileSync(path.join(root,file),'utf8'),/setCardArt/);
 assert.ok(html.indexOf('src="card-art.js')<html.indexOf('src="atlas.js'));assert.match(fs.readFileSync(path.join(root,'noir.css'),'utf8'),/background-image:var\(--art-image/);
});
