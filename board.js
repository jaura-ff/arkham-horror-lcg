/* Presentation only: a bounded game table, with no game-state writes. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),game=byId('game');
  if(!game)return;
  const minimum={width:1000,height:800};
  let active=false;
  function fit(){
    if(!active)return;
    // Do not counteract the user's pinch-to-zoom accessibility gesture.
    const viewport=window.visualViewport?.scale>1?null:window.visualViewport;
    const width=Math.max(1,viewport?.width||window.innerWidth);
    const height=Math.max(1,viewport?.height||window.innerHeight);
    const scale=Math.min(1,width/minimum.width,height/minimum.height);
    game.style.setProperty('--board-scale',String(scale));
    game.style.width=`${width/scale}px`;
    game.style.height=`${height/scale}px`;
  }
  function sync(){
    const visible=game.style.display!=='none';
    if(visible===active)return;
    active=visible;
    for(const node of [document.documentElement,document.body])node.classList[active?'add':'remove']('game-fit');
    if(active){const guide=byId('playGuide');if(guide)guide.open=false;fit();}
  }
  document.addEventListener('arkham:game-started',sync);
  document.addEventListener('arkham:menu',sync);
  window.addEventListener('resize',fit);
  window.visualViewport?.addEventListener('resize',fit);
  if(typeof MutationObserver!=='undefined')new MutationObserver(sync).observe(game,{attributes:true,attributeFilter:['style']});
  for(const [id,direction] of [['handPrevious',-1],['handNext',1]])byId(id)?.addEventListener('click',()=>{
    const hand=byId('hand');
    hand?.scrollBy({left:direction*Math.max(138,hand.clientWidth*.8),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  });
  const button=byId('boardLogButton'),dialog=byId('boardLogDialog');
  button?.addEventListener('click',()=>{
    if(!active || game.inert || !dialog || dialog.open || document.querySelector('dialog[open]') || byId('modal')?.classList.contains('open'))return;
    byId('boardLogContent').innerHTML=byId('log').innerHTML;
    dialog.showModal();byId('boardLogClose').focus();
  });
  byId('boardLogClose')?.addEventListener('click',()=>dialog.close());
  dialog?.addEventListener('close',()=>{if(active&&!game.inert)button?.focus();});
  document.addEventListener('arkham:menu',()=>{if(dialog?.open)dialog.close();});
  sync();
})();
