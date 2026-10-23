const {test}=require('node:test'),assert=require('node:assert/strict');
const session=require('../official-session.js'),decks=require('../official-decks.js'),weakness=require('../official-weaknesses.js');
const card=(code,id=code)=>({...decks.normalize(code),instanceId:id});
function playing(id='roland'){const s=session.create(id,()=>.5);session.opening(s,()=>.5);session.mulligan(s,[],()=>.5);session.begin(s);s.hand=[];s.deck=[];return s;}
test('drawn player weakness does not consume an additional card draw',()=>{
  const s=playing();s.resources=5;s.deck=[card('01088'),card('01097')];
  weakness.draw(s,1);assert.equal(s.resources,0);assert.equal(s.hand.length,0);assert.equal(s.deck.length,1);assert.equal(s.discard[0].code,'01097');
});
test('all threat weaknesses enter correct zones and initialize signature counters',()=>{
  for(const code of ['01007','01009','01011','01098','01099','01100']){
    const s=playing();s.deck=[card(code)];weakness.draw(s);assert.equal(s.threats[0].code,code);assert.equal(s.hand.length,0);assert.equal(s.discard.length,0);
    if(code==='01007')assert.equal(s.threats[0].clues,3);if(code==='01009')assert.equal(s.threats[0].horror,3);if(code==='01011')assert.equal(s.threats[0].resources,0);
  }
});
test('Dark Memory remains in hand, forces horror only once when its turn ends',()=>{
  const s=playing('agnes');s.deck=[card('01013')];weakness.draw(s);assert.equal(s.hand[0].code,'01013');assert.equal(s.horror,0);
  assert.ok(weakness.endTurn(s));assert.equal(s.pending.horror,2);assert.ok(weakness.chooseLoss(s));assert.equal(s.horror,2);
  assert.equal(weakness.endTurn(s),false);s.turn++;assert.ok(weakness.endTurn(s));weakness.chooseLoss(s);assert.equal(s.horror,4);
});
test('Amnesia waits for a real player choice, protects weakness cards and rejects stale choices',()=>{
  const s=playing('agnes');s.hand=[card('01013'),card('01088','a'),card('01088','b')];s.deck=[card('01096')];weakness.draw(s);
  assert.equal(s.pending.kind,'amnesia');const before=structuredClone(s);assert.equal(weakness.chooseAmnesia(s,'01013'),false);assert.deepEqual(s,before);
  assert.ok(weakness.chooseAmnesia(s,'b'));assert.deepEqual(s.hand.map(c=>c.instanceId),['01013','b']);assert.equal(s.discard.length,2);assert.equal(weakness.chooseAmnesia(s,'b'),false);
});
test('Abandoned and Alone deals direct horror and removes old discard, not itself',()=>{
  const s=playing('wendy');s.discard=[card('01088')];s.deck=[card('01015')];weakness.draw(s);
  assert.equal(s.horror,2);assert.equal(s.removed[0].code,'01088');assert.deepEqual(s.discard.map(c=>c.code),['01015']);
});
test('empty-deck horror pauses for soak choice before drawing from shuffled discard',()=>{
  const s=playing();s.discard=[card('01088')];s.assets=[card('01059')];weakness.draw(s);
  assert.equal(s.pending.kind,'loss');assert.equal(s.hand.length,0);assert.equal(weakness.draw(s),false);
  assert.ok(weakness.chooseLoss(s,[{instanceId:'01059',damage:0,horror:1}]));assert.equal(s.horror,0);assert.equal(s.assets[0].horror,1);assert.equal(s.hand[0].code,'01088');
});
test('bad damage assignment keeps pending choice and all state unchanged',()=>{
  const s=playing();s.discard=[card('01088')];weakness.draw(s);const before=structuredClone(s);
  assert.equal(weakness.chooseLoss(s,[{instanceId:'fake',damage:0,horror:1}]),false);assert.deepEqual(s,before);
});
test('enemy basic weaknesses spawn engaged at the bearer location',()=>{
  for(const code of ['01101','01102','01103']){const s=playing();s.location='attic';s.deck=[card(code)];weakness.draw(s);assert.equal(s.enemies[0].location,'attic');assert.ok(s.enemies[0].engaged);assert.equal(s.enemies[0].code,code);}
});
test('Hospital Debts payment is free-action, twice per round, and resets in a new round',()=>{
  const s=playing('skids');s.deck=[card('01011')];weakness.draw(s);const actions=s.actions;
  assert.ok(weakness.payDebt(s,'01011'));assert.ok(weakness.payDebt(s,'01011'));assert.equal(weakness.payDebt(s,'01011'),false);
  assert.equal(s.actions,actions);assert.equal(s.resources,3);assert.equal(s.threats[0].resources,2);s.round++;assert.ok(weakness.payDebt(s,'01011'));
});
test('end scenario applies Cover Up trauma and unpaid debt XP penalty exactly once',()=>{
  const s=playing();s.threats=[card('01007'),card('01011')];s.threats[0].clues=1;s.threats[1].resources=5;
  assert.ok(weakness.finishScenario(s));assert.equal(s.mentalTrauma,1);assert.equal(s.experiencePenalty,2);assert.equal(weakness.finishScenario(s),false);assert.equal(s.mentalTrauma,1);
});
test('Psychosis and Hypochondria forced chain terminates at defeat instead of looping forever',()=>{
  const s=playing();s.threats=[card('01099'),card('01100')];s.damage=8;s.horror=3;
  weakness.forcedAfterLoss(s,0,1);weakness.pump(s);assert.ok(s.defeated);assert.equal(s.damage,9);assert.equal(s.pending,null);assert.equal(s.effectQueue.length,0);
});
