const {test}=require('node:test'),assert=require('node:assert/strict');
const session=require('../official-session.js'),decks=require('../official-decks.js'),tests=require('../official-tests.js');
const card=(code,id=code)=>({...decks.normalize(code),instanceId:id});
function playing(id='roland'){const s=session.create(id,()=>.5);session.opening(s,()=>.5);session.mulligan(s,[],()=>.5);session.begin(s);s.hand=[];s.chaos=[{label:'0',mod:0}];s.location='study';return s;}
function resolve(s){assert.ok(tests.reveal(s,()=>0));assert.ok(tests.accept(s));assert.ok(tests.finalize(s));return tests.finish(s);}
test('matching icons and wild icons count, mismatches/weaknesses do not, duplicate Guts rejected',()=>{
 const s=playing();s.hand=[card('01089','a'),card('01089','b'),card('01093'),card('01090'),card('01013')];
 tests.begin(s,{skill:'willpower',difficulty:4});assert.ok(tests.commit(s,'a'));assert.equal(tests.commit(s,'b'),false);assert.ok(tests.commit(s,'01093'));assert.equal(tests.commit(s,'01090'),false);assert.equal(tests.commit(s,'01013'),false);
 const r=resolve(s);assert.ok(r.success);assert.equal(r.total,7);assert.deepEqual(r.effects,[{effect:'draw',amount:1}]);assert.equal(s.discard.length,2);assert.equal(tests.finish(s),null);
});
test('Wendy cancels autofail before consequences, returns token, and pays a noncommitted hand card',()=>{
 const s=playing('wendy');s.hand=[card('01093'),card('01088')];s.chaos=[{autofail:true,label:'fail'},{mod:0,label:'0'}];
 tests.begin(s,{skill:'intellect',difficulty:2});tests.commit(s,'01093');tests.reveal(s,()=>0);
 assert.equal(tests.redraw(s,'01093',()=>0),false);assert.ok(tests.redraw(s,'01088',()=>0));assert.equal(tests.redraw(s,'01093',()=>0),false);
 assert.equal(s.test.current.token.label,'0');tests.accept(s);tests.finalize(s);const r=tests.finish(s);assert.ok(r.success);assert.equal(r.tokens.length,1);assert.equal(s.discard.length,2);
});
test('cancelled symbol produces no loss and cancelled token itself can be drawn again',()=>{
 const s=playing('wendy');s.hand=[card('01088')];s.chaos=[{symbol:'tablet',label:'tablet'}];tests.begin(s,{skill:'intellect',difficulty:0});tests.reveal(s,()=>0);
 assert.ok(tests.redraw(s,'01088',()=>0));assert.equal(s.test.current.token.symbol,'tablet');assert.equal(s.test.effects.length,0);
 assert.ok(tests.accept(s,()=>({modifier:-2,loss:{damage:1}})));tests.finalize(s);const r=tests.finish(s);assert.equal(r.effects.length,1);assert.equal(s.damage,0);
});
test('revealed chained tokens stay out of bag until test ends',()=>{
 const s=playing();s.chaos=[{symbol:'cultist'},{mod:-1}];tests.begin(s,{skill:'combat',difficulty:2});tests.reveal(s,()=>0);tests.accept(s,()=>({modifier:0,drawAgain:true}));
 tests.reveal(s,()=>0);assert.equal(s.test.current.token.mod,-1);tests.accept(s);tests.finalize(s);const r=tests.finish(s);assert.equal(r.tokens.length,2);assert.equal(s.chaos.length,2);
});
test('unknown scenario symbol blocks resolution instead of giving a false zero modifier',()=>{
 const s=playing();s.chaos=[{symbol:'tablet'}];tests.begin(s,{skill:'intellect',difficulty:1});tests.reveal(s,()=>0);assert.equal(tests.accept(s),false);assert.equal(s.test.stage,'token-choice');
});
test('five character elder signs use current state; Daisy weakness suppresses success effect',()=>{
 for(const id of ['roland','daisy','skids','agnes','wendy']){
  const s=playing(id);s.chaos=[{elder:true}];s.localClues=2;s.horror=2;if(id==='daisy')s.assets=[card('01031')];if(id==='wendy')s.assets=[card('01014')];
  tests.begin(s,{skill:'intellect',difficulty:0});const r=resolve(s);assert.ok(r.success);
  if(id==='roland')assert.equal(r.total,5);if(id==='agnes')assert.equal(r.total,4);
  if(id==='daisy')assert.deepEqual(r.effects,[{effect:'draw',amount:1}]);if(id==='skids')assert.deepEqual(r.effects,[{effect:'gain-resources',amount:2}]);if(id==='wendy')assert.ok(r.automaticSuccess);
 }
 const s=playing('daisy');s.chaos=[{elder:true}];s.threats=[card('01009')];tests.begin(s,{skill:'intellect',difficulty:0});assert.equal(resolve(s).success,false);
});
test('detective blanks investigator ability but does not blank an asset skill modifier',()=>{
 const s=playing('wendy');s.enemies=[{code:'01103',location:'study'}];s.assets=[card('01014'),card('01033')];s.chaos=[{elder:true}];s.hand=[card('01088')];
 tests.begin(s,{skill:'intellect',difficulty:5});tests.reveal(s,()=>0);assert.equal(tests.redraw(s,'01088',()=>0),false);tests.accept(s);assert.equal(tests.result(s).automaticSuccess,false);assert.equal(tests.result(s).total,4);
});
test('Lucky reopens success determination, charges only once and amulet routes played event to bottom',()=>{
 const s=playing('wendy');s.hand=[card('01080')];s.assets=[card('01014')];tests.begin(s,{skill:'intellect',difficulty:4});tests.reveal(s,()=>0);tests.accept(s);
 assert.equal(tests.result(s).success,false);assert.ok(tests.lucky(s,'01080'));assert.ok(tests.result(s).success);assert.equal(s.resources,4);assert.equal(s.deck[0].code,'01080');assert.equal(tests.lucky(s,'01080'),false);
 tests.finalize(s);assert.equal(tests.lucky(s,'01080'),false);tests.finish(s);
});
test('Opportunist returns only if success margin reaches three; Deduction and Vicious Blow stay contextual',()=>{
 const s=playing();s.hand=[card('01053'),card('01039')];tests.begin(s,{skill:'intellect',difficulty:0,context:'investigate'});tests.commit(s,'01053');tests.commit(s,'01039');const r=resolve(s);
 assert.ok(s.hand.some(c=>c.code==='01053'));assert.ok(r.effects.some(e=>e.effect==='discover-additional-clues'));
 const h=playing();h.hand=[card('01025')];tests.begin(h,{skill:'combat',difficulty:1,context:'effect'});tests.commit(h,'01025');assert.equal(resolve(h).effects.length,0);
});
