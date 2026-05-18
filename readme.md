# QuickPaste

A fast, lightweight clipboard organizer for Chrome. Save text and image clips from any web page with a single right-click, then find, organize, and reuse them whenever you need.

No account. No sign-up. No servers. Everything stays on your device.

- **Chrome Web Store:** [QuickPaste listing](https://chromewebstore.google.com/detail/kdlcijllofgjnpdghojpdhjjhnnffcgb)
- **Website:** https://cristiangabriel.dev/QuickPaste/index.html
- **Issues / support:** https://github.com/cristiangabriel88/quickpaste/issues
- **Author:** Constantinescu Cristian-Gabriel — cristiconstantinescu88@gmail.com

---

## Install

**From the Chrome Web Store (recommended)**

1. Open the [QuickPaste listing](https://chromewebstore.google.com/detail/kdlcijllofgjnpdghojpdhjjhnnffcgb).
2. Click _Add to Chrome_, then confirm the permissions prompt.
3. Pin the QuickPaste icon to the toolbar via the puzzle-piece menu.

**From source (for development or to try the latest unreleased build)**

1. Clone this repository.
2. Open `chrome://extensions`, enable _Developer mode_ (top-right toggle).
3. Click _Load unpacked_ and select the repo root (the directory containing `manifest.json`).
4. Pin the QuickPaste icon to the toolbar.

There is no build step, package manager, or bundler — files are plain HTML/CSS/JS loaded directly by Chrome.

---

## Usage (10-second tour)

1. Select text on any web page.
2. Right-click → **Save text to QuickPaste**.
3. Click the QuickPaste toolbar icon (or press `Alt+Shift+Q`) to see your saved clip.

Same flow for images: right-click an image → **Save image to QuickPaste**.

Want to jot something down by hand? Open the popup and click the `+` button to type or paste a clip directly.

---

## Features

### Save and capture

- Right-click context menu for text and images on any site.
- Manual quick-save form in the popup.
- Optional auto-capture of `Ctrl+C` / `Cmd+C` events, with a per-domain blocklist for privacy. **Off by default.**
- Keyboard shortcut to open the popup: `Alt+Shift+Q` (rebindable at `chrome://extensions/shortcuts`).

### Organize

- Pin important clips so they stay on top.
- Add and edit per-clip **labels** via a dedicated tag-icon button on each clip. The editor shows your current labels as removable pills and offers a "Pick from existing" row of one-click suggestions drawn from every label already in use across your collection, so you stay consistent without retyping.
- Filter by label from the **Label** dropdown in the Collection filter bar (next to Sort). Shows up to 30 labels ranked by usage count, each annotated with how many clips carry it.
- Drag-and-drop reorder (in manual sort mode).
- Sort by manual order, newest, oldest, or A–Z.
- Edit clips in place — fix typos, change wording, merge paragraphs.

### Find anything fast

- Live search with fuzzy matching and typo-tolerance (e.g. `recevied` still matches `received`).
- Match highlighting shows you where your query landed in each clip.
- Filter by date range (today, last 7/30 days, custom) and by tag.
- Save favourite searches and reapply them with one click.

### Bulk actions

- Multi-select with checkboxes, plus Select All / Deselect All.
- Bulk delete with a 6-second Undo toast.
- Bulk copy joins selected clips using your chosen format (plain, with source URL, with timestamp, or Markdown).

### Get clips out

- One-click copy to the system clipboard.
- "Copy with source URL" appends the original page link automatically.
- Send to integrations:
  - **Obsidian** — pre-fills a new note in your vault via the `obsidian://` URL scheme.
  - **Notion** — copies the clip and opens a new Notion page; paste with `Ctrl+V`.
  - **Google Docs** — copies the clip and opens a new Doc; paste with `Ctrl+V`.
- Export the whole Collection to JSON or Markdown.
- Import clips back from a JSON export.

### Sync (optional)

- Mirror your pinned clips plus the most recent N clips across the Chrome browsers you're signed into, via your own Google account. **Off by default.** The developer has no access to your data.

### Looks and feel

- Light and Dark themes.
- Custom accent colour.
- Compact or Comfortable density.
- Adjustable preview length; toggle source URL and timestamp display.

### Housekeeping

- Optional auto-delete: prune clips older than 7, 30, or 90 days. Pinned clips are never pruned. **Off by default.**
- Optional max clip count: cap your collection at 100, 500, or 1000 clips; oldest unpinned drop first. **Off by default.**
- Deduplication: strict, normalized (case + whitespace ignored), or off.
- Optional confirm-before-delete prompt.

---

## Privacy

QuickPaste does not collect personal information, browsing history, passwords, form data, or anything else you don't explicitly save. There are no servers. There are no analytics. There is no account system.

The extension requests the `<all_urls>` host permission for one reason: so the right-click _Save text_ and _Save image_ menu items work on every site you choose to use them on, and so the opt-in auto-capture feature can listen for your own `Ctrl+C` actions if you turn it on. The extension does not read page content on its own.

Full privacy policy and per-permission justifications: see [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md).

---

## Architecture

Three entry points + a small shared library, all sharing state through `chrome.storage`:

| File                                          | Role                                                                                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background.js`                               | Manifest V3 service worker. Registers the context menus, handles save clicks, manages the prune alarm, drives optional sync push/pull, and dispatches messages from the auto-capture content script. |
| `popup.html` / `popup.js` / `popup.css`       | The toolbar popup: quick search, recent clips, per-clip actions, pin/edit/copy/delete, send-to integrations, and quick-save.                                                                         |
| `options.html` / `options.js` / `options.css` | The full Collection: bulk operations, advanced filters, saved searches, drag-and-drop reorder, settings panel, import/export.                                                                        |
| `offscreen.html` / `offscreen.js`             | A hidden helper page that performs clipboard writes (MV3 service workers can't access the clipboard directly).                                                                                       |
| `content/capture.js`                          | Content script for opt-in auto-capture of `copy` events. No-op unless the user enables auto-capture.                                                                                                 |
| `lib/storage.js`                              | Central CRUD layer for clips. Idempotent migration, write serialization via an internal lock. **All clip mutations go through here.**                                                                |
| `lib/settings.js`                             | Centralized preference store with defaults and legacy-key migration.                                                                                                                                 |
| `lib/sync.js`                                 | Mirrors recent + pinned clips to `chrome.storage.sync` (opt-in).                                                                                                                                     |
| `lib/search.js`                               | Fuzzy matching + match highlighting.                                                                                                                                                                 |
| `lib/format.js`                               | Relative/absolute time formatting and copy-format renderers (text, text+URL, Markdown, etc.).                                                                                                        |
| `lib/exporter.js`                             | JSON and Markdown export/import.                                                                                                                                                                     |
| `lib/sendto.js`                               | Obsidian / Notion / Google Docs integrations.                                                                                                                                                        |
| `lib/toast.js`                                | Shared undo toast.                                                                                                                                                                                   |
| `lib/confirm.js`                              | Shared confirm dialog backed by `<dialog>`.                                                                                                                                                          |
| `lib/tooltip.js`                              | Custom themed tooltip system replacing the slow native `title=""` tooltip.                                                                                                                           |
| `lib/savedSearches.js`                        | CRUD for named saved-search combos.                                                                                                                                                                  |

For storage shape, migration behaviour, and gotchas, see [`CLAUDE.md`](CLAUDE.md).

---

## Development

There is no build step, no `package.json`, no test runner. Workflow:

1. Edit files in place.
2. Reload the extension on `chrome://extensions` (click the reload icon on the card).
3. Popup and options HTML/CSS/JS pick up changes on reopen; background-script edits require an explicit reload.

**Inspecting:**

- Service worker logs: `chrome://extensions` → QuickPaste card → _Service worker_ link.
- Popup logs: right-click the popup → _Inspect_.
- Options page logs: open the options page, then `F12`.
- Offscreen document: `chrome://extensions` → QuickPaste card → _Inspect views: offscreen.html_ (only visible while the document is alive — briefly, after an auto-copy save).

**Storage inspection (run in the service-worker console):**

```js
chrome.storage.local.get("text", console.log); // all clips
chrome.storage.sync.get("settings", console.log); // settings
chrome.storage.sync.get("synced_clips", console.log); // sync mirror (if enabled)
chrome.storage.local.get("saved_searches", console.log); // saved searches
```

**Pre-submission and testing docs:**

- [`STORE_SUBMISSION.md`](STORE_SUBMISSION.md) — privacy policy, per-permission justifications, product description, submission checklist.
- [`TESTING.md`](TESTING.md) — full manual QA matrix and static-analysis findings.
- [`store-description.txt`](store-description.txt) — paste-ready text for the Chrome Web Store _Description_ field.

---

## Project structure

```
quickpaste/
├── manifest.json           MV3 manifest (permissions, commands, entry points)
├── background.js           Service worker
├── popup.html|css|js       Toolbar popup
├── options.html|css|js     Options page + Collection
├── offscreen.html|js       Clipboard write helper
├── content/
│   └── capture.js          Opt-in auto-capture content script
├── lib/                    Shared libraries (storage, settings, sync, search, …)
├── icons/                  Toolbar and store icons
├── scripts/                Local utility scripts (not loaded by the extension)
├── CLAUDE.md               Codebase guide for Claude Code
├── STORE_SUBMISSION.md     Web Store submission pack (policy, justifications, description)
├── TESTING.md              Manual QA plan and static-analysis findings
└── store-description.txt   Paste-ready Web Store listing description
```

---

## Permissions

| Permission         | Why                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`          | Save clips, tags, pin state, and settings locally; optionally mirror via Chrome Sync.                                                                       |
| `contextMenus`     | Add _Save text to QuickPaste_ and _Save image to QuickPaste_ to the right-click menu.                                                                       |
| `notifications`    | Optional confirmation toast on save (off-able in settings).                                                                                                 |
| `clipboardWrite`   | Optional "auto-copy on save" — writes the saved clip to the system clipboard.                                                                               |
| `offscreen`        | Required by MV3 to perform the clipboard write from a hidden helper page (service workers can't access the clipboard directly).                             |
| `alarms`           | Schedules the once-per-day auto-delete prune.                                                                                                               |
| Host: `<all_urls>` | So the right-click menu items work on any site and so opt-in auto-capture can observe `Ctrl+C` events. The extension does not read page content on its own. |

---

## Origin

QuickPaste started as a Harvard CS50x final project. The brief was to "build something of interest to you, that you solve an actual problem, that you impact your community, or that you change the world." Friends asked for "something fast and easy, to select some text and save it, like taking notes as you go, but no logging in, no account, really simple and fast." That became v1.0.

A specific early design decision worth flagging: the original idea was to use the system clipboard so multi-paragraph selections kept their structure, but the clipboard API required permissions that hurt the install-time UX. Instead, `background.js` splits `selectionText` on runs of 2+ whitespace characters as a heuristic for paragraph boundaries. It's not perfect, but it preserves structure on most real-world pages without asking for the clipboard. That heuristic is still the one in production.

v2.0 (2026) was a near-complete rewrite around the same core idea: image clips, pins, tags, drag-and-drop reorder, fuzzy search, in-place edit, bulk operations with undo, opt-in auto-capture and sync, Send-to integrations, JSON/Markdown import/export, retention rules, and the light/dark themed UI.

---

## License

Released for personal and educational use. Contributions and bug reports welcome via [GitHub issues](https://github.com/cristiangabriel88/quickpaste/issues).
