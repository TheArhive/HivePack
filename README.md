# HivePack

A SillyTavern extension for styled character thoughts and portrait-enhanced messages.

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

Name labels, borders, background tint, and hover accents use the supplied thought colour. Body text keeps a readable blue-gray colour. Missing or invalid colours fall back to the last valid colour learned for that character in the current chat, or the default style if no colour is known.

Colour memory is saved in chat metadata and shared by aliases of the same character. Explicit colours always take precedence for their own thought. Disable **Remember colours in this chat** to use explicit colours only.

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

Aliases affect portraits and remembered colours. Labels retain the name written by the model. Alias chains are supported; cycles are safely ignored. Aliases and portrait overrides are global preferences.

### Custom photos and saved-photo management

Under **Portrait overrides**, enter a speaker name and either:

- Choose a loaded card, Current persona, or No portrait, then click **Add / replace override**.
- Click the clearly marked **Choose custom photo** control, select an image, review its preview, and click **Upload photo and set override**.
- Click **Browse saved photos**, then **Use photo** below a previously uploaded portrait.

PNG, JPEG, WebP, and GIF files up to 10 MB are accepted. Images are stored in the HivePack image folder on your SillyTavern server. Settings store server-relative paths so the same photos remain available on reload and when using the same server from another device.

**Remove** on an override removes only the assignment. **Delete photo** in the saved-photo browser permanently deletes that uploaded file after confirmation and removes all current HivePack overrides that reference it. Deletion is limited to the HivePack image folder. Failed uploads or deletions preserve existing overrides. Back up both settings and uploaded image files if moving servers.

### Expanded portrait viewer

Click a thought's portrait to open a larger view. Keyboard users can focus the portrait and press Enter or Space. Close the viewer with its Close button, Escape, or a click on the backdrop. Character-card thumbnails use the original card image when opening the viewer.

### Collapsible thoughts

Click the top speaker label, or focus it and press Enter/Space, to collapse or expand a thought. Each message also has a **Collapse thoughts / Expand thoughts** button immediately below its token-count element. Mixed states collapse all on the next bulk click.

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

Syntax, manifest, and DOM behavior have automated checks. Image API calls are tested with mocks against the inspected API contract. Full-browser layout checks and testing against a live SillyTavern instance remain outstanding. See [VALIDATION.txt](VALIDATION.txt).

## License

MIT. Original companion code. No Moonlit Echoes or Megumin Suite source is bundled.
