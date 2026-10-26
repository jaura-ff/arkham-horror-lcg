/* Local, non-blocking hit feedback. No animation callback mutates the game. */
(() => {
  'use strict';
  const effects=new Set();
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nodeFor=enemy=>document.querySelector(`#enemies [data-enemy-key="${enemyVisualKey(enemy)}"]`);
  function visible(rect){
    return rect&&[rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)&&rect.width>0&&rect.height>0&&rect.left+rect.width>0&&rect.top+rect.height>0&&rect.left<window.innerWidth&&rect.top<window.innerHeight;
  }
  window.captureEnemyHitOrigin=enemy=>{
    const rect=nodeFor(enemy)?.getBoundingClientRect?.();
    return visible(rect)?{key:enemyVisualKey(enemy),left:rect.left,top:rect.top,width:rect.width,height:rect.height}:null;
  };
  function remove(effect){clearTimeout(effect.timer);effect.node.remove();effects.delete(effect);}
  window.resetEnemyDamage=()=>{for(const effect of [...effects])remove(effect);};
  window.showEnemyDamage=hit=>{
    if(!S || S.gameOver || document.hidden || !hit?.enemy || !(hit.damage>0))return;
    const enemy=hit.enemy,key=enemyVisualKey(enemy),defeated=hit.remaining===0;
    if(!defeated&&!S.enemies.includes(enemy))return;
    let rect=nodeFor(enemy)?.getBoundingClientRect?.();
    if(!visible(rect)&&defeated&&hit.origin?.key===key)rect=hit.origin;
    if(!visible(rect))return;
    // Repeated rapid hits replace only that monster's old visual, never another.
    for(const effect of [...effects])if(effect.key===key)remove(effect);
    const node=document.createElement('div');
    node.className=`enemy-hit-effect${defeated?' is-defeated':''}`;
    node.dataset.enemyKey=key;node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');
    node.setAttribute('aria-label',`${enemy.card.name}失去 ${hit.damage} 点生命，剩余 ${hit.remaining}，${defeated?'已被击败':'攻击命中'}`);
    Object.assign(node.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    const ghoul=isGhoul(enemy.card);
    node.innerHTML=`${defeated?`<div class="enemy-hit-ghost"><span class="e-ico${ghoul?' art':''}" aria-hidden="true" style="--art-x:100%;--art-y:100%">${ghoul?'':esc(enemy.card.name?.slice(0,1)||'敌')}</span><span>${esc(enemy.card.name)}<small>已被击败</small></span></div>`:''}
      <div class="enemy-hit-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="enemy-hit-number"><b>−${hit.damage} 生命</b><small>${hit.before} → ${hit.remaining}${defeated?' · 击败':''}</small></div>`;
    document.body.appendChild(node);
    const effect={node,key,timer:null};effects.add(effect);effect.timer=setTimeout(()=>remove(effect),950);
  };
  document.addEventListener('arkham:menu',window.resetEnemyDamage);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)window.resetEnemyDamage();});
  window.addEventListener('pagehide',window.resetEnemyDamage);
  window.addEventListener('resize',window.resetEnemyDamage);
  window.addEventListener('scroll',window.resetEnemyDamage,true);
})();
