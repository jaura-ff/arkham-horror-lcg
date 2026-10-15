/* Announce a phase before its effects; never rewind or replay game state. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('phaseAnnouncement');
  if(!dialog)return;
  const labels={investigation:'调查阶段',enemy:'敌人阶段',upkeep:'维持阶段',mythos:'神话阶段'};
  let timer=null,version=0;
  window.resetPhaseAnnouncement=()=>{
    version++;
    if(timer!==null)clearTimeout(timer);
    timer=null;phaseTransitionActive=false;
    if(dialog.open)dialog.close();
  };
  window.announcePhase=(phase,continuePhase)=>{
    if(!S || S.gameOver || !labels[phase] || phaseTransitionActive)return;
    const state=S,from=S.phase,ticket=++version;
    phaseTransitionActive=true;
    byId('phaseAnnouncementTitle').textContent=labels[phase];
    byId('phaseAnnouncementRound').textContent=`第 ${S.round+(from==='mythos'&&phase==='investigation'?1:0)} 回合`;
    renderActions();dialog.showModal();byId('phaseAnnouncementTitle').focus();
    timer=setTimeout(()=>{
      if(ticket!==version)return;
      timer=null;phaseTransitionActive=false;
      if(dialog.open)dialog.close();
      if(S!==state || !S || S.gameOver || S.phase!==from){if(S)renderActions();return;}
      continuePhase();
      if(S)renderActions();
      document.dispatchEvent(new Event('arkham:phase-ready'));
      // Phase effects may have opened a mandatory test/ending modal.
      if(!byId('modal').classList.contains('open') && byId('tutorial').hidden){
        (document.querySelector('#actions .btn:not(:disabled)')||byId('menuButton'))?.focus();
      }
    },3000);
  };
  dialog.addEventListener('cancel',event=>event.preventDefault());
})();
