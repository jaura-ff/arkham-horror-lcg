/* Menu-only explanation. Shares the actual bag and symbol-rule description. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const select=byId('difficultySelect'),dialog=byId('difficultyInfo');
  if(!select || !dialog)return;
  let lastFocus=null,savedOverflow='';
  function open(){
    if(byId('startOverlay').style.display==='none' || byId('cardAtlas').open || byId('modal').classList.contains('open') || !byId('tutorial').hidden)return;
    const key=difficultyKey(select.value),data=DIFFICULTIES[key],bag=makeChaosBag(key);
    updateDifficultyPreview();
    byId('difficultyInfoTitle').textContent=`${data.name}难度 · 混沌袋`;
    byId('difficultyInfoSummary').textContent=`${data.description} 袋内共 ${bag.length} 枚指示物。数字是检定修正值，「×」后是该指示物的枚数。`;
    const counts=new Map();
    bag.forEach(token=>counts.set(token.label,(counts.get(token.label)||0)+1));
    const list=byId('difficultyInfoTokens');list.replaceChildren();
    counts.forEach((count,label)=>{
      const item=document.createElement('li'),name=document.createElement('span'),amount=document.createElement('b');
      name.className='difficulty-token';name.textContent=label;amount.textContent=`× ${count}`;
      item.append(name,amount);list.append(item);
    });
    byId('difficultyInfoSide').textContent=`《聚会》参考卡：${data.hard?'困难／专家面':'简单／标准面'}`;
    byId('difficultyInfoRules').textContent=difficultySymbolText(key);
    if(dialog.open)return;
    lastFocus=document.activeElement;savedOverflow=document.body.style.overflow;
    dialog.showModal();document.body.style.overflow='hidden';dialog.scrollTop=0;
    byId('difficultyInfoClose').focus();
  }
  select.addEventListener('change',open);
  byId('difficultyInfoButton').addEventListener('click',open);
  for(const id of ['difficultyInfoClose','difficultyInfoConfirm'])byId(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.style.overflow=savedOverflow;if(lastFocus?.isConnected!==false)lastFocus?.focus();});
})();
