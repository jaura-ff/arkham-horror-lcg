/* Read-only catalogue: all card values come from this game's definitions. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const dialog = byId('cardAtlas'), list = byId('atlasCards');
  const search = byId('atlasSearch'), filter = byId('atlasFilter');
  if (!dialog || !list || !search || !filter) return;
  const types = {investigator:'调查员',asset:'资产',event:'事件',skill:'技能',weak:'弱点',enemy:'敌人',treachery:'诡计',location:'地点',act:'幕',agenda:'议程'};
  const usage = CARD_USAGE;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards = [];
  const add = (type,name,text,fields,use,art=null) => cards.push({type,name,text,fields,use,art});
  add('investigator',INVESTIGATOR.name,INVESTIGATOR.title,
    [['意志',INVESTIGATOR.will],['智慧',INVESTIGATOR.int],['战斗',INVESTIGATOR.combat],['敏捷',INVESTIGATOR.agility],['生命',INVESTIGATOR.maxHp],['理智',INVESTIGATOR.maxSanity]],
    '这些是开局基础值，不是当前剩余状态。上古印记按当前地点每个线索 +1，不保证成功或治疗。本作未实现实体罗兰的完整人物能力；受伤、恐惧与临时检定加值请以游戏面板为准。',[0,0]);
  for (const c of INVESTIGATOR.deck) {
    const fields = [['打出费用',c.type==='skill'||c.type==='weak'?'不直接打出':c.cost+' 资源']];
    if(c.slot) fields.push(['槽位',(c.slots||1)+' 只手槽']);
    if(c.icons) fields.push(['投入加值',c.icons]);
    add(c.type,c.name,c.text,fields,usage[c.id],CARD_ART[c.id]);
  }
  const seen = new Set();
  for (const c of ENCOUNTER) {
    if(seen.has(c.name)) continue;
    seen.add(c.name);
    if(c.type==='enemy') add(c.type,c.name,'遭遇抽到后，生成在你当前的地点并交缠。',
      [['战斗难度',c.fight],['生命',c.hp],['闪避难度',c.evade],['攻击伤害',c.dmg],['攻击恐惧',c.horror],['胜利点',c.victory]],
      (c.hunter?'猎手：就绪且未交缠时，每个敌人阶段向你移动一个相邻地点。':'非猎手：不会主动跨地点追赶。')+' 成功闪避使其力竭并脱离交缠；就绪且同地点时会重新交缠。交缠的就绪敌人会在普通非战斗／闪避行动前借机攻击。');
    else add(c.type,c.name,c.text,[],c.id.startsWith('ancient')?'抽到后自动增加 1 末日，并检查议程推进，然后弃置。':'抽到后自动打开意志难度 2 的检定。可投入匹配技能牌；失败失去 1 理智，成功则不受恐惧，之后弃置。');
  }
  for(const [id,c] of Object.entries(LOCATIONS)) add('location',c.name,c.desc,
    [['遮蔽',c.shroud],['初始线索',c.clues],['相邻地点',c.conn.map(key=>LOCATIONS[key].name).join('、')]],
    '移动消耗 1 行动，只能前往相邻地点。调查以智慧对抗遮蔽；成功获得这里的 1 个线索。图鉴显示初始线索，不是剩余线索。');
  ACT_DECK.forEach(c=>add('act','幕 '+c.id,c.text,[],c.id==='1a'?'本作推进幕需花 3 线索和 1 行动；不是免行动操作。':'推进幕后到达阁楼，再执行「完成调查」行动获胜。'));
  AGENDA_DECK.forEach(c=>add('agenda','议程 '+c.id,c.text,[['末日门槛',c.threshold||'终局']],c.threshold?'神话阶段或卡牌效果增加末日；达到门槛后自动推进并清除当前末日。':'本作的失败终局，推进到此时调查结束。'));
  function render() {
    const query=search.value.trim().toLocaleLowerCase();
    const matches=cards.filter(c=>(filter.value==='all'||c.type===filter.value) && [c.name,c.text,c.use,types[c.type],...c.fields.flat()].join(' ').toLocaleLowerCase().includes(query));
    byId('atlasCount').textContent=`显示 ${matches.length} / ${cards.length} 条档案（同名遭遇牌合并）`;
    list.innerHTML=matches.length?matches.map(c=>`<details class="atlas-card"><summary>${c.art?`<span class="atlas-thumb art" aria-hidden="true" style="--art-x:${c.art[0]}%;--art-y:${c.art[1]}%"></span>`:`<span class="atlas-stamp" aria-hidden="true">${types[c.type]}</span>`}<span><small>${types[c.type]}</small><b>${esc(c.name)}</b></span><span class="atlas-expand" aria-hidden="true">＋</span></summary><div class="atlas-card-body"><dl>${c.fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl><h3>本作牌面效果</h3><p>${esc(c.text)}</p><h3>本作使用说明</h3><p>${esc(c.use)}</p></div></details>`).join(''):'<p class="atlas-empty">没有匹配的卡牌，试试其他名称或切回“全部类型”。</p>';
  }
  let lastFocus=null,savedOverflow='';
  function open() {
    if(dialog.open)return;
    if(byId('modal').classList.contains('open') || !byId('tutorial').hidden){
      byId('guideStatus').textContent='请先完成或关闭当前弹窗，再打开卡牌图鉴。';return;
    }
    lastFocus=document.activeElement;
    search.value='';filter.value='all';render();
    savedOverflow=document.body.style.overflow;
    dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
    byId('atlasClose').focus();
  }
  byId('menuAtlasButton').addEventListener('click',open);
  byId('atlasButton').addEventListener('click',open);
  byId('atlasClose').addEventListener('click',()=>dialog.close());
  byId('atlasConfirm')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.style.overflow=savedOverflow;if(lastFocus?.isConnected!==false)lastFocus?.focus();});
  search.addEventListener('input',render);filter.addEventListener('change',render);
})();
