// Centralized preference store with defaults + legacy-key migration.
// Loaded as a classic script in popup/options HTML and via importScripts in the service worker.
// Exposes globalThis.QPSettings.

(function (root) {
  const STORAGE_KEY = "settings";
  const LEGACY_KEYS = ["theme", "notifOptions", "autoCopy"];

  const DEFAULTS = {
    // General
    notifications: "Off",           // "On" | "Off"
    notificationPreview: false,     // include clip snippet in notification body
    autoCopy: "On",                 // "On" | "Off"
    confirmDelete: false,           // confirm before delete

    // Lifecycle
    autoDeleteDays: 0,              // 0 (Never) | 7 | 30 | 90
    maxClipCount: 0,                // 0 (Off) | 100 | 500 | 1000
    dedupMode: "normalized",        // "strict" | "normalized" | "off"
    trimWhitespace: false,
    promptForTag: false,            // when on, popup shows tag-banner after a save

    // Display
    theme: "light",                 // "light" | "dark"
    accentColor: "",                // empty = use theme's CSS var default
    density: "comfortable",         // "compact" | "comfortable"
    previewLength: 500,             // chars before "View more..." in popup
    sortMode: "newest",             // "manual" | "newest" | "oldest" | "az"
    showUrl: true,
    showTimestamp: true,
    searchScope: "both",            // "text" | "url" | "both"
    clipActionsMode: "inline",      // "inline" | "menu" — show action buttons on each clip vs. tuck behind a kebab

    // Copy
    copyFormat: "text",             // "text" | "text-url" | "text-url-time" | "markdown"
    obsidianVault: "",              // vault name for the Send-to-Obsidian URL scheme

    // Capture
    autoCapture: false,             // auto-save Ctrl+C copies; requires <all_urls> host perm
    autoCaptureBlocklist: [],       // array of domain strings (e.g. "mail.google.com")

    // Sync
    syncEnabled: false,             // mirror clips to chrome.storage.sync
    syncLimit: 50,                  // recent-N clips to mirror (plus all pinned)
  };

  function readRaw() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(null, function (all) {
        resolve(all || {});
      });
    });
  }

  function writeRaw(settingsObj) {
    return new Promise(function (resolve) {
      chrome.storage.sync.set({ [STORAGE_KEY]: settingsObj }, resolve);
    });
  }

  function removeLegacy() {
    return new Promise(function (resolve) {
      chrome.storage.sync.remove(LEGACY_KEYS, resolve);
    });
  }

  // Idempotent: fills missing fields with defaults, folds legacy keys into the settings object.
  function migrate(rawAll) {
    let stored = (rawAll && typeof rawAll[STORAGE_KEY] === "object" && rawAll[STORAGE_KEY])
      ? rawAll[STORAGE_KEY]
      : {};

    let next = Object.assign({}, DEFAULTS, stored);
    let changed = false;

    for (let key of Object.keys(DEFAULTS)) {
      if (!(key in stored)) changed = true;
    }

    let hasLegacy = false;
    if (rawAll && typeof rawAll.theme === "string" && !("theme" in stored)) {
      next.theme = rawAll.theme === "dark" ? "dark" : "light";
      hasLegacy = true;
    }
    if (rawAll && typeof rawAll.notifOptions === "string" && !("notifications" in stored)) {
      next.notifications = rawAll.notifOptions === "Off" ? "Off" : "On";
      hasLegacy = true;
    }
    if (rawAll && typeof rawAll.autoCopy === "string" && !("autoCopy" in stored)) {
      next.autoCopy = rawAll.autoCopy === "Off" ? "Off" : "On";
      hasLegacy = true;
    }
    if (hasLegacy) changed = true;

    return { settings: next, changed: changed, hadLegacy: hasLegacy };
  }

  function get() {
    return readRaw().then(function (all) {
      let result = migrate(all);
      if (result.changed) {
        return writeRaw(result.settings).then(function () {
          if (result.hadLegacy) {
            return removeLegacy().then(function () { return result.settings; });
          }
          return result.settings;
        });
      }
      return result.settings;
    });
  }

  function set(patch) {
    return get().then(function (current) {
      let next = Object.assign({}, current, patch || {});
      return writeRaw(next).then(function () { return next; });
    });
  }

  function onChanged(fn) {
    function handler(changes, area) {
      if (area !== "sync") return;
      if (!changes[STORAGE_KEY]) return;
      let newVal = changes[STORAGE_KEY].newValue || {};
      let merged = Object.assign({}, DEFAULTS, newVal);
      fn(merged);
    }
    chrome.storage.onChanged.addListener(handler);
    return function () { chrome.storage.onChanged.removeListener(handler); };
  }

  root.QPSettings = {
    get: get,
    set: set,
    onChanged: onChanged,
    defaults: DEFAULTS,
  };
})(typeof self !== "undefined" ? self : globalThis);
