/* Read-only, queued loss feedback; no focus changes or blocking dialogs. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),notice=byId('lossNotice');
  if(!notice)return;
  let queue=[],timer=null,version=0;
  function hide(){notice.hidePopover?.();notice.hidden=true;}
  window.resetLossNotices=()=>{
    version++;if(timer!==null)clearTimeout(timer);
    timer=null;queue=[];hide();
    byId('lossNoticeAmount').textContent='';byId('lossNoticeSource').textContent='';
  };
  function next(){
    if(!queue.length){timer=null;hide();return;}
    const loss=queue.shift(),ticket=version;
    byId('lossNoticeAmount').textContent=[loss.hp>0?`生命 −${loss.hp}`:'',loss.sanity>0?`理智 −${loss.sanity}`:''].filter(Boolean).join(' · ');
    byId('lossNoticeSource').textContent=loss.source||'受到伤害';
    notice.hidden=false;notice.showPopover?.();
    timer=setTimeout(()=>{if(ticket!==version)return;hide();next();},3000);
  }
  window.showPlayerLoss=loss=>{
    if(!S || !(loss.hp>0 || loss.sanity>0))return;
    queue.push({...loss});if(timer===null)next();
  };
})();
