# QuickPaste — Test Plan & Static-Analysis Findings

A complete manual QA pass for the QuickPaste Chrome MV3 extension. Two parts:

1. **Findings from static analysis** — bugs, smells, and discrepancies surfaced by reading the code. Pre-prioritized so you know what to verify first.
2. **Manual test matrix** — checklist covering every surface (popup, options/Collection, background, content script, offscreen, storage, sync, accessibility, security, performance).

The static analysis does **not** replace clicking through the UI in a real browser — these are predictions to confirm or refute during the manual pass.

> **Re-test first (fixed in this branch — needs browser verification):**
> 1. Toolbar shortcut is now `Alt+Shift+Q` on both platforms (was `Ctrl+Q`/`Cmd+Q`). Verify in `chrome://extensions/shortcuts`.
> 2. Popup preview for a clip whose first paragraph is ≥ `previewLength` (default 500) — should show truncated text + "View more…", not just the link.
> 3. Bulk-delete → Undo in the Collection — restored clips should reappear with their checkboxes checked.
> 4. Rapid context-menu saves (e.g. 20× as fast as you can right-click) — all 20 should land.
> 5. Rapid checkbox toggles / Select-All / Deselect-All races — `selectedCheckboxes` should reflect every click.
> 6. Send-to → Notion / Google Docs with clipboard denied (DevTools → block `navigator.clipboard.writeText`) — should flash "Copy failed" and NOT open the destination tab.
>
> **Doc note:** `CLAUDE.md` is stale. It documents the original CS50-era surface (popup, options, storage migration, paragraph split). The current build also has: image clips, pin/unpin, in-place edit, tags + tag banner, drag-and-drop reorder, sort modes, date-range + tag filters, saved searches, fuzzy search + match highlighting, custom tooltip system, quick-save, auto-capture content script, sync to `chrome.storage.sync`, offscreen document for clipboard, import/export (JSON & Markdown), Send To (Obsidian/Notion/Docs), back-to-top / scroll-to-bottom, side-panel settings (theme/accent/density/preview length/sort/show URL/show timestamp/notifications/auto-copy/dedup/trim/confirm-delete/auto-delete days/max clip count/search scope/copy format/Obsidian vault/auto-capture + blocklist/sync limit), prune-old-clips alarm. Treat any test below that mentions a feature missing from `CLAUDE.md` as a doc gap too.

---

## Part 1 — Findings from static analysis

> **Status legend:** ✅ FIXED — patched in this branch, needs re-verification in browser. 🟡 OPEN — not yet addressed. ⚪ WONTFIX — see notes.

### P0 / P1

- ✅ **FIXED · `Ctrl+Q` / `Cmd+Q` shortcut is hostile** — `manifest.json` registers `_execute_action` with `Ctrl+Q` (Linux/Win) and `Cmd+Q` (Mac). `Cmd+Q` on macOS is reserved by the OS and Chrome generally refuses to bind it for extensions; even where it binds, it quits Chrome. `Ctrl+Q` on Linux Chrome historically quits the browser. **Fix:** changed default to `Alt+Shift+Q` on both platforms. **Verify in `chrome://extensions/shortcuts`** that the new binding registered on each OS.

- ✅ **FIXED · Long-first-paragraph hides preview entirely** — `popup.js` lines 181–200. The loop accumulated `letterCount` *before* deciding whether to render. If `paragraphs[0].length >= previewLength` (default 500), the first iteration tripped the `else` branch and emitted *only* the "View more…" link with no text shown. **Fix:** rewrote the loop to track `remaining` budget and emit a word-boundary-truncated snippet (with "…") before the link. Repro check: save a clip with one paragraph ≥ 500 chars; open popup; verify text is now visible before the link.

- ✅ **FIXED · Undo of bulk delete loses checkbox selection** — `options.js` lines 886, 893 cleared `selectedCheckboxes` to `[]` both at delete time and at undo time, so restored clips reappeared unchecked. **Fix:** snapshot `selectedCheckboxes` before delete (`priorSelection`); on undo, write the snapshot back so the same set is re-selected and the user can act on it.

- ✅ **FIXED · `chrome.storage.local` read-modify-write races** — every storage mutation (`saveClip`, `updateClip`, `deleteClips`, `reorderClips`, `restoreClips`, `importClips`, `pruneOldClips`, and the `persistSelectionState` / Select-All closures in `options.js`) did `get → mutate → set` with no locking. **Fix:** added a `withLock` promise queue inside `lib/storage.js` that serializes every mutation, plus a `_getClipsInternal` non-locking read used by mutations so they don't re-enter the queue. Added a sibling `mutateSelection` queue in `options.js` for the `selectedCheckboxes` writes. Repro check: 20 rapid context-menu saves → all 20 land; rapid checkbox toggles → no lost state.

- ✅ **FIXED · `byteSize` of synced payload uses raw `JSON.stringify(items)` in the fallback** — `sync.js` line 83. The actual write wraps in `{ v:1, items }`, so the fallback under-counted. **Fix:** compute the envelope JSON once and reuse it in both the `TextEncoder` and fallback branches.

- 🟡 **OPEN · Sync deletes don't propagate** — `QPSync.pull` calls `QPStorage.importClips` which only *adds* missing ids. A clip deleted on Device A but still present in `synced_clips` (because Device B's last push contained it) will reappear on Device A after the next pull on startup. There is no tombstone mechanism. Needs a tombstone design (e.g. `deletedAt` field, GC after a TTL); architectural — not fixed in this pass.

### P2

- 🟡 **OPEN · `pendingTagClipId` can outlive its clip** — `background.js` line 88 stores it whenever `promptForTag` is on; nothing clears it if the user deletes the clip before opening the popup. The popup banner handles "target not found" by calling `close()`, which is fine, but the user briefly sees the banner with no clip to tag. Minor; not fixed.

- ✅ **FIXED · Notion / Google Docs "Send to" opens the new-tab URL even if the clipboard write was denied** — `lib/sendto.js` lines 52–58. `.catch(()=>{})` swallowed the error and `openTab` always ran. **Fix:** `writeClipboard` now rejects on failure; `notion`/`googleDocs` only `openTab` after the write succeeds; popup and options Send-To callbacks now flash "Copy failed" on rejection instead of falsely claiming "Copied".

- 🟡 **OPEN · `MutationObserver` in `tooltip.js`** observes the entire `<body>` for `attributes: ["title"]` and `childList: true, subtree: true`. On the Collection page with hundreds of clips, every full re-render fires a barrage of mutations. Profile re-render time at 500+ clips. Not fixed — speculative until measured.

- 🟡 **OPEN · Date-range "custom" with only `currentDateEnd` set** — `options.js` line 99–105. `dateRangeStart()` returns 0 when only the end date is filled, and `dateRangeEnd()` returns `MAX_SAFE_INTEGER` when only the start date is filled. That's a reasonable "open-ended" interpretation but should be intentional — confirm in UX.

- 🟡 **OPEN · `autoCapture` requires `<all_urls>` host permission**, which the Chrome Web Store reviewer may flag. The setting is off by default but the permission is requested at install. Note the user-facing wording in `options.html` already calls this out — verify it's accurate.

- 🟡 **OPEN · No tombstones / no version field on individual clips for sync** — see P0 entry above.

- ⚪ **WONTFIX · Image clips: no size/source validation** — `background.js` `handleImageSave` saves whatever `clickData.srcUrl` is. Could be `data:image/...;base64,…` (megabytes), `chrome-extension://…`, `blob:…`, or an external `https://` URL that becomes a dead link if the source disappears. Storage can fill quickly with base64 images. Skipped — adding limits would break legitimate base64 saves; needs product call.

- 🟡 **OPEN · `importClips` runs full `migrate` on the merged array**, which (correctly) reassigns ids if `seenIds` sees a duplicate. But it does *not* dedupe by text/content — an import re-run of the same JSON file will skip by id (good). If a user manually crafts a JSON file with no `id`s, every entry gets a fresh id, so re-importing creates duplicates. Document this.

### P3 / nits

- 🟡 **OPEN · `CLAUDE.md` storage shape is incomplete** — missing `kind: "text"|"image"` and `src: string` fields on `Clip`. Missing keys `chrome.storage.sync.settings`, `chrome.storage.sync.synced_clips`, `chrome.storage.local.saved_searches`, `chrome.storage.local.pendingTagClipId`. Theme/notifOptions are now legacy keys folded into `settings`.
- ✅ **FIXED · `CLAUDE.md` says the popup shortcut is `Ctrl+Q`** — shortcut changed to `Alt+Shift+Q`. CLAUDE.md still needs an update (separate doc task).
- 🟡 **OPEN · CDN fonts and Bootstrap CSS** are pulled from `cdn.jsdelivr.net` and `fonts.googleapis.com`. Both popup and options pages will FOUC briefly while loading, and will look broken offline.
- ⚪ **WONTFIX · `document.execCommand("copy")` in `offscreen.js`** is deprecated; the fallback to `navigator.clipboard.writeText` is fine but the primary path will eventually break. Skipped — works today; revisit when Chrome removes the API.
- ⚪ **WONTFIX · `window.prompt` in `options.js` line 714** ("Name this search") — UX preference, not a bug. Skipped.
- 🟡 **OPEN · `flashButton` interacts with the `tooltip.js` title shim** by design — verify the flash label actually shows in the custom tooltip after a button click, and that the original tooltip is restored after 1200 ms.
- 🟡 **OPEN · Sort mode `"manual"` is the docs default but `DEFAULTS.sortMode` is `"newest"`** — `lib/settings.js` line 28. Verify intended.
- 🟡 **OPEN · `previewLength` default is 500** but settings min is 50 and max is 5000 — fine, just confirm UI clamps.
- 🟡 **OPEN · `syncLimit` default 50, min 10, max 500** — at 500 with average clip size, the 100 KB sync quota will be exceeded and `pickPayload` will silently drop. Confirm with a "synced N of M" indicator in UI if missing.

### What looked OK on inspection

- **XSS surface:** every clip-derived string flows through `document.createTextNode(...)` or `innerText`. The `innerHTML` calls in `popup.js`/`options.js` only assign hardcoded SVG constants. `lib/search.js` `highlight` builds a `DocumentFragment` of text nodes wrapped in `<mark>` — no string concatenation into HTML. ✅
- **Source-URL button** is gated by `clip.url.startsWith("http")` in both popup and options — `javascript:` and `data:` URLs are not opened. ✅
- **Migration (`lib/storage.js` `migrate`)** is idempotent and handles `null` / non-array / missing-field / duplicate-id cases. ✅
- **`chrome.contextMenus.removeAll` before `create`** prevents duplicate menu items across reloads. ✅
- **`ensureOffscreen` race protection** via the `creatingOffscreen` promise + `.catch` swallowing concurrent-create errors. ✅
- **`selectedCheckboxes` legacy reset** on options-page load (`options.js` lines 612–618). ✅
- **Hash deep-link uses `CSS.escape`** to avoid selector injection. ✅
- **All referenced files in `manifest.json` exist.** ✅
- **`manifest.json` parses as valid JSON.** ✅

---

## Part 2 — Manual test matrix

For each item, record **Pass / Fail / Notes**. Capture console output from: extension-card "Service worker" inspector (background), popup DevTools, options DevTools.

### 0. Setup

- [ ] `chrome://extensions` → Developer mode → Load unpacked → repo root loads without manifest errors.
- [ ] Extension card shows version **1.2** matching `manifest.json`.
- [ ] No console errors in service worker on first install.
- [ ] `chrome://extensions/shortcuts` lists QuickPaste with `Ctrl+Q` (Win/Linux) or `Cmd+Q` (Mac). **If Mac shortcut is blank or refuses to bind, log P0 from Part 1.**
- [ ] Pin the extension to the toolbar.

### 1. Install / first-run

- [ ] After install, right-click on a page with text selected → **"Save text to QuickPaste"** appears.
- [ ] Right-click on an image → **"Save image to QuickPaste"** appears.
- [ ] Reload extension; both menu items still present (verifies `removeAll` + `create` re-registration).
- [ ] Service worker console: no errors. `chrome.storage.local.get('text', console.log)` returns `[]` or `undefined`.
- [ ] `chrome.storage.sync.get('settings', console.log)` returns the full defaults object after first save.

### 2. Saving text clips (context menu)

For each, select text on a normal HTTPS page, right-click → Save, then open the popup.

- [ ] Single short sentence saves as one fragment.
- [ ] Multi-paragraph selection with blank lines splits into multiple `text[]` entries (`\s{2,}` heuristic).
- [ ] Selection with only single newlines/spaces stays as one fragment.
- [ ] Selection with leading/trailing whitespace — note actual trim behavior (depends on `trimWhitespace` setting).
- [ ] **Long single paragraph (≥ 500 chars):** popup shows preview text + "View more…". *Expected per P0 — currently shows ONLY the link with no text. Confirm bug.*
- [ ] Unicode + emoji + RTL text saves and renders verbatim.
- [ ] **XSS check:** save `<script>alert(1)</script><img src=x onerror=alert(2)>` → no alert in popup or options; DOM shows escaped text nodes.
- [ ] From `chrome://extensions`: no menu item appears (or no-op if it does).
- [ ] From PDF viewer: note behavior.
- [ ] From cross-origin `<iframe>`: note behavior.
- [ ] From `<textarea>` / `contenteditable`: saves the selection.
- [ ] Rapid-fire: 20 saves in quick succession via context menu → all 20 land (or document any loss; see P0 race).
- [ ] Source URL on each clip matches the page URL including query string and hash.
- [ ] **Dedup `normalized`:** save "Hello   world", then "hello world", then "Hello world." — first two dedupe (case + whitespace ignored), third doesn't (punctuation differs).
- [ ] **Dedup `strict`:** all three save separately.
- [ ] **Dedup `off`:** no dedup.
- [ ] Dedup behavior moves the matched clip to most-recent position (does not preserve original position).
- [ ] **Max clip count:** set to 100, save 101 clips. Oldest *unpinned* drops. Pinned never drops. Just-saved never drops.
- [ ] **Trim whitespace** on/off respected.

### 3. Saving image clips (context menu)

- [ ] Right-click an `<img>` → "Save image to QuickPaste" → image appears as a clip with `kind: "image"`.
- [ ] Popup/options renders `<img>` element with `loading="lazy"`.
- [ ] Saving same image src twice with dedup on dedupes; with dedup off, two copies.
- [ ] Right-click a base64 `data:image/…` → saved as `clip.src` (potentially huge — note storage impact).
- [ ] Right-click an image on an `https://` site that later goes 404 → clip persists but image broken (acceptable).
- [ ] Notification body says "Image saved" / "Image already saved — moved to most recent".

### 4. Quick Save (popup → +)

- [ ] Toolbar popup → `+` button opens the textarea area.
- [ ] Typing then **Save** persists; URL is empty (no source button on the resulting clip).
- [ ] **Ctrl/Cmd+Enter** in the textarea saves.
- [ ] **Esc** closes without saving.
- [ ] **Paste** button reads `navigator.clipboard.readText()` and prefills (denies gracefully if blocked).
- [ ] Empty/whitespace-only input doesn't save.
- [ ] Multi-paragraph (separated by `\n\n`) splits into `text[]`.

### 5. Popup — list, search, edit, copy, send-to, delete

- [ ] Empty state when zero clips.
- [ ] Pinned clips render first.
- [ ] Sort mode (Settings → Default sort) reflected here.
- [ ] **Search** icon toggles search input; Esc clears + closes.
- [ ] Search filters live, case-insensitive, matches text + tags. URL match depends on `searchScope`.
- [ ] Matches are highlighted with `<mark>` (verify `lib/search.js` highlight works).
- [ ] **Pin / Unpin** toggles persist and re-render.
- [ ] **Edit** opens an inline textarea pre-filled with `\n\n`-joined text. Save commits with `\n\s*\n+` split. Cancel restores the original DOM.
- [ ] **Copy text** flashes "Copied" and writes joined text to clipboard.
- [ ] **Copy with source URL** appends `\n\n— <url>` (uses `text-url` format).
- [ ] **Source URL** button: only present when `clip.url.startsWith("http")`. Opens in new tab.
- [ ] **Send to → Obsidian:** only appears if `obsidianVault` is set; clicks open `obsidian://new?...` (verify in DevTools network or by having Obsidian installed).
- [ ] **Send to → Notion:** copies markdown body, opens `notion.so/new` — paste Ctrl+V lands.
- [ ] **Send to → Google Docs:** copies markdown body, opens `docs.google.com/document/create`.
- [ ] Send-to dropdown closes on outside click and on Esc.
- [ ] **Delete:** removes only that clip, shows "Clip deleted" toast with Undo. Undo restores at original position.
- [ ] If **Confirm before delete** is on, confirm dialog appears first.
- [ ] **"View more…"** href is `./options.html#<urlEncodedClipId>`, opens new tab, options scrolls to that clip.
- [ ] **Long single paragraph** P0 bug — does preview text show or only the link?

### 6. Tag banner (post-save tagging)

- [ ] With **Prompt for tag** on, save a clip → popup opens with tag banner visible.
- [ ] Type a tag → Enter saves it; appears as a pill on the clip.
- [ ] Esc / Skip dismisses without tagging.
- [ ] Two saves in a row with banner unviewed: only the most recent clip is offered for tagging.
- [ ] Delete a clip while its `pendingTagClipId` is set → reopen popup → banner shows then auto-closes.

### 7. Notifications

- [ ] **Notifications On:** OS notification appears on save with body "Saved/Updated …" or "Image saved".
- [ ] **Notification preview** off → generic body ("Your clip was saved" / "Saved & copied to clipboard" / "Duplicate clip — moved to most recent").
- [ ] **Notification preview** on → snippet (≤80 chars) prefixed "Saved: " or "Updated: ".
- [ ] **Notifications Off:** no notification.
- [ ] **autoCopy On:** save → system clipboard contains formatted clip (per `copyFormat`); paste into a text editor.
- [ ] autoCopy uses the offscreen document (verify in `chrome://extensions` → "Inspect views" lists offscreen.html during/just after a save).

### 8. Options page — top-level

- [ ] Loads at `chrome://extensions` → details → "Extension options", or via popup gear icon.
- [ ] Activity bar shows Settings, Backup, About icons. Click toggles the side panel; click again closes.
- [ ] **Esc** while panel is open closes it; focus returns to the last toggle.
- [ ] **About** links open in new tab.
- [ ] Back-to-top button appears after scrolling > 240px, animates smoothly (or jumps under reduced-motion).
- [ ] Scroll-to-bottom appears alongside it and hides near the bottom.

### 9. Settings panel (every control)

For each control: change → reload options page → value persists. Use service worker console `chrome.storage.sync.get('settings', console.log)` to verify the stored value.

**Appearance**
- [ ] Theme: Light/Dark — DOM `data-theme` updates on options *and* popup (reopen popup to confirm).
- [ ] Accent color: hex input changes `--accent` CSS var; Reset clears.
- [ ] Density: Compact/Comfortable updates `body[data-density]`.

**Clip display**
- [ ] Preview length: number 50–5000, step 50. Clamps at boundaries.
- [ ] Default sort: Manual/Newest/Oldest/A–Z. Re-render reflects.
- [ ] Show source URL: hides/shows URL meta.
- [ ] Show timestamp: hides/shows time meta.

**Notifications**
- [ ] On/Off radio. Preview-in-notification checkbox.

**Saving behavior**
- [ ] Auto-copy On/Off. Trim whitespace checkbox.
- [ ] Dedup: Strict/Normalized/Off — verify via Section 2.
- [ ] Prompt for tag — verify via Section 6.

**Storage & cleanup**
- [ ] Auto-delete: Never / 7 / 30 / 90 days. After setting, force the alarm via service worker: `chrome.runtime.sendMessage(...)` won't help — instead set `savedAt` of a test clip to `Date.now() - 8*24*3600*1000`, then in SW console call `QPStorage.pruneOldClips(7*24*3600*1000)` and verify the old clip is removed but pinned ones remain.
- [ ] Max clip count: 100/500/1000/None — verify via Section 2.
- [ ] Confirm before delete: on/off.

**Search**
- [ ] Scope: Text / URL / Both — verify filter in Section 5 / 10.

**Copy & integrations**
- [ ] Copy format: plain / text+URL / text+URL+time / markdown. Trigger via auto-copy or "Copy Selected" and paste into a plain text editor.
- [ ] Obsidian vault name persists; controls visibility of the Obsidian item in Send-to menus.

**Auto-capture**
- [ ] Toggle on. On any page, select + Ctrl+C → service worker receives `qp-auto-capture` message → clip saved.
- [ ] Add a domain to blocklist (e.g. `example.com`). On that domain and any subdomain (`www.example.com`), Ctrl+C does NOT save. On other domains, still saves.
- [ ] Blocklist textarea splits on newlines, trims, drops empties.
- [ ] With auto-capture *off* (default), Ctrl+C anywhere does NOT save.

**Sync**
- [ ] Toggle on → within ~1s, `chrome.storage.sync.synced_clips` is populated. Verify in SW console.
- [ ] `synced_clips.items.length` ≤ `syncLimit` + (count of pinned).
- [ ] Pinned clips always present.
- [ ] Sign in to the same Chrome profile on a second device (or use a second profile); verify clips populate on startup via `pull`.
- [ ] **Delete a clip on Device A; restart Device A → does the clip reappear from sync?** (Documents P0 bug.)
- [ ] At 500 clips of ~500 chars each, watch SW for sync quota errors; `pickPayload` should drop oldest until under 95 KB.

### 10. Options — Collection list

- [ ] Renders all clips. Pinned first, then per sort mode.
- [ ] Click a clip body — does NOT toggle selection (body is excluded).
- [ ] Click a non-body area of a card — toggles its checkbox + `is-selected` class.
- [ ] Clicking a button/link/input/label/tag pill does NOT toggle selection (verifies the `.closest()` exclusion list).
- [ ] Checkbox state persists across reload via `selectedCheckboxes`.
- [ ] **Legacy reset:** manually `chrome.storage.local.set({ selectedCheckboxes: [0,1,2] })` then reload options → resets to `[]` (no errors).

**Search + filters**
- [ ] Live search filter; case-insensitive; respects `searchScope`.
- [ ] Match highlighting applies to visible cards only.
- [ ] **Date range:** All / Today / 7d / 30d / Custom. Each re-renders.
- [ ] **Custom range with only start filled** → end defaults to `MAX_SAFE_INTEGER` (open-ended). Same for only-end.
- [ ] Reset clears custom dates.

**Saved searches**
- [ ] "Save search" prompts for a name (via `window.prompt`). Empty name aborts.
- [ ] Saved entry appears in the list; clicking applies query + dateRange + tag.
- [ ] Delete (`×`) removes it.
- [ ] Persists across reload (in `chrome.storage.local.saved_searches`).

**Per-clip actions** — mirror Section 5 in the Collection card. Bulk actions:
- [ ] **Select All** selects all *visible* (filtered) cards; toggles to **Deselect All**.
- [ ] **Copy Selected** uses `copyFormat`; joins with `\n\n`. Paste in a text editor.
- [ ] **Delete Selected** with toast + Undo. Undo restores at original positions. **Note**: per P1, selection is NOT restored after Undo.
- [ ] Confirm dialog appears for bulk delete if `confirmDelete` is on.

**Drag-and-drop reorder** (only when sortMode = `manual`)
- [ ] Pinned cards are not draggable.
- [ ] Drag an unpinned card before/after another; indicator (`drop-before` / `drop-after`) shows.
- [ ] On drop, order persists. Page does not scroll; `minHeight` lock + double-rAF prevents jump.
- [ ] Dragging to the same position is a no-op.
- [ ] Click immediately after a drag does NOT toggle selection (200ms grace via `lastDragEndTime`).
- [ ] In non-manual sort modes, cards are not draggable.

**Deep link**
- [ ] `options.html#<validClipId>` scrolls to clip on load and on hashchange.
- [ ] `options.html#bogusId` → no scroll, no console error.
- [ ] `options.html#collection-container` (legacy popup link target) → no scroll, no error.

### 11. Edit mode (popup + options)

- [ ] Edit opens a textarea pre-filled with `clip.text.join("\n\n")`.
- [ ] Save splits on `\n\s*\n+`, trims, drops empties. If everything becomes empty, falls back to `[textarea.value.trim()]`.
- [ ] Cancel restores the original DOM in both popup (`bodyEls` show again) and options (`body.innerHTML = originalHTML`).
- [ ] Highlighting is *skipped* on an editing card (`applyCollectionHighlights` checks `is-editing`).
- [ ] Edit doesn't change `savedAt` or `id` (verify in SW console after save).
- [ ] Edit on an image clip: no edit button is rendered (verify in popup).

### 12. Import / Export

- [ ] **Export JSON** downloads `quickpaste-YYYYMMDD-HHMM.json`. Open it: `{ app, v:1, exportedAt, clips: [...] }`.
- [ ] **Export Markdown** downloads `.md` with one H2 per clip, tags, body, attribution.
- [ ] **Import JSON** of the same file → 0 added, N skipped (all duplicates by id).
- [ ] Import a hand-crafted JSON with no `id` fields → migration assigns fresh ids; all imported.
- [ ] Import an array (not an envelope) → also accepted.
- [ ] Import malformed JSON → toast "Import failed: …".
- [ ] Import a `clips: []` envelope → 0 added, 0 skipped, no error.

### 13. Migration & storage hygiene

- [ ] Seed legacy data:
  ```js
  chrome.storage.local.set({ text: [{ text: ['legacy'], url: 'https://example.com' }] })
  ```
  Reload extension; open popup. Verify in SW console: clip now has `id`, `kind: "text"`, `src: ""`, `savedAt: 0`, `pinned: false`, `tags: []`.
- [ ] Reload again — no duplication, no field reset (idempotent).
- [ ] Seed garbage:
  ```js
  chrome.storage.local.set({ text: [null, {}, { id: "dup" }, { id: "dup" }] })
  ```
  Verify migration replaces `null`, fills `{}`, reassigns the duplicate id.
- [ ] Seed `text: "not an array"` → migration treats as `[]`; no crash.
- [ ] Quota stress: save 1 MB+ of clips. Watch for `QUOTA_BYTES` errors; verify graceful behavior.

### 14. Settings migration (sync)

- [ ] Seed legacy keys:
  ```js
  chrome.storage.sync.set({ theme: "dark", notifOptions: "Off", autoCopy: "Off" })
  ```
  Then `chrome.storage.sync.remove("settings")`. Reload extension; open options. Verify `settings.theme === "dark"`, `notifications === "Off"`, `autoCopy === "Off"`. Legacy keys removed from sync.
- [ ] Idempotent on re-run.

### 15. Cross-surface consistency

- [ ] Save a clip → popup (after reopen) and options page (after re-render via QPSettings.onChanged or full reload) both show it.
- [ ] Delete in popup → gone from options on next open.
- [ ] Pin in popup → pinned in options.
- [ ] Change theme in options → popup reflects on next open.
- [ ] Live `QPSettings.onChanged` re-render: while options is open, change a setting → re-renders without manual reload.

### 16. Service worker lifecycle

- [ ] After ~30s of inactivity, SW unloads (visible in `chrome://serviceworker-internals/`).
- [ ] Triggering a context-menu save wakes it; clip is saved successfully on the first wake.
- [ ] Reload extension; `onInstalled` re-runs migrations.
- [ ] Restart Chrome; `onStartup` runs prune (verify with a stale clip per Section 9), starts sync auto-push, and pulls sync.
- [ ] `ensureOffscreen` survives SW restart: trigger 5 rapid autoCopy saves in a row → exactly one offscreen document active at a time (check `chrome://inspect`).

### 17. Alarm (prune-old-clips)

- [ ] On install / startup, an alarm named `qp-prune-old-clips` exists. Verify: `chrome.alarms.getAll(console.log)` in SW console.
- [ ] `delayInMinutes: 60, periodInMinutes: 1440`.
- [ ] Removing the alarm and reloading the extension recreates it (only if missing).
- [ ] With `autoDeleteDays: 0`, prune is a no-op.
- [ ] With `autoDeleteDays: 7`, clips older than 7 days are removed *unless pinned*. Clips with `savedAt: 0` are kept (legacy).

### 18. Tooltips (custom system)

- [ ] Hovering any button shows the custom tooltip after ~80ms.
- [ ] Tooltip survives dynamic DOM insertions (newly rendered cards).
- [ ] `flashButton` swaps the label ("Copied" etc.), the visible tooltip text updates if the button is still hovered, then restores after 1200ms.
- [ ] Tooltip hides on click, Esc, scroll, resize.
- [ ] Position flips above the element when near the bottom of the viewport.
- [ ] Native browser tooltip (`title` attribute) NEVER appears.

### 19. Auto-capture content script

- [ ] On a normal page, with autoCapture off, no `qp-auto-capture` messages are sent (check SW console).
- [ ] With autoCapture on, Ctrl+C sends the message; service worker saves the clip with `url = location.href`.
- [ ] On a blocklisted domain or subdomain, no message sent.
- [ ] On `chrome://` and other restricted pages, content script does not run (Chrome blocks injection).
- [ ] After extension reload, content scripts on already-open tabs need a reload (verify: extension-context-invalidated swallowed silently).
- [ ] Copy of empty selection → no message.

### 20. Sync (chrome.storage.sync)

- [ ] With syncEnabled off, no `synced_clips` writes happen (verify by clearing it and saving a clip).
- [ ] Toggling syncEnabled on triggers a push within ~1s.
- [ ] Any subsequent local clip mutation triggers a debounced push (~1s).
- [ ] `synced_clips.items` includes every pinned clip plus most-recent `syncLimit` unpinned (by `savedAt` desc).
- [ ] At ~95 KB the payload is trimmed by dropping oldest unpinned first.
- [ ] Pull on startup imports missing-by-id clips; existing ids skipped.
- [ ] Cross-device manual test — see Section 9 Sync.

### 21. Security & privacy

- [ ] XSS via clip text — see Section 2.
- [ ] XSS via clip URL — `<a>`/source button gated by `startsWith("http")`. Try `javascript:alert(1)` as a clip URL (via seeded import); verify no link is rendered and source button is absent.
- [ ] Imported JSON with `id` collision → migration reassigns; no overwrite of existing clips.
- [ ] Permissions in `manifest.json`: `storage, contextMenus, notifications, clipboardWrite, offscreen, alarms`, `<all_urls>`. Each must have a justification in the listing.
- [ ] No telemetry / no outbound network requests from background, popup, options (Network panel).
- [ ] Bootstrap and Google Fonts loaded from CDN (this *is* outbound). Document or self-host before publishing if privacy is a concern.

### 22. Accessibility

- [ ] All interactive elements reachable by keyboard.
- [ ] Visible focus rings in both themes.
- [ ] All icon-only buttons have `aria-label`.
- [ ] Side panel toggles set `aria-pressed` correctly; `aria-hidden` on the panel reflects open state.
- [ ] `<dialog>` confirm uses native `showModal()` (focus trap, Esc closes).
- [ ] Tooltip has `role="tooltip"` and `aria-hidden` toggles.
- [ ] Color contrast ≥ 4.5:1 for body text in both themes (use Chrome's Accessibility panel).
- [ ] Screen reader test (NVDA/VoiceOver): clip count, delete actions, tag pills are announced sensibly.
- [ ] Reduced motion: back-to-top and scroll-to-bottom snap rather than animate (already coded; verify).

### 23. Performance

- [ ] 100 clips: options page renders < 500 ms, search input is instant.
- [ ] 500 clips: options page renders < 2 s; search filter stays responsive; profile MutationObserver overhead.
- [ ] Popup open time < 500 ms at 500 clips.
- [ ] Drag-and-drop at 500 clips: drag indicator stays smooth; drop + re-render < 1 s.

### 24. Upgrade / uninstall

- [ ] Load v1.1 (if archived), save clips, then load v1.2 unpacked over it — clips, settings, saved searches, sync all survive. Migrations run idempotently.
- [ ] Uninstall extension → reinstall → all `chrome.storage.local` and `.sync` data is gone; empty state.

### 25. Reporting

Produce:

1. **Pass/fail matrix** for every checkbox above.
2. **Confirmed bugs** with: repro steps, expected vs actual, environment, console output, screenshots, severity (P0–P3).
3. **Discrepancies vs CLAUDE.md** — the doc is significantly stale; flag every feature missing from it (see Part 1).
4. **Permission audit** — for each of the 6 `permissions` and the `<all_urls>` host permission, the user-facing justification you'd use in the Web Store listing.
