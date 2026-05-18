# QuickPaste — Chrome Web Store Submission Pack

This document contains everything you need to submit (or re-submit) QuickPaste to the Chrome Web Store: the privacy policy text, the per-permission justifications, the single-purpose statement, and the data-handling disclosures.

How to use it:

1. **Privacy policy** — copy the section titled *"Privacy Policy (publish this)"* into a public web page (GitHub Pages, a Notion page set to public, your own site, anything with a stable URL). The Web Store requires a publicly reachable URL — you can't link to this file in the repo because the listing form will reject anything that isn't `https://…`.
2. **Permission justifications** — paste each one into the corresponding field on the Privacy tab of the developer dashboard. There is one field per permission listed in `manifest.json`.
3. **Single-purpose description** — paste into the *Single purpose* field on the Privacy tab.
4. **Data-handling disclosures** — use the checklist to fill in the *Data usage* section (the certifications). I've pre-filled the answers based on what the code actually does.

The text below is written to match the behavior in the code as of version 2.0. If you add a feature that touches new data (an analytics call, a remote backup, a paid tier, etc.) you must update the policy *before* the new version ships.

---

## 1. Privacy Policy (publish this)

> **QuickPaste — Privacy Policy**
>
> *Effective date: 2026-05-18*
> *Last updated: 2026-05-18*
>
> QuickPaste is a Chrome extension that lets you save text and image clips from web pages into a local Collection. This policy explains what data the extension handles, where that data lives, and what it is (and is not) used for.
>
> ### Summary
>
> - QuickPaste stores your saved clips on your own device using Chrome's built-in storage.
> - If you turn on the optional "Sync" feature, your clips are mirrored through your own Google Account using Chrome Sync. The developer never sees them.
> - QuickPaste does not send any data to the developer, any analytics service, or any other third party.
> - QuickPaste has no account system, no login, and no server.
>
> ### What data QuickPaste handles
>
> QuickPaste handles the following information, all of which stays on your device or inside your own Google Account's Chrome Sync storage:
>
> 1. **Text you explicitly save.** When you right-click selected text on a page and choose "Save text to QuickPaste", the selected text and the URL of the page you saved it from are stored as a clip.
> 2. **Images you explicitly save.** When you right-click an image and choose "Save image to QuickPaste", the image's URL (`src`) and the URL of the page it appeared on are stored as a clip. QuickPaste does not download or re-host the image itself.
> 3. **Copied text, only if you opt in.** QuickPaste includes an optional "auto-capture" feature that, when enabled by you in the extension's settings, saves the plain-text contents of any copy action (Ctrl+C / Cmd+C) on pages you visit. This feature is **off by default**. You can also add specific sites to a blocklist so that copies on those sites are never captured.
> 4. **Your extension settings.** Preferences such as theme, notification on/off, sort order, auto-delete window, sync on/off, and the auto-capture blocklist are stored as settings.
> 5. **Tags and pin state you add to clips.** Any tags or pin/unpin actions you perform on saved clips are stored alongside the clip.
>
> QuickPaste does not collect or have access to: your browsing history, your form inputs, your passwords, your cookies, your identity, your IP address, your location, your contacts, or the contents of pages other than what you explicitly save (or what you copy while auto-capture is enabled).
>
> ### Where the data is stored
>
> - **On your device:** clip contents and most data are stored in `chrome.storage.local`, which is a sandboxed storage area Chrome provides to the extension. This data lives on your computer and is removed if you uninstall the extension.
> - **In your Google Account (only if you turn on Sync):** if you enable the "Sync" feature in QuickPaste's settings, a subset of your clips (your pinned clips plus the most recent N unpinned clips, where N is a number you choose) is written to `chrome.storage.sync`. Chrome itself replicates that storage between browsers signed in to the same Google Account. The data is encrypted in transit and at rest by Google; the developer of QuickPaste has no access to it and no way to read it.
> - **In Chrome's clipboard (only when you trigger it):** if you have "Auto-copy on save" turned on, saved text is also written to your system clipboard so you can paste it elsewhere. This happens locally through an offscreen document. Nothing is transmitted off your machine.
>
> ### What QuickPaste does *not* do
>
> - QuickPaste does not make network requests to any server controlled by the developer.
> - QuickPaste does not include analytics, telemetry, crash reporting, or advertising SDKs.
> - QuickPaste does not sell or transfer your data to anyone.
> - QuickPaste does not use your data for any purpose unrelated to the core feature (saving and organizing clips).
> - QuickPaste does not use your data for credit, lending, or any form of automated decision-making.
> - QuickPaste does not use your data to train any machine-learning or AI model.
>
> ### Permissions and why they are requested
>
> - **`storage`** — to save your clips and settings locally and (optionally) to sync them through your own Google Account.
> - **`contextMenus`** — to add the "Save text to QuickPaste" and "Save image to QuickPaste" entries to the right-click menu.
> - **`notifications`** — to optionally show a small confirmation notification when a clip is saved (you can turn this off).
> - **`clipboardWrite`** — to optionally place the contents of a saved clip onto your system clipboard when "Auto-copy" is enabled.
> - **`offscreen`** — required by Chrome's Manifest V3 to perform the clipboard write from a hidden helper page, since service workers cannot access the clipboard directly.
> - **`alarms`** — to wake the extension once per day to delete clips older than your configured retention window (if you have set one).
> - **Host permissions: all URLs (`<all_urls>`)** — required so that the "Save text" and "Save image" right-click menu items work on any website you choose to use them on, and so the opt-in auto-capture feature can observe copy actions on the sites you visit. The extension does not read page contents on its own; it only reads what you select, what you right-click, or what you copy when auto-capture is enabled.
>
> ### Your control over your data
>
> - You can delete individual clips, bulk-delete selected clips, or clear everything from QuickPaste's options page.
> - You can disable Sync at any time in the settings; doing so stops further uploads to `chrome.storage.sync`.
> - You can disable auto-capture at any time, or add specific sites to its blocklist.
> - Uninstalling the extension removes all local data. Chrome may retain the synced copy in your Google Account until you also clear it from `chrome://settings/syncSetup/advanced` or sign out and delete your sync data through Google.
>
> ### Children
>
> QuickPaste is not directed at children under 13 and does not knowingly collect any data from them.
>
> ### Changes to this policy
>
> If the extension's behavior changes in a way that affects this policy, the policy will be updated before the new version is published, and the "Last updated" date at the top will change.
>
> ### Contact
>
> Questions about this policy can be sent to: **cristiconstantinescu88@gmail.com**

---

## 2. Single-purpose description (paste into dashboard)

> QuickPaste lets users save text snippets and images from web pages into a personal collection that they can browse, search, organize with tags, and copy back to their clipboard. All saving is initiated by the user via a right-click menu, a keyboard shortcut, or an opt-in auto-capture of their own copy actions.

Keep this to one paragraph. Chrome's policy is that everything the extension does must serve this stated purpose — auto-copy, notifications, sync, auto-delete, tags, pinning, and search all clearly do, so you're fine.

---

## 3. Per-permission justifications (paste into dashboard)

Each box on the Privacy tab takes a short paragraph. Use these:

**`storage`**
> Used to save the user's clips, tags, pinned state, and extension preferences locally on their device. When the user opts in to sync, a subset of clips is also written to `chrome.storage.sync` so they are mirrored across the user's own Chrome browsers via their Google Account.

**`contextMenus`**
> Used to add "Save text to QuickPaste" and "Save image to QuickPaste" entries to the browser's right-click menu. These are the primary ways the user adds clips to their collection.

**`notifications`**
> Used to show an optional small confirmation when a clip is saved (e.g. "Saved" or a short preview). The notification can be turned off in the extension's settings.

**`clipboardWrite`**
> Used by the optional "Auto-copy on save" feature, which writes the just-saved clip back to the system clipboard so the user can immediately paste it elsewhere. Performed via an offscreen document because Manifest V3 service workers cannot access the clipboard directly.

**`offscreen`**
> Used to host a hidden helper page that performs the clipboard write described under `clipboardWrite`. The offscreen document exists only to satisfy Manifest V3's requirement that clipboard writes happen in a document context.

**`alarms`**
> Used to schedule a once-per-day background task that deletes clips older than the user's configured retention window (off unless the user enables an auto-delete period in settings).

**Host permission: `<all_urls>` ("Read and change your data on all websites")**
> The extension's core function is to let users save text and images from any web page. The host permission is required so that:
> 1. The "Save text" and "Save image" right-click menu items can capture the selection or image URL the user clicks on, regardless of which site they are on.
> 2. The optional, off-by-default "auto-capture" feature can observe the user's own copy actions on sites they visit, so it can save those copies as clips.
> The extension does not read or modify page contents on its own. It only acts on what the user explicitly selects, right-clicks, or copies. It does not send any data off the user's device.

---

## 4. Data-usage disclosures (the checkboxes)

On the *Privacy practices* tab the form asks "What user data does your extension collect?" Check these boxes and not the others:

- **Personally identifiable information** — *No*. QuickPaste does not collect names, addresses, emails, ages, or identifiers.
- **Health information** — *No*.
- **Financial and payment information** — *No*.
- **Authentication information** — *No*.
- **Personal communications** — *No*. (Even though users *could* paste an email into a clip, the extension is not designed for and does not require communications data.)
- **Location** — *No*.
- **Web history** — *No*. The extension stores the URL of the page each clip was saved from, but it does not record pages the user merely visited.
- **User activity** — *Yes, in a limited sense*. If you want to be conservative, check this box and explain in the field: "QuickPaste stores the contents of clips the user explicitly chooses to save, and — only if the user opts in — the plain text of `copy` actions on pages they visit. No keystrokes, mouse movements, scroll position, or page contents beyond what the user saves or copies are recorded."
- **Website content** — *Yes*. Explanation: "QuickPaste stores the text or image URL the user selects and saves via the right-click menu, along with the URL of the source page. It only stores what the user explicitly chooses to save (or copies, if auto-capture is enabled)."

Then the form requires three certifications. All three are **true** for QuickPaste:

- ☑ I do not sell or transfer user data to third parties, apart from the approved use cases.
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

---

## 5. Pre-submission checklist

Before clicking submit:

- [ ] `manifest.json` version is bumped (currently `2.0`).
- [ ] Privacy policy is published at a public HTTPS URL and that URL is pasted into the dashboard.
- [ ] Single-purpose description pasted.
- [ ] All seven permission justifications pasted (including the host-permission one, which is the field labelled "Host permission").
- [ ] Data-usage checkboxes match section 4.
- [ ] Screenshots in the listing match the current UI (the v2.0 redesign means old screenshots may be misleading).
- [ ] Auto-capture is described in the listing description as "optional, off by default" — reviewers explicitly look for this when an extension has `<all_urls>` plus a content script.
- [ ] No leftover debug `console.log` calls that mention developer tooling (reviewers occasionally flag these).

---

## 6. If review comes back with a clarification request

The two most common ones for an extension with this shape are:

1. **"Your host permission request is broader than necessary."** Reply with the section-3 justification for `<all_urls>` and emphasize: (a) the right-click menu must work on arbitrary sites, (b) the extension does not read page contents on its own, only what the user explicitly acts on, (c) the broadest data path — auto-capture — is opt-in and disabled by default.
2. **"Please clarify your data handling."** Link them to the privacy policy URL, and quote the *"What QuickPaste does not do"* section verbatim — reviewers want to see explicit "no analytics, no transfer, no sale" statements.

Do not promise to remove `<all_urls>` to make the request go away — the extension genuinely needs it for the right-click menu to work everywhere. Justifying it correctly is the right move.

---

## 7. Product detail description (paste into the listing's Description field)

The Chrome Web Store "Description" field allows up to 16,000 characters. The text below is ~5,400 characters — well under the cap, comprehensive enough to communicate every feature, and structured with plain-text section headers (the Store does not render Markdown). Paste it verbatim into the Description box on the Store listing tab.

Before pasting:
- Replace `[your privacy URL]` near the bottom with your actual published privacy policy URL.
- Confirm the keyboard shortcut still matches `manifest.json` (currently `Alt+Shift+Q`). If you change the binding, update the description.

> QuickPaste is a fast, lightweight clipboard organizer for Chrome. Save snippets of text and images from any website with a single right-click, then find, organize, and reuse them whenever you need. No account, no sign-up, no servers — everything stays on your device.
>
> WHAT IT DOES
>
> Right-click any selected text on any page and choose "Save text to QuickPaste" — that's it. The clip lands in your personal Collection along with the URL of the page it came from. Click the QuickPaste icon in your toolbar (or press Alt+Shift+Q) to see everything you've saved.
>
> Same flow for images: right-click an image, choose "Save image to QuickPaste", and it lands in your Collection as a visual clip.
>
> Need to jot something down by hand? Open the popup and use the quick-save form to type or paste a clip directly — useful for ideas, draft replies, or anything you didn't copy from a webpage.
>
> WHY USE IT
>
> - No sign-up, no login, no account. Install and start saving immediately.
> - 100% local by default. Clips live in your browser's own storage. The developer never sees them.
> - No analytics, no telemetry, no ads. Single-purpose extension: it saves clips, and that's it.
> - Open and transparent. The privacy policy spells out exactly what is and isn't stored.
> - Free.
>
> GREAT FOR
>
> - Researchers building a swipe file from articles, papers, and forum threads.
> - Writers collecting quotes, references, and source URLs without losing the link.
> - Students saving lecture notes, definitions, and study material as they browse.
> - Designers and developers grabbing color codes, snippets, and inspiration.
> - Anyone tired of pasting things into a scratch document and losing them.
>
> FEATURES
>
> Save and capture
> - Right-click context menu for text and images on any site.
> - Quick-save form in the popup for typing clips manually.
> - Optional auto-capture: opt in to save every Ctrl+C / Cmd+C automatically, with a per-domain blocklist for privacy. Off by default.
> - Toolbar shortcut: Alt+Shift+Q (rebindable at chrome://extensions/shortcuts).
>
> Organize
> - Pin important clips to keep them at the top.
> - Add tags to clips and filter by them later.
> - Drag-and-drop to reorder clips in manual sort mode.
> - Sort by manual order, newest, oldest, or A–Z.
> - Edit clips in place — fix typos, change wording, merge paragraphs.
>
> Find anything fast
> - Live search with fuzzy matching and typo-tolerance: "recevied" still finds "received".
> - Match highlighting shows you exactly where your query landed.
> - Filter by date range (today, last 7 days, last 30 days, custom range) and by tag.
> - Save your favourite searches and apply them with one click later.
>
> Bulk actions
> - Select multiple clips with checkboxes; Select All / Deselect All.
> - Bulk delete with a 6-second Undo toast — your deletes are reversible.
> - Bulk copy joins selected clips with your chosen format (plain, with source URL, with timestamp, or Markdown).
>
> Get clips out
> - One-click copy a clip to your system clipboard.
> - "Copy with source URL" appends the original page link automatically.
> - Send to integrations: Obsidian (pre-fills a new note in your vault), Notion (copies and opens a new page), Google Docs (copies and opens a new doc).
> - Export your whole Collection to JSON or Markdown for backup or migration.
> - Import clips back from a JSON export.
>
> Stay in sync (optional)
> - Turn on Chrome Sync to mirror your pinned clips plus the most recent N clips across the browsers you're signed into. Uses your own Google account; the developer has no access. Off by default.
>
> Looks and feel
> - Light and Dark themes.
> - Custom accent colour.
> - Compact or Comfortable density.
> - Adjustable preview length; toggle source URL and timestamp display.
>
> Housekeeping
> - Optional auto-delete: clips older than 7, 30, or 90 days are pruned automatically. Pinned clips are never pruned. Off by default.
> - Optional max clip count: cap your collection at 100, 500, or 1000 clips; oldest unpinned drop first. Off by default.
> - Deduplication: strict, normalized (case + whitespace ignored), or off — your call.
> - Optional confirm-before-delete safety prompt.
>
> PRIVACY
>
> QuickPaste does not collect personal information, browsing history, passwords, form data, or anything else you don't explicitly save. There are no servers. There are no analytics. There is no account system.
>
> The extension requests the host permission "Read and change your data on all websites" for one reason: so the right-click "Save text" and "Save image" menu items work on every site you choose to use them on, and so the opt-in auto-capture feature can listen for your own Ctrl+C actions if you turn it on. The extension does not read page content on its own.
>
> Full privacy policy: [your privacy URL]
>
> WHAT'S NEW IN 2.0
>
> - New design with light and dark themes, accent colour, and density options.
> - Save images, not just text.
> - Tags, pins, and drag-and-drop reorder.
> - Live fuzzy search with highlighting; date and tag filters; saved searches.
> - In-place clip editing.
> - Bulk select, copy, delete — all with undo.
> - Quick-save for clips you type manually.
> - Optional auto-capture of copy actions with per-site blocklist.
> - Optional sync of pinned + recent clips via Chrome Sync.
> - Send to Obsidian, Notion, Google Docs.
> - Export and import (JSON, Markdown).
> - Optional auto-delete and max-clip-count retention rules.
> - Notifications can include a clip preview.
>
> Get started in 10 seconds: install QuickPaste, select some text on any page, right-click, choose "Save text to QuickPaste". Done.
