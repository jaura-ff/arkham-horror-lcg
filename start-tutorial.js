/* Ask before starting; preserve the existing Learn and prologue entry points. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('startTutorialDialog');
  if(!dialog)return;
  let active=false,savedOverflow='';
  function restore(){
    if(!active)return;
    active=false;
    document.body.style.overflow=savedOverflow;
  }
  function close(returnFocus=false){
    if(!active)return false;
    // Restore now: a queued native close event must not unlock the prologue.
    if(dialog.open)dialog.close();
    restore();
    if(returnFocus)byId('startButton').focus();
    return true;
  }
  function choose(tutorial){
    if(close())beginPrologue(tutorial);
  }
  window.requestGameStart=()=>{
    if(active || (typeof S!=='undefined' && S) || byId('startOverlay').style.display==='none' || document.querySelector('dialog[open]'))return;
    savedOverflow=document.body.style.overflow;
    dialog.showModal();active=true;
    document.body.style.overflow='hidden';
    byId('startWithTutorial').focus();
  };
  byId('startWithTutorial').addEventListener('click',()=>choose(true));
  byId('startWithoutTutorial').addEventListener('click',()=>choose(false));
  byId('startTutorialCancel').addEventListener('click',()=>close(true));
  dialog.addEventListener('cancel',event=>{event.preventDefault();close(true);});
  dialog.addEventListener('close',restore);
  document.addEventListener('arkham:menu',()=>close());
})();
