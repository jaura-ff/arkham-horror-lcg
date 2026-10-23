/* Read-only, queued loss feedback; no focus changes or blocking dialogs. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),notice=byId('lossNotice');
  if(!notice)return;
  let queue=[],timer=null,version=0,flight=null;
  const landings=new Set();
  function cancelFlight(){
    const old=flight;flight=null;if(!old)return;
    old.animations.forEach(a=>{try{a.cancel();}catch(_){}});
    old.ghosts.forEach(g=>{try{g.hidePopover?.();}catch(_){}g.remove();});
    notice.classList.remove('loss-flying');
  }
  function clearImpact(){const panel=byId('investigator');panel?.classList.remove('is-loss-hp');panel?.classList.remove('is-loss-sanity');}
  function hide(){try{notice.hidePopover?.();}catch(_){}notice.hidden=true;notice.classList.remove('loss-enter');clearImpact();}
  window.resetLossNotices=()=>{
    version++;if(timer!==null)clearTimeout(timer);
    timer=null;queue=[];cancelFlight();landings.forEach(a=>{try{a.cancel();}catch(_){}});landings.clear();hide();
    byId('lossNoticeAmount').textContent='';byId('lossNoticeSource').textContent='';
    byId('lossNoticeTitle').textContent='';byId('lossNoticeRemaining').textContent='';
  };
  function exit(loss,ticket){
    const panel=byId('investigator');
    const target=loss.hp>0&&loss.sanity>0?panel:panel?.querySelector?.(`[data-vital="${loss.hp>0?'hp':'sanity'}"]`)||panel;
    const from=notice.getBoundingClientRect?.(),to=target?.getBoundingClientRect?.();
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(document.hidden||reduced||typeof notice.animate!=='function'||!from?.width||!to?.width||!to?.height){hide();next();return;}
    const dx=to.left+to.width/2-from.left-from.width/2,dy=to.top+to.height/2-from.top-from.height/2;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)){hide();next();return;}
    const current={animations:[],ghosts:[],end:null};flight=current;
    const transform=(x,y,scale)=>`translate(calc(-50% + ${x}px), ${y}px) scale(${scale})`;
    const frames=opacity=>[
      {offset:0,transform:transform(0,0,1),opacity},
      {offset:.24,transform:transform(dx*.06,-22,.52),opacity},
      {offset:.62,transform:transform(dx*.52,dy*.35-38,.22),opacity:opacity*.8},
      {offset:1,transform:transform(dx,dy,.08),opacity:0}
    ];
    current.end=()=>{
      if(ticket!==version||flight!==current)return;
      if(timer!==null)clearTimeout(timer);timer=null;
      cancelFlight();hide();
      const livePanel=byId('investigator'),liveTarget=loss.hp>0&&loss.sanity>0?livePanel:livePanel?.querySelector?.(`[data-vital="${loss.hp>0?'hp':'sanity'}"]`)||livePanel;
      try{const landing=liveTarget?.animate?.([{filter:'brightness(1.9)'},{filter:'brightness(1)'}],{duration:420,easing:'ease-out'});if(landing){landings.add(landing);landing.finished?.then(()=>landings.delete(landing),()=>landings.delete(landing));}}catch(_){}
      next();
    };
    try{
      notice.classList.remove('loss-enter');notice.classList.add('loss-flying');
      // Three fading copies follow the same curve, slightly behind the card.
      for(let i=3;i>=1;i--){
        if(!notice.cloneNode||!document.body?.appendChild)break;
        const ghost=notice.cloneNode(true);ghost.removeAttribute('id');ghost.removeAttribute('role');ghost.removeAttribute('aria-live');ghost.removeAttribute('aria-atomic');
        ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));ghost.setAttribute('aria-hidden','true');ghost.inert=true;
        ghost.classList.add('loss-ghost');ghost.hidden=false;document.body.appendChild(ghost);current.ghosts.push(ghost);
        try{ghost.showPopover?.();}catch(_){ghost.removeAttribute('popover');}
        current.animations.push(ghost.animate(frames(.18/i),{duration:720,delay:i*35,fill:'both',easing:'cubic-bezier(.4,0,.2,1)'}));
      }
      current.animations.push(notice.animate(frames(1),{duration:720,fill:'forwards',easing:'cubic-bezier(.4,0,.2,1)'}));
      // A bounded timer also cleans up cancelled/unsupported animation promises.
      timer=setTimeout(current.end,840);
    }catch(_){current.end();}
  }
  function next(){
    if(!queue.length){timer=null;hide();return;}
    const loss=queue.shift(),ticket=version;
    notice.dataset.kind=loss.hp>0?(loss.sanity>0?'both':'hp'):'sanity';
    byId('lossNoticeTitle').textContent=loss.hp>0?(loss.sanity>0?'生命与理智受损':'遭受伤害'):'精神受创';
    byId('lossNoticeAmount').textContent=[loss.hp>0?`生命 −${loss.hp}`:'',loss.sanity>0?`理智 −${loss.sanity}`:''].filter(Boolean).join(' · ');
    byId('lossNoticeSource').textContent=loss.source||'受到伤害';
    byId('lossNoticeRemaining').textContent=[loss.hp>0?`剩余生命 ${loss.remainingHp}`:'',loss.sanity>0?`剩余理智 ${loss.remainingSanity}`:''].filter(Boolean).join('　/　');
    notice.hidden=false;
    try{notice.showPopover?.();}catch(_){notice.removeAttribute?.('popover');}
    void notice.offsetWidth;notice.classList.add('loss-enter');
    clearImpact();const panel=byId('investigator');if(panel){void panel.offsetWidth;if(loss.hp>0)panel.classList.add('is-loss-hp');if(loss.sanity>0)panel.classList.add('is-loss-sanity');}
    timer=setTimeout(()=>{if(ticket!==version)return;exit(loss,ticket);},3000);
  }
  window.showPlayerLoss=loss=>{
    if(!S || !(loss.hp>0 || loss.sanity>0))return;
    queue.push({...loss,remainingHp:S.hp,remainingSanity:S.sanity});if(timer===null)next();
  };
  window.addEventListener?.('resize',()=>flight?.end());
  document.addEventListener?.('visibilitychange',()=>{if(document.hidden)flight?.end();});
})();
