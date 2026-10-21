/* The original audio controls live in this native dialog; no audio proxy state. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),button=byId('gameSettingsButton'),dialog=byId('gameSettingsDialog'),close=byId('gameSettingsClose'),game=byId('game');
  if(!button||!dialog||!close||!game)return;
  button.addEventListener('click',()=>{
    if(game.style.display==='none'||game.inert||dialog.open||document.querySelector('dialog[open]')||byId('modal')?.classList.contains('open')||(typeof phaseTransitionActive!=='undefined'&&phaseTransitionActive))return;
    dialog.showModal();dialog.scrollTop=0;close.focus();
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    if(!dialog.open&&game.style.display!=='none'&&!game.inert&&button.isConnected!==false)button.focus();
  });
  document.addEventListener('arkham:menu',()=>{if(dialog.open)dialog.close();});
})();
