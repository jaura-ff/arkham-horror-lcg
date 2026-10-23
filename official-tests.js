/* Executable skill-test windows; scene-specific symbol consequences are
 * returned as effects for the resolution queue, never silently applied. */
(function(root){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const core=node?require('./official-core.js'):root.ArkhamOfficialCore;
  const session=node?require('./official-session.js'):root.ArkhamOfficialSession;
  const skills=['willpower','intellect','combat','agility'];
  function blanked(s){return s.enemies.some(c=>c.code==='01103'&&c.location===s.location);}
  function value(s,skill,context){
    if(!skills.includes(skill))throw Error('Unknown skill');
    let total=s.spec.skills[skills.indexOf(skill)];
    for(const c of s.assets)total+=(c.rules.static?.[skill]||0)+(skill==='intellect'&&context==='investigate'?(c.rules.static?.investigateIntellect||0):0);
    for(const c of s.threats)total+=c.rules.static?.allSkills||0;
    return Math.max(0,total);
  }
  function begin(s,{skill,difficulty,context='effect',bonus=0}){
    if(s.stage!=='playing'||s.defeated||s.pending||s.test||!skills.includes(skill)||!Number.isFinite(difficulty)||difficulty<0||!Number.isFinite(bonus))return false;
    s.test={skill,difficulty,context,bonus,stage:'commit',committed:[],available:(s.chaos||[]).map((_,i)=>i),tokens:[],effects:[],modifier:0,autofail:false,automaticSuccess:false,wendyUsed:false};return true;
  }
  function commit(s,id){
    const t=s.test,card=s.hand.find(c=>c.instanceId===id);
    if(s.defeated||!t||t.stage!=='commit'||!card||session.weak(card)||!(card.skills[t.skill]+card.skills.wild>0))return false;
    const selected=t.committed.includes(card);
    if(selected){t.committed=t.committed.filter(c=>c!==card);return true;}
    if(card.rules.maxCommittedPerTest&&t.committed.filter(c=>c.code===card.code).length>=card.rules.maxCommittedPerTest)return false;
    t.committed.push(card);return true;
  }
  function reveal(s,random=Math.random){
    const t=s.test;if(s.defeated||!t||!['commit','draw-next'].includes(t.stage)||!t.available.length)return false;
    const r=random();if(!Number.isFinite(r)||r<0||r>=1)return false;
    const [index]=t.available.splice(Math.floor(r*t.available.length),1);
    t.current={index,token:structuredClone(s.chaos[index])};t.stage='token-choice';return true;
  }
  function redraw(s,cardId,random=Math.random){
    const t=s.test,card=s.hand.find(c=>c.instanceId===cardId);
    if(s.investigator!=='wendy'||blanked(s)||!t||t.stage!=='token-choice')return false;
    if(!core.useWendy({usedThisTest:t.wendyUsed,handCard:card,committedCards:t.committed,atRevealWindow:true,gameOver:s.defeated}))return false;
    const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)return false;
    s.hand=s.hand.filter(c=>c!==card);s.discard.push(card);t.wendyUsed=true;
    t.available.push(t.current.index);t.current=null;t.stage='draw-next';
    return reveal(s,()=>roll);
  }
  function accept(s,sceneSymbol){
    const t=s.test;if(s.defeated||!t||t.stage!=='token-choice')return false;
    const token=t.current.token;
    let outcome;
    if(token.elder){
      outcome=blanked(s)?{modifier:0}:core.elderSign(s.investigator,{localClues:s.localClues||0,
        tomes:s.assets.filter(c=>c.traits?.split('.').map(t=>t.trim()).includes('Tome')).length,
        horrorOnInvestigator:s.horror,amulet:s.assets.some(c=>c.code==='01014'),necronomicon:s.threats.some(c=>c.code==='01009')});
    }else if(token.autofail)outcome={modifier:0,autofail:true};
    else if(token.symbol){
      // No default modifier for a scenario symbol: absence of an actual rule
      // must stop resolution, rather than falsely succeeding with zero.
      if(typeof sceneSymbol!=='function')return false;
      outcome=sceneSymbol(structuredClone(token),s);if(!outcome||!Number.isFinite(outcome.modifier))return false;
    }else outcome={modifier:token.mod||0};
    if(!Number.isFinite(outcome.modifier))return false;
    t.tokens.push(token);t.effects.push(structuredClone(outcome));t.modifier+=outcome.modifier;
    t.autofail=t.autofail||!!outcome.autofail;t.automaticSuccess=t.automaticSuccess||!!outcome.automaticSuccess;t.current=null;
    t.stage=outcome.drawAgain?'draw-next':'would-determine';return true;
  }
  function result(s){
    const t=s.test;if(!t||!['would-determine','result'].includes(t.stage))return null;
    const committed=t.committed.reduce((sum,c)=>sum+c.skills[t.skill]+c.skills.wild,0);
    const raw=value(s,t.skill,t.context)+t.bonus+committed+t.modifier;
    const difficulty=t.automaticSuccess?0:t.difficulty,total=t.autofail?0:Math.max(0,raw);
    return {success:!t.autofail&&(t.automaticSuccess||total>=difficulty),total,difficulty,margin:total-difficulty,autofail:t.autofail,automaticSuccess:t.automaticSuccess};
  }
  function lucky(s,id){
    const t=s.test,card=s.hand.find(c=>c.instanceId===id),r=result(s);
    if(s.defeated||!t||t.stage!=='would-determine'||!r||r.success||r.autofail||!card||card.code!=='01080'||t.committed.includes(card)||s.resources<card.cost)return false;
    s.resources-=card.cost;s.hand=s.hand.filter(c=>c!==card);t.bonus+=2;
    if(s.assets.some(c=>c.code==='01014'))s.deck.unshift(card);else s.discard.push(card);
    return true;
  }
  function finalize(s){
    const t=s.test,r=result(s);if(!t||t.stage!=='would-determine'||!r)return false;
    t.stage='result';return true;
  }
  function finish(s){
    const t=s.test,r=result(s);if(!t||t.stage!=='result'||!r)return null;
    const effects=[];
    for(const effect of t.effects){
      if(effect.drawOnSuccess&&r.success)effects.push({effect:'draw',amount:effect.drawOnSuccess});
      if(effect.gainResourcesOnSuccess&&r.success)effects.push({effect:'gain-resources',amount:effect.gainResourcesOnSuccess});
      if(effect.loss)effects.push({effect:'loss',...effect.loss});
      if(effect.onFailure&&!r.success)effects.push(effect.onFailure);
    }
    for(const card of t.committed){
      const effect=card.rules.committed?.success;
      s.hand=s.hand.filter(c=>c!==card);
      if(r.success&&effect?.destination==='hand'&&r.margin>=effect.succeedBy)s.hand.push(card);else s.discard.push(card);
      if(r.success&&effect&&(!effect.context||effect.context===t.context||(effect.context==='investigate-location'&&t.context==='investigate'))&&(!effect.succeedBy||r.margin>=effect.succeedBy)){
        if(effect.draw)effects.push({effect:'draw',amount:effect.draw});
        if(effect.extraDamage)effects.push({effect:'attack-extra-damage',amount:effect.extraDamage});
        if(effect.additionalClues)effects.push({effect:'discover-additional-clues',amount:effect.additionalClues});
        if(effect.healHorror)effects.push({effect:'heal-horror',amount:effect.healHorror});
        if(effect.optionalDisengageOthers)effects.push({effect:'survival-instinct-choice',optionalMove:effect.optionalMove});
      }
    }
    s.test=null;return {...r,effects,tokens:t.tokens};
  }
  const api={blanked,value,begin,commit,reveal,redraw,accept,result,lucky,finalize,finish};
  if(node)module.exports=api;else root.ArkhamOfficialTests=api;
})(globalThis);
