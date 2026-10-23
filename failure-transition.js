/* A terminal presentation only: never advance, replay, or restart game state. */
(() => {
  'use strict';
  let timer=null,revision=0,owner=null;
  const box=()=>document.getElementById('modalBox');
  window.resetFailureTransition=()=>{
    revision++;
    if(timer!==null)clearTimeout(timer);
    timer=null;
    if(owner)owner.failureTransitionActive=false;
    owner=null;
    box().classList.remove('failure-cinema','failure-ready');
  };
  window.beginFailureTransition=text=>{
    window.resetFailureTransition();
    if(!S||!S.gameOver)return;
    if(typeof stopEndingNarration==='function')stopEndingNarration();
    const state=S;
    openModal(`<section class="failure-scene" aria-labelledby="failureTitle">
      <div class="failure-mark" aria-hidden="true"><svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="28" cy="28" r="22"/><path d="M28 6v14l-7 7 14 5-7 8v10M8 28h12m17 0h11"/></svg></div>
      <p class="failure-eyebrow">THE DARKNESS PREVAILS</p>
      <h3 id="failureTitle" tabindex="-1">游戏失败</h3>
      <p class="failure-subtitle">调查失败 · 黑暗吞没了最后的希望</p>
      <button id="failureSkip" class="btn failure-skip">跳过动画</button>
      <div id="failureAftermath" class="failure-aftermath" aria-live="polite" hidden>
        <div class="failure-reason">${text}</div>
        <button id="failureRestart" class="btn primary" onclick="location.reload()">${uiIcon('restart')}重新开始</button>
      </div>
    </section>`);
    const ticket=revision;
    owner=state;state.failureTransitionActive=true;
    box().classList.add('failure-cinema');
    renderActions();
    document.getElementById('failureTitle')?.focus?.();
    const finish=()=>{
      if(timer!==null)clearTimeout(timer);
      timer=null;
      if(ticket!==revision||S!==state||!state.gameOver||!document.getElementById('modal').classList.contains('open'))return;
      state.failureTransitionActive=false;
      document.getElementById('failureSkip').hidden=true;
      document.getElementById('failureAftermath').hidden=false;
      box().classList.add('failure-ready');
      renderActions();
      document.getElementById('failureRestart')?.focus?.();
    };
    document.getElementById('failureSkip')?.addEventListener('click',finish,{once:true});
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)finish();
    else timer=setTimeout(finish,2400);
  };
  document.addEventListener('arkham:menu',window.resetFailureTransition);
  window.addEventListener('pagehide',window.resetFailureTransition);
})();
