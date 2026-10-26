/* Declarative printed Core rules. player-runtime.js supplies UI execution for
 * the five standard starter decks; recipes alone are not execution handlers.
 * Effects use numeric primitives and explicit windows, never legacy card IDs.
 */
(function(root){
  'use strict';
  const rule=(number,value)=>['01'+String(number).padStart(3,'0'),value];
  const action=(effect,cost={},extra={})=>({timing:'action',effect,cost:{actions:1,...cost},...extra});
  const fast=(window,effect,extra={})=>({timing:'fast',window,effect,...extra});
  const reaction=(window,effect,extra={})=>({timing:'reaction',window,effect,...extra});
  const weapon=(bonus,damage=1,cost={},extra={})=>action('fight',cost,{skill:'combat',bonus,damage,...extra});
  const boost=skills=>skills.map(skill=>fast('skill-test-player-window','boost-test',{cost:{resources:1},skill,bonus:1}));
  const rules=Object.fromEntries([
    rule(6,{uses:{ammo:4},abilities:[weapon(1,2,{ammo:1},{bonusWithLocalClue:3})]}),
    rule(7,{revelation:{effect:'threat',counters:{clues:3}},abilities:[reaction('would-discover-local-clues','remove-threat-clues-instead')],endScenario:{ifCounterPositive:'clues',mentalTrauma:1}}),
    rule(8,{slotsBonus:{hand:2,restrictedTrait:'Tome'}}),
    rule(9,{revelation:{effect:'threat-asset',counters:{horror:3}},cannotLeaveWith:'horror',elderSignAs:'autofail',abilities:[action('move-threat-horror-to-investigator',{}, {amount:1,discardIfEmpty:'horror'})]}),
    rule(10,{play:fast('after-own-turn-begins','prevent-nonelite-attacks',{until:'round-end'})}),
    rule(11,{revelation:{effect:'threat'},abilities:[fast('player-window','pay-hospital-debt',{cost:{resources:1},counter:'resources',limit:{per:'round',count:2}})],endScenario:{ifCounterBelow:{resources:6},experiencePenalty:2}}),
    rule(12,{abilities:[reaction('after-play-Spell','draw',{amount:1})]}),
    rule(13,{play:action('add-agenda-doom',{}, {amount:1,checkAdvance:true}),forced:[{window:'own-turn-end',zone:'hand',effect:'horror',amount:2}]}),
    rule(14,{permission:{zone:'discard',card:'topmost-event',as:'hand'},replacement:{window:'played-event-destination',destination:'deck-bottom'}}),
    rule(15,{revelation:{effect:'abandoned-and-alone',directHorror:2,removeDiscardFromGame:true}}),
    rule(16,{uses:{ammo:4},abilities:[weapon(1,2,{ammo:1})]}),
    rule(17,{abilities:boost(['willpower','combat'])}),
    rule(18,{static:{combat:1},abilities:[fast('player-window','damage-local-enemy',{cost:{discardSelf:true},amount:1})]}),
    rule(19,{uses:{supplies:3},discardIfEmpty:'supplies',abilities:[action('heal-investigator',{supplies:1},{amount:1,choice:['damage','horror'],target:'local-investigator'})]}),
    rule(20,{abilities:[weapon(1,1,{}, {extraDamageIfOnlyEngagedTarget:1})]}),
    rule(21,{abilities:[reaction('enemy-attack-damages-this-asset','damage-attacking-enemy',{amount:1})]}),
    rule(22,{play:fast('after-defeat-enemy','discover-local-clues',{amount:1})}),
    rule(23,{play:fast('enemy-attacks-local-investigator','cancel-attack')}),
    rule(24,{play:action('damage-all-at-location',{}, {amount:3,target:'own-or-connecting-location',includeInvestigators:true})}),
    rule(25,{committed:{success:{context:'attack',extraDamage:1}}}),
    rule(30,{play:fast('player-window','install'),static:{investigateIntellect:1}}),
    rule(31,{abilities:[action('search-draw',{exhaustSelf:true},{top:3,choose:1,target:'local-investigator',shuffle:'remaining-into-deck'})]}),
    rule(32,{abilities:[reaction('enters-play','search-draw',{deck:'own',trait:'Tome',choose:1,shuffle:'deck'})]}),
    rule(33,{static:{intellect:1},abilities:[reaction('successful-investigation','gain-resources',{amount:1})]}),
    rule(34,{abilities:boost(['intellect','agility'])}),
    rule(35,{abilities:[action('medical-test',{}, {skill:'intellect',difficulty:2,target:'local-investigator',successHeal:1,failureDamage:1})]}),
    rule(36,{play:fast('own-turn','allow-skill-substitution',{from:['combat','agility'],to:'intellect',until:'round-end',optional:true})}),
    rule(37,{play:fast('own-turn','discover-local-clues',{amount:1})}),
    rule(38,{play:action('attach-to-location'),static:{preventNonEliteEnemyEntry:true},forced:[{window:'investigator-leaves-attached-location',effect:'discard-self'}]}),
    rule(39,{committed:{success:{context:'investigate-location',additionalClues:1}}}),
    rule(44,{play:fast('player-window','install'),abilities:[weapon(0,1,{}, {succeedBy:2,additionalDamage:1})]}),
    rule(45,{abilities:[action('investigate',{exhaustSelf:true},{successReplacement:{resources:3},discoverClues:false})]}),
    rule(46,{abilities:[reaction('after-evade-enemy','draw',{cost:{exhaustSelf:true},amount:1})]}),
    rule(47,{uses:{ammo:3},abilities:[weapon(2,1,{ammo:1},{succeedBy:2,additionalDamage:1})]}),
    rule(48,{static:{additionalTurnActions:1}}),
    rule(49,{abilities:boost(['combat','agility'])}),
    rule(50,{play:fast('own-turn','disengage-and-move',{target:'revealed-empty-location'})}),
    rule(51,{play:action('fight',{}, {skill:'agility',damage:3})}),
    rule(52,{play:action('damage-local-enemy',{}, {targetMustBeExhausted:true,amount:2})}),
    rule(53,{commitRestriction:'own-test',committed:{success:{succeedBy:3,destination:'hand'}}}),
    rule(58,{uses:{secrets:4},discardIfEmpty:'secrets',abilities:[fast('player-window','gain-resources',{cost:{exhaustSelf:true,horror:1,secrets:1},amount:1})]}),
    rule(59,{static:{willpower:1}}),
    rule(60,{uses:{charges:4},abilities:[action('fight',{charges:1},{skill:'willpower',damage:2,onRevealedSymbols:{symbols:['skull','cultist','tablet','elder_thing','autofail'],horror:1}})]}),
    rule(61,{uses:{charges:3},abilities:[action('look-reorder',{charges:1,exhaustSelf:true},{top:3,deck:'investigator-or-encounter'})]}),
    rule(62,{abilities:boost(['willpower','intellect'])}),
    rule(63,{forced:[{window:'enters-play',effect:'add-self-doom',amount:1}],abilities:[fast('player-window','search-draw',{cost:{exhaustSelf:true},top:3,trait:'Spell',choose:1,shuffle:'deck'})]}),
    rule(64,{play:action('draw-encounter-then-discover',{}, {amount:2,onlyIfAlive:true})}),
    rule(65,{play:fast('draw-nonweakness-treachery','cancel-revelation-then-horror',{amount:1})}),
    rule(66,{play:action('evade',{}, {skill:'willpower',successDamage:1,onRevealedSymbols:{symbols:['skull','cultist','tablet','elder_thing','autofail'],loseTurnActions:1}})}),
    rule(67,{committed:{success:{healHorror:1}}}),
    rule(72,{}),
    rule(73,{abilities:[reaction('successful-investigation','return-item-to-hand',{succeedBy:2,cost:{exhaustSelf:true},source:'discard',choose:1})]}),
    rule(74,{abilities:[weapon(2,2,{}, {afterResolveDiscardOnSymbols:['skull','autofail']})]}),
    rule(75,{abilities:[reaction('failed-test','draw',{cost:{exhaustSelf:true},amount:1})]}),
    rule(76,{abilities:[fast('player-window','automatic-evade',{cost:{discardSelf:true},target:'local-nonelite-enemy'})]}),
    rule(77,{abilities:boost(['willpower','agility'])}),
    rule(78,{play:action('automatic-evade-all-local')}),
    rule(79,{play:fast('failed-investigation','discover-local-clues',{failByAtMost:2,amount:2})}),
    rule(80,{play:fast('would-fail-test','boost-test',{bonus:2,returnTo:'determine-success'})}),
    rule(81,{committed:{success:{context:'evade',optionalDisengageOthers:true,optionalMove:'connecting'}}}),
    rule(86,{abilities:[weapon(1),weapon(2,2,{discardSelf:true})]}),
    rule(87,{uses:{supplies:3},abilities:[action('investigate',{supplies:1},{shroudModifier:-2})]}),
    rule(88,{play:action('gain-resources',{}, {amount:3})}),
    ...[89,90,91,92].map(n=>rule(n,{maxCommittedPerTest:1,committed:{success:{draw:1}}})),
    rule(93,{maxCommittedPerTest:1}),
    rule(96,{revelation:{effect:'discard-hand-keep-one',choice:true}}),
    rule(97,{revelation:{effect:'discard-all-resources'}}),
    rule(98,{revelation:{effect:'threat'},static:{allSkills:-1},abilities:[action('discard-self',{actions:2})]}),
    rule(99,{revelation:{effect:'threat'},forced:[{window:'after-take-horror',effect:'direct-damage',amount:1}],abilities:[action('discard-self',{actions:2})]}),
    rule(100,{revelation:{effect:'threat'},forced:[{window:'after-take-damage',effect:'direct-horror',amount:1}],abilities:[action('discard-self',{actions:2})]}),
    rule(101,{spawn:'bearer',hunter:true,abilities:[action('parley-discard',{resources:4})]}),
    rule(102,{spawn:'bearer',hunter:true,forced:[{window:'after-this-enemy-attacks',effect:'add-agenda-doom',amount:1,checkAdvance:false}]}),
    rule(103,{spawn:'bearer',hunter:true,static:{blankInvestigatorIfColocated:true}})
  ]);
  if(typeof module==='object'&&module.exports)module.exports=rules;
  else root.ArkhamOfficialCardRules=rules;
})(globalThis);
