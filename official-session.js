/* Executable setup and player-state primitives. No legacy game globals. */
(function(root){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const decks=node?require('./official-decks.js'):root.ArkhamOfficialDecks;
  const core=node?require('./official-core.js'):root.ArkhamOfficialCore;
  const weak=c=>['weakness','basicweakness'].includes(c.subtype);
  const integer=n=>Number.isInteger(n)&&n>=0;
  function shuffle(cards,random){
    for(let i=cards.length-1;i>0;i--){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error('Invalid random value');const j=Math.floor(r*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
    return cards;
  }
  function create(id,random=Math.random){
    const spec=core.investigator(id),deck=shuffle(decks.assemble(id,random),random);
    return {investigator:id,spec,stage:'opening',round:1,phase:'setup',turn:0,
      resources:5,actions:3,damage:0,horror:0,clues:0,mentalTrauma:0,physicalTrauma:0,
      experiencePenalty:0,deck,hand:[],discard:[],removed:[],assets:[],threats:[],enemies:[],
      ability:core.initialAbilityState(),pending:null,defeated:false,mulliganUsed:false,events:[]};
  }
  // Opening cards and replacements ignore weaknesses. Rejected cards remain
  // outside the deck until every replacement has been drawn.
  function openingDraw(s,n,held){
    if(s.deck.filter(c=>!weak(c)).length<n)throw Error('Not enough non-weakness cards for opening hand');
    let count=0;
    while(count<n&&s.deck.length){const c=s.deck.pop();if(weak(c))held.push(c);else{s.hand.push(c);count++;}}
    if(count!==n)throw Error('Not enough non-weakness cards for opening hand');
  }
  function opening(s,random=Math.random){
    if(s.stage!=='opening')throw Error('Opening already drawn');
    const held=[];openingDraw(s,5,held);s.deck.push(...held);shuffle(s.deck,random);s.stage='mulligan';
  }
  function mulligan(s,instanceIds=[],random=Math.random){
    if(s.stage!=='mulligan'||s.mulliganUsed)throw Error('Mulligan unavailable');
    if(new Set(instanceIds).size!==instanceIds.length||instanceIds.some(id=>!s.hand.some(c=>c.instanceId===id)))throw Error('Invalid mulligan selection');
    const rejected=s.hand.filter(c=>instanceIds.includes(c.instanceId)),held=[];
    s.hand=s.hand.filter(c=>!instanceIds.includes(c.instanceId));openingDraw(s,rejected.length,held);
    s.deck.push(...rejected,...held);shuffle(s.deck,random);s.mulliganUsed=true;s.stage='ready';
  }
  function begin(s){
    if(s.stage!=='ready')throw Error('Complete opening choice first');
    s.stage='playing';s.phase='investigation';s.turn++;
  }
  function find(s,id){return [...s.hand,...s.assets,...s.threats].find(c=>c.instanceId===id);}
  function blocked(s){return s.defeated||s.pending||s.stage!=='playing';}
  function pay(s,cost={},source=null,horrorAllocation=[]){
    if(blocked(s))return false;
    const keys=['actions','resources','horror'];
    if(keys.some(k=>cost[k]!==undefined&&!integer(cost[k])))return false;
    if(s.actions<(cost.actions||0)||s.resources<(cost.resources||0))return false;
    if(cost.actions&&(s.phase!=='investigation'))return false;
    if((cost.exhaustSelf||cost.discardSelf||['ammo','charges','supplies','secrets'].some(k=>cost[k]))&&(!source||![...s.assets,...s.threats].includes(source)))return false;
    if(cost.horror&&!validLoss(s,0,cost.horror,horrorAllocation,false))return false;
    if(cost.exhaustSelf&&(!source||source.exhausted))return false;
    if(cost.discardSelf&&(!source||!s.assets.includes(source)))return false;
    if(cost.discardSelf&&source.rules.cannotLeaveWith&&source[source.rules.cannotLeaveWith]>0)return false;
    for(const use of ['ammo','charges','supplies','secrets'])if(cost[use]!==undefined&&(!integer(cost[use])||!source||!(source.uses[use]>=cost[use])))return false;
    s.actions-=cost.actions||0;s.resources-=cost.resources||0;
    for(const use of ['ammo','charges','supplies','secrets'])if(cost[use])source.uses[use]-=cost[use];
    if(cost.exhaustSelf)source.exhausted=true;
    if(cost.horror)assignLoss(s,0,cost.horror,horrorAllocation);
    if(cost.discardSelf)discardAsset(s,source);
    const empty=source?.rules.discardIfEmpty;
    if(empty&&source.uses[empty]===0&&s.assets.includes(source))discardAsset(s,source);
    return true;
  }
  function discardAsset(s,card){
    if(card.rules.cannotLeaveWith&&card[card.rules.cannotLeaveWith]>0)throw Error('Asset cannot leave play');
    s.assets=s.assets.filter(c=>c!==card);s.threats=s.threats.filter(c=>c!==card);s.discard.push(card);
  }
  function slotUsage(assets){
    const slots={Hand:0,TomeHand:0,Arcane:0,Body:0,Ally:0,Accessory:0};
    for(const card of assets){
      if(!card.printedSlot&&!card.slot)continue;
      const [slot,count]=(card.printedSlot||card.slot).split(' x'),n=Number(count||1);
      if(!Number.isInteger(n)||n<1||!(slot in slots))throw Error('Unsupported slot');
      if(slot==='Hand'&&card.traits?.split('.').map(t=>t.trim()).includes('Tome'))slots.TomeHand+=n;
      else slots[slot]+=n;
    }
    return slots;
  }
  function fits(assets){
    const slots=slotUsage(assets),extra=assets.some(c=>c.code==='01008')?2:0;
    return slots.Hand+Math.max(0,slots.TomeHand-extra)<=2&&slots.Arcane<=2&&slots.Body<=1&&slots.Ally<=1&&slots.Accessory<=1;
  }
  function install(s,instanceId,replacements=[]){
    const card=s.hand.find(c=>c.instanceId===instanceId);
    if(blocked(s)||!card||card.type_code!=='asset'||weak(card)||new Set(replacements).size!==replacements.length)return false;
    const removed=replacements.map(id=>s.assets.find(c=>c.instanceId===id));
    if(removed.some(c=>!c||(c.rules.cannotLeaveWith&&c[c.rules.cannotLeaveWith]>0)))return false;
    const retained=s.assets.filter(c=>!removed.includes(c));
    if(!fits([...retained,...s.threats.filter(c=>c.type_code==='asset'),card]))return false;
    // Slots do not permit discarding unrelated assets voluntarily.
    if(removed.some(c=>fits([...retained,...s.threats.filter(t=>t.type_code==='asset'),card,c])))return false;
    const cost={resources:card.cost,actions:card.rules.play?.timing==='fast'?0:1};
    if(!integer(card.cost)||!pay(s,cost))return false;
    removed.forEach(c=>discardAsset(s,c));s.hand=s.hand.filter(c=>c!==card);s.assets.push(card);
    s.events.push({type:'asset-entered',instanceId:card.instanceId});
    return true;
  }
  function checkDefeat(s){
    const defeated=s.damage>=s.spec.health||s.horror>=s.spec.sanity;
    if(defeated&&!s.defeated){s.defeated=true;s.events.push({type:'investigator-defeated',damage:s.damage>=s.spec.health,horror:s.horror>=s.spec.sanity});}
    return defeated;
  }
  function validLoss(s,damage,horror,allocation=[],direct=false){
    if(blocked(s)||!integer(damage)||!integer(horror)||!Array.isArray(allocation))return false;
    if(direct&&allocation.length)return false;
    if(new Set(allocation.map(a=>a.instanceId)).size!==allocation.length)return false;
    let assignedDamage=0,assignedHorror=0;
    for(const a of allocation){
      const card=s.assets.find(c=>c.instanceId===a.instanceId);
      if(!card||!integer(a.damage)||!integer(a.horror))return false;
      if(a.damage>(card.health||0)-card.damage||a.horror>(card.sanity||0)-card.horror)return false;
      assignedDamage+=a.damage;assignedHorror+=a.horror;
    }
    if(assignedDamage>damage||assignedHorror>horror)return false;
    return true;
  }
  function assignLoss(s,damage,horror,allocation=[],direct=false){
    if(!validLoss(s,damage,horror,allocation,direct))return false;
    const assignedDamage=allocation.reduce((n,a)=>n+a.damage,0),assignedHorror=allocation.reduce((n,a)=>n+a.horror,0);
    // Both kinds are placed simultaneously before any asset is defeated.
    for(const a of allocation){const card=s.assets.find(c=>c.instanceId===a.instanceId);card.damage+=a.damage;card.horror+=a.horror;s.events.push({type:'asset-loss-placed',instanceId:a.instanceId,damage:a.damage,horror:a.horror});}
    const ownDamage=damage-assignedDamage,ownHorror=horror-assignedHorror;s.damage+=ownDamage;s.horror+=ownHorror;
    if(ownDamage||ownHorror)s.events.push({type:'investigator-loss-placed',damage:ownDamage,horror:ownHorror});
    for(const card of [...s.assets])if((card.health&&card.damage>=card.health)||(card.sanity&&card.horror>=card.sanity))discardAsset(s,card);
    checkDefeat(s);return true;
  }
  const api={create,opening,mulligan,begin,find,pay,install,fits,slotUsage,assignLoss,checkDefeat,discardAsset,weak};
  if(node)module.exports=api;else root.ArkhamOfficialSession=api;
})(globalThis);
