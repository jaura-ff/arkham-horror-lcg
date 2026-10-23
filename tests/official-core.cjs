const {test}=require('node:test'),assert=require('node:assert/strict');
const core=require('../official-core.js');
for(const id of ['roland','daisy','skids','agnes','wendy']){
  test(id+' standard starter has 30 regular cards and three extra cards',()=>{
    const m=core.starterManifest(id),s=core.investigator(id);
    assert.equal(Object.values(m.counts).reduce((a,b)=>a+b,0),32);
    assert.equal(m.randomBasicWeakness,1);assert.equal(m.regularSize,30);assert.equal(m.totalSize,33);
    assert.equal(m.counts['01'+String(s.signature).padStart(3,'0')],1);
    assert.equal(m.counts['01'+String(s.weakness).padStart(3,'0')],1);
    assert.ok(Object.values(m.counts).every(n=>n<=2));
    const catalog=Object.fromEntries(Object.keys(m.counts).map(code=>[code,{code,uses:{ammo:4}}]));
    const deck=core.materialize(id,catalog,{code:'01096',subtype:'basicweakness'});
    assert.equal(deck.length,33);assert.equal(new Set(deck.map(c=>c.instanceId)).size,33);
    const copies=deck.filter(c=>c.code==='01086');copies[0].uses.ammo=0;assert.equal(copies[1].uses.ammo,4);
    assert.throws(()=>core.materialize(id,{},null));assert.throws(()=>core.materialize(id,{}, {code:'01096',subtype:'basicweakness'}));
  });
}
test('Skids pays exactly two resources once per own turn, including with zero normal actions',()=>{
  const s=core.initialAbilityState(),args={turn:1,resources:2,ownTurn:true,playerWindow:true};
  const r=core.useSkids(s,args);assert.equal(r.additionalActions,1);assert.equal(r.resourceCost,2);
  assert.equal(core.useSkids(r.state,args),null);assert.ok(core.useSkids(r.state,{...args,turn:2}));
  assert.equal(core.useSkids(s,{...args,resources:1}),null);assert.equal(core.useSkids(s,{...args,ownTurn:false}),null);
});
test('Daisy action is restricted to Tome abilities, not playing a Tome',()=>{
  const s=core.initialAbilityState(),args={turn:1,ownTurn:true,isTomeAbility:true};
  const r=core.useDaisy(s,args);assert.equal(r.restrictedAction,1);assert.equal(core.useDaisy(r.state,args),null);
  assert.equal(core.useDaisy(s,{...args,isTomeAbility:false}),null);assert.ok(core.useDaisy(r.state,{...args,turn:2}));
});
test('Agnes triggers on horror placed on her once per phase, not on horror soaked by an ally',()=>{
  const s=core.initialAbilityState(),args={phase:1,horrorPlaced:1,enemyAtLocation:true};
  const r=core.reactAgnes(s,args);assert.equal(r.damage,1);assert.equal(core.reactAgnes(r.state,args),null);
  assert.ok(core.reactAgnes(r.state,{...args,phase:2}));assert.equal(core.reactAgnes(s,{...args,horrorPlaced:0}),null);
  assert.equal(core.reactAgnes(s,{...args,gameOver:true}),null);
});
test('Roland discovers a clue after defeating a local enemy once per round',()=>{
  const s=core.initialAbilityState(),args={round:1,defeatedEnemy:true,enemyAtLocation:true,availableClues:1};
  const r=core.reactRoland(s,args);assert.equal(r.clues,1);assert.equal(core.reactRoland(r.state,args),null);
  assert.equal(core.reactRoland(s,{...args,availableClues:0}),null);assert.ok(core.reactRoland(r.state,{...args,round:2}));
});
test('Wendy may cancel autofail but pays an uncommitted hand card and cannot reroll twice',()=>{
  const handCard={instanceId:'a',type:'event'},args={handCard,atRevealWindow:true};
  assert.deepEqual(core.useWendy(args),{discardInstance:'a',cancelToken:true,returnToken:true,drawAgain:true,usedThisTest:true});
  assert.equal(core.useWendy({...args,usedThisTest:true}),null);assert.equal(core.useWendy({...args,committedCards:[handCard]}),null);
  assert.equal(core.useWendy({...args,handCard:{...handCard,type:'weak'}}),null);
});
test('five different elder signs and Daisy signature weakness override',()=>{
  assert.equal(core.elderSign('roland',{localClues:3}).modifier,3);
  assert.deepEqual(core.elderSign('daisy',{tomes:2}),{modifier:0,drawOnSuccess:2});
  assert.equal(core.elderSign('daisy',{necronomicon:true}).autofail,true);
  assert.deepEqual(core.elderSign('skids'),{modifier:2,gainResourcesOnSuccess:2});
  assert.equal(core.elderSign('agnes',{horrorOnInvestigator:4}).modifier,4);
  assert.equal(core.elderSign('wendy',{amulet:true}).automaticSuccess,true);
  assert.equal(core.elderSign('wendy').automaticSuccess,false);assert.throws(()=>core.elderSign('parallel-wendy'));
});
