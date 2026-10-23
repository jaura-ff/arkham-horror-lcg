/* Standard Core Set only. This module is not enabled in the legacy game until
 * every card and timing window has an integrated, tested handler.
 * Starter lists: FFG Starter Decklists v2.0, pages 2–4.
 * Card numbers are collector numbers, not array indices or legacy card IDs.
 */
(function(root){
  'use strict';
  const code=n=>'01'+String(n).padStart(3,'0');
  const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
  const specs={
    roland:{name:'罗兰·班克斯',title:'联邦探员',number:1,skills:[3,3,4,2],health:9,sanity:5,classes:['guardian','seeker'],signature:6,weakness:7,groups:[16,30],neutralSkills:[89,92]},
    daisy:{name:'黛西·沃克',title:'图书管理员',number:2,skills:[3,5,2,2],health:5,sanity:9,classes:['seeker','mystic'],signature:8,weakness:9,groups:[30,58],neutralSkills:[90,92]},
    skids:{name:'“斯基兹”·奥图尔',title:'前科犯',number:3,skills:[2,3,3,4],health:8,sanity:6,classes:['rogue','guardian'],signature:10,weakness:11,groups:[44,16],neutralSkills:[89,91]},
    agnes:{name:'艾格尼丝·贝克',title:'女服务员',number:4,skills:[5,2,2,3],health:6,sanity:8,classes:['mystic','survivor'],signature:12,weakness:13,groups:[58,72],neutralSkills:[90,93]},
    wendy:{name:'温蒂·亚当斯',title:'街头孤儿',number:5,skills:[4,3,1,4],health:7,sanity:7,classes:['survivor','rogue'],signature:14,weakness:15,groups:[72,44],neutralSkills:[91,93]}
  };
  const source='https://images-cdn.fantasyflightgames.com/filer_public/c0/87/c087e26e-c6d6-4533-ba2e-2b97b3f05917/ahc_decklists_v20_web.pdf';
  function investigator(id){
    const value=specs[id];if(!value)throw new Error('Unknown standard investigator: '+id);
    return {...value,id,skills:[...value.skills],classes:[...value.classes],groups:[...value.groups],neutralSkills:[...value.neutralSkills]};
  }
  function starterManifest(id){
    const s=investigator(id),counts={};
    const add=(n,copies=1)=>{counts[code(n)]=(counts[code(n)]||0)+copies;};
    s.groups.forEach(start=>range(start,start+9).forEach(n=>add(n)));
    [86,87,88,...s.neutralSkills].forEach(n=>add(n,2));
    add(s.signature);add(s.weakness);
    return {investigator:code(s.number),counts,randomBasicWeakness:1,regularSize:30,totalSize:33,source};
  }
  // Materialize physical copies: shared card definitions must not share uses,
  // damage, exhaustion or identity. Resolve the random weakness before shuffle.
  function materialize(id,catalog,basicWeakness){
    const manifest=starterManifest(id);
    if(!basicWeakness || basicWeakness.subtype!=='basicweakness')throw new Error('A real basic weakness is required');
    const cards=[];
    for(const [id,count] of Object.entries(manifest.counts)){
      if(!catalog[id])throw new Error('Missing official card definition: '+id);
      for(let i=0;i<count;i++)cards.push({...structuredClone(catalog[id]),code:id,instanceId:id+':'+i});
    }
    cards.push({...structuredClone(basicWeakness),instanceId:basicWeakness.code+':basic'});
    return cards;
  }
  function initialAbilityState(){return {turn:0,phase:0,skidsTurn:null,daisyTurn:null,agnesPhase:null,rolandRound:null};}
  function useSkids(state,{turn,resources,ownTurn,playerWindow,gameOver=false}){
    if(gameOver || !ownTurn || !playerWindow || resources<2 || state.skidsTurn===turn)return null;
    return {state:{...state,skidsTurn:turn},resourceCost:2,additionalActions:1};
  }
  function useDaisy(state,{turn,ownTurn,isTomeAbility,actionCost=1,gameOver=false}){
    if(gameOver || !ownTurn || !isTomeAbility || actionCost<1 || state.daisyTurn===turn)return null;
    return {state:{...state,daisyTurn:turn},restrictedAction:1};
  }
  function reactAgnes(state,{phase,horrorPlaced,enemyAtLocation,gameOver=false}){
    if(gameOver || horrorPlaced<1 || !enemyAtLocation || state.agnesPhase===phase)return null;
    return {state:{...state,agnesPhase:phase},damage:1};
  }
  function reactRoland(state,{round,defeatedEnemy,enemyAtLocation,availableClues,gameOver=false}){
    if(gameOver || !defeatedEnemy || !enemyAtLocation || availableClues<1 || state.rolandRound===round)return null;
    return {state:{...state,rolandRound:round},clues:1};
  }
  function useWendy({usedThisTest,handCard,committedCards=[],atRevealWindow,gameOver=false}){
    if(gameOver || usedThisTest || !atRevealWindow || !handCard || handCard.type==='weak' || handCard.subtype==='weakness' || handCard.subtype==='basicweakness' || committedCards.includes(handCard))return null;
    // The caller cancels this token's effects, returns it to the bag, then draws
    // again. The discarded card is the cost, not an optional later payment.
    return {discardInstance:handCard.instanceId,cancelToken:true,returnToken:true,drawAgain:true,usedThisTest:true};
  }
  function elderSign(id,{localClues=0,tomes=0,horrorOnInvestigator=0,amulet=false,necronomicon=false}={}){
    investigator(id);
    if(id==='daisy' && necronomicon)return {modifier:0,autofail:true};
    if(id==='roland')return {modifier:localClues};
    if(id==='daisy')return {modifier:0,drawOnSuccess:tomes};
    if(id==='skids')return {modifier:2,gainResourcesOnSuccess:2};
    if(id==='agnes')return {modifier:horrorOnInvestigator};
    return {modifier:0,automaticSuccess:amulet};
  }
  const api={investigator,starterManifest,materialize,initialAbilityState,useSkids,useDaisy,reactAgnes,reactRoland,useWendy,elderSign,source};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ArkhamOfficialCore=api;
})(globalThis);
