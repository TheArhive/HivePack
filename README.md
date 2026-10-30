# HivePack

**Version 1.13.0** · A SillyTavern extension for styled inner thoughts, character dialogue colours, and speaker portraits.

HivePack styles the chat display without rewriting saved messages. Optional model-instruction injection is off by default. Colour memory is stored separately in chat metadata; portraits and preferences are stored on your SillyTavern server.

## Install and update

1. Open **Extensions → Install extension** in SillyTavern.
2. Paste `https://github.com/TheArhive/HivePack` and install.
3. Refresh the page and click the hive button beside the message input to open the new settings panel.

Update through SillyTavern’s extension manager, then refresh. Disable any old regex that replaces thought tags with HTML so HivePack can read the original `<i>` thoughts.

The right-side persona portrait requires [Moonlit Echoes Theme](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme) with **Ripple style** selected. Thought cards, their portraits, and dialogue colours work with other themes.

[Megumin Suite](https://github.com/Arif-salah/Megumin-Suite-Beta) is used in the original setup for coloured dialogue, but is **optional**. Your preset can handle dialogue colours, or you can use HivePack’s `<c>` feature below.

## Settings panel and floating button

The dark gray and purple panel opens from the **hive button** or **magic wand menu → HivePack Settings**. HivePack no longer adds settings to SillyTavern’s Extensions drawer. Preferences save automatically; portrait-override drafts are applied when **Add / replace override** is clicked.

The rounded square hive button has a light purple gradient and starts beside the text input, inset to the left of the send controls with space reserved in the composer. Dragging follows the pointer directly without animated position changes. Drag it to a floating position; its location is remembered and kept inside the window when resized. Keyboard users can move the focused button with **Alt + arrow keys**. **General → Reset floating button position** docks it beside the input again.

| Tab | Contents |
| --- | --- |
| General | Large green/gray power switch, compact toggle columns, generation timing, collapse behaviour, and launcher reset. |
| Appearance | Compact layout columns, portraits, sampling methods, and animated colour-priority lists. |
| Speakers | Embedded speaker manager; expand Add speaker overrides & aliases for manual configuration. |
| Photos | Embedded gallery with preview, pagination, upload, refresh, reuse, and deletion. |
| Prompt | Optional prompt injection, placement/depth, editable instructions, and reset. |

The live preview shows narration, coloured dialogue, a thought for the selected character, and a thought without an associated portrait. It updates as preferences change. On desktop the panel can be resized from its corner and remembers its size; on mobile it fills the screen. General and Appearance use compact columns, and the wider preview stays beside the controls on large screens.

## Model instructions / Author’s Note

Use the optional injection controls to send instructions automatically, or add the manual examples below to your own Author’s Note.

### Automatic prompt injection

Open the **Prompt** tab. Placement controls are visible directly; the prompt editor starts collapsed, and injection starts **off**.

1. Enable **Inject HivePack model instructions**.
2. Choose the placement mode.
3. In separate mode, set **Injection depth**. The default is 4; 0 places it at the most recent end of the chat. Values from 0 to 10,000 are accepted.
4. Expand **Edit model instructions** to customise the text. Edits are saved automatically. **Reset to default** restores the supplied `<ChatColor>` block containing the dialogue and thought instructions.

| Placement | Behaviour |
| --- | --- |
| Separate injection at depth | Sends the text as a system instruction at your chosen chat depth, independently of Author’s Note. |
| Append after Author’s Note (in-chat only) | Sends it immediately after the active in-chat Author’s Note, using that note’s depth and role. The separate depth field is disabled in this mode. |

Append mode uses a separate runtime prompt entry beside Author’s Note; it does not edit the saved note or chat metadata. It follows the note’s active interval and sends nothing if the note is empty, disabled, or placed outside chat. Set Author’s Note to **In-chat** to use append mode; otherwise use the separate depth mode. An identical instruction block already present in the note is not appended twice.

Injection preferences are global. Emptying the prompt, switching injection off, or switching **Enable HivePack** off removes HivePack’s runtime injections. Manual instructions remain untouched. Remove duplicate manual formatting instructions when enabling automatic injection. SillyTavern handles macros such as `{{user}}` in the injected text.

### Inner thoughts (manual)

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

### Coloured dialogue (manual)

Enable **Colour character dialogue (<c>)**, then add this instruction:

```text
Assign a distinct, readable hex color to every characters dialogue using: <c>Character Name | #HEXCODE: "Dialogue here"</c>. Once assigned, a character's color is LOCKED for the entire story. Wrap ALL dialogue with these blocks.
Eg: <c>Diane | #35BD5A: "Can you believe this?"</c>
```

Use `<c>Name | #RRGGBB: "Dialogue here"</c>`. Whitespace around the name, separator, and colour is allowed. A closing `</c>` and six HEX digits are required. HivePack hides the name/colour header while enabled; the saved text stays intact. Old `<charcolor=#35BD5A|Diane>…</charcolor>` blocks remain supported in existing chats.

HivePack colours matching dialogue already rendered by SillyTavern, retaining its surrounding markup and formatting. It does not rebuild the message. If another extension rewrites the dialogue so it cannot be matched, HivePack leaves that passage alone. Code examples and user/system messages are excluded.

## Main settings

The large **HivePack power switch** sits above the other General settings. It is green when on and gray when off. Turning it off removes HivePack’s thought cards, dialogue colours and hidden headers, side portraits, and collapse controls. It also pauses colour learning and removes HivePack’s runtime prompt injection. Your preferences and overrides are retained.

| Setting | What it does |
| --- | --- |
| Apply styling after generation finishes (prevents flashing) | Defers thought cards, dialogue styling, and the side portrait for the generating message until generation ends or is stopped. Older messages stay styled. Off by default. |
| Style inner monologues | Turns recognised thoughts into styled cards. |
| Dim other text when hovering a speaker | Keeps the hovered speaker’s dialogue and thoughts clear while dimming narration and other speakers in that message. On by default. |
| Hover highlight and enlargement | Highlights and enlarges thought cards on hover. |
| Show thought portraits | Shows a portrait or a clickable fallback beside thoughts. |
| Sample portrait colour | Makes portrait colours available for thought styling. |
| Remember colours in this chat | Learns valid thought-header colours in the current chat. |
| Click speaker labels to collapse thoughts | Enables individual and per-message collapse controls. |
| Start new thought cards collapsed | Sets the initial state of newly displayed thoughts. |
| Collapse earlier messages after a new AI response | Collapses older thoughts after a new response finishes. |
| Show persona beside full messages (Ripple only) | Adds your persona portrait to the right of AI messages. |
| Colour character dialogue (<c>) | Enables dialogue colouring. On by default. |
| Show hovered speaker portrait (dialogue and thoughts, Ripple only) | Temporarily replaces the right-side persona portrait when hovering dialogue or a thought bubble. Off by default. |

The dialogue hover option is greyed out unless **Show persona beside full messages** is enabled. It requires Ripple style. The hovered speaker’s name appears below the right-side portrait, using the effective dialogue or thought colour. No name appears while idle. Leaving hides the name immediately; the image lingers for the configured delay before restoring the persona. Moving onto another speaker cancels the previous linger. A missing or failed portrait leaves or restores the persona without a misleading name label.

## Colours and appearance

Open the **Appearance** tab. The live preview shows the active character’s portrait, narration, dialogue, ordinary/bold/quoted thought text, and an unassigned speaker’s thought.

### Colour priority

Each list uses the first available source. Drag each entry by its grip to reorder it. The dragged row follows your pointer and neighbouring rows slide aside; the order is saved when released. Up/down buttons provide a keyboard-friendly alternative, and reduced-motion preferences disable the slide animation.

| List | Sources | Default order |
| --- | --- | --- |
| Thought colour priority | Override, Photo colour, Model HEX, Remembered colour | Override → Photo colour → Model HEX → Remembered colour |
| Dialogue colour priority | Override, Photo colour, HEX in message | Override → HEX in message → Photo colour |

Thought photo sampling requires **Sample portrait colour**; remembered thought colours require **Remember colours in this chat**. Dialogue photo sampling is independent of the thought sampling toggle. Missing images, pending samples, and failed samples fall through to the next source.

Choose **Appearance → Portrait colour sampling** for both thought and dialogue photo colours:

| Method | Behaviour |
| --- | --- |
| Average | Averages the whole photo. This preserves the original behaviour and is the default. |
| Vibrant + center-weighted | Favours saturated colours and central pixels, then selects a prominent colour group rather than blending different hues together. |
| Ignore background | Estimates the dominant background colour from the image edges, excludes similar pixels, and averages what remains. Falls back to Average if nothing remains. |

Sampling uses a 32×32 rendering, ignores transparent pixels, and caches results separately for each method. These are colour heuristics, not subject recognition: a colourful background can still influence the result, and matching clothes/background colours may be excluded together. No external image service is used. Dialogue uses the selected colour directly. Thought labels, borders, and backgrounds use it as a tint; bold thought text uses a darker shade and double-quoted text a lighter shade, adjusted for contrast.

### Layout controls

| Control | Choices or range |
| --- | --- |
| Maximum thought width | 200–1200 px, constrained to the message area |
| Thought font size | 60–150% |
| Background opacity | 0–60% |
| Thought portrait width | 35–180 px, constrained on narrow screens |
| Hover enlargement | 0–20% |
| Portrait linger after hover | 0–5000 ms; default 500 ms. Set 0 for immediate restoration. |
| Corner radius | 0–30 px |
| Thought alignment | Left, centered, right, or full message width |
| Portrait crop | Match bubble height, original proportions, 1:1, 2:3, or 3:2 |
| Missing portrait appearance | Vertical photo-picker strip, speaker initials, or the supplied silhouette image |
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

### Speaker manager and dialogue controls

Open the **Speakers** tab to see speakers detected in the current chat’s completed dialogue and thought blocks. Aliases are grouped together. Each card shows the associated portrait, effective dialogue/thought colours and their sources, a **Portrait & colour** button, and an alias-target field. Leave the alias target blank and click **Save alias** to remove that speaker’s alias mapping. Changes share the same settings as the main HivePack panel.

Click dialogue to open the same speaker controls used by thought portraits: a portrait viewer if the speaker has a photo, or the compact override editor if they do not. Dialogue is keyboard-focusable; Enter or Space opens its controls. Selecting text does not open an editor.

When **Dim other text when hovering a speaker** is enabled, hovering dialogue or a thought highlights that speaker throughout the message, including their aliases. Other speakers and narrative text are dimmed. Moving away clears the focus immediately, independently of the portrait linger delay.

### Create or edit an override

In **Speakers → Add speaker overrides & aliases → Speaker portrait and colour overrides**:

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

The speaker’s name sits at the top left, above the portrait-selection buttons. **Close** is centred below the image. The viewer offers **Character card**, **Saved photos**, and **Upload photo** to replace that speaker’s portrait. Its top-right **Style colour** picker saves immediately, retaining the existing portrait and scope. New overrides default to Global. The supplied SVG **pipette button to the left of the colour picker** enters photo sampling mode. Click a point on the photo to save that pixel as the speaker’s custom colour, or click the pipette again to cancel. Sampling uses the original image coordinates even when the viewer scales it down. Transparent pixels are rejected without changing the override. The adjacent disable button removes that colour override. Keep Override first in colour priority if you want it to win.

Click the fallback beside a thought without an image to open the compact override editor. Its selection and colour controls are centred, with a green-check save button at the bottom.

### Upload and reuse photos

The **upload icon** accepts PNG, JPEG, WebP, and GIF files up to 10 MB. Uploading stores the image immediately on your SillyTavern server, but you still need **Add / replace override** to assign it. Closing without saving leaves the upload available for reuse.

The **Photos** tab loads the saved-photo gallery directly, with up to 25 images per page. Click a thumbnail to preview it, Back to return, or **✓ Select photo** to assign it to a speaker. The upload icon opens a portrait upload, and **Refresh photos** reloads the gallery. Override editors also offer **Browse saved photos** in a popup; that popup has Back at the top left, Close at the top right, and **✓ Select photo** beneath the title. Save the override to apply the assignment.

**Delete photo** permanently deletes an uploaded image after confirmation. Its portrait assignments are cleared across scopes, retaining any custom colours. Failed uploads or deletions keep existing assignments. Photos use server-relative paths and remain available when accessing the same server from another device. Back up settings and uploaded images when moving servers.

## Collapse controls and streaming

Click a thought’s top speaker label to collapse or expand it. Each message also has **Collapse thoughts / Expand thoughts** below its token count. If some thoughts are open and others closed, the next bulk click collapses them all.

Opening or switching to a chat collapses thoughts in older messages and expands every thought in the most recent message containing thoughts. This reopening rule takes precedence over the initial collapsed setting for that latest message. Afterward, manual collapse choices last for the chat session, and newly generated thoughts follow **Start new thought cards collapsed**. Switching or reopening the chat applies the reopening rule again. Identical thoughts in the same message share collapse state. Themes that hide the entire avatar/info column also hide the bulk button.

Automatic collapse of older messages runs after a changed AI response finishes. Quiet/background generations, dry runs, and unchanged replies do not trigger it. The latest response follows the initial collapsed setting.

Thoughts wait for a closing `</i>`, and dialogue waits for `</c>` (or the legacy `</charcolor>`). By default, complete blocks are styled while the rest streams. SillyTavern rebuilds the display during streaming, which can cause styling to flash. Enable **Apply styling after generation finishes (prevents flashing)** to delay styling of the generating message until generation ends or is stopped. Complete blocks are then styled; unfinished blocks remain undecorated.

## Compatibility and troubleshooting

- Use non-nested thought tags. Ordinary unnamed italics and code examples are left alone.
- Regexes or extensions that replace thought tags or rewrite dialogue can prevent matching.
- After an update, refresh SillyTavern. If the display was affected by 1.8.0, reloading the chat lets SillyTavern render the original saved messages again.
- Disable **Colour character dialogue (<c>)** to remove dialogue colours and hover swapping. The message’s text and other markup remain in place, and the name/colour headers become visible again.
- HivePack uses SillyTavern’s authenticated image APIs for uploads, listing, and deletion.

## Development and validation

No build step is required. Install development dependencies with `npm install`, then run `npm test`. Check module syntax with `node --input-type=module --check < index.js`.

DOM regression tests cover formatting, colour sources, collapse controls, streaming, overrides, photo management, dialogue interactions, and prompt injection. Formatter, image, and prompt APIs are mocked. Live SillyTavern and full-browser visual testing remain outstanding. See [VALIDATION.txt](VALIDATION.txt).

## Uninstall and licence

Remove HivePack through the extension manager and refresh. Settings, chat colour metadata, and uploaded photos may remain; delete unwanted photos through the photo browser before uninstalling.

Code: MIT. No Moonlit Echoes or Megumin Suite source is bundled. The pipette, hive, upload, and power SVGs (SVG Repo) and silhouette PNG were supplied for HivePack and are bundled locally in `assets/`.
