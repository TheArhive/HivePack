import { user_avatar } from '../../../../script.js';

const KEY = 'hivepack';
const defaults = { enabled: true, desktopWidth: 0, mobileWidth: 0, monologues: true, hover: true, thoughtPortraits: true, rememberColours: true, collapsible: true, aliases: '', overrides: [], bubbleWidth: 450, fontSize: 92, backgroundOpacity: 8, portraitWidth: 80, hoverStrength: 1.5, cornerRadius: 7, defaultCollapsed: false, autoCollapsePrevious: false };
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
        card.append(content);
        const mes = italic.closest('.mes');
        card.dataset.hpCollapseKey = `${mes?.getAttribute('mesid') ?? ''}:${text}`;
        originals.set(card, italic);
        italic.replaceWith(card);
    });
    document.querySelectorAll('#chat .hp-monologue').forEach(card => {
        applyThoughtColour(card, s);
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
        if (card.classList.contains('hp-has-portrait')) card.classList.remove('hp-has-portrait');
        return;
    }
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
            portrait.hidden = true;
            card.classList.remove('hp-has-portrait');
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
        img.setAttribute('src', src);
    }
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
    const override = (s.overrides ?? []).find(item => normalizedName(item.name) === normalizedName(speaker))
        ?? (s.overrides ?? []).find(item => canonicalName(item.name,s) === name);
    if (override) {
        if (override.image) return safeImagePath(override.image);
        if (override.avatar === '@none') return '';
        if (override.avatar === '@persona') return avatarUrl;
        const card = cards.find(item => item.avatar === override.avatar);
        return card ? c.getThumbnailUrl('avatar',card.avatar) : '';
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
function applyThoughtColour(card, s) {
    const explicit = card.dataset.hpExplicitColour;
    const remembered = s.rememberColours ? colourMemory()?.[canonicalName(card.dataset.hpSpeaker,s)] : null;
    const colour = explicit || remembered;
    if (colour && /^#[0-9a-f]{6}$/i.test(colour)) {
        card.style.setProperty('--hp-colour',colour);
        card.style.setProperty('--hp-rgb',[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).join(', '));
    } else {
        card.style.removeProperty('--hp-colour');card.style.removeProperty('--hp-rgb');
    }
}
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
    const origin=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='hp-portrait-dialog';dialog.setAttribute('aria-label',title);
    const close=document.createElement('button');close.type='button';close.className='hp-viewer-close';close.textContent='Close';
    const img=document.createElement('img');img.src=imagePath;img.alt=title;
    const error=document.createElement('p');error.hidden=true;error.textContent='Could not load this portrait.';
    img.addEventListener('error',()=>{img.hidden=true;error.hidden=false;});
    const cleanup=()=>{document.removeEventListener('keydown',escape);dialog.remove();dismissPortraitViewer=null;origin?.focus?.();};
    const dismiss=()=>{if(typeof dialog.close==='function')dialog.close();else cleanup();};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}};
    dismissPortraitViewer=dismiss;
    close.addEventListener('click',dismiss);dialog.addEventListener('close',cleanup,{once:true});
    dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss();});
    document.addEventListener('keydown',escape);dialog.append(close,img,error);document.body.append(dialog);
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    close.focus();
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
    settings().overrides=settings().overrides.filter(item=>!item.image || safeImagePath(item.image)!==safe);
    context().saveSettingsDebounced();
}
function addSettings() {
    const host = document.querySelector('#extensions_settings');
    if (!host || document.getElementById('hivepack-settings')) return;
    const panel = document.createElement('div');panel.id='hivepack-settings';panel.className='extension_container';
    panel.innerHTML='<div class="inline-drawer"><div class="inline-drawer-toggle inline-drawer-header"><b>HivePack</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div><div class="inline-drawer-content hp-settings-content"></div></div>';
    const area=panel.querySelector('.hp-settings-content');
    const checkbox=(key,title)=>{
        const label=document.createElement('label');label.className='checkbox_label';
        const input=document.createElement('input');input.type='checkbox';input.checked=Boolean(settings()[key]);input.dataset.rpp=key;
        const span=document.createElement('span');span.textContent=title;label.append(input,span);area.append(label);
        input.addEventListener('change',()=>{settings()[key]=input.checked;context().saveSettingsDebounced();schedule();});
    };
    for(const [key,title] of Object.entries({monologues:'Style inner monologues',hover:'Hover highlight and enlargement',thoughtPortraits:'Show thought portraits',rememberColours:'Remember colours in this chat',collapsible:'Click speaker labels to collapse thoughts',defaultCollapsed:'Start new thought cards collapsed',autoCollapsePrevious:'Collapse earlier messages after a new AI response',enabled:'Show persona beside full messages (Ripple only)'})) checkbox(key,title);
    const appearance=document.createElement('details');appearance.className='hp-appearance';
    const appearanceSummary=document.createElement('summary');appearanceSummary.textContent='Appearance';appearance.append(appearanceSummary);area.append(appearance);
    const number=(key,title)=>{
        const label=document.createElement('label');label.textContent=title;
        const input=document.createElement('input');input.type='number';input.className='text_pole';input.dataset.rpp=key;
        input.min=ranges[key][0];input.max=ranges[key][1];input.step=key==='hoverStrength' ? '.1' : '1';input.value=settings()[key];label.append(input);appearance.append(label);
        input.addEventListener('change',()=>{settings()[key]=safeNumber(key,input.value);input.value=settings()[key];context().saveSettingsDebounced();schedule();});
    };
    for(const [key,label] of Object.entries({bubbleWidth:'Maximum thought width (px)',fontSize:'Thought font size (%)',backgroundOpacity:'Background opacity (%)',portraitWidth:'Thought portrait width (px)',hoverStrength:'Hover enlargement (%)',cornerRadius:'Corner radius (px)',desktopWidth:'Full-message persona width (0 = Ripple default)',mobileWidth:'Mobile full-message persona width (0 = Ripple default)'})) number(key,label);
    const aliasesLabel=document.createElement('label');aliasesLabel.textContent='Aliases: one Alias = Character Name per line';
    const aliases=document.createElement('textarea');aliases.className='text_pole';aliases.rows=4;aliases.placeholder='Appy = Apothos\nCorazón = Apothos';aliases.value=settings().aliases;aliasesLabel.append(aliases);area.append(aliasesLabel);
    aliases.addEventListener('change',()=>{settings().aliases=aliases.value;context().saveSettingsDebounced();schedule();});
    const heading=document.createElement('b');heading.textContent='Portrait overrides';area.append(heading);
    const help=document.createElement('small');help.textContent='Override any speaker or alias. Card filenames distinguish duplicate names. Overrides take priority over automatic matches.';area.append(help);
    const name=document.createElement('input');name.className='text_pole';name.placeholder='Speaker name';name.setAttribute('aria-label','Override speaker name');
    const select=document.createElement('select');select.className='text_pole';select.setAttribute('aria-label','Override portrait');
    const fillOptions=()=>{
        const current=select.value;select.replaceChildren();
        for(const [value,label] of [['@persona','Current persona'],['@none','No portrait'],...(context().characters??[]).map(card=>[card.avatar,`${card.name} (${card.avatar})`])]) {
            if(!value || value==='none')continue;
            const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);
        }
        if(Array.from(select.options).some(option=>option.value===current))select.value=current;
    };
    fillOptions();select.addEventListener('focus',fillOptions);
    const list=document.createElement('div');
    const renderList=()=>{
        list.replaceChildren();
        for(const item of settings().overrides) {
            const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');
            text.textContent=`${item.name} → ${item.image ? 'Custom photo' : item.avatar} `;remove.type='button';remove.className='menu_button';remove.textContent='Remove';
            remove.addEventListener('click',()=>{settings().overrides=settings().overrides.filter(x=>x!==item);context().saveSettingsDebounced();renderList();schedule();});
            row.append(text,remove);list.append(row);
        }
    };
    const add=document.createElement('button');add.type='button';add.className='menu_button';add.textContent='Add / replace override';
    add.addEventListener('click',()=>{
        const speaker=name.value.trim();if(!speaker || !select.value)return;
        settings().overrides=settings().overrides.filter(item=>normalizedName(item.name)!==normalizedName(speaker));
        settings().overrides.push({name:speaker,avatar:select.value});context().saveSettingsDebounced();renderList();schedule();
    });
    const file=document.createElement('input');file.type='file';file.accept='image/png,image/jpeg,image/webp,image/gif';file.className='hp-file-input';file.setAttribute('aria-label','Custom portrait image');
    const picker=document.createElement('button');picker.type='button';picker.className='hp-photo-picker';
    const preview=document.createElement('img');preview.hidden=true;preview.alt='Selected custom portrait';
    const pickerText=document.createElement('span');pickerText.textContent='＋ Choose custom photo';picker.append(preview,pickerText);
    picker.addEventListener('click',()=>file.click());
    let previewUrl='';
    const clearPreview=()=>{if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}preview.removeAttribute('src');preview.hidden=true;pickerText.textContent='＋ Choose custom photo';};
    const status=document.createElement('small');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    file.addEventListener('change',()=>{
        clearPreview();const selected=file.files?.[0];if(!selected)return;
        try{validatePhoto(selected);previewUrl=URL.createObjectURL(selected);preview.src=previewUrl;preview.hidden=false;pickerText.textContent=`${selected.name || 'Selected photo'} · click to change`;status.textContent='';}
        catch(error){file.value='';status.textContent=error.message;}
    });
    window.addEventListener('beforeunload',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},{once:true});
    const upload=document.createElement('button');upload.type='button';upload.className='menu_button';upload.textContent='Upload photo and set override';
    function setPhotoOverride(speaker,image){
        settings().overrides=settings().overrides.filter(item=>normalizedName(item.name)!==normalizedName(speaker));
        settings().overrides.push({name:speaker,image});context().saveSettingsDebounced();renderList();schedule();
    }
    upload.addEventListener('click',async()=>{
        const speaker=name.value.trim(), selected=file.files?.[0];
        if(!speaker){status.textContent='Enter a speaker name first.';return;}
        if(!selected){status.textContent='Choose a photo first.';return;}
        upload.disabled=true;add.disabled=true;file.disabled=true;picker.disabled=true;status.textContent='Uploading photo…';
        try{
            const image=await uploadPortrait(selected);setPhotoOverride(speaker,image);
            file.value='';clearPreview();status.textContent=`Custom photo saved for ${speaker}.`;
            if(!gallery.hidden)await loadGallery();
        }catch(error){status.textContent=error.message || 'Could not upload the photo.';}
        finally{upload.disabled=false;add.disabled=false;file.disabled=false;picker.disabled=false;}
    });
    const uploadHelp=document.createElement('small');uploadHelp.textContent='PNG, JPEG, WebP, or GIF, up to 10 MB. Uploads are saved on your SillyTavern server and can be reused below.';
    const browse=document.createElement('button');browse.type='button';browse.className='menu_button';browse.textContent='Browse saved photos';
    const gallery=document.createElement('div');gallery.className='hp-photo-gallery';gallery.hidden=true;
    let galleryRequest=0;
    async function loadGallery(){
        const request=++galleryRequest;gallery.hidden=false;gallery.textContent='Loading saved photos…';browse.disabled=true;
        try{
            const photos=await listPortraitPhotos();if(request!==galleryRequest)return;gallery.replaceChildren();
            if(!photos.length)gallery.textContent='No saved HivePack photos yet.';
            for(const image of photos){
                const tile=document.createElement('div');tile.className='hp-photo-tile';
                const view=document.createElement('button');view.type='button';view.className='hp-photo-view';view.setAttribute('aria-label','View saved portrait');
                const thumb=document.createElement('img');thumb.src=image;thumb.alt=image.split('/').pop();thumb.loading='lazy';view.append(thumb);view.addEventListener('click',()=>openPortraitViewer(image,'Saved portrait'));
                const use=document.createElement('button');use.type='button';use.className='menu_button';use.textContent='Use photo';use.addEventListener('click',()=>{
                    const speaker=name.value.trim();if(!speaker){status.textContent='Enter a speaker name above first.';name.focus();return;}
                    setPhotoOverride(speaker,image);status.textContent=`Saved photo selected for ${speaker}.`;
                });
                const remove=document.createElement('button');remove.type='button';remove.className='menu_button';remove.textContent='Delete photo';
                remove.addEventListener('click',async()=>{
                    const uses=settings().overrides.filter(item=>item.image && safeImagePath(item.image)===safeImagePath(image));
                    if(!confirm(`Permanently delete this photo?${uses.length ? ' Its '+uses.length+' portrait override(s) will also be removed.' : ''}`))return;
                    remove.disabled=true;use.disabled=true;
                    try{await deletePortraitPhoto(image);renderList();schedule();status.textContent='Photo deleted.';await loadGallery();}
                    catch(error){status.textContent=error.message;remove.disabled=false;use.disabled=false;}
                });
                tile.append(view,use,remove);gallery.append(tile);
            }
        }catch(error){gallery.textContent=error.message;}
        finally{if(request===galleryRequest)browse.disabled=false;}
    }
    browse.addEventListener('click',loadGallery);
    area.append(name,select,add,file,picker,upload,uploadHelp,status,browse,gallery,list);renderList();
    host.append(panel);
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
