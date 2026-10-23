/* Contextual explanations only: never skip a phase or take an action. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),labels={investigation:'调查阶段',enemy:'敌人阶段',upkeep:'维持阶段',mythos:'神话阶段'};
  window.phaseGuideText=(phase,preview=false)=>{
    if(!S)return '';
    if(phase==='investigation'){
      const firstTurn=S.round===1 && !(preview && S.phase==='mythos');
      const opening=firstTurn?'首回合开局跳过神话阶段，从调查开始；敌人阶段仍会进行。':'调查阶段可使用 3 次行动；抽牌、资源、移动等通常各花 1 次。';
      if(!preview && S.actions<=0)return `${opening} 行动已用完，请点击「结束回合」，继续处理敌人和后续阶段。`;
      if(S.enemies.some(e=>e.engaged&&!e.exhausted))return `${opening} 有就绪敌人与你交缠：调查、移动、抽牌、资源和出牌会先触发借机攻击；战斗、闪避豁免。`;
      if(S.actIdx===0 && S.clues>=3)return `${opening} 线索已足够：可花 3 条线索和 1 次行动「推进幕」。`;
      if(S.actIdx===1)return `${opening} ${S.location==='attic'?'已到阁楼，完成调查后可以继续下一幕。':'目标已推进：前往阁楼，再用「完成调查」。'}`;
      if(S.chapter===2)return `${opening} ${S.actIdx===2?'收集 2 条线索并辨认封印，再前往仪式祭坛。':'抵达祭坛并摆脱就绪交缠敌人，执行「封印裂隙」；意志检定目标值 3，失败承受 1 恐惧，可重试。'}`;
      return `${opening} 先调查收集线索；没有敌人时无需战斗或闪避。`;
    }
    if(phase==='enemy'){
      if(!S.enemies.length)return '当前没有敌人，本阶段不会发生敌人攻击，但敌人阶段仍正常经过，并不是首回合跳过它。随后进入维持阶段。';
      return preview?'猎手先向你移动；随后就绪且与你交缠的敌人会攻击。力竭敌人不会在本阶段攻击。':'敌人阶段已结算；就绪且交缠的敌人攻击后会力竭。点击「继续」进入维持阶段。';
    }
    if(phase==='upkeep')return '维持阶段会恢复力竭牌就绪、抽 1 张玩家牌并获得 1 资源，手牌超过 8 张则弃至 8 张。这不是玩家的行动，不消耗行动次数。';
    if(phase==='mythos')return `${S.round===1?'开局已跳过一次神话阶段；现在进入下一轮的神话，不会再次跳过。':'每一轮开端都要处理神话阶段。'} 末日增加 1，检查议程，再抽遭遇牌；遭遇牌不是你的手牌。`;
    return '';
  };
  window.updatePlayGuide=()=>{
    if(!S)return;
    let label=labels[S.phase]||'',text=phaseGuideText(S.phase);
    if(S.gameOver){label=S.canContinue?'阁楼调查完成':'本局结束';text=S.canContinue?'可点击「继续下一幕」进入地下室，当前人物状态与装备会保留。':'调查已结束，可查看结局或重新开始。';}
    else if(S.test){label='技能检定';text=`可投入匹配属性的牌提高技能值，再抽混沌指示物；达到难度才算成功。${S.test.resolved?'指示物已抽取，不能返回重抽，请继续结算。':S.test.actionExempt===null?'这是已触发的强制检定，不能取消。':'抽取前可返回，不消耗行动或投入牌。'}`;}
    const title=byId('playGuideLabel'),body=byId('playGuideText');
    if(title && title.textContent!==label)title.textContent=label;
    if(body && body.textContent!==text)body.textContent=text;
  };
})();
