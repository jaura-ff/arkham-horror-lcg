/* Four fixed home tiles open native dialogs; never expand the landing page. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const pairs=[['menuDifficultyButton','homeDifficultyDialog'],['menuSettingsButton','homeSettingsDialog'],['menuCharacterButton','homeCharacterDialog']];
  let active=null,lastFocus=null,savedOverflow='';
  function restore(dialog){
    if(active!==dialog)return;
    active=null;document.body.style.overflow=savedOverflow;
    if(lastFocus?.isConnected!==false)lastFocus?.focus();
    lastFocus=null;
  }
  function close(){
    if(!active)return;
    const dialog=active;
    // Restore synchronously before Learn opens the prologue. Late close events are inert.
    if(dialog.open)dialog.close();restore(dialog);
  }
  window.closeHomeDialogs=close;
  for(const [buttonId,dialogId] of pairs){
    const button=byId(buttonId),dialog=byId(dialogId);if(!button||!dialog)continue;
    button.addEventListener('click',()=>{
      if(active || byId('startOverlay').style.display==='none' || byId('cardAtlas')?.open || byId('difficultyInfo')?.open || byId('prologueDialog')?.open)return;
      lastFocus=document.activeElement;savedOverflow=document.body.style.overflow;
      dialog.showModal();active=dialog;document.body.style.overflow='hidden';dialog.scrollTop=0;
      dialog.querySelector('[data-home-close]')?.focus();
    });
    dialog.querySelectorAll('[data-home-close]').forEach(button=>button.addEventListener('click',close));
    dialog.addEventListener('close',()=>restore(dialog));
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  }
  document.addEventListener('arkham:menu',close);
})();
