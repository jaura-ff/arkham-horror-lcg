/* Read-only feedback after a confirmed test actually awards clues. */
(() => {
  'use strict';
  let timer=null,revision=0;
  const nodes=new Set(),animations=new Set();
  const target=()=>document.querySelector('#investigator [data-status="clues"]');
  window.resetClueFlight=()=>{
    revision++;
    if(timer!==null)clearTimeout(timer);
    timer=null;
    for(const animation of animations){try{animation.cancel();}catch(_){}}
    animations.clear();
    for(const node of nodes){try{node.hidePopover?.();}catch(_){}node.remove();}
    nodes.clear();
  };
  window.captureClueOrigin=()=>{
    try{
      const node=document.querySelector('#modalBox .test-clue-preview')||document.getElementById('modalBox');
      const rect=node?.getBoundingClientRect?.();
      return rect?.width&&rect?.height?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
    }catch(_){return null;}
  };
  window.showClueGain=(amount,origin)=>{
    window.resetClueFlight();
    if(!S||S.gameOver||!(amount>0)||document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const dest=target(),rect=dest?.getBoundingClientRect?.();
    if(!rect?.width||!rect?.height||!origin||!document.body)return;
    const dx=rect.left+rect.width/2-origin.x,dy=rect.top+rect.height/2-origin.y;
    if(![origin.x,origin.y,dx,dy].every(Number.isFinite))return;
    const ticket=revision,state=S;
    const frames=opacity=>[
      {offset:0,transform:'translate(-50%,-50%) scale(1)',opacity},
      {offset:.25,transform:`translate(calc(-50% + ${dx*.12}px),calc(-50% + ${dy*.05-30}px)) scale(1.05)`,opacity},
      {offset:.65,transform:`translate(calc(-50% + ${dx*.6}px),calc(-50% + ${dy*.4-42}px)) scale(.7)`,opacity:opacity*.85},
      {offset:1,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.18)`,opacity:0}
    ];
    try{
      for(let i=3;i>=0;i--){
        const node=document.createElement('div');
        node.className='clue-flight'+(i?' clue-flight-trail':'');
        node.setAttribute('aria-hidden','true');node.setAttribute('popover','manual');
        node.inert=true;node.style.left=`${origin.x}px`;node.style.top=`${origin.y}px`;
        node.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></svg>';
        if(!i){const label=document.createElement('span');label.textContent=`+${amount}`;node.appendChild(label);}
        nodes.add(node);document.body.appendChild(node);
        try{node.showPopover?.();}catch(_){node.removeAttribute('popover');}
        if(typeof node.animate!=='function'){window.resetClueFlight();return;}
        animations.add(node.animate(frames(i?.24/i:1),{duration:780,delay:i*30,fill:'both',easing:'cubic-bezier(.4,0,.2,1)'}));
      }
      timer=setTimeout(()=>{
        if(ticket!==revision)return;
        if(S!==state){window.resetClueFlight();return;}
        window.resetClueFlight();
        const landingTicket=revision;
        // Render may have replaced the investigator DOM: find the current clue value.
        const liveTarget=target();
        try{
          const landing=liveTarget?.animate?.([{filter:'brightness(1)',transform:'scale(1)'},{offset:.4,filter:'brightness(1.8)',transform:'scale(1.3)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:420,easing:'ease-out'});
          if(landing){animations.add(landing);timer=setTimeout(()=>{if(landingTicket===revision)window.resetClueFlight();},450);}
        }catch(_){}
      },900);
    }catch(_){window.resetClueFlight();}
  };
  window.addEventListener?.('resize',window.resetClueFlight);
  window.addEventListener?.('pagehide',window.resetClueFlight);
  document.addEventListener?.('arkham:menu',window.resetClueFlight);
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)window.resetClueFlight();});
})();
