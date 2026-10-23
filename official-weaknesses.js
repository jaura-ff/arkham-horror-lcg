/* Revelation/turn-end/finish execution for standard Core weaknesses. */
(function(root){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const session=node?require('./official-session.js'):root.ArkhamOfficialSession;
  const shuffle=(cards,random)=>{for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;};
  function queue(s){return s.effectQueue||(s.effectQueue=[]);}
  function reveal(s,card){
    switch(card.code){
      case '01007':card.clues=3;s.threats.push(card);break;
      case '01009':card.horror=3;s.threats.push(card);s.events.push({type:'check-slots',instanceId:card.instanceId});break;
      case '01011':card.resources=0;card.paymentsRound=null;card.payments=0;s.threats.push(card);break;
      case '01013':s.hand.push(card);break;
      case '01015':queue(s).unshift({kind:'loss',damage:0,horror:2,direct:true},{kind:'abandon-discard'},{kind:'discard',card});break;
      case '01096':queue(s).unshift({kind:'amnesia',card});break;
      case '01097':s.resources=0;s.discard.push(card);break;
      case '01098':case '01099':case '01100':s.threats.push(card);break;
      case '01101':case '01102':case '01103':s.enemies.push({...card,location:s.location||'study',engaged:true,exhausted:false,damage:0});break;
      default:throw Error('Unsupported weakness '+card.code);
    }
  }
  function draw(s,count=1,random=Math.random){
    if(s.pending||s.defeated||s.stage!=='playing'||!Number.isInteger(count)||count<0)return false;
    queue(s).push({kind:'draw',count});pump(s,random);return true;
  }
  function pump(s,random=Math.random){
    while(queue(s).length&&!s.pending&&!s.defeated){
      const item=queue(s).shift();
      if(item.kind==='draw'){
        if(!item.count)continue;
        if(!s.deck.length){
          if(!s.discard.length)continue;
          s.deck=shuffle(s.discard,random);s.discard=[];
          queue(s).unshift({kind:'loss',damage:0,horror:1,direct:false},item);continue;
        }
        const card=s.deck.pop();queue(s).unshift({kind:'draw',count:item.count-1});
        if(session.weak(card))reveal(s,card);else s.hand.push(card);
      }else if(item.kind==='loss'){
        if(item.direct){
          const beforeDamage=s.damage,beforeHorror=s.horror;
          session.assignLoss(s,item.damage,item.horror,[],true);
          forcedAfterLoss(s,s.damage-beforeDamage,s.horror-beforeHorror);
        }else s.pending={...item};
      }else if(item.kind==='amnesia'){
        const candidates=s.hand.filter(c=>!session.weak(c));
        if(candidates.length<=1)s.discard.push(item.card);
        else s.pending={kind:'amnesia',card:item.card,candidates:candidates.map(c=>c.instanceId)};
      }else if(item.kind==='abandon-discard'){
        s.removed.push(...s.discard);s.discard=[];
      }else if(item.kind==='discard')s.discard.push(item.card);
      else throw Error('Unknown pending weakness operation '+item.kind);
    }
    // A resolving weakness still goes to discard if its own damage defeated
    // the investigator. Cleanup is not another gameplay action.
    if(s.defeated){
      for(const item of queue(s))if(item.kind==='discard')s.discard.push(item.card);
      s.effectQueue=[];s.pending=null;
    }
  }
  function forcedAfterLoss(s,damage,horror){
    if(s.defeated)return;
    // Forced effects occur per damage/horror event, not once per token.
    const effects=[];
    if(horror>0)for(const card of s.threats.filter(c=>c.code==='01099'))effects.push({kind:'loss',damage:1,horror:0,direct:true});
    if(damage>0)for(const card of s.threats.filter(c=>c.code==='01100'))effects.push({kind:'loss',damage:0,horror:1,direct:true});
    queue(s).unshift(...effects);
  }
  function chooseAmnesia(s,keepId,random=Math.random){
    const p=s.pending;if(p?.kind!=='amnesia'||!p.candidates.includes(keepId))return false;
    const discarded=s.hand.filter(c=>!session.weak(c)&&c.instanceId!==keepId);
    s.hand=s.hand.filter(c=>session.weak(c)||c.instanceId===keepId);s.discard.push(...discarded,p.card);s.pending=null;pump(s,random);return true;
  }
  function chooseLoss(s,allocation=[],random=Math.random){
    const p=s.pending;if(p?.kind!=='loss')return false;
    s.pending=null;const beforeDamage=s.damage,beforeHorror=s.horror;
    if(!session.assignLoss(s,p.damage,p.horror,allocation,p.direct)){s.pending=p;return false;}
    forcedAfterLoss(s,s.damage-beforeDamage,s.horror-beforeHorror);pump(s,random);return true;
  }
  function endTurn(s,random=Math.random){
    if(s.pending||s.defeated||s.stage!=='playing'||s.endedTurn===s.turn)return false;
    s.endedTurn=s.turn;
    for(const card of s.hand.filter(c=>c.code==='01013'))queue(s).push({kind:'loss',damage:0,horror:2,direct:false});
    pump(s,random);return true;
  }
  function payDebt(s,instanceId){
    const card=s.threats.find(c=>c.instanceId===instanceId&&c.code==='01011');
    if(!card||s.pending||s.defeated||s.stage!=='playing'||s.resources<1)return false;
    const used=card.paymentsRound===s.round?card.payments:0;if(used>=2)return false;
    s.resources--;card.resources++;card.paymentsRound=s.round;card.payments=used+1;return true;
  }
  function finishScenario(s){
    if(s.scenarioFinished)return false;
    s.scenarioFinished=true;
    for(const card of s.threats){
      if(card.code==='01007'&&card.clues>0)s.mentalTrauma++;
      if(card.code==='01011'&&(card.resources||0)<6)s.experiencePenalty+=2;
    }
    if(s.defeated){if(s.damage>=s.spec.health)s.physicalTrauma++;if(s.horror>=s.spec.sanity)s.mentalTrauma++;}
    return true;
  }
  const api={draw,reveal,pump,chooseAmnesia,chooseLoss,endTurn,payDebt,finishScenario,forcedAfterLoss};
  if(node)module.exports=api;else root.ArkhamOfficialWeaknesses=api;
})(globalThis);
