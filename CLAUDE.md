# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

QuickPaste is a Chrome extension (Manifest V3) that saves selected text from any page via right-click → "Save text to QuickPaste". Saved clips are viewable in the toolbar popup or a fuller Collection on the options page. It was originally built as a CS50 final project and is published on the Chrome Web Store.

## Build / run / test

There is no build step, package manager, bundler, linter, or test suite — this is plain HTML/CSS/JS loaded directly by Chrome.

To develop:
1. Open `chrome://extensions`, enable Developer mode.
2. "Load unpacked" → point at this repo's root (the directory containing `manifest.json`).
3. After editing files, click the reload icon on the extension card. Background-script edits require a reload; popup/options HTML/CSS/JS pick up on reopen.

Toolbar shortcut is `Ctrl+Q` (Windows/Linux) / `Cmd+Q` (Mac), set in `manifest.json` under `commands._execute_action`.

## Architecture

Three entry points + one shared library, all sharing state through `chrome.storage`:

- **`lib/storage.js`** — shared CRUD layer. Exposes `globalThis.QPStorage` with `getClips`, `saveClip`, `updateClip`, `deleteClips`, `restoreClips`, `migrate`. Loaded via `importScripts` in the service worker and `<script>` in popup/options HTML. **All clip mutation should go through here** — don't poke `chrome.storage.local.text` directly.
- **`background.js`** — service worker. Registers the `save-text` context menu on install and handles clicks: splits `selectionText` on runs of 2+ whitespace chars (the heuristic the author landed on as a clipboard substitute, since real clipboard access required permissions that hurt UX), then calls `QPStorage.saveClip({ text, url })` and fires a notification if enabled. Also runs `QPStorage.getClips()` on install/startup to trigger the migration backfill.
- **`popup.html` + `popup.js`** — toolbar popup. Reads clips via `QPStorage.getClips()` and renders each one; truncates with a "View more…" link to the options page once a clip's character count exceeds 500. The link uses `./options.html#<clipId>` so the Collection scrolls to the right clip.
- **`options.html` + `options.js`** — full Collection view plus notification On/Off setting and theme toggle. Renders clips with per-item checkboxes for bulk delete (with undo toast), bulk copy, Select All / Deselect All, and a live search filter.

### Storage shape

- `chrome.storage.local.text` — `Array<Clip>`. Each `Clip` is:
  ```js
  {
    id: string,         // UUID, stable across renders/sorts/filters
    text: string[],     // paragraph fragments from the \s{2,} split in background.js
    url: string,        // pageUrl of the source page
    savedAt: number,    // Date.now() at save; 0 for legacy clips backfilled by migration
    pinned: boolean,    // reserved for Phase 2 pin feature
    tags: string[],     // reserved for Phase 3 tag feature
  }
  ```
  `lib/storage.js` `migrate()` is idempotent: on first read after upgrade it backfills `id`/`savedAt`/`pinned`/`tags` on any clip missing them and writes back.
- `chrome.storage.local.selectedCheckboxes` — `string[]` of clip **ids** (not indices) currently selected in the Collection. Legacy numeric values are auto-reset to `[]` on options page load.
- `chrome.storage.sync.notifOptions` — `"On"` | `"Off"`.
- `chrome.storage.sync.theme` — `"light"` | `"dark"`.

### Gotchas worth knowing before editing

- **Identity is by `clip.id`, not array position.** Renders set `container.dataset.clipId` and `checkbox.dataset.clipId`; delete/copy/select-all all iterate by id. Reordering or filtering the clip array is now safe.
- **`lib/storage.js` must stay classic-script-compatible.** It's loaded via `importScripts()` in the MV3 service worker, so no ES module syntax. It attaches to `self`/`globalThis` as `QPStorage`.
- **Popup is single-clip delete only.** Its per-clip delete button calls `QPStorage.deleteClips([id])` followed by `location.reload()` — that's fine for one item but not a pattern to copy into anything bulk.

## Source of truth for project context

`readme.md` is the CS50 submission write-up — it documents the author's design decisions (especially the paragraph-splitting workaround) and is the closest thing to design docs this repo has.
