const {test}=require('node:test'),assert=require('node:assert/strict');
const cards=require('../official-cards.js'),rules=require('../official-card-rules.js'),decks=require('../official-decks.js'),core=require('../official-core.js');
test('all 68 starter definitions and eight basic weaknesses have an explicit rule recipe',()=>{
  assert.equal(Object.keys(cards).length,76);assert.deepEqual(Object.keys(cards).sort(),Object.keys(rules).sort());
  for(const id of ['roland','daisy','skids','agnes','wendy']){
    for(const code of Object.keys(core.starterManifest(id).counts)){
      const card=decks.normalize(code);assert.ok(card.name);assert.ok(card.rules);assert.ok(card.skills);
    }
  }
});
for(const id of ['roland','daisy','skids','agnes','wendy'])test(id+' builds a real, separate 33-card starting deck',()=>{
  const deck=decks.assemble(id,()=>0),m=core.starterManifest(id);
  assert.equal(deck.length,33);assert.equal(new Set(deck.map(c=>c.instanceId)).size,33);
  for(const [code,count] of Object.entries(m.counts))assert.equal(deck.filter(c=>c.code===code).length,count);
  assert.equal(deck.filter(c=>c.subtype==='basicweakness').length,1);
  const flashlights=deck.filter(c=>c.code==='01087');assert.equal(flashlights.length,2);
  flashlights[0].uses.supplies--;assert.equal(flashlights[1].uses.supplies,3);
  const other=decks.assemble(id,()=>.999999);assert.notEqual(other.at(-1).code,deck.at(-1).code);
});
test('random basic weakness selection uses physical core quantities and rejects invalid rolls',()=>{
  const pool=decks.basicWeaknessPool();assert.equal(new Set(pool).size,8);
  for(const code of new Set(pool))assert.equal(pool.filter(c=>c===code).length,cards[code].quantity);
  for(const value of [-1,1,NaN,Infinity])assert.throws(()=>decks.assemble('wendy',()=>value));
});
test('original printed weapon costs, ammo and conditional damage are not legacy shortcuts',()=>{
  assert.equal(cards['01016'].cost,4);assert.equal(rules['01016'].uses.ammo,4);
  assert.equal(rules['01016'].abilities[0].cost.ammo,1);
  assert.equal(rules['01020'].abilities[0].extraDamageIfOnlyEngagedTarget,1);
  assert.equal(cards['01074'].slot,'Hand x2');assert.equal(rules['01060'].uses.charges,4);
});
test('signature weaknesses and reaction events preserve timing instead of resolving on generic draw/play',()=>{
  assert.equal(rules['01013'].forced[0].window,'own-turn-end');assert.equal(rules['01013'].play.checkAdvance,true);
  assert.equal(rules['01023'].play.window,'enemy-attacks-local-investigator');
  assert.equal(rules['01065'].play.window,'draw-nonweakness-treachery');
  assert.equal(rules['01014'].replacement.destination,'deck-bottom');
  assert.equal(rules['01015'].revelation.removeDiscardFromGame,true);
  assert.equal(rules['01009'].cannotLeaveWith,'horror');assert.equal(rules['01007'].endScenario.mentalTrauma,1);
});
test('card metadata cannot unlock playable roles without an executor for every rule',()=>{
  const state=decks.releaseReadiness();assert.equal(state.ready,false);assert.equal(state.missing.length,76);
  assert.equal(decks.releaseReadiness({supports:code=>code==='01016'}).ready,false);
});
