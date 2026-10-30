const {parseHTML}=require('linkedom');const fs=require('fs');const vm=require('vm');const assert=require('node:assert/strict');const path=require('path');
const raw='<i>Mira | #9BD4A8: Hello <strong>friend</strong>, "stay <em>safe</em>."</i><i>Other: A plain thought.</i>';
const {window}=parseHTML(`<html><body class="ripplestyle"><div id="extensions_settings"></div><div id="chat"><div class="mes" mesid="0" is_user="false"><div class="mesAvatarWrapper"><div class="tokenCounterDisplay">100</div></div><div class="mes_text">${raw}<i>Ordinary italics</i><pre><code><i>Example: No styling.</i></code></pre></div></div><div class="mes" mesid="1" is_user="false"><div class="mesAvatarWrapper"><div class="tokenCounterDisplay">50</div></div><div class="mes_text"><i>Appy: My thought.</i></div></div><div class="mes" is_user="true"><div class="mes_text"><i>Appy: User text.</i></div></div></div></body></html>`);
const d=window.document;Object.defineProperty(d,'baseURI',{value:'http://localhost:8000/'});
const handlers={};let saved=0,metadataSaved=0,frames=[],calls=[];
const c={name1:'Appy',name2:'Mira',characterId:0,characters:[{name:'Mira',avatar:'Mira.png'},{name:'Marco',avatar:'Marco.png'}],chat:[{mes:raw,is_user:false},{mes:'<i>Appy: My thought.</i>',is_user:false}],chatId:'one',chatMetadata:{},extensionSettings:{},saveSettingsDebounced:()=>saved++,saveMetadataDebounced:()=>metadataSaved++,getThumbnailUrl:(type,file)=>`/thumbnail?type=${type}&file=${encodeURIComponent(file)}`,getRequestHeaders:()=>({'Content-Type':'application/json'}),eventTypes:{CHAT_CHANGED:'chat',PERSONA_CHANGED:'persona',GENERATION_STARTED:'start',GENERATION_ENDED:'end'},eventSource:{on(event,f){const previous=handlers[event];handlers[event]=(...args)=>{previous?.(...args);f(...args);};}}};
const sandbox={window,document:d,MutationObserver:window.MutationObserver,NodeFilter:{SHOW_TEXT:4},SillyTavern:{getContext:()=>c},user_avatar:'Appy.png',URL,requestAnimationFrame:f=>frames.push(f),console,confirm:()=>true};
URL.createObjectURL=()=> 'blob:preview';URL.revokeObjectURL=()=>{};
sandbox.FileReader=class{readAsDataURL(file){this.result=`data:${file.type};base64,aGVsbG8=`;this.onload();}};
function api(callback){sandbox.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url,body});return callback(url,body);};}
api(()=>({ok:true,json:async()=>({path:'user/images/HivePack/upload.png'})}));
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','index.js'),'utf8').replace(/^import .*;\n/,''),sandbox);
const run=code=>vm.runInContext(code,sandbox);
async function flush(){for(let i=0;i<20;i++){const current=frames;frames=[];current.forEach(f=>f());await new Promise(r=>setTimeout(r,0));if(!frames.length)return;}throw Error('Observers did not settle');}
const click=el=>el.dispatchEvent(new window.Event('click'));
const change=el=>el.dispatchEvent(new window.Event('change'));
const button=(root,label)=>Array.from(root.querySelectorAll('button')).find(b=>b.textContent===label);
(async()=>{
await flush();const s=c.extensionSettings.hivepack,mes=d.querySelector('.mes'),text=mes.querySelector('.mes_text');
assert.equal(d.querySelectorAll('#chat .hp-monologue').length,3);assert.equal(d.querySelectorAll('#chat .rpp-column').length,2);
assert.equal(text.querySelector('.hp-monologue-name').textContent,'◈ Mira');assert.ok(text.querySelector('.hp-monologue-body strong'));assert.ok(text.querySelector('.hp-quote em')||text.querySelector('em .hp-quote'));assert.equal(d.querySelectorAll('pre .hp-monologue').length,0);
assert.equal(d.querySelector('.hp-appearance').hasAttribute('open'),false);assert.ok(d.querySelector('.hp-preview .hp-monologue'));
assert.equal(run("resolvePortrait('Marco',settings())"),'');s.aliases='Apothos = Appy';assert.match(run("resolvePortrait('Apothos',settings())"),/Appy/);
run("storeOverride('Marco',{avatar:'Marco.png'})");assert.match(run("resolvePortrait('Marco',settings())"),/Marco.png/);
run("storeOverride('Mira',{colour:'#123456',scope:''})");await flush();assert.equal(text.querySelector('.hp-monologue').style.getPropertyValue('--hp-colour'),'#123456');
run("storeOverride('Mira',{colour:'#abcdef',scope:'Mira.png'})");await flush();assert.equal(run("findOverride('Mira',settings()).colour"),'#abcdef');
c.characterId=1;c.name2='Marco';await run('schedule()');await flush();assert.equal(run("findOverride('Mira',settings()).colour"),'#123456');
c.characterId=undefined;c.name2='';run('notifyOverrides()');assert.ok(d.querySelector('.hp-override-editor .hp-scope-toggle').disabled);c.characterId=0;c.name2='Mira';run('notifyOverrides()');
assert.equal(d.querySelector('.hp-override-editor .hp-scope-toggle').disabled,false);
assert.equal(run('averagePixels([255,0,0,255,0,0,255,255,0,255,0,0])'),'#800080');assert.equal(run('averagePixels([0,0,0,0])'),null);
s.samplePortrait=true;run("photoColours.set(fullPortraitSource(resolvePortrait('Mira',settings())),{colour:'#4477aa'})");s.colourPriority=['photo','model','override','memory'];await run('schedule()');await flush();assert.equal(text.querySelector('.hp-monologue').style.getPropertyValue('--hp-colour'),'#4477aa');
s.samplePortrait=false;s.colourPriority=['model','override','memory','photo'];run('schedule()');await flush();assert.equal(text.querySelector('.hp-monologue').style.getPropertyValue('--hp-colour'),'#9BD4A8');
assert.equal(c.chatMetadata.hivepack.colours.mira,'#9BD4A8');
for(const align of ['left','center','right','stretch']){s.alignment=align;run('schedule()');await flush();assert.ok(text.querySelector('.hp-monologue').classList.contains('hp-align-'+align));assert.ok(d.querySelector('.hp-preview .hp-monologue').classList.contains('hp-align-'+align));}
s.hoverStrength=20;run('schedule()');await flush();assert.equal(d.body.style.getPropertyValue('--hp-scale'),'1.2');
let bulk=mes.querySelector('.hp-toggle-message-thoughts');click(bulk);assert.equal(mes.querySelectorAll('.hp-collapsed').length,2);click(bulk);assert.equal(mes.querySelectorAll('.hp-collapsed').length,0);
s.defaultCollapsed=true;c.chat[0].mes='<i>Mira: New default.</i>';text.innerHTML=c.chat[0].mes;await flush();assert.equal(text.querySelectorAll('.hp-collapsed').length,1);click(text.querySelector('.hp-monologue-name'));run('schedule()');await flush();assert.equal(text.querySelectorAll('.hp-collapsed').length,0);
s.defaultCollapsed=false;s.autoCollapsePrevious=true;handlers.start('normal',{},false);c.chat.push({is_user:false,mes:'<i>Mira: New reply.</i>'});handlers.end();await flush();assert.equal(text.querySelectorAll('.hp-collapsed').length,1);
// Unfinished tags remain undecorated; complete thoughts can render first.
c.chat[0].mes='<i>Mira: Complete.</i><i>Other: Still typing';text.innerHTML=c.chat[0].mes;await flush();assert.equal(text.querySelectorAll('.hp-monologue').length,1);assert.equal(text.querySelectorAll('i').length,1);
c.chat[0].mes+='.</i>';text.innerHTML=c.chat[0].mes;await flush();assert.equal(text.querySelectorAll('.hp-monologue').length,2);
for(const fallback of ['initials','silhouette','picker']){s.missingPortrait=fallback;run('schedule()');await flush();assert.ok(text.querySelector('.hp-thought-placeholder'));}
click(text.querySelector('.hp-thought-placeholder'));assert.ok(d.querySelector('.hp-override-dialog'));click(d.querySelector('.hp-override-dialog .hp-viewer-close'));assert.equal(d.querySelector('.hp-override-dialog'),null);
run("openPortraitViewer('/thumbnail?type=avatar&file=Mira.png','Mira')");assert.match(d.querySelector('.hp-portrait-dialog img').src,/characters\/Mira.png/);assert.equal(d.querySelectorAll('.hp-viewer-toolbar button').length,3);click(d.querySelector('.hp-viewer-close'));
// Uploaded photo stages a draft; Add / replace is the explicit commit.
const editor=d.querySelector('#hivepack-settings .hp-override-editor'),name=editor.querySelector('[aria-label="Override speaker name"]');name.value='Uploaded speaker';change(name);
const input=editor.querySelector('[type="file"]');Object.defineProperty(input,'files',{value:[{type:'image/png',size:5,name:'pic.png'}],configurable:true});change(input);await flush();assert.equal(editor.querySelector('.hp-editor-preview').hidden,false);assert.ok(!s.overrides.find(x=>x.name==='Uploaded speaker'));click(button(editor,'Add / replace override'));await flush();assert.equal(s.overrides.find(x=>x.name==='Uploaded speaker').image,'/user/images/HivePack/upload.png');
const colour=editor.querySelector('[aria-label="Custom override colour"]'),enable=editor.querySelector('[aria-label="Use custom override colour"]');enable.checked=true;change(enable);colour.value='#bb7722';click(button(editor,'Add / replace override'));await flush();assert.equal(s.overrides.find(x=>x.name==='Uploaded speaker').colour,'#bb7722');
await assert.rejects(run("uploadPortrait({type:'image/svg+xml',size:5})"),/Choose/);await assert.rejects(run("uploadPortrait({type:'image/png',size:20000000})"),/smaller/);
// Paginated popup, preview Back/Select flow, saved photo remains a draft until committed.
api(()=>({ok:true,json:async()=>Array.from({length:52},(_,i)=>`photo_${i}.png`)}));click(button(editor,'Browse saved photos'));await flush();let popup=d.querySelector('.hp-picker-dialog');assert.equal(popup.querySelectorAll('.hp-photo-tile').length,25);click(button(popup,'Next'));assert.match(popup.querySelector('.hp-pagination').textContent,/Page 2 of 3/);click(popup.querySelector('.hp-photo-view'));assert.ok(popup.querySelector('.hp-selected-photo'));click(button(popup,'Back'));assert.equal(popup.querySelectorAll('.hp-photo-tile').length,25);click(popup.querySelector('.hp-photo-view'));click(button(popup,'Select photo'));assert.equal(d.querySelector('.hp-picker-dialog'),null);assert.equal(s.overrides.find(x=>x.name==='Uploaded speaker').image,'/user/images/HivePack/upload.png');click(button(editor,'Add / replace override'));assert.match(s.overrides.find(x=>x.name==='Uploaded speaker').image,/photo_25.png/);
// Deleting a photo retains a colour-only override, scoped assignments included.
api(()=>({ok:true,json:async()=>[]}));await run("deletePortraitPhoto('/user/images/HivePack/photo_25.png')");assert.equal(s.overrides.find(x=>x.name==='Uploaded speaker').image,undefined);assert.equal(s.overrides.find(x=>x.name==='Uploaded speaker').colour,'#bb7722');
await assert.rejects(run("deletePortraitPhoto('/user/images/Other/photo.png')"),/Only HivePack/);
api(()=>({ok:false,status:500}));run("storeOverride('Failure',{image:'/user/images/HivePack/keep.png'})");await assert.rejects(run("deletePortraitPhoto('/user/images/HivePack/keep.png')"),/kept/);assert.ok(s.overrides.find(x=>x.name==='Failure'));
// Exercise the asynchronous image/canvas path, not only cached colour lookup.
let imageLoads=0;
const originalCreate=d.createElement.bind(d);d.createElement=(tag,...args)=>{const el=originalCreate(tag,...args);if(tag==='canvas')el.getContext=()=>({drawImage(){},getImageData(){return {data:[0,0,255,255,255,0,0,0]};}});return el;};
sandbox.Image=class {set src(value){imageLoads++;Promise.resolve().then(()=>this.onload());}};
s.samplePortrait=true;s.colourPriority=['photo','model','override','memory'];run('photoColours.clear(); schedule()');await flush();assert.equal(text.querySelector('.hp-monologue').style.getPropertyValue('--hp-colour'),'#0000ff');const loads=imageLoads;run('schedule()');await flush();assert.equal(imageLoads,loads);
sandbox.Image=class {set src(value){Promise.resolve().then(()=>this.onerror());}};run('photoColours.clear(); schedule()');await flush();assert.notEqual(text.querySelector('.hp-monologue').style.getPropertyValue('--hp-colour'),'#0000ff');
// Literal markdown bold is also decorated if the renderer leaves it inside raw HTML.
c.chat[0].mes='<i>Mira: **Important** and "a quote".</i>';text.innerHTML=c.chat[0].mes;await flush();assert.equal(text.querySelector('strong').textContent,'Important');assert.ok(text.querySelector('.hp-quote'));
const css=fs.readFileSync(path.join(__dirname,'..','style.css'),'utf8');assert.ok(!css.includes('content: \'▾'));assert.match(css,/hp-photo-picker \{ display: inline-flex;width: fit-content/);
console.log('PASS: formatting, quotes/bold, priorities, alpha-weighted averages, scoped overrides, aliases, live preview, alignment, 20% hover, collapse controls/defaults/auto-collapse, streaming, fallbacks, viewer controls, staged uploads, 25-item pagination/selection, deletion and preservation');
})().catch(error=>{console.error(error);process.exitCode=1;});
