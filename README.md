# HivePack 1.4.0

SillyTavern companion extension: full-message persona portraits for Moonlit Echoes Ripple style, plus styled inner monologues in all themes.

## Install / upgrade

1. Disable the old monologue replacement regex so original `<i>` markup reaches HivePack.
2. Remove the standalone `ripple-persona-portrait` folder if present.
3. Replace the existing `HivePack` folder with this ZIP's `HivePack` folder inside `SillyTavern/public/scripts/extensions/third-party/`.
4. Confirm the path is `SillyTavern/public/scripts/extensions/third-party/HivePack/manifest.json`.
5. Reload SillyTavern. Open Extensions > HivePack for controls.

Manual installation only: Install from URL expects a Git repository, not a ZIP.

## Thought format and colours

```html
<i>Mira | #9BD4A8: He means it. He has no idea.</i>
```

The name labels, border, background tint, and hover use the supplied colour. Body text keeps its readable blue-gray colour. `<i>Mira: A thought without a colour.</i>` also works.

With Remember colours enabled, a missing/invalid colour uses the last valid colour learned for that character in the current chat. If none is known, the default blue-gray style applies. Colours are saved in chat metadata, independently of global extension settings. Valid existing thoughts rebuild the mapping on reload. A thought with its own valid colour always keeps that explicit colour. Disabling colour memory uses explicit colours only.

Only AI message text is formatted. User/system messages, code examples, and ordinary unnamed italics are excluded. Saved message text, prompts, and injections are not rewritten.

## Recognized portraits

Resolution order:

1. A portrait override for the speaker or canonical alias target.
2. The current persona when the name matches `{{user}}`.
3. The active character when the name matches `{{char}}`.
4. A unique matching card among SillyTavern's loaded character cards.
5. No portrait when no match exists or multiple cards share the name.

Names ignore case, surrounding whitespace, and repeated spaces. Full names must otherwise match. When persona and character names are identical, persona wins unless overridden. All thought portraits work independently of the full-message Ripple portrait setting.

Images crop to the bubble height, with rounded corners and an inward/bottom fade. Failed images hide themselves without leaving a broken-image column.

## Character aliases

In the Aliases field, write one mapping per line:

```text
Appy = Apothos
Corazón = Apothos
Ser Marco = Marco
```

Use the target's actual card/persona name. Aliases affect both portraits and remembered colours. Displayed labels retain the name the model wrote. Alias chains work; cycles are ignored safely. Aliases are global preferences.

## Portrait overrides

Under Portrait overrides, enter the speaker name, select a card, and click Add / replace override. The dropdown includes card filenames so duplicate names can be distinguished. You can also choose Current persona or No portrait. Remove an override to restore automatic matching. Overrides are global preferences and identify cards by avatar filename; renaming/removing a card may require updating the override. Focus the dropdown to refresh its card list after creating a new card.

### Custom photo uploads

Enter the speaker name in Portrait overrides, choose a file under Or upload a custom portrait, then click Upload photo and set override. The upload directly saves an override for that speaker; you do not need the card dropdown or Add / replace override button for this route.

PNG, JPEG, WebP, and GIF files up to 10 MB are accepted. The image is stored using SillyTavern's image upload API in its HivePack image folder. The server-relative path is saved in the override, so reloading or opening the same server from another device keeps it available. The current override is preserved if upload fails. Removing or replacing an override does not delete the old uploaded image from the server. Backups of settings alone do not include these image files.

Custom photos follow the same alias and override-priority rules as card portraits. They affect thought portraits, not the full-message persona portrait.

## Appearance controls

- Maximum bubble width: 200–1200 px, constrained to the message width.
- Thought font size: 60–150% of surrounding text.
- Background opacity: 0–60%.
- Thought portrait width: 35–180 px, constrained on narrow screens.
- Hover enlargement: 0–5%.
- Corner radius: 0–30 px.
- Full-message persona portrait widths: desktop/mobile overrides; 0 uses Ripple defaults.

Hover is disabled on touch-only pointers. Reduced-motion preferences disable scaling and animation. Colour accents remain subtle; choose character colours that are legible on your theme.

## Collapsible thoughts

Click the top speaker label, or focus it and press Enter/Space, to collapse or expand a thought. Collapsed cards show just the label. State lasts for the current chat session and survives message rerenders when message ID and text remain the same. It resets when switching chats or reloading. Turn off collapsible thoughts to expand all cards.

### Collapse / expand all thoughts in one message

A Collapse thoughts button appears immediately below the message's token-count element whenever it has completed thought cards. Clicking it collapses every completed thought in that message; clicking Expand thoughts opens them all. If some thoughts are collapsed and some expanded, the next click collapses all. Individual speaker-label toggles keep the bulk button synchronized.

The control follows the collapsible-thoughts setting and disappears when monologue styling or collapsibility is disabled. Newly completed thoughts start expanded. When token-count text is disabled, the button stays in the same location under its hidden element; a theme hiding the entire avatar/info column also hides the button. Existing collapse-state session behavior applies.

## Wait for completion

HivePack checks the source message for explicit closing `</i>` tags. A browser-auto-closed unfinished thought stays undecorated until its closing tag arrives. Earlier completed thoughts may render while later text is still streaming. Stopping generation with an unclosed thought leaves it plain. If source text is unavailable, the current streaming message is left undecorated until streaming finishes.

## Limitations and removal

Uses standard SillyTavern message markup. Extensions that restructure message HTML or rewrite italic tags may interfere. Thought completion matching assumes normal, non-nested `<i>...</i>` tags in source order; use markdown emphasis inside thoughts instead of nested `<i>` tags. Only character cards already loaded by SillyTavern are recognized. HivePack does not infer identities from prose or partial names.

Delete the HivePack folder and reload to uninstall. Global preferences and per-chat colour metadata may remain. Moonlit Echoes files are never edited.

## Validation

JavaScript syntax, manifest, and DOM behavior were tested. See VALIDATION.txt for checks and limitations. Full-browser visual checks inside a running SillyTavern installation remain outstanding.

MIT license. Original companion code; no Moonlit Echoes source files bundled.
