/* Original background fiction for the existing simplified scenario. */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id),dialog=byId('prologueDialog');
  if(!dialog)return;
  const scenes=[
    {title:'阿卡姆，夜色渐深',text:'1926 年，阿卡姆。雨水沿窗玻璃缓缓滑落，街上的脚步声逐渐消失，只剩远处钟楼的回响。\n\n你是联邦探员罗兰·班克斯。今晚，你留在自己的书房整理近来的调查记录。一些看似毫不相关的线索，让你迟迟无法合上卷宗。'},
    {title:'熟悉的书房，陌生的声音',text:'台灯照着摊开的文件，旧木书架在阴影里沉默。突然，地板下传来一阵抓挠声。你停下笔，声音却又消失了。\n\n一股冷风穿过房间，书页无故翻动。门外的走廊比平时更暗，楼上传来压低的说话声——可这栋房子里，本该只有你一个人。'},
    {title:'从这里，开始调查',text:'你起身检查房间。桌边散落的纸张、门缝里透出的寒意，还有那再次响起的低语，都表明这不是普通的夜晚。\n\n先查清书房里发生了什么，再循着线索探索宅邸。危险可能就在下一扇门后；在体力与理智耗尽前，你必须找到这些异象的源头。'}
  ];
  let page=0,forceTutorial=false,difficulty='standard',savedOverflow='';
  function render(){
    const scene=scenes[page];
    byId('prologueProgress').textContent=`序章 ${page+1} / ${scenes.length}`;
    byId('prologueTitle').textContent=scene.title;byId('prologueText').textContent=scene.text;
    byId('prologueDifficulty').textContent=`本局难度：${DIFFICULTIES[difficulty].name}`;
    byId('prologuePrevious').disabled=page===0;
    byId('prologueNext').textContent=page===scenes.length-1?'开始调查':'继续阅读';
    dialog.scrollTop=0;byId('prologueTitle').focus();
  }
  function finish(){
    if(!dialog.open)return;
    const tutorial=forceTutorial;
    dialog.close();document.body.style.overflow=savedOverflow;
    byId('difficultySelect').value=difficulty;
    startGame();
    document.dispatchEvent(new CustomEvent('arkham:game-started',{detail:{tutorial}}));
  }
  function back(){
    if(!dialog.open)return;
    dialog.close();document.body.style.overflow=savedOverflow;forceTutorial=false;
    document.dispatchEvent(new Event('arkham:menu'));byId('startButton').focus();
  }
  window.openPrologue=(tutorial=false)=>{
    if(S)return;
    if(dialog.open){forceTutorial=forceTutorial||tutorial;return;}
    page=0;forceTutorial=tutorial;difficulty=difficultyKey(byId('difficultySelect').value);
    savedOverflow=document.body.style.overflow;dialog.showModal();document.body.style.overflow='hidden';render();
  };
  byId('prologueNext').addEventListener('click',()=>{if(!dialog.open)return;if(page===scenes.length-1)finish();else{page++;render();gameSfx('page');}});
  byId('prologuePrevious').addEventListener('click',()=>{if(dialog.open&&page>0){page--;render();gameSfx('page');}});
  byId('prologueSkip').addEventListener('click',finish);
  byId('prologueMenu').addEventListener('click',back);
  dialog.addEventListener('cancel',event=>{event.preventDefault();back();});
})();
