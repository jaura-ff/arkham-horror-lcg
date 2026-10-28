/* Read-only investigator/deck navigation. Never assembles or shuffles a deck. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('cardAtlas'),list=byId('atlasCards'),search=byId('atlasSearch'),bar=byId('atlasCategories');
  if(!dialog||!list||!search||!bar)return;
  const tabs=[...bar.querySelectorAll('button[data-atlas-type]')];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={asset:'资产',event:'事件',skill:'技能',weak:'弱点',enemy:'敌人'};
  const investigators=[],players=new Map(),enemies=[],basic=[];
  let category='all',selected=null,lastFocus=null,savedOverflow='';
  const official=typeof ArkhamPlayers!=='undefined';
  const fieldsHtml=fields=>'<dl>'+fields.map(([key,value])=>'<div><dt>'+esc(key)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>';
  const matches=(card,query)=>[card.name,card.text,card.use,labels[card.type],...(card.fields||[]).flat()].join(' ').toLocaleLowerCase().includes(query);
  function playerCard(card){
    const fields=[['编号',card.code||card.id],['打出费用',card.type==='skill'||card.type==='weak'&&card.code!=='01013'?'见牌面结算':card.cost+' 资源']];
    if(card.englishName)fields.push(['英文名称',card.englishName]);
    if(card.printedSlot||card.slot)fields.push(['槽位',card.printedSlot||card.slot]);
    if(card.icons)fields.push(['投入加值',card.icons]);
    if(card.health)fields.push(['生命',card.health]);if(card.sanity)fields.push(['理智',card.sanity]);
    return {faction_code:card.faction_code,factionLabel:card.factionLabel,id:card.code||card.id,type:card.type,name:card.name,text:card.text,fields,art:CARD_ART[card.id],use:card.code?'主动牌在手牌中确认；资产主动能力在「角色与资产能力」中发动，条件反应牌会在对应时机提示。'+(card.type==='weak'?'弱点抽到时立即展示，再按本牌效果处理；可能留在威胁区或手牌。':''):CARD_USAGE[card.id]||card.text};
  }
  function enemyCard(c,id=c.id){return {id,art:CARD_ART[id]||[100,100],type:'enemy',name:c.name,text:c.text||'在当前地点出现并与你交缠。',fields:[['战斗值',c.fight??c.enemy_fight],['生命',c.hp??c.health],['闪避值',c.evade??c.enemy_evade],['攻击伤害',c.dmg??c.enemy_damage??0],['攻击恐惧',c.horror??c.enemy_horror??0]],use:(c.hunter?'猎手：就绪且未交缠时，在敌人阶段向你移动一个相邻地点。':'非猎手：不会主动跨地点追赶。')+' 成功闪避使其力竭并脱离交缠；就绪且同地点时会重新交缠。就绪交缠敌人会在普通非战斗／闪避行动前借机攻击。'};}
  if(official){
    for(const raw of Object.values(ArkhamOfficialCards)){
      const c=ArkhamPlayers.card(ArkhamOfficialDecks.normalize(raw.code));players.set(c.code,playerCard(c));
      if(c.subtype_code==='basicweakness'){
        basic.push(c.code);
        if(c.type_code==='enemy')enemies.push(enemyCard({...c,hunter:true},c.code));
      }
    }
    for(const id of ArkhamPlayers.ids){
      const c=ArkhamPlayers.investigator(id),manifest=ArkhamOfficialCore.starterManifest(id);
      investigators.push({id,faction_code:c.faction_code,factionLabel:c.factionLabel,name:c.name,type:'investigator',role:c.role,text:c.title,symbol:c.symbol,art:INVESTIGATOR_ART[id]||(id==='roland'?[0,0]:null),fields:[['意志',c.skills[0]],['智慧',c.skills[1]],['战斗',c.skills[2]],['敏捷',c.skills[3]],['生命',c.health],['理智',c.sanity]],use:c.ability+' 上古印记：'+c.elder,counts:{...manifest.counts},fixed:32,total:33,random:true});
    }
  }else{
    const counts={};for(const c of INVESTIGATOR.deck){players.set(c.id,playerCard(c));counts[c.id]=(counts[c.id]||0)+1;}
    investigators.push({id:'roland',name:INVESTIGATOR.name,role:'守护者',type:'investigator',text:INVESTIGATOR.title,art:[0,0],fields:[['意志',INVESTIGATOR.will],['智慧',INVESTIGATOR.int],['战斗',INVESTIGATOR.combat],['敏捷',INVESTIGATOR.agility],['生命',INVESTIGATOR.maxHp],['理智',INVESTIGATOR.maxSanity]],use:'人物基础数值不是当前剩余状态。本作简化人物与配牌。',counts,fixed:INVESTIGATOR.deck.length,total:INVESTIGATOR.deck.length,random:false});
  }
  const seen=new Set();
  for(const c of [...ENCOUNTER,...(typeof CELLAR_GUARD==='undefined'?[]:[CELLAR_GUARD]),...(typeof FINAL_GUARD==='undefined'?[]:[FINAL_GUARD])]){
    if(c.type!=='enemy'||seen.has(c.name))continue;seen.add(c.name);
    const e=enemyCard(c);
    if(c.id==='cellar-keeper')e.text='第二幕首次进入地下窖室时出现；本局不重复生成。';
    if(c.id==='gate-keeper')e.text='最终幕首次进入宅邸铁门时出现；本局不重复生成。';
    enemies.push(e);
  }
  function thumb(card){return card.art?'<span class="atlas-thumb art" aria-hidden="true" style="'+cardArtStyle(card.art)+'"></span>':'<span class="atlas-stamp" aria-hidden="true">'+esc(card.symbol||labels[card.type]||card.role)+'</span>';}
  function entry(card,copies=null){return '<details class="atlas-card" data-faction="'+esc(card.faction_code||'neutral')+'"><summary>'+thumb(card)+'<span><small>'+esc(labels[card.type])+(card.factionLabel?' · '+esc(card.factionLabel):'')+(copies!==null?' · 牌组中 ×'+copies:'')+'</small><b>'+esc(card.name)+'</b></span><span class="atlas-expand" aria-hidden="true">＋</span></summary><div class="atlas-card-body">'+fieldsHtml(card.fields)+'<h3>卡牌效果</h3><p>'+esc(card.text)+'</p><h3>使用说明</h3><p>'+esc(card.use)+'</p></div></details>';}
  function heroEntry(hero){return '<button type="button" class="atlas-investigator" data-faction="'+esc(hero.faction_code||'guardian')+'" data-atlas-investigator="'+esc(hero.id)+'" aria-controls="atlasCards" aria-label="查看'+esc(hero.name)+'的牌组">'+thumb(hero)+'<span><small>'+esc(hero.factionLabel||hero.role)+' · '+esc(hero.text)+'</small><b>'+esc(hero.name)+'</b><span>'+hero.total+' 张配牌 · 点击查看牌组 →</span></span></button>';}
  function section(title,content){return '<section class="atlas-section"><h3 class="atlas-section-title">'+esc(title)+'</h3><div class="atlas-card-grid">'+content+'</div></section>';}
  const empty='<p class="atlas-empty">没有匹配的档案，试试其他名称或清空搜索。</p>';
  function render(){
    const query=search.value.trim().toLocaleLowerCase(),hero=investigators.find(c=>c.id===selected);
    tabs.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.atlasType===category)));
    byId('atlasDeckNav').hidden=!hero;
    byId('atlasDeckName').textContent=hero?hero.name+' · 起始牌组':'';
    if(hero){
      const fixed=Object.entries(hero.counts).map(([code,copies])=>({card:players.get(code),copies}));
      const found=fixed.filter(({card})=>matches(card,query));
      let content='<section class="atlas-hero-info" data-faction="'+esc(hero.faction_code||'guardian')+'"><h3>'+esc(hero.name)+' · '+esc(hero.factionLabel||hero.role)+'</h3><p>'+esc(hero.use)+'</p>'+fieldsHtml(hero.fields)+'<p>'+(hero.random?'32 张固定卡牌 ＋ 1 张随机基础弱点 ＝ 33 张；下方同名卡合并并标注张数。随机弱点不会在图鉴中抽取。':'本网页版配牌共 '+hero.total+' 张。')+'</p></section>';
      for(const type of ['asset','event','skill','weak']){
        const group=found.filter(c=>c.card.type===type);if(group.length)content+=section(labels[type],group.map(({card,copies})=>entry(card,copies)).join(''));
      }
      const pool=hero.random?basic.map(code=>players.get(code)).filter(c=>matches(c,query)):[];
      if(pool.length)content+='<details class="atlas-weakness-pool"><summary>随机基础弱点 ×1 · 查看可能的 '+pool.length+' 种弱点</summary><p class="atlas-source">实际开局只从基础盒弱点池随机加入 1 张；这里列出可能结果，不表示这些牌都在角色牌组中。</p><div class="atlas-card-grid">'+pool.map(c=>entry(c)).join('')+'</div></details>';
      if(!found.length&&!pool.length)content+=empty;
      list.innerHTML=content;
      byId('atlasCount').textContent=hero.name+' · 配牌 '+hero.total+' 张 · 显示 '+found.length+' / '+fixed.length+' 种固定卡牌'+(pool.length?' · 随机基础弱点另列':'');
      return;
    }
    const heroes=category==='enemy'?[]:investigators.filter(c=>matches(c,query)||Object.keys(c.counts).some(code=>matches(players.get(code),query)));
    const foes=category==='investigator'?[]:enemies.filter(c=>matches(c,query));
    list.innerHTML=(heroes.length?section('调查员 · 点击查看对应牌组',heroes.map(heroEntry).join('')):'')+(foes.length?section('敌人',foes.map(c=>entry(c)).join('')):'')||empty;
    byId('atlasCount').textContent='显示 '+heroes.length+' 位调查员 · '+foes.length+' 名敌人'+(category==='enemy'?'':' · 其他玩家牌请先点击调查员');
  }
  function open(){
    if(dialog.open)return;
    if(byId('modal').classList.contains('open')||!byId('tutorial').hidden){byId('guideStatus').textContent='请先完成或关闭当前弹窗，再打开卡牌图鉴。';return;}
    lastFocus=document.activeElement;search.value='';category='all';selected=null;render();
    savedOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;byId('atlasClose').focus();
  }
  list.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-atlas-investigator]');if(!button||!list.contains(button))return;
    if(!investigators.some(c=>c.id===button.dataset.atlasInvestigator))return;
    selected=button.dataset.atlasInvestigator;category='investigator';search.value='';render();
    byId('atlasBack').focus();
  });
  byId('atlasBack').addEventListener('click',()=>{const id=selected;selected=null;category='investigator';search.value='';render();list.querySelector('button[data-atlas-investigator="'+id+'"]')?.focus();});
  tabs.forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.atlasType;if(!['all','investigator','enemy'].includes(next))return;category=next;selected=null;render();}));
  byId('menuAtlasButton').addEventListener('click',open);byId('atlasButton').addEventListener('click',open);
  byId('atlasClose').addEventListener('click',()=>dialog.close());byId('atlasConfirm')?.addEventListener('click',()=>dialog.close());
  search.addEventListener('input',render);
  dialog.addEventListener('close',()=>{document.body.style.overflow=savedOverflow;if(lastFocus?.isConnected!==false)lastFocus?.focus();});
})();
