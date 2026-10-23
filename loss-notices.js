/* Read-only, queued loss feedback; no focus changes or blocking dialogs. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),notice=byId('lossNotice');
  if(!notice)return;
  let queue=[],timer=null,version=0;
  function clearImpact(){const panel=byId('investigator');panel?.classList.remove('is-loss-hp');panel?.classList.remove('is-loss-sanity');}
  function hide(){try{notice.hidePopover?.();}catch(_){}notice.hidden=true;notice.classList.remove('loss-enter');clearImpact();}
  window.resetLossNotices=()=>{
    version++;if(timer!==null)clearTimeout(timer);
    timer=null;queue=[];hide();
    byId('lossNoticeAmount').textContent='';byId('lossNoticeSource').textContent='';
    byId('lossNoticeTitle').textContent='';byId('lossNoticeRemaining').textContent='';
  };
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
    timer=setTimeout(()=>{if(ticket!==version)return;hide();next();},3000);
  }
  window.showPlayerLoss=loss=>{
    if(!S || !(loss.hp>0 || loss.sanity>0))return;
    queue.push({...loss,remainingHp:S.hp,remainingSanity:S.sanity});if(timer===null)next();
  };
})();
