import { user_avatar } from '../../../../script.js';

const KEY = 'hivepack';
const defaults = { enabled: true, desktopWidth: 0, mobileWidth: 0, monologues: true, hover: true, thoughtPortraits: true, rememberColours: true, collapsible: true, aliases: '', overrides: [], bubbleWidth: 450, fontSize: 92, backgroundOpacity: 8, portraitWidth: 80, hoverStrength: 1.5, cornerRadius: 7, defaultCollapsed: false, autoCollapsePrevious: false, samplePortrait: false, colourPriority: ['override','photo','model','memory'], alignment: 'left', missingPortrait: 'picker' };
let queued = false;
let revision = 0;
let lastAvatar;
let avatarUrl = '';

function context() { return SillyTavern.getContext(); }
function settings() {
    const c = context();
    c.extensionSettings[KEY] ??= { ...defaults, overrides: [], ...c.extensionSettings.ripple_persona_portrait };
    for (const [key, value] of Object.entries(defaults)) c.extensionSettings[KEY][key] ??= Array.isArray(value) ? [...value] : value;
    return c.extensionSettings[KEY];
}
function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh(); });
}
function refresh() {
    const s = settings();
    const active = s.enabled && document.body.classList.contains('ripplestyle') && Boolean(user_avatar);
    if (document.body.classList.contains('rpp-enabled') !== Boolean(active)) {
        document.body.classList.toggle('rpp-enabled', Boolean(active));
    }
    for (const [key, variable] of [['desktopWidth', '--rpp-desktop'], ['mobileWidth', '--rpp-mobile']]) {
        const n = Number(s[key]);
        if (Number.isFinite(n) && n >= 40 && n <= 400) document.body.style.setProperty(variable, `${n}px`);
        else document.body.style.removeProperty(variable);
    }
    if (user_avatar !== lastAvatar) {
        lastAvatar = user_avatar;
        revision++;
        // Original image, matching Ripple's preference for full-resolution portraits.
        avatarUrl = user_avatar ? new URL(`User Avatars/${encodeURIComponent(user_avatar)}`, document.baseURI).href : '';
        if (avatarUrl) avatarUrl += `?rpp=${revision}`;
    }
    applyAppearance(s);
    learnColours(s);
    refreshMonologues(s);
    refreshMessageButtons(s);
    refreshLivePreview();
    document.querySelectorAll('#chat > .mes').forEach(mes => {
        const eligible = active && mes.getAttribute('is_user') === 'false' && mes.getAttribute('is_system') !== 'true';
        let column = mes.querySelector(':scope > .rpp-column');
        if (!eligible) { column?.remove(); return; }
        if (!column) {
            column = document.createElement('div');
            column.className = 'rpp-column';
            column.setAttribute('aria-hidden', 'true');
            const img = document.createElement('img');
            img.className = 'rpp-image';
            img.alt = '';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
            img.addEventListener('load', () => { img.style.visibility = ''; });
            column.append(img);
            mes.append(column);
        }
        const img = column.firstElementChild;
        if (img.getAttribute('src') !== avatarUrl) img.setAttribute('src', avatarUrl);
    });
}

// Retain original rendered nodes for reversible display-only formatting.
const originals = new WeakMap();
function refreshMonologues(s) {
    if (document.body.classList.contains('hivepack-hover') !== Boolean(s.hover)) {
        document.body.classList.toggle('hivepack-hover', Boolean(s.hover));
    }
    if (!s.monologues) {
        document.querySelectorAll('#chat .hp-monologue').forEach(card => {
            const original = originals.get(card);
            if (original) card.replaceWith(original);
        });
        return;
    }
    document.querySelectorAll('#chat > .mes[is_user="false"]:not([is_system="true"]) .mes_text i').forEach(italic => {
        if (!thoughtIsComplete(italic)) return;
        if (italic.closest('pre, code, .hp-monologue') || italic.querySelector('i')) return;
        // Same name/body semantics as the user's regex, applied to rendered italic elements.
        const text = italic.textContent;
        const match = /^\s*([^:\n]+?)\s*:\s*([\s\S]*?)\s*$/.exec(text);
        if (!match) return;
        const [speaker, colour] = parseSpeaker(match[1]);
        if (!speaker) return;
        const card = document.createElement('span');
        card.dataset.hpSpeaker = speaker;
        card.dataset.hpExplicitColour = colour ?? '';
        card.className = 'hp-monologue';
        const top = document.createElement('span');
        top.className = 'hp-monologue-name';
        top.textContent = `◈ ${speaker}`;
        top.addEventListener('click', () => toggleThought(card));
        top.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleThought(card); }
        });
        const body = document.createElement('span');
        body.className = 'hp-monologue-body';
        // Clone existing sanitized inline markup rather than re-interpreting LLM text as HTML.
        body.append(...Array.from(italic.childNodes, n => n.cloneNode(true)));
        const prefix = /^\s*[^:\n]+?\s*:\s*/.exec(text)[0].length;
        const suffix = /\s*$/.exec(text)[0].length;
        trimText(body, prefix, true);
        trimText(body, suffix, false);
        const bottom = document.createElement('span');
        bottom.className = 'hp-monologue-name hp-monologue-footer';
        bottom.textContent = top.textContent;
        const content = document.createElement('span');
        content.className = 'hp-monologue-content';
        content.append(top, body, bottom);
        markBold(body);
        markQuotes(body);
        card.append(content);
        const mes = italic.closest('.mes');
        card.dataset.hpCollapseKey = `${mes?.getAttribute('mesid') ?? ''}:${text}`;
        originals.set(card, italic);
        italic.replaceWith(card);
    });
    document.querySelectorAll('#chat .hp-monologue').forEach(card => {
        applyThoughtColour(card, s);
        applyAlignment(card,s);
        updateCollapse(card, s);
        updateThoughtPortrait(card, s);
    });
}
// A missing or invalid colour falls back to the original blue-gray theme.
function parseSpeaker(header) {
    const split = header.indexOf('|');
    if (split < 0) return [header.trim(), null];
    const name = header.slice(0, split).trim();
    const colour = header.slice(split + 1).trim();
    return [name, /^#[0-9a-f]{6}$/i.test(colour) ? colour : null];
}
function normalizedName(name) {
    return String(name ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}
function updateThoughtPortrait(card, s) {
    const src = s.thoughtPortraits ? resolvePortrait(card.dataset.hpSpeaker, s) : '';
    let portrait = card.querySelector(':scope > .hp-thought-portrait');
    if (!src) {
        portrait?.remove();
        updateMissingPortrait(card,s);
        if (card.classList.contains('hp-has-portrait')) card.classList.remove('hp-has-portrait');
        return;
    }
    card.querySelector(':scope > .hp-thought-placeholder')?.remove();
    if (!portrait) {
        portrait = document.createElement('span');
        portrait.className = 'hp-thought-portrait';
        portrait.setAttribute('role', 'button');
        portrait.setAttribute('tabindex', '0');
        portrait.setAttribute('aria-label', `View portrait of ${card.dataset.hpSpeaker}`);
        const open = () => openPortraitViewer(portrait.firstElementChild.src, card.dataset.hpSpeaker);
        portrait.addEventListener('click', e => { e.stopPropagation(); open(); });
        portrait.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); open(); }
        });
        const img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => {
            img.dataset.hpFailed='true';
            portrait.hidden = true;
            card.classList.remove('hp-has-portrait');
            updateMissingPortrait(card,settings());
        });
        img.addEventListener('load', () => {
            portrait.hidden = false;
            card.classList.add('hp-has-portrait');
        });
        portrait.append(img);
        card.append(portrait);
    }
    const img = portrait.firstElementChild;
    if (img.getAttribute('src') !== src) {
        portrait.hidden = false;
        card.classList.add('hp-has-portrait');
        delete img.dataset.hpFailed;
        img.setAttribute('src', src);
    } else if(img.dataset.hpFailed==='true') updateMissingPortrait(card,s);
}
function trimText(root, count, fromStart) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (!fromStart) nodes.reverse();
    for (const node of nodes) {
        if (!count) break;
        const take = Math.min(count, node.data.length);
        node.data = fromStart ? node.data.slice(take) : node.data.slice(0, node.data.length - take);
        count -= take;
    }
}

const ranges = {
    desktopWidth: [0,400,0], mobileWidth: [0,400,0], bubbleWidth: [200,1200,450],
    fontSize: [60,150,92], backgroundOpacity: [0,60,8], portraitWidth: [35,180,80],
    hoverStrength: [0,20,1.5], cornerRadius: [0,30,7],
};
function applyAppearance(s) {
    const vars = { bubbleWidth: ['--hp-width','px'], fontSize: ['--hp-font','%'],
        portraitWidth: ['--hp-portrait-width','px'], cornerRadius: ['--hp-radius','px'] };
    for (const [key,[variable,unit]] of Object.entries(vars)) document.body.style.setProperty(variable, `${safeNumber(key,s[key])}${unit}`);
    const opacity = safeNumber('backgroundOpacity',s.backgroundOpacity) / 100;
    document.body.style.setProperty('--hp-opacity', String(opacity));
    document.body.style.setProperty('--hp-hover-opacity', String(Math.min(1,opacity + .07)));
    document.body.style.setProperty('--hp-scale', String(1 + safeNumber('hoverStrength',s.hoverStrength) / 100));
}
function safeNumber(key, value) {
    const [min,max,fallback] = ranges[key];
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min,Math.min(max,n)) : fallback;
}
function aliasMap(s) {
    const map = new Map();
    for (const line of String(s.aliases).split('\n')) {
        const i = line.indexOf('=');
        if (i > 0 && line.slice(i+1).trim()) map.set(normalizedName(line.slice(0,i)),normalizedName(line.slice(i+1)));
    }
    return map;
}
function canonicalName(name, s) {
    const map = aliasMap(s), seen = new Set();
    let key = normalizedName(name);
    while (map.has(key)) {
        if (seen.has(key)) return normalizedName(name); // Alias cycles never hang rendering.
        seen.add(key); key = map.get(key);
    }
    return key;
}
function resolvePortrait(speaker, s) {
    const c = context(), name = canonicalName(speaker,s);
    const cards = c.characters ?? [];
    const override = findOverride(speaker,s);
    if (override) {
        if (override.image) return safeImagePath(override.image);
        if (override.avatar === '@none') return '';
        if (override.avatar === '@persona') return avatarUrl;
        const card = cards.find(item => item.avatar === override.avatar);
        if (override.avatar) return card ? c.getThumbnailUrl('avatar',card.avatar) : '';
    }
    if (name === canonicalName(c.name1,s)) return avatarUrl;
    if (name === canonicalName(c.name2,s)) {
        const card = cards[c.characterId];
        if (card?.avatar && card.avatar !== 'none') return c.getThumbnailUrl('avatar',card.avatar);
    }
    // Library-wide automatic matching was unreliable in live use. Use explicit card/photo overrides.
    return '';
}
function rawThoughts(text) {
    // Ignore literal examples in fenced/inline code. Only explicitly closed tags qualify.
    const clean = String(text ?? '').replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g,'');
    return [...clean.matchAll(/<i(?:\s[^>]*)?>([\s\S]*?)<\/i\s*>/gi)];
}
function thoughtIsComplete(italic) {
    const c = context(), mes = italic.closest('.mes');
    const id = Number(mes?.getAttribute('mesid'));
    const source = c.chat?.[id]?.mes;
    const processor = c.streamingProcessor;
    const streaming = processor && !processor.isFinished && !processor.isStopped &&
        (Number(processor.messageId) === id || processor.messageDom === mes);
    if (typeof source !== 'string') return !streaming;
    // Browser HTML parsing auto-closes an unfinished <i>; count the actual closing tags instead.
    const rendered = Array.from(mes.querySelectorAll('.mes_text i, .mes_text .hp-monologue'))
        .filter(node => !node.closest('pre, code') && !node.parentElement?.closest('.hp-monologue'));
    const ordinal = rendered.indexOf(italic);
    return ordinal >= 0 && ordinal < rawThoughts(source).length;
}
function colourMemory() {
    const c = context();
    if (!c.chatMetadata || !c.getCurrentChatId?.() && !c.chatId) return null;
    c.chatMetadata.hivepack ??= {};
    c.chatMetadata.hivepack.colours ??= {};
    return c.chatMetadata.hivepack.colours;
}
function learnColours(s) {
    if (!s.rememberColours) return;
    const memory = colourMemory();
    if (!memory) return;
    let changed = false;
    for (const message of context().chat ?? []) {
        if (message.is_user || message.is_system) continue;
        for (const thought of rawThoughts(message.mes)) {
            const match = /^\s*([^:\n]+?)\s*:/.exec(thought[1]);
            if (!match) continue;
            const [speaker,colour] = parseSpeaker(match[1]);
            if (!speaker || !colour) continue;
            const key = canonicalName(speaker,s);
            if (!['__proto__','constructor','prototype'].includes(key) && memory[key] !== colour) {
                Object.defineProperty(memory,key,{value:colour,writable:true,enumerable:true,configurable:true});
                changed = true;
            }
        }
    }
    // Do not save on every pass when earlier messages have a different historical colour.
    const signature = JSON.stringify(memory);
    if (changed && signature !== savedColourSignature) {
        savedColourSignature = signature;
        context().saveMetadataDebounced?.();
    }
}
let savedColourSignature = '';
const collapsedThoughts = new Set();
const knownThoughts = new Set();
let autoCollapseBefore = -1;
let generationSnapshot = null;
function toggleThought(card) {
    if (!settings().collapsible) return;
    const key = card.dataset.hpCollapseKey;
    if (collapsedThoughts.has(key)) collapsedThoughts.delete(key);else collapsedThoughts.add(key);
    updateCollapse(card,settings());
    refreshMessageButtons(settings());
}
function updateCollapse(card,s) {
    const key = card.dataset.hpCollapseKey;
    if (!knownThoughts.has(key)) {
        knownThoughts.add(key);
        const mes = card.closest('.mes');
        const rawId = mes?.getAttribute('mesid');
        const id = rawId === null ? NaN : Number(rawId);
        if (s.defaultCollapsed || (s.autoCollapsePrevious && Number.isFinite(id) && id < autoCollapseBefore)) collapsedThoughts.add(key);
    }
    const collapsed = s.collapsible && collapsedThoughts.has(key);
    card.classList.toggle('hp-collapsed',Boolean(collapsed));
    const label = card.querySelector('.hp-monologue-name');
    if (s.collapsible) {
        label.setAttribute('role','button');label.setAttribute('tabindex','0');
        label.setAttribute('aria-expanded',String(!collapsed));
        label.title = collapsed ? 'Expand thought' : 'Collapse thought';
    } else {
        for (const attr of ['role','tabindex','aria-expanded','title']) label.removeAttribute(attr);
    }
}
function refreshMessageButtons(s) {
    document.querySelectorAll('#chat > .mes').forEach(mes => {
        const cards = Array.from(mes.querySelectorAll('.mes_text .hp-monologue'));
        let button = mes.querySelector('.hp-toggle-message-thoughts');
        const tokenCount = mes.querySelector('.mesAvatarWrapper .tokenCounterDisplay');
        if (!s.monologues || !s.collapsible || !cards.length || !tokenCount) {
            button?.remove();return;
        }
        if (!button) {
            button = document.createElement('button');button.type='button';
            button.className='hp-toggle-message-thoughts';
            button.addEventListener('click',e=>{
                e.preventDefault();e.stopPropagation();
                const current = Array.from(mes.querySelectorAll('.mes_text .hp-monologue'));
                const expand = current.every(card=>card.classList.contains('hp-collapsed'));
                for(const card of current) {
                    const key=card.dataset.hpCollapseKey;
                    if(expand)collapsedThoughts.delete(key);else collapsedThoughts.add(key);
                    updateCollapse(card,settings());
                }
                refreshMessageButtons(settings());
            });
        }
        if(tokenCount.nextElementSibling!==button) tokenCount.after(button);
        const allCollapsed=cards.every(card=>card.classList.contains('hp-collapsed'));
        const label=allCollapsed ? 'Expand thoughts' : 'Collapse thoughts';
        if(button.textContent!==label)button.textContent=label;
        button.setAttribute('aria-label',`${label} in this message`);
        button.setAttribute('aria-expanded',String(!allCollapsed));
        button.title=`${label} in this message`;
    });
}
function safeImagePath(path) {
    if(typeof path!=='string' || !path.trim())return '';
    try {
        const base=new URL(document.baseURI), url=new URL(path,base);
        // Stored uploads belong to this SillyTavern server, never another origin or a script URL.
        return url.origin===base.origin && ['http:','https:'].includes(url.protocol) ? url.href : '';
    }catch{return '';}
}
function validatePhoto(file) {
    const formats={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
    const format=formats[file?.type];
    if(!format)throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
    if(file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
    return format;
}
async function uploadPortrait(file) {
    const format=validatePhoto(file);
    const dataUrl=await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(reader.result);
        reader.onerror=()=>reject(new Error('Could not read the selected image.'));reader.readAsDataURL(file);
    });
    const response=await fetch('/api/images/upload',{
        method:'POST',headers:context().getRequestHeaders(),
        body:JSON.stringify({image:String(dataUrl).split(',')[1],format,ch_name:'HivePack',filename:`portrait_${Date.now()}_${Math.random().toString(36).slice(2,10)}`}),
    });
    if(!response.ok)throw new Error(`Image upload failed (${response.status}). Your existing override was kept.`);
    const result=await response.json();
    const path=safeImagePath(result.path);
    if(!path)throw new Error('The server returned an invalid image path. Your existing override was kept.');
    // Store a server-relative URL so it also works when opening this server from another device.
    const url=new URL(path);return `${url.pathname}${url.search}`;
}
function fullPortraitSource(src) {
    const safe=safeImagePath(src);if(!safe)return '';
    const url=new URL(safe);
    if(url.pathname.endsWith('/thumbnail') && url.searchParams.get('type')==='avatar') {
        const file=url.searchParams.get('file');
        if(file && !/[\\/]/.test(file))return new URL(`characters/${encodeURIComponent(file)}`,document.baseURI).href;
    }
    return safe;
}
let dismissPortraitViewer = null;
function openPortraitViewer(src,title='Portrait') {
    const imagePath=fullPortraitSource(src);if(!imagePath)return;
    dismissPortraitViewer?.();
    const view=createPopup(title,'hp-portrait-dialog');dismissPortraitViewer=view.close;
    const toolbar=document.createElement('div');toolbar.className='hp-viewer-toolbar';
    for(const [mode,label] of [['card','Character card'],['saved','Saved photos'],['upload','Upload photo']]) {
        toolbar.append(action(label,()=>{view.close();openOverrideDialog(title,mode);}));
    }
    const img=document.createElement('img');img.src=imagePath;img.alt=title;
    const error=document.createElement('p');error.hidden=true;error.textContent='Could not load this portrait.';
    img.addEventListener('error',()=>{img.hidden=true;error.hidden=false;});
    view.content.append(toolbar,img,error);
}
async function listPortraitPhotos() {
    const response=await fetch('/api/images/list',{method:'POST',headers:context().getRequestHeaders(),body:JSON.stringify({folder:'HivePack',sortField:'date',sortOrder:'desc'})});
    if(!response.ok)throw new Error(`Could not list saved photos (${response.status}).`);
    const files=await response.json();if(!Array.isArray(files))throw new Error('Unexpected photo list from the server.');
    return files.filter(file=>typeof file==='string' && !/[\\/]/.test(file) && /\.(png|jpe?g|webp|gif)$/i.test(file))
        .map(file=>`/user/images/HivePack/${encodeURIComponent(file)}`);
}
async function deletePortraitPhoto(image) {
    const safe=safeImagePath(image);if(!safe)throw new Error('Invalid photo path.');
    const pathname=new URL(safe).pathname;
    const prefix='/user/images/HivePack/';
    if(!pathname.startsWith(prefix))throw new Error('Only HivePack uploaded photos can be deleted here.');
    const filename=decodeURIComponent(pathname.slice(prefix.length));
    if(!filename || /[\\/]/.test(filename) || filename==='.' || filename==='..')throw new Error('Invalid photo filename.');
    const response=await fetch('/api/images/delete',{method:'POST',headers:context().getRequestHeaders(),body:JSON.stringify({path:`user/images/HivePack/${filename}`})});
    if(!response.ok)throw new Error(`Could not delete photo (${response.status}). Existing overrides were kept.`);
    settings().overrides=settings().overrides.flatMap(item=>{
        if(!item.image || safeImagePath(item.image)!==safe)return [item];
        if(item.colour)return [{...item,image:undefined,avatar:undefined}];
        return [];
    });
    notifyOverrides();
    context().saveSettingsDebounced();
}
const sources=['override','photo','model','memory'];
const sourceLabels={override:'Custom override colour',photo:'Average portrait colour',model:'Model hex code',memory:'Remembered colour'};
const overrideListeners=new Set();
function notifyOverrides(){for(const callback of overrideListeners)callback();}
function selectedCharacterKey(){const c=context();return c.characters?.[c.characterId]?.avatar || '';}
function overrideScope(item){return item.scope || '';}
function findOverride(speaker,s){
    const key=selectedCharacterKey(),canonical=canonicalName(speaker,s);
    const match=item=>normalizedName(item.name)===normalizedName(speaker);
    const alias=item=>canonicalName(item.name,s)===canonical;
    const eligible=(s.overrides??[]).filter(item=>!overrideScope(item)||overrideScope(item)===key);
    return eligible.find(item=>key && overrideScope(item)===key && match(item))
        ?? eligible.find(item=>key && overrideScope(item)===key && alias(item))
        ?? eligible.find(match) ?? eligible.find(alias);
}
function storeOverride(speaker,draft){
    const item={...draft,name:speaker.trim(),scope:draft.scope||''};
    if(!item.name)throw new Error('Enter a speaker name first.');
    if(item.scope && item.scope!==selectedCharacterKey())throw new Error('Select the character this override belongs to before saving.');
    if(item.colour && !/^#[\da-f]{6}$/i.test(item.colour))throw new Error('Choose a valid six-digit colour.');
    settings().overrides=settings().overrides.filter(old=>!(normalizedName(old.name)===normalizedName(item.name)&&overrideScope(old)===item.scope));
    settings().overrides.push(item);context().saveSettingsDebounced();notifyOverrides();schedule();
}
function priority(s){const list=Array.isArray(s.colourPriority)?s.colourPriority:[];return [...new Set([...list.filter(x=>sources.includes(x)),...sources])];}
const photoColours=new Map();
function averagePixels(pixels){
    let r=0,g=0,b=0,total=0;
    for(let i=0;i<pixels.length;i+=4){const alpha=pixels[i+3]/255;if(!alpha)continue;r+=pixels[i]*alpha;g+=pixels[i+1]*alpha;b+=pixels[i+2]*alpha;total+=alpha;}
    if(!total)return null;
    return '#'+[r,g,b].map(x=>Math.round(x/total).toString(16).padStart(2,'0')).join('');
}
function requestPhotoColour(src){
    const url=fullPortraitSource(src);if(!url)return null;
    if(photoColours.has(url))return photoColours.get(url).colour;
    const entry={colour:null};photoColours.set(url,entry);
    if(typeof Image==='undefined')return null;
    const image=new Image();
    image.onload=()=>{
        try{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const ctx=canvas.getContext('2d',{willReadFrequently:true});
            if(ctx){ctx.drawImage(image,0,0,32,32);entry.colour=averagePixels(ctx.getImageData(0,0,32,32).data);}
        }catch{entry.colour=null;}
        schedule();
    };
    image.onerror=()=>{};image.src=url;return null;
}
function resolveColour(card,s){
    const speaker=card.dataset.hpSpeaker;
    const override=findOverride(speaker,s);
    const values={override:override?.colour,model:card.dataset.hpExplicitColour,memory:s.rememberColours?colourMemory()?.[canonicalName(speaker,s)]:null};
    if(s.samplePortrait){const src=resolvePortrait(speaker,s);values.photo=src?requestPhotoColour(src):null;}
    for(const source of priority(s)){const colour=values[source];if(colour && /^#[\da-f]{6}$/i.test(colour))return colour;}
    return null;
}
function mixColour(hex,white,amount){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return '#'+rgb.map(x=>Math.round(x+(white?255-x:-x)*amount).toString(16).padStart(2,'0')).join('');}
function luminance(hex){const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function readableColour(hex,background){
    const ratio=c=>(Math.max(luminance(c),luminance(background))+.05)/(Math.min(luminance(c),luminance(background))+.05);
    if(ratio(hex)>=4.5)return hex;
    const towardsWhite=luminance(background)<.4;
    for(let amount=.1;amount<=1.01;amount+=.1){const candidate=mixColour(hex,towardsWhite,Math.min(1,amount));if(ratio(candidate)>=4.5)return candidate;}
    return towardsWhite?'#ffffff':'#000000';
}
function thoughtBackground(colour,s){
    let rgb=[21,27,36];
    if(typeof getComputedStyle==='function'){
        const css=getComputedStyle(document.body).backgroundColor;
        const match=/rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\)/.exec(css);
        if(match && (match[4]===undefined || Number(match[4])>.5))rgb=match.slice(1,4).map(Number);
    }
    const opacity=safeNumber('backgroundOpacity',s.backgroundOpacity)/100;
    const tint=[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16));
    return '#'+rgb.map((x,i)=>Math.round(x*(1-opacity)+tint[i]*opacity).toString(16).padStart(2,'0')).join('');
}
function applyThoughtColour(card,s){
    const colour=resolveColour(card,s);
    if(colour){card.style.setProperty('--hp-colour',colour);card.style.setProperty('--hp-rgb',[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).join(', '));}
    else{card.style.removeProperty('--hp-colour');card.style.removeProperty('--hp-rgb');}
    const base=colour || '#91a8c5',background=thoughtBackground(base,s);
    card.style.setProperty('--hp-label-colour',readableColour(base,background));
    card.style.setProperty('--hp-bold-colour',readableColour(mixColour(base,false,.23),background));
    card.style.setProperty('--hp-quote-colour',readableColour(mixColour(base,true,.3),background));
}
function markBold(body){
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())if(!walker.currentNode.parentElement?.closest('code,pre,strong,b'))nodes.push(walker.currentNode);
    for(const node of nodes){const text=node.data,matches=[...text.matchAll(/\*\*([\s\S]+?)\*\*/g)];if(!matches.length)continue;
        const result=document.createDocumentFragment();let offset=0;
        for(const match of matches){result.append(document.createTextNode(text.slice(offset,match.index)));const strong=document.createElement('strong');strong.textContent=match[1];result.append(strong);offset=match.index+match[0].length;}
        result.append(document.createTextNode(text.slice(offset)));node.replaceWith(result);
    }
}
function markQuotes(body){
    const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement?.closest('code, pre'))nodes.push(walker.currentNode);
    let quoted=false;
    for(const node of nodes){const fragments=String(node.data).split(/(["“”])/);if(fragments.length===1 && !quoted)continue;
        const result=document.createDocumentFragment();
        for(const part of fragments){if(!part)continue;const delimiter=/^["“”]$/.test(part);let active=quoted;
            if(delimiter){active=true;quoted=part==='“'?true:part==='”'?false:!quoted;}
            if(active){const span=document.createElement('span');span.className='hp-quote';span.textContent=part;result.append(span);}else result.append(document.createTextNode(part));
        }node.replaceWith(result);
    }
}
function applyAlignment(card,s){for(const value of ['left','center','right','stretch'])card.classList.toggle('hp-align-'+value,s.alignment===value);}
function updateMissingPortrait(card,s){
    let placeholder=card.querySelector(':scope > .hp-thought-placeholder');
    if(!s.thoughtPortraits){placeholder?.remove();return;}
    if(!placeholder){placeholder=document.createElement('span');placeholder.className='hp-thought-placeholder';placeholder.setAttribute('role','button');placeholder.setAttribute('tabindex','0');
        const open=()=>openOverrideDialog(card.dataset.hpSpeaker);
        placeholder.addEventListener('click',open);placeholder.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});card.append(placeholder);
    }
    const name=card.dataset.hpSpeaker;
    const text=s.missingPortrait==='initials'?name.split(/\s+/).map(x=>Array.from(x)[0]).slice(0,2).join('').toUpperCase():s.missingPortrait==='silhouette'?'👤':'＋ Photo';
    if(placeholder.textContent!==text)placeholder.textContent=text;
    placeholder.setAttribute('aria-label',`Set portrait for ${name}`);placeholder.title=`Set portrait for ${name}`;
}
function action(label,callback){const button=document.createElement('button');button.type='button';button.className='menu_button';button.textContent=label;button.addEventListener('click',callback);return button;}
function createPopup(title,className='hp-picker-dialog'){
    const origin=document.activeElement,dialog=document.createElement('dialog');dialog.className=className;dialog.setAttribute('aria-label',title);
    const header=document.createElement('div');header.className='hp-popup-header';const label=document.createElement('b');label.textContent=title;
    const content=document.createElement('div');content.className='hp-popup-content';
    let closed=false;
    const cleanup=()=>{if(closed)return;closed=true;document.removeEventListener('keydown',escape);dialog.querySelectorAll('.hp-override-editor').forEach(editor=>editor.hpCleanup?.());dialog.remove();if(origin?.isConnected)origin.focus?.();};
    const close=()=>{if(typeof dialog.close==='function' && dialog.open)dialog.close();cleanup();};
    const closeButton=action('Close',close);closeButton.classList.add('hp-viewer-close');
    const escape=e=>{if(e.key==='Escape' && document.querySelector('dialog:last-of-type')===dialog){e.preventDefault();close();}};
    document.addEventListener('keydown',escape);dialog.addEventListener('close',cleanup,{once:true});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
    header.append(label,closeButton);dialog.append(header,content);document.body.append(dialog);
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');closeButton.focus();return {dialog,content,close};
}
async function openSavedPhotoPicker(onSelect){
    const popup=createPopup('Saved HivePack photos');let photos=[],page=0;const size=25;
    popup.content.textContent='Loading saved photos…';
    const render=()=>{
        if(!popup.dialog.isConnected)return;popup.content.replaceChildren();
        if(!photos.length){popup.content.textContent='No saved photos yet.';return;}
        page=Math.min(page,Math.max(0,Math.ceil(photos.length/size)-1));
        const grid=document.createElement('div');grid.className='hp-photo-gallery';
        for(const image of photos.slice(page*size,(page+1)*size)){
            const tile=document.createElement('div');tile.className='hp-photo-tile';const thumb=document.createElement('img');thumb.src=image;thumb.alt='Saved portrait';thumb.loading='lazy';
            const view=action('Preview',()=>{
                popup.content.replaceChildren();const large=document.createElement('img');large.src=image;large.alt='Selected portrait';large.className='hp-selected-photo';
                popup.content.append(action('Back',render),large,action('Select photo',()=>{onSelect(image);popup.close();}));
            });view.classList.add('hp-photo-view');view.replaceChildren(thumb);view.setAttribute('aria-label','Preview saved portrait');
            const remove=action('Delete photo',async()=>{
                const uses=settings().overrides.filter(item=>item.image&&safeImagePath(item.image)===safeImagePath(image));
                if(!confirm(`Permanently delete this photo?${uses.length?' Its portrait assignments will be removed. Custom colours will be kept.':''}`))return;
                remove.disabled=true;
                try{await deletePortraitPhoto(image);photos=photos.filter(x=>x!==image);photoColours.delete(fullPortraitSource(image));schedule();render();}
                catch(error){remove.disabled=false;errorLabel.textContent=error.message;}
            });
            const errorLabel=document.createElement('small');errorLabel.setAttribute('role','status');tile.append(view,remove,errorLabel);grid.append(tile);
        }
        const pages=document.createElement('div');pages.className='hp-pagination';const previous=action('Previous',()=>{page--;render();}),next=action('Next',()=>{page++;render();});previous.disabled=page===0;next.disabled=(page+1)*size>=photos.length;
        const label=document.createElement('span');label.textContent=`Page ${page+1} of ${Math.ceil(photos.length/size)}`;pages.append(previous,label,next);popup.content.append(grid,pages);
    };
    try{photos=await listPortraitPhotos();render();}catch(error){if(popup.dialog.isConnected)popup.content.textContent=error.message;}
    return popup;
}
function buildOverrideEditor(initialName='',mode='all',initialOverride=null){
    const root=document.createElement('div');root.className='hp-override-editor';
    const instruction=document.createElement('p');instruction.textContent='1. Enter the speaker name. 2. Select a card, saved photo, or upload a photo. 3. Click Add / replace override. Set an optional colour and scope alongside it.';
    const name=document.createElement('input');name.className='text_pole';name.placeholder='Speaker name';name.value=initialName;name.setAttribute('aria-label','Override speaker name');
    const scope=action('Global',()=>{draft.scope=draft.scope?'':selectedCharacterKey();updateScope();});scope.classList.add('hp-scope-toggle');
    const colour=document.createElement('input');colour.type='color';colour.value='#91a8c5';colour.setAttribute('aria-label','Custom override colour');
    const enabled=document.createElement('input');enabled.type='checkbox';enabled.setAttribute('aria-label','Use custom override colour');
    const colourLabel=document.createElement('label');colourLabel.className='hp-colour-control';colourLabel.append(enabled,document.createTextNode('Custom colour '),colour,scope);
    const select=document.createElement('select');select.className='text_pole';select.setAttribute('aria-label','Override portrait');
    const preview=document.createElement('img');preview.className='hp-editor-preview';preview.alt='Selected override portrait';preview.hidden=true;
    const status=document.createElement('small');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    let draft={scope:''},previewUrl='',pinnedOverride=initialOverride;
    function updateScope(){scope.textContent=draft.scope?'Current character':'Global';scope.disabled=!draft.scope&&!selectedCharacterKey();scope.title=draft.scope?`Character: ${draft.scope}`:'Applies to all characters';}
    function fillOptions(){
        const selected=select.value;select.replaceChildren();
        for(const [value,label] of [['@auto','Automatic portrait (or colour only)'],...(draft.image?[['@custom','Selected custom / saved photo']]:[]),['@persona','Current persona'],['@none','No portrait'],...(context().characters??[]).filter(Boolean).map(card=>[card.avatar,`${card.name || card.data?.name || 'Character'} (${card.avatar})`])]){
            if(!value||value==='none')continue;const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
        }
        if(Array.from(select.options).some(x=>x.value===selected))select.value=selected;
    }
    function showPreview(src){const path=src?.startsWith('blob:')?src:safeImagePath(src);preview.hidden=!path;if(path)preview.src=path;else preview.removeAttribute('src');}
    function load(){
        const existing=pinnedOverride??findOverride(name.value,settings());pinnedOverride=null;
        draft={...(existing??{}),scope:existing?.scope||''};
        enabled.checked=Boolean(draft.colour);colour.value=draft.colour||'#91a8c5';colour.disabled=!enabled.checked;updateScope();
        fillOptions();select.value=draft.image?'@custom':draft.avatar||'@auto';
        showPreview(draft.image || (draft.avatar&&draft.avatar!=='@auto'&&draft.avatar!=='@none'?draft.avatar==='@persona'?avatarUrl:context().getThumbnailUrl('avatar',draft.avatar):''));
    }
    select.addEventListener('focus',fillOptions);select.addEventListener('change',()=>{
        if(select.value==='@custom')return;
        delete draft.image;draft.avatar=select.value==='@auto'?undefined:select.value;status.textContent='Portrait selected. Click Add / replace override to save.';
        showPreview(draft.avatar==='@persona'?avatarUrl:draft.avatar&&draft.avatar!=='@none'?context().getThumbnailUrl('avatar',draft.avatar):'');
    });
    name.addEventListener('change',load);
    enabled.addEventListener('change',()=>{colour.disabled=!enabled.checked;});
    const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/gif';file.className='hp-file-input';file.setAttribute('aria-label','Custom portrait image');
    const picker=action('＋ Choose custom photo',()=>file.click());picker.classList.add('hp-photo-picker');
    file.addEventListener('change',async()=>{
        const photo=file.files?.[0];if(!photo)return;
        try{
            validatePhoto(photo);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(photo);showPreview(previewUrl);
            picker.disabled=true;add.disabled=true;status.textContent='Uploading selected photo…';
            draft.image=await uploadPortrait(photo);delete draft.avatar;fillOptions();select.value='@custom';status.textContent='Photo ready. Click Add / replace override to save.';
        }catch(error){status.textContent=error.message;showPreview(draft.image || (draft.avatar&&draft.avatar!=='@none'?(draft.avatar==='@persona'?avatarUrl:context().getThumbnailUrl('avatar',draft.avatar)):''));}
        finally{picker.disabled=false;add.disabled=false;file.value='';}
    });
    const browse=action('Browse saved photos',()=>openSavedPhotoPicker(image=>{draft.image=image;delete draft.avatar;fillOptions();select.value='@custom';showPreview(image);status.textContent='Photo selected. Click Add / replace override to save.';}));
    const add=action('Add / replace override',()=>{
        try{storeOverride(name.value,{...draft,colour:enabled.checked?colour.value:''});status.textContent=`Override saved for ${name.value.trim()}.`;}
        catch(error){status.textContent=error.message;}
    });
    const actions=document.createElement('div');actions.className='hp-editor-actions';actions.append(picker,browse);
    root.append(instruction,name,colourLabel,select,file,actions,preview,add,status);
    if(mode==='upload')select.hidden=true;
    const cleanup=()=>{if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}window.removeEventListener('beforeunload',cleanup);};
    root.hpCleanup=cleanup;window.addEventListener('beforeunload',cleanup,{once:true});
    root.hpRefresh=()=>{updateScope();fillOptions();};
    load();return root;
}
function openOverrideDialog(speaker,mode='all',initialOverride=null){
    const popup=createPopup(`Portrait and colour: ${speaker}`,'hp-picker-dialog hp-override-dialog');
    const editor=buildOverrideEditor(speaker,mode,initialOverride);popup.content.append(editor);
    popup.dialog.addEventListener('close',()=>editor.hpCleanup?.(),{once:true});
    const choices=document.createElement('div');choices.className='hp-editor-actions';
    choices.append(action('Character card',()=>{const select=editor.querySelector('select');select.hidden=false;select.focus();}),action('Saved photos',()=>Array.from(editor.querySelectorAll('button')).find(x=>x.textContent==='Browse saved photos').click()),action('Upload photo',()=>editor.querySelector('input[type="file"]').click()));
    popup.content.prepend(choices);
    if(mode==='saved')Array.from(editor.querySelectorAll('button')).find(x=>x.textContent==='Browse saved photos').click();
    if(mode==='upload')editor.querySelector('input[type="file"]').click();
    if(mode==='card')editor.querySelector('select').focus();
}
let previewElement=null;
function refreshLivePreview(){
    if(!previewElement?.isConnected)return;
    const s=settings(),c=context();previewElement.dataset.hpSpeaker=c.name2||c.name1||'Preview';previewElement.dataset.hpExplicitColour='#9BD4A8';
    previewElement.querySelector('.hp-monologue-name').textContent=`◈ ${previewElement.dataset.hpSpeaker}`;
    previewElement.querySelector('.hp-monologue-footer').textContent=`◈ ${previewElement.dataset.hpSpeaker}`;
    applyThoughtColour(previewElement,s);applyAlignment(previewElement,s);updateThoughtPortrait(previewElement,s);
    previewElement.classList.remove('hp-collapsed');
}
function addSettings(){
    const host=document.querySelector('#extensions_settings');if(!host||document.getElementById('hivepack-settings'))return;
    const panel=document.createElement('div');panel.id='hivepack-settings';panel.className='extension_container';
    panel.innerHTML='<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>HivePack</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content hp-settings-content"></div></div>';
    const area=panel.querySelector('.hp-settings-content');
    const save=()=>{context().saveSettingsDebounced();schedule();};
    for(const [key,title] of Object.entries({monologues:'Style inner monologues',hover:'Hover highlight and enlargement',thoughtPortraits:'Show thought portraits',samplePortrait:'Sample average portrait colour',rememberColours:'Remember colours in this chat',collapsible:'Click speaker labels to collapse thoughts',defaultCollapsed:'Start new thought cards collapsed',autoCollapsePrevious:'Collapse earlier messages after a new AI response',enabled:'Show persona beside full messages (Ripple only)'})){
        const label=document.createElement('label');label.className='checkbox_label';const input=document.createElement('input');input.type='checkbox';input.dataset.rpp=key;input.checked=Boolean(settings()[key]);label.append(input,document.createTextNode(title));input.addEventListener('change',()=>{settings()[key]=input.checked;save();});area.append(label);
    }
    const appearance=document.createElement('details');appearance.className='hp-appearance';const summary=document.createElement('summary');summary.textContent='Appearance';appearance.append(summary);area.append(appearance);
    for(const [key,title] of Object.entries({bubbleWidth:'Maximum thought width (px)',fontSize:'Thought font size (%)',backgroundOpacity:'Background opacity (%)',portraitWidth:'Thought portrait width (px)',hoverStrength:'Hover enlargement (%)',cornerRadius:'Corner radius (px)',desktopWidth:'Full-message persona width (0 = Ripple default)',mobileWidth:'Mobile full-message persona width (0 = Ripple default)'})){
        const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.type='number';input.className='text_pole';input.dataset.rpp=key;input.min=ranges[key][0];input.max=ranges[key][1];input.step=key==='hoverStrength'?'.1':'1';input.value=settings()[key];
        input.addEventListener('input',()=>{settings()[key]=safeNumber(key,input.value);save();});input.addEventListener('change',()=>{input.value=settings()[key];});label.append(input);appearance.append(label);
    }
    function selection(key,title,options){const label=document.createElement('label');label.textContent=title;const select=document.createElement('select');select.className='text_pole';select.dataset.rpp=key;
        for(const [value,text] of options){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=settings()[key];select.addEventListener('change',()=>{settings()[key]=select.value;save();});label.append(select);appearance.append(label);
    }
    selection('alignment','Thought alignment',[['left','Left'],['center','Centered'],['right','Right'],['stretch','Full message width']]);
    selection('missingPortrait','Missing portrait appearance',[['picker','Compact photo picker'],['initials','Speaker initials'],['silhouette','Silhouette']]);
    const priorityHeading=document.createElement('b');priorityHeading.textContent='Colour priority (first available wins)';appearance.append(priorityHeading);
    const priorities=document.createElement('div');appearance.append(priorities);
    function renderPriority(){priorities.replaceChildren();priority(settings()).forEach((source,index)=>{const row=document.createElement('label');row.textContent=`${index+1}. `;const select=document.createElement('select');select.className='text_pole';select.setAttribute('aria-label',`Colour priority ${index+1}`);
        for(const value of sources){const option=document.createElement('option');option.value=value;option.textContent=sourceLabels[value];select.append(option);}select.value=source;
        select.addEventListener('change',()=>{const order=priority(settings()),other=order.indexOf(select.value);[order[index],order[other]]=[order[other],order[index]];settings().colourPriority=order;save();renderPriority();});row.append(select);priorities.append(row);});}renderPriority();
    const previewTitle=document.createElement('b');previewTitle.textContent='Live styling preview';appearance.append(previewTitle);
    const preview=document.createElement('div');preview.className='hp-preview';preview.innerHTML='<span class="hp-monologue"><span class="hp-monologue-content"><span class="hp-monologue-name"></span><span class="hp-monologue-body">An ordinary thought, <strong>an important detail</strong>, and <span class="hp-quote">“a remembered voice.”</span></span><span class="hp-monologue-name hp-monologue-footer"></span></span></span>';
    previewElement=preview.querySelector('.hp-monologue');appearance.append(preview);
    const aliasesLabel=document.createElement('label');aliasesLabel.textContent='Aliases: one Alias = Character Name per line';const aliases=document.createElement('textarea');aliases.className='text_pole';aliases.rows=4;aliases.value=settings().aliases;aliases.placeholder='Appy = Apothos';aliases.addEventListener('change',()=>{settings().aliases=aliases.value;save();});aliasesLabel.append(aliases);area.append(aliasesLabel);
    const heading=document.createElement('b');heading.textContent='Speaker portrait and colour overrides';area.append(heading);
    const editor=buildOverrideEditor();area.append(editor);
    const rows=document.createElement('div');rows.className='hp-override-list';area.append(rows);
    function renderOverrides(){
        if(!panel.isConnected)return;editor.hpRefresh?.();rows.replaceChildren();
        for(const item of settings().overrides.filter(x=>!overrideScope(x)||overrideScope(x)===selectedCharacterKey())){
            const row=document.createElement('div');row.className='hp-override-row';const name=document.createElement('span');name.textContent=`${item.name} · ${item.image?'Custom photo':item.avatar||'Automatic portrait'}`;
            const picker=document.createElement('input');picker.type='color';picker.value=item.colour||'#91a8c5';picker.setAttribute('aria-label',`Override colour for ${item.name}`);
            const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=Boolean(item.colour);enabled.setAttribute('aria-label',`Use override colour for ${item.name}`);picker.disabled=!enabled.checked;
            const change=()=>storeOverride(item.name,{...item,colour:enabled.checked?picker.value:''});picker.addEventListener('change',change);enabled.addEventListener('change',change);
            const scope=action(item.scope?'Current character':'Global',()=>{
                const old=item.scope||'',next=old?'':selectedCharacterKey();if(!old&&!next)return;
                settings().overrides=settings().overrides.filter(x=>x!==item);storeOverride(item.name,{...item,scope:next});
            });scope.disabled=!item.scope&&!selectedCharacterKey();scope.classList.add('hp-scope-toggle');
            const edit=action('Edit',()=>openOverrideDialog(item.name,'all',item));const remove=action('Remove',()=>{settings().overrides=settings().overrides.filter(x=>x!==item);context().saveSettingsDebounced();notifyOverrides();schedule();});row.append(name,enabled,picker,scope,edit,remove);rows.append(row);
        }
    }
    overrideListeners.add(renderOverrides);host.append(panel);renderOverrides();
}

function init() {
    addSettings();
    const c = context();
    const events = c.eventTypes ?? c.event_types;
    if(events.GENERATION_STARTED)c.eventSource.on(events.GENERATION_STARTED,(type,options,dryRun)=>{
        const ctx=context();
        generationSnapshot=!dryRun && !['quiet','impersonate'].includes(type) ? {chat:ctx.chat,id:ctx.getCurrentChatId?.() ?? ctx.chatId,last:ctx.chat?.at(-1)?.mes,length:ctx.chat?.length} : null;
    });
    if(events.GENERATION_ENDED)c.eventSource.on(events.GENERATION_ENDED,()=>{
        const snapshot=generationSnapshot;generationSnapshot=null;const ctx=context();
        if(!snapshot || snapshot.chat!==ctx.chat || snapshot.id!==(ctx.getCurrentChatId?.() ?? ctx.chatId))return;
        if(snapshot.length===ctx.chat?.length && snapshot.last===ctx.chat?.at(-1)?.mes)return;
        if(!settings().autoCollapsePrevious || !settings().collapsible)return;
        const latest=ctx.chat?.findLastIndex(message=>!message.is_user && !message.is_system) ?? -1;
        if(latest<0)return;autoCollapseBefore=latest;
        document.querySelectorAll('#chat > .mes').forEach(mes=>{
            const id=Number(mes.getAttribute('mesid'));if(!Number.isFinite(id) || id>=latest)return;
            mes.querySelectorAll('.hp-monologue').forEach(card=>collapsedThoughts.add(card.dataset.hpCollapseKey));
        });schedule();
    });
    for (const name of ['CHAT_CHANGED', 'CHARACTER_MESSAGE_RENDERED', 'MESSAGE_UPDATED', 'MESSAGE_DELETED', 'PERSONA_CHANGED', 'PERSONA_UPDATED', 'GENERATION_ENDED', 'GENERATION_STOPPED', 'STREAM_TOKEN_RECEIVED', 'CHARACTER_EDITED']) {
        if (events[name]) c.eventSource.on(events[name], () => {
            if (name === 'CHAT_CHANGED') { collapsedThoughts.clear();knownThoughts.clear();autoCollapseBefore=-1;generationSnapshot=null;savedColourSignature=''; }
            if (name==='CHARACTER_EDITED') photoColours.clear();
            if (['CHAT_CHANGED','CHARACTER_EDITED'].includes(name)) notifyOverrides();
            if (name.startsWith('PERSONA_')) lastAvatar = undefined;
            schedule();
        });
    }
    const chat = document.getElementById('chat');
    if (chat) new MutationObserver(records => {
        // Our own formatting can trigger one extra pass; marked cards are never rewrapped.
        if (records.some(r => r.type === 'attributes' ||
            (r.target.parentElement?.closest('.mes_text') || (r.target.nodeType === 1 && r.target.matches('.mes_text'))) ||
            [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1 &&
                !n.classList.contains('rpp-column') && (n.matches('.mes, .mes_text, i') || n.querySelector('.mes, .mes_text, i'))))) schedule();
    }).observe(chat, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['is_user', 'is_system'] });
    new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    schedule();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
