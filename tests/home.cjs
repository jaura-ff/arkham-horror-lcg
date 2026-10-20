const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),home=html.slice(html.indexOf('<div id="startOverlay">'),html.indexOf('<div id="game"')),css=fs.readFileSync(path.join(root,'home.css'),'utf8');
test('首页主要入口在说明前，两组内容默认折叠而非铺满首屏',()=>{
 assert.ok(home.indexOf('id="startButton"')<home.indexOf('id="homeSettings"'));for(const id of ['homeSettings','homeHelp']){assert.match(home,new RegExp('<details id="'+id+'" class="home-group" name="home-panels">'));}assert.doesNotMatch(home,/case-route|case-stop|case-bottom/);assert.match(home,/门后的低语，正在等你靠近/);
});
test('设置收纳原难度和声音，教学图鉴收纳到指南且保留唯一入口ID',()=>{
 const settings=home.slice(home.indexOf('id="homeSettings"'),home.indexOf('id="homeHelp"')),help=home.slice(home.indexOf('id="homeHelp"'));for(const id of ['difficultySelect','difficultyInfoButton','difficultyPreview','difficultyBag','difficultyScope','menuSoundToggle','menuAmbientToggle','menuSoundVolume'])assert.ok(settings.includes('id="'+id+'"'),id);for(const id of ['learnButton','menuAtlasButton'])assert.ok(help.includes('id="'+id+'"'),id);for(const id of ['startButton','learnButton','menuAtlasButton','difficultySelect','soundToggle','ambientToggle','soundVolume'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
test('首页设置复用原音效控制，不增加独立音频或第二套偏好',()=>{
 assert.match(home,/document.getElementById\('soundToggle'\).click\(\)/);assert.match(home,/document.getElementById\('ambientToggle'\).click\(\)/);assert.match(home,/document.getElementById\('soundVolume'\).dispatchEvent/);assert.match(home,/<label for="menuSoundVolume">/);assert.match(home,/<select id="difficultySelect"[^>]*aria-describedby/);
});
test('首页局部样式兼容手机横竖屏、键盘焦点，装饰不参与交互',()=>{
 assert.match(html,/home.css\?v=grouped-menu-1/);assert.match(css,/min-height:100dvh/);assert.match(css,/min-height:44px/);assert.match(css,/:focus-visible/);assert.match(css,/@media\(max-width:760px\)/);assert.match(css,/orientation:landscape/);assert.match(home,/<aside class="home-case" aria-hidden="true">/);assert.match(css,/pointer-events:none/);assert.doesNotMatch(css,/animation:|position:fixed/);
});
