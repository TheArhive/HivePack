# HivePack

**Version 1.8.1** · A SillyTavern extension for styled inner thoughts, character dialogue colours, and speaker portraits.

HivePack changes the chat display. It does not rewrite saved messages, prompts, or injections. Colour memory is stored separately in chat metadata; portraits and preferences are stored on your SillyTavern server.

## Install and update

1. Open **Extensions → Install extension** in SillyTavern.
2. Paste `https://github.com/TheArhive/HivePack` and install.
3. Refresh the page and open **Extensions → HivePack**.

Update through SillyTavern’s extension manager, then refresh. Disable any old regex that replaces thought tags with HTML so HivePack can read the original `<i>` thoughts.

The right-side persona portrait requires [Moonlit Echoes Theme](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme) with **Ripple style** selected. Thought cards, their portraits, and dialogue colours work with other themes.

[Megumin Suite](https://github.com/Arif-salah/Megumin-Suite-Beta) is used in the original setup for coloured dialogue, but is **optional**. Your preset can handle dialogue colours, or you can use HivePack’s `<charcolor>` feature below.

## Model instructions / Author’s Note

### Inner thoughts

Add this instruction to your Author’s Note:

```text
Interweave character's inner monologue (this can be any character present in the scene, including {{user}}) through the response between <i></i> while featuring the characters name
Eg: <i>Tomy | #Hex: I can't believe I have to explain this again.</i>
```

`#Hex` is a placeholder for a real six-digit colour. For example:

```html
<i>Tomy | #9BD4A8: I can't believe I have to explain this again.</i>
```

Thoughts can belong to any character in the scene, including your persona. `<i>Name: Thought</i>` also works, using an override, a remembered colour, or the default styling when no HEX is supplied. Use consistent speaker names or configure aliases.

### Coloured dialogue

Enable **Colour charcolor dialogue**, then add this instruction:

```text
Assign a distinct, readable hex color to every characters dialogue using: <charcolor=#HEXCODE | Character Name>"Dialogue here"</charcolor>. Once assigned, a character's color is LOCKED for the entire story. Wrap ALL dialogue with these blocks.
Eg: <charcolor=#35BD5A| Diane>"Can you believe this?"</charcolor>
```

Both `<charcolor=#35BD5A|Diane>` and `<charcolor=#35BD5A | Diane>` are accepted. A closing `</charcolor>` is required. HEX codes must have six digits.

HivePack colours matching dialogue already rendered by SillyTavern, retaining its surrounding markup and formatting. It does not rebuild the message. If another extension rewrites the dialogue so it cannot be matched, HivePack leaves that passage alone. Code examples and user/system messages are excluded.

## Main settings

| Setting | What it does |
| --- | --- |
| Style inner monologues | Turns recognised thoughts into styled cards. |
| Hover highlight and enlargement | Highlights and enlarges thought cards on hover. |
| Show thought portraits | Shows a portrait or a clickable fallback beside thoughts. |
| Sample average portrait colour | Makes portrait colours available for thought styling. |
| Remember colours in this chat | Learns valid thought-header colours in the current chat. |
| Click speaker labels to collapse thoughts | Enables individual and per-message collapse controls. |
| Start new thought cards collapsed | Sets the initial state of newly displayed thoughts. |
| Collapse earlier messages after a new AI response | Collapses older thoughts after a new response finishes. |
| Show persona beside full messages (Ripple only) | Adds your persona portrait to the right of AI messages. |
| Colour charcolor dialogue | Enables dialogue colouring. On by default. |
| Show dialogue speaker portrait on hover (Ripple only) | Temporarily replaces the right-side persona portrait with the dialogue speaker. Off by default. |

The dialogue hover option is greyed out unless **Show persona beside full messages** is enabled. It requires Ripple style. Moving away restores the persona portrait; missing or failed speaker images leave or restore the persona.

## Colours and appearance

Open the collapsible **Appearance** menu. Its live preview shows the active character’s portrait and demonstrates ordinary, bold, and quoted thought text.

### Colour priority

Each list uses the first available source. Drag entries to reorder them, or use their up/down buttons.

| List | Sources | Default order |
| --- | --- | --- |
| Thought colour priority | Override, Photo average, Model HEX, Remembered colour | Override → Photo average → Model HEX → Remembered colour |
| Dialogue colour priority | Override, Photo average, HEX in message | Override → HEX in message → Photo average |

Thought photo sampling requires **Sample average portrait colour**; remembered thought colours require **Remember colours in this chat**. Dialogue photo sampling is independent of the thought sampling toggle. Missing images, pending samples, and failed samples fall through to the next source.

Photo sampling averages the entire image using a 32×32 rendering, weighted by transparency, and caches the result for the session. No external image service is used. Dialogue uses the selected colour directly. Thought labels, borders, and backgrounds use it as a tint; bold thought text uses a darker shade and double-quoted text a lighter shade, adjusted for contrast.

### Layout controls

| Control | Choices or range |
| --- | --- |
| Maximum thought width | 200–1200 px, constrained to the message area |
| Thought font size | 60–150% |
| Background opacity | 0–60% |
| Thought portrait width | 35–180 px, constrained on narrow screens |
| Hover enlargement | 0–20% |
| Corner radius | 0–30 px |
| Thought alignment | Left, centered, right, or full message width |
| Portrait crop | Match bubble height, original proportions, 1:1, 2:3, or 3:2 |
| Missing portrait appearance | Vertical photo-picker strip, speaker initials, or silhouette |
| Full-message persona width, desktop/mobile | 0 uses Ripple defaults; 40–400 px sets a custom width |

Right-aligned thoughts enlarge toward the top left. Full-width thoughts occupy 82% of the message text area and enlarge from the centre, leaving space for the maximum hover enlargement. Reduced-motion preferences disable scaling and animation. Hover enlargement can overlap nearby text without moving the layout.

## Speakers, aliases, and portraits

HivePack chooses a speaker portrait in this order:

1. An applicable speaker override, including aliases.
2. Your current persona if its name matches the speaker.
3. The selected chat character if its name matches the speaker.
4. A clickable missing-portrait fallback.

Names ignore case and repeated spaces. If your persona and selected character share a name, the persona wins unless an override is set. Other library cards must be selected explicitly as overrides; automatic name lookup across the whole library is not supported.

### Aliases

Enter one mapping per line:

```text
Appy = Apothos
Corazón = Apothos
Professor Bine = Ilya
```

HivePack treats an alias as the same speaker, sharing portrait overrides, colour overrides, and remembered colours. Labels retain the name written by the model. Aliases are global; chains are supported and cycles are ignored.

### Create or edit an override

Under **Speaker portrait and colour overrides**:

1. Enter the speaker name or alias.
2. Select a character card, the current persona, a saved photo, or a custom upload. Leave **Automatic** selected for a colour-only override.
3. Optionally pick a custom colour and choose the scope.
4. Click **Add / replace override**. A popup editor closes after a successful save.

The character-card selector includes a preview beside it. Native dropdown menus do not reliably support image thumbnails across browsers.

| Scope button | Meaning |
| --- | --- |
| **G**, light blue | Global across characters and chats. |
| **L**, orange | Local to the selected character, across that character’s chats. |

Hover over G/L for details. Local overrides take precedence over global ones. Local scope is tied to the character card’s avatar filename, so renaming it may require recreating the override. Switching from G to L is disabled when no character is selected. Other characters’ local overrides remain saved but are hidden until selected.

Selecting a colour automatically enables it. **Disable colour override** appears beside enabled pickers and removes only the custom colour. The main editor stages changes until **Add / replace override**; colour changes on saved override cards and in the expanded portrait viewer save immediately.

Open **Existing speaker overrides** to browse compact cards with portrait thumbnails, colour controls, G/L, Edit, and Remove. Remove deletes the assignment, not its uploaded photo.

## Portrait viewer and saved photos

Click a thought portrait to open a larger view, scaled down to fit the browser without enlarging small images. Use Close, Escape, or the backdrop to dismiss it. Portraits and missing-portrait controls also support Enter/Space.

The viewer offers **Character card**, **Saved photos**, and **Upload photo** to replace that speaker’s portrait. Its top-right **Style colour** picker saves immediately, retaining the existing portrait and scope. New overrides default to Global. The adjacent disable button removes that colour override. Keep Override first in colour priority if you want it to win.

Click the fallback beside a thought without an image to open the compact override editor. Its selection and colour controls are centred, with a green-check save button at the bottom.

### Upload and reuse photos

**Choose custom photo** accepts PNG, JPEG, WebP, and GIF files up to 10 MB. Uploading stores the image immediately on your SillyTavern server, but you still need **Add / replace override** to assign it. Closing without saving leaves the upload available for reuse.

**Browse saved photos** shows up to 25 images per page. Click a thumbnail to preview it. Back is at the top left, Close at the top right, and **✓ Select photo** beneath the title stages your choice. Save the override to apply it.

**Delete photo** permanently deletes an uploaded image after confirmation. Its portrait assignments are cleared across scopes, retaining any custom colours. Failed uploads or deletions keep existing assignments. Photos use server-relative paths and remain available when accessing the same server from another device. Back up settings and uploaded images when moving servers.

## Collapse controls and streaming

Click a thought’s top speaker label to collapse or expand it. Each message also has **Collapse thoughts / Expand thoughts** below its token count. If some thoughts are open and others closed, the next bulk click collapses them all.

Collapse choices last for the chat session and reset on chat switches or page reload. Changing the initial collapsed setting affects new cards; reload to apply it throughout the chat. Identical thoughts in the same message share collapse state. Themes that hide the entire avatar/info column also hide the bulk button.

Automatic collapse of older messages runs after a changed AI response finishes. Quiet/background generations, dry runs, and unchanged replies do not trigger it. The latest response follows the initial collapsed setting.

Thoughts wait for a closing `</i>`, and dialogue waits for `</charcolor>`. Complete blocks can be styled while the rest of a response streams. Unfinished blocks remain undecorated.

## Compatibility and troubleshooting

- Use non-nested thought tags. Ordinary unnamed italics and code examples are left alone.
- Regexes or extensions that replace thought tags or rewrite dialogue can prevent matching.
- After an update, refresh SillyTavern. If the display was affected by 1.8.0, reloading the chat lets SillyTavern render the original saved messages again.
- Disable **Colour charcolor dialogue** to remove dialogue colours and hover swapping. The message’s text and other markup remain in place.
- HivePack uses SillyTavern’s authenticated image APIs for uploads, listing, and deletion.

## Development and validation

No build step is required. Install development dependencies with `npm install`, then run `npm test`. Check module syntax with `node --input-type=module --check < index.js`.

DOM regression tests cover formatting, colour sources, collapse controls, streaming, overrides, photo management, and dialogue interactions. Image APIs are mocked. Live SillyTavern and full-browser visual testing remain outstanding. See [VALIDATION.txt](VALIDATION.txt).

## Uninstall and licence

Remove HivePack through the extension manager and refresh. Settings, chat colour metadata, and uploaded photos may remain; delete unwanted photos through the photo browser before uninstalling.

MIT. No Moonlit Echoes or Megumin Suite source is bundled.
