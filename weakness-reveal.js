/* Brief mandatory reveal. Only the core callback applies card effects. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  let job=null,timer=null,version=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function clear(){if(timer!==null)clearTimeout(timer);timer=null;}
  function hide(){if(byId('weaknessReveal'))byId('modal')?.classList.remove('open');}
  function arm(){
    clear();if(!job || document.hidden)return;
    const current=job;
    timer=setTimeout(()=>{
      if(job!==current || current.ticket!==version || S!==current.owner || S.gameOver)return;
      clear();job=null;version++;hide();current.settle();
    },2200);
  }
  window.resetWeaknessReveal=()=>{version++;clear();job=null;hide();};
  window.revealWeakness=(card,settle)=>{
    if(!S || S.gameOver || S.weaknessReveal!==card || typeof settle!=='function')return false;
    window.resetWeaknessReveal();
    const current={owner:S,card,ticket:version,settle};job=current;
    const art=CARD_ART[card.id];
    openModal(`<section id="weaknessReveal" class="weakness-reveal" role="status" aria-live="assertive" aria-atomic="true">
      <p class="weakness-kicker">WEAKNESS / 抽到弱点牌</p><h3>${esc(card.name)}</h3>
      ${art?`<div class="art weakness-art" aria-hidden="true" style="--art-x:${art[0]}%;--art-y:${art[1]}%"></div>`:'<div class="weakness-no-art" aria-hidden="true">弱点</div>'}
      <p class="weakness-rule">弱点牌必须立即展示并结算</p>
      <p>${esc(card.text||'承受 1 点恐惧（理智 −1）。')}</p>
      <p class="weakness-note">不能留在手牌，也不需要出牌。片刻后自动承受 1 点恐惧（理智 −1），然后进入弃牌堆。</p>
    </section>`);
    renderActions();
    arm();
    return true;
  };
  document.addEventListener?.('arkham:menu',window.resetWeaknessReveal);
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)clear();else arm();});
  // Preserve the pending reveal through the back/forward cache, not a dead lock.
  window.addEventListener?.('pagehide',clear);
  window.addEventListener?.('pageshow',arm);
})();
