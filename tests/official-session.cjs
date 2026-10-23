const {test}=require('node:test'),assert=require('node:assert/strict');
const session=require('../official-session.js'),decks=require('../official-decks.js');
const card=(code,id=code)=>({...decks.normalize(code),instanceId:id});
function playing(id='roland'){const s=session.create(id,()=>.5);session.opening(s,()=>.5);session.mulligan(s,[],()=>.5);session.begin(s);return s;}
test('all investigators open with five nonweaknesses, five resources and conserved physical deck',()=>{
  for(const id of ['roland','daisy','skids','agnes','wendy']){
    const s=session.create(id,()=>.5);session.opening(s,()=>.5);
    assert.equal(s.hand.length,5);assert.ok(s.hand.every(c=>!session.weak(c)));assert.equal(s.deck.length,28);assert.equal(s.resources,5);
    assert.throws(()=>session.begin(s));const rejected=s.hand.map(c=>c.instanceId);
    session.mulligan(s,rejected,()=>.5);assert.ok(s.hand.every(c=>!rejected.includes(c.instanceId)));assert.equal(s.deck.length,28);
    assert.equal(new Set([...s.hand,...s.deck].map(c=>c.instanceId)).size,33);assert.throws(()=>session.mulligan(s,[],()=>.5));
    session.begin(s);assert.equal(s.stage,'playing');assert.equal(s.investigator,id);assert.equal(s.actions,3);
  }
});
test('weaknesses encountered during replacement do not trigger and return only after drawing',()=>{
  const s=session.create('agnes',()=>.5);session.opening(s,()=>.5);
  s.deck=[card('01088','replacement'),card('01013','dark-memory')];
  const rejected=s.hand[0].instanceId;session.mulligan(s,[rejected],()=>.5);
  assert.ok(s.hand.some(c=>c.instanceId==='replacement'));assert.ok(s.deck.some(c=>c.instanceId==='dark-memory'));
  assert.equal(s.horror,0);assert.equal(s.events.length,0);
});
test('duplicate and missing mulligan selections do not mutate hand or deck',()=>{
  const s=session.create('wendy',()=>.5);session.opening(s,()=>.5);const before=structuredClone(s),id=s.hand[0].instanceId;
  assert.throws(()=>session.mulligan(s,[id,id]));assert.deepEqual(s,before);
  assert.throws(()=>session.mulligan(s,['missing']));assert.deepEqual(s,before);
});
test('ammo, resources, actions and exhaustion validate together without partial payments',()=>{
  const s=playing(),gun=card('01016');s.assets=[gun];const before=structuredClone(s);
  assert.equal(session.pay(s,{resources:6,actions:1,ammo:1},gun),false);assert.deepEqual(s,before);
  assert.ok(session.pay(s,{actions:1,ammo:1},gun));assert.equal(gun.uses.ammo,3);assert.equal(s.actions,2);
  gun.exhausted=true;assert.equal(session.pay(s,{ammo:1,exhaustSelf:true},gun),false);assert.equal(gun.uses.ammo,3);
  assert.equal(session.pay(s,{ammo:1},card('01016','fake')),false);
  assert.equal(session.pay(s,{actions:-1}),false);assert.equal(session.pay(s,{charges:.5},gun),false);
});
test('fast assets cost resources but no action and two-handed assets cannot exceed hand capacity',()=>{
  const s=playing();s.hand=[card('01030'),card('01074')];
  assert.ok(session.install(s,'01030'));assert.equal(s.resources,4);assert.equal(s.actions,3);
  assert.equal(session.install(s,'01074'),false);assert.equal(s.resources,4);
  assert.ok(session.install(s,'01074',['01030']));assert.equal(s.actions,2);assert.equal(s.resources,2);
  assert.equal(s.assets[0].code,'01074');assert.equal(s.discard[0].code,'01030');
});
test('Daisy bag provides two Tome-only slots, not extra weapon slots',()=>{
  const bag=card('01008'),tome1=card('01031'),tome2=card('01035'),gun=card('01016'),knife=card('01086');
  assert.ok(session.fits([bag,tome1,tome2,gun,knife]));assert.equal(session.fits([bag,gun,knife,card('01044')]),false);
  assert.equal(session.fits([tome1,tome2,gun]),false);
});
test('locked Necronomicon cannot be paid as a discard cost or replaced to free slots',()=>{
  const s=playing('daisy'),book=card('01009');book.horror=3;s.threats=[book];s.assets=[card('01016')];s.hand=[card('01074')];
  assert.equal(session.install(s,'01074',['01009']),false);assert.equal(session.pay(s,{discardSelf:true},book),false);
  assert.equal(book.horror,3);assert.equal(s.actions,3);
});
test('damage and horror assigned simultaneously to one ally before it is defeated',()=>{
  const s=playing(),ally=card('01018');s.assets=[ally];assert.ok(session.assignLoss(s,2,2,[{instanceId:ally.instanceId,damage:2,horror:2}]));
  assert.equal(s.damage,0);assert.equal(s.horror,0);assert.equal(s.assets.length,0);assert.equal(s.discard[0],ally);
  assert.equal(ally.damage,2);assert.equal(ally.horror,2);
});
test('invalid, excess and direct damage allocations are atomic',()=>{
  const s=playing(),ally=card('01018');s.assets=[ally];const before=structuredClone(s);
  for(const allocation of [[{instanceId:ally.instanceId,damage:3,horror:0}],[{instanceId:'fake',damage:1,horror:0}]]){
    assert.equal(session.assignLoss(s,1,0,allocation),false);assert.deepEqual(s,before);
  }
  assert.equal(session.assignLoss(s,1,0,[{instanceId:ally.instanceId,damage:1,horror:0}],true),false);
  assert.ok(session.assignLoss(s,1,2,[],true));assert.equal(s.damage,1);assert.equal(s.horror,2);
});
test('horror paid as a cost may be assigned to an asset; Agnes cannot treat that as horror placed on her',()=>{
  const s=playing('agnes'),rosary=card('01059'),knowledge=card('01058');s.assets=[rosary,knowledge];
  assert.ok(session.pay(s,{horror:1,secrets:1,exhaustSelf:true},knowledge,[{instanceId:rosary.instanceId,damage:0,horror:1}]));
  assert.equal(s.horror,0);assert.equal(rosary.horror,1);assert.equal(knowledge.uses.secrets,3);assert.ok(knowledge.exhausted);
});
test('defeat fires once and rejects further changes',()=>{
  const s=playing();assert.ok(session.assignLoss(s,9,5,[],true));assert.ok(s.defeated);
  const before=structuredClone(s);assert.equal(session.assignLoss(s,1,1),false);assert.equal(session.pay(s,{resources:1}),false);
  assert.deepEqual(s,before);assert.equal(s.events.filter(e=>e.type==='investigator-defeated').length,1);
});
test('last First Aid supply discards the empty asset; an empty firearm is retained',()=>{
  const s=playing(),aid=card('01019'),gun=card('01016');s.assets=[aid,gun];aid.uses.supplies=1;gun.uses.ammo=1;
  assert.ok(session.pay(s,{actions:1,supplies:1},aid));assert.ok(s.discard.includes(aid));assert.equal(s.assets.includes(aid),false);
  assert.ok(session.pay(s,{actions:1,ammo:1},gun));assert.ok(s.assets.includes(gun));assert.equal(gun.uses.ammo,0);
  const before=structuredClone(s);assert.equal(session.pay(s,{ammo:1},gun),false);assert.deepEqual(s,before);
});
