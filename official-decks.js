/* Assemble exact starter lists, not the adapted ten-card legacy deck. */
(function(root){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const core=node?require('./official-core.js'):root.ArkhamOfficialCore;
  const catalog=node?require('./official-cards.js'):root.ArkhamOfficialCards;
  const rules=node?require('./official-card-rules.js'):root.ArkhamOfficialCardRules;
  function normalize(code){
    const card=catalog[code],rule=rules[code];
    if(!card || !rule)throw Error('Missing official definition or rule: '+code);
    return {...structuredClone(card),subtype:card.subtype_code,
      skills:{willpower:card.skill_willpower||0,intellect:card.skill_intellect||0,combat:card.skill_combat||0,agility:card.skill_agility||0,wild:card.skill_wild||0},
      rules:structuredClone(rule),uses:structuredClone(rule.uses||{}),
      exhausted:false,damage:0,horror:0,doom:0};
  }
  function basicWeaknessPool(){
    return Object.values(catalog).filter(c=>c.subtype_code==='basicweakness')
      .flatMap(c=>Array.from({length:c.quantity},()=>c.code));
  }
  function assemble(id,random=Math.random){
    const manifest=core.starterManifest(id),pool=basicWeaknessPool();
    if(!pool.length)throw Error('No basic weakness pool');
    const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Invalid random value');
    const weakness=normalize(pool[Math.floor(roll*pool.length)]);
    const definitions=Object.fromEntries(Object.keys(manifest.counts).map(code=>[code,normalize(code)]));
    return core.materialize(id,definitions,weakness);
  }
  // A separate executor-coverage gate prevents metadata/recipes from being
  // mistaken for playable cards. A handler must explicitly acknowledge the
  // exact recipe, including its forced/replacement/response timing windows.
  function releaseReadiness(executor){
    const missing=Object.keys(catalog).filter(code=>!executor?.supports?.(code,rules[code]));
    return {ready:missing.length===0,missing};
  }
  const api={normalize,basicWeaknessPool,assemble,releaseReadiness};
  if(node)module.exports=api;else root.ArkhamOfficialDecks=api;
})(globalThis);
