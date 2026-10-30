# HivePack

A SillyTavern extension for styled character thoughts and portrait-enhanced messages.

Current version: **1.6.0**.

## Installation

1. Open SillyTavern's **Extensions** panel and select **Install extension** / **Install from URL**.
2. Paste the Git clone URL of the GitHub repository hosting this README and install it.
3. Reload SillyTavern, then open **Extensions → HivePack**.

Use SillyTavern's extension manager to update the extension from its repository. If you previously used a display regex to replace thought tags with HTML, disable that regex so HivePack receives the original `<i>` tags. Saved message text is not rewritten by HivePack.

## Author's Note / model instructions

This is the instruction used in the Author's Note to make the model output thoughts in HivePack's format:

```text
Interweave character's inner monologue (this can be any character present in the scene, including {{user}}) through the response between <i></i> while featuring the characters name
Eg: <i>Tomy | #Hex: I can't believe I have to explain this again.</i>
```

`#Hex` in that example is a placeholder. Ask the model to use a real six-digit hexadecimal colour, preferably the same colour it uses for that character's dialogue:

```html
<i>Tomy | #9BD4A8: I can't believe I have to explain this again.</i>
```

The exact shape is **Name | #RRGGBB: Thought** inside `<i></i>`. Use the same character names consistently, or add aliases in HivePack. Thoughts can belong to anyone in the scene, including the current persona. Ordinary `<i>Name: Thought</i>` tags also work: HivePack uses a remembered colour if available, otherwise its blue-gray fallback.

## Theme and dialogue colours

The **side persona portrait beside full messages** requires [Moonlit Echoes Theme](https://github.com/RivelleDays/SillyTavern-MoonlitEchoesTheme) with **Ripple style** selected. Thought bubbles and their smaller portraits work in other themes too.

This setup uses [Megumin Suite](https://github.com/Arif-salah/Megumin-Suite-Beta) for colour-coded dialogue. **Megumin Suite is optional.** Your preset can handle dialogue colours instead. HivePack reads the colour in each thought's header; it does not require another extension or infer a speaker from coloured dialogue.

## Features

### Thought styling and colour memory

Name labels, borders, background tint, and hover accents use the selected colour source. Ordinary body text keeps a readable blue-gray colour. Bold text (`**text**`) starts with a darker shade of the bubble colour; double-quoted text uses a lighter shade. Shades are adjusted when needed for contrast. Straight and curly double quotes are supported, including quotes spanning existing inline markup. Missing or invalid colours fall back to the last valid colour learned for that character in the current chat, or the default style if no colour is known.

Colour memory is saved in chat metadata and shared by aliases of the same character. Colour precedence is configurable under **Appearance → Colour priority**. Choose the order of:

1. Custom override colour.
2. Average portrait colour.
3. Model hex code.
4. Remembered colour.

The first available source wins. Drag sources into priority order, or use the up/down buttons. **Sample average portrait colour** must be enabled for the photo source; **Remember colours in this chat** must be enabled for memory. Missing or failed image samples fall through to the next source. Defaults preserve model colours unless a custom override is enabled or portrait sampling is turned on.

Photo sampling uses a 32×32 rendering of the entire portrait, weighted by transparency. Fully transparent pixels are ignored. Results are cached for the session. Sampling does not send the image to an external service.

### Portraits and aliases

Portrait matching checks:

1. A speaker or alias-target override.
2. The current persona when the name matches `{{user}}`.
3. The active chat character when the name matches `{{char}}`.
4. No portrait if there is no match.

Matching ignores case and repeated spaces but otherwise requires the full name. Persona wins when the persona and active character have the same name, unless you set an override.

Automatic name matching against other character cards has been removed because it was unreliable. **You can still explicitly choose any loaded character card as a portrait override**, including duplicate-name cards distinguished by their filenames. Custom uploaded portraits are also supported.

Aliases use one mapping per line:

```text
Appy = Apothos
Corazón = Apothos
Professor Bine = Ilya
```

Aliases affect portraits and remembered colours. Labels retain the name written by the model. Alias chains are supported; cycles are safely ignored. Aliases are global preferences. Each speaker override can be **G (Global)** or **L (Local)**, scoped to the **Current character**. Character scope is keyed by the selected card's avatar filename, so it applies across that character's chats. A matching character-scoped override takes precedence over a global override. Renaming the card file may require recreating scoped overrides.

The scope button is disabled when no character is selected and its current state is Global. A previously scoped override can still be switched back to Global. Overrides for other characters remain stored and reappear when those characters are selected. Selecting a colour enables its override. A Disable colour override button appears beside enabled pickers. The main editor stages changes until Add / replace override; saved override cards and the portrait viewer save colour changes immediately. A colour-only override can leave portrait selection set to Automatic.

### Custom photos and saved-photo management

Under **Speaker portrait and colour overrides**:

1. Enter the exact speaker name (or alias).
2. Choose a character card, a saved photo, or a custom upload.
3. Optionally select a custom colour to enable it, and choose G (Global) or L (Local) scope.
4. Click **Add / replace override** to save the assignment.

The compact **Choose custom photo** button opens the file selector. The selected photo appears in a preview. Choosing a new file uploads it to the server; it does not change a speaker's saved assignment until you click Add / replace override. If you close the editor without saving, the uploaded file remains available in saved photos.

**Browse saved photos** opens a closable popup displaying **up to 25 photos per page**. Use Previous/Next to change pages. Click a thumbnail to see a larger preview, then choose **Back** or **Select photo**. Selecting a photo stages it in the editor; click Add / replace override to commit it.

PNG, JPEG, WebP, and GIF files up to 10 MB are accepted. Images are stored in the HivePack image folder on your SillyTavern server. Settings store server-relative paths so the same photos remain available on reload and when using the same server from another device.

**Remove** on an override removes only the assignment. **Delete photo** in the saved-photo browser permanently deletes that uploaded file after confirmation. Referencing portrait assignments are cleared across global and character scopes; any custom colour on those assignments is preserved as a colour-only override. Deletion is limited to the HivePack image folder. Failed uploads/deletions preserve existing assignments. Back up settings and uploaded image files if moving servers.

### Expanded portrait viewer

Click a thought's portrait to open a larger view. Keyboard users can focus the portrait and press Enter or Space. Close the viewer with its Close button, Escape, or a click on the backdrop. Character-card thumbnails use the original card image when opening the viewer.

The viewer's top-left controls open **Character card**, **Saved photos**, or **Upload photo** override editors for that thought's speaker. These editors also include the speaker's custom colour and scope controls.

Thoughts without a portrait have a compact clickable fallback. Choose **speaker initials**, a **silhouette**, or a **photo-picker area** in Appearance. Clicking it opens the compact override editor. Turning off thought portraits also hides these fallback controls.

### Collapsible thoughts

Click the top speaker label, or focus it and press Enter/Space, to collapse or expand a thought. There is no collapse-arrow decoration. Each message also has a **Collapse thoughts / Expand thoughts** button immediately below its token-count element. Mixed states collapse all on the next bulk click.

- **Start new thought cards collapsed** controls the initial state of newly decorated thoughts. Existing choices are kept; reload the chat/page to apply the default to all thoughts.
- **Collapse earlier messages after a new AI response** collapses thoughts in earlier messages after a changed AI response finishes generating. The latest response follows the default setting. Quiet/background generations, dry runs, and unchanged replies do not trigger it.
- Disabling collapsible thoughts expands all cards and hides their collapse controls.

Collapse choices are local to the current chat session and reset on chat switches or page reload. Identical thoughts with the same message ID share collapse state. If token-count text is hidden, the bulk button remains below its element. A theme that hides the entire avatar/info column also hides that button.

### Appearance

Appearance controls are inside a closed-by-default **Appearance** submenu:

| Setting | Range |
| --- | --- |
| Maximum thought width | 200–1200 px, constrained to message width |
| Thought font size | 60–150% |
| Background opacity | 0–60% |
| Thought portrait width | 35–180 px, constrained on narrow screens |
| Hover enlargement | 0–20% |
| Corner radius | 0–30 px |
| Full-message persona width, desktop/mobile | 0 uses Ripple defaults; 40–400 px overrides |

Choose **Left**, **Centered**, **Right**, or **Full message width** alignment. Full width stretches through the message text area, excluding the surrounding message portrait columns.

The **Live styling preview** updates while changing settings, using the active character's name/portrait when available. It demonstrates normal, bold, and quoted text. It stays expanded so appearance changes remain visible even when real thoughts default to collapsed.

Hover applies to fine pointers. Reduced-motion preferences disable scaling and animation. Larger hover settings may overlap nearby text without changing the layout.

### Streaming

HivePack waits for an explicit closing `</i>` in the source message before decorating a thought. Completed thoughts can render while the rest of a reply is still streaming. An unfinished thought remains plain, including when generation stops before its closing tag arrives.

## Compatibility and limitations

- Uses standard SillyTavern message markup and the current extension context APIs.
- Other extensions or regexes that restructure message HTML or replace thought tags may interfere.
- Use non-nested `<i>...</i>` thought tags. Markdown emphasis inside thoughts is supported.
- User/system messages, code examples, and unnamed italics are not decorated.
- Thought portraits crop to the bubble height with a Ripple-inspired fade.
- HivePack does not edit model prompts, injections, or saved message content. Colour memory is stored separately in chat metadata.
- Upload, list, and delete operations use SillyTavern's authenticated local image APIs.

## Uninstall

Remove HivePack through SillyTavern's extension manager and reload. Global settings, chat colour metadata, and uploaded photos may remain. Delete unwanted photos through the saved-photo browser before uninstalling.

## Validation

Syntax, manifest, and DOM behavior have automated checks. Image API calls are tested with mocks against the inspected API contract. Full-browser layout checks and testing against a live SillyTavern instance remain outstanding. To run the development checks, install dev dependencies with `npm install` and run `npm test`; no build step is needed for installation. See [VALIDATION.txt](VALIDATION.txt).

## License

MIT. Original companion code. No Moonlit Echoes or Megumin Suite source is bundled.

### New in 1.7.0

Compact G/L scope buttons show blue for global and orange for character-local overrides. Hover for details. Colour pickers are square, and the initial settings use two columns. The portrait-source selector has an explanation and a small preview of the selected card. Native select menus do not reliably support image thumbnails across browsers.

Empty portraits use a vertical photo strip on the right. Portrait dialogs offer replacement controls once, with explanatory text. The viewer’s top-right **Style colour** picker saves immediately to the speaker’s effective override, preserving its portrait and scope; a new override defaults to global. To make that colour take precedence, keep Custom override first in colour priority. New speaker entries retain colour selections when committing the name field.

Saved-photo previews place Back at the top left, Close at the top right, the title centered, and a Select photo button with a green check beneath it. Open portraits fit the window without enlarging small originals.

Right-aligned bubbles enlarge toward the top left. Full-width bubbles use 82% of the available width and enlarge from the center, leaving room for the maximum 20% hover enlargement. **Portrait crop** offers bubble-height, original proportions, 1:1, 2:3, and 3:2 layouts.

### New in 1.7.1

Portrait previews stay hidden until a valid image is selected and disappear if loading fails. Popup override editors have centered selection and colour controls, plus a centered save button with a green check. A successful save closes the popup; validation errors keep it open.

Existing overrides appear in a collapsed **Existing speaker overrides** section with compact cards and portrait thumbnails. Choose any colour to enable an override and use **Disable colour override** to remove its colour while retaining the portrait and scope. The portrait viewer offers the same disable action beside its immediate colour picker. Aliases share the canonical speaker’s portrait overrides, colour overrides, and remembered colours.
