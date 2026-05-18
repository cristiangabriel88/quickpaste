// Clip sync to chrome.storage.sync. Mirrors recent-N + all pinned clips when enabled.
// Attaches to globalThis.QPSync.
//
// Storage layout:
//   chrome.storage.sync["synced_clips"] = { v: 1, items: [clip, clip, ...], updatedAt: ms }
// Items are pinned clips + the most-recent `syncLimit` unpinned clips.
//
// Push: triggered (debounced) by chrome.storage.onChanged for the clip key,
//       or explicitly via push().
// Pull: triggered by background.js on startup; merges synced items into local
//       (skipping any clip id that already exists locally).

(function (root) {
  const SYNC_KEY = "synced_clips";
  const CLIP_KEY = "text";
  const DEBOUNCE_MS = 1000;
  const MAX_BYTES = 95 * 1024; // chrome.storage.sync quota is 100KB; leave headroom

  let pushTimer = null;
  let pushing = false;
  let pendingPush = false;
  let started = false;

  function readSynced() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get([SYNC_KEY], function (result) {
        let bag = result[SYNC_KEY];
        if (!bag || !Array.isArray(bag.items)) resolve([]);
        else resolve(bag.items);
      });
    });
  }

  function writeSynced(items) {
    let bag = { v: 1, items: items, updatedAt: Date.now() };
    return new Promise(function (resolve, reject) {
      chrome.storage.sync.set({ [SYNC_KEY]: bag }, function () {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      });
    });
  }

  function clearSynced() {
    return new Promise(function (resolve) {
      chrome.storage.sync.remove([SYNC_KEY], resolve);
    });
  }

  function pickPayload(clips, limit) {
    let n = Number(limit) || 50;
    let pinned = clips.filter(function (c) { return c.pinned; });
    let unpinned = clips.filter(function (c) { return !c.pinned; });
    // Most recent unpinned by savedAt desc:
    let recent = unpinned.slice().sort(function (a, b) {
      return (b.savedAt || 0) - (a.savedAt || 0);
    }).slice(0, n);
    // Combine, dedupe by id, then trim to MAX_BYTES by dropping oldest recent.
    let combined = pinned.concat(recent);
    let seen = new Set();
    let unique = [];
    for (let c of combined) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      unique.push(c);
    }
    while (unique.length > 0 && byteSize(unique) > MAX_BYTES) {
      // Drop oldest unpinned first; if all are pinned and still too big, drop oldest pinned.
      let dropIdx = -1;
      for (let i = unique.length - 1; i >= 0; i--) {
        if (!unique[i].pinned) { dropIdx = i; break; }
      }
      if (dropIdx === -1) dropIdx = unique.length - 1;
      unique.splice(dropIdx, 1);
    }
    return unique;
  }

  function byteSize(items) {
    let envelope = JSON.stringify({ v: 1, items: items });
    try {
      return new TextEncoder().encode(envelope).length;
    } catch (e) {
      return envelope.length;
    }
  }

  function push(clips, settings) {
    if (!settings || !settings.syncEnabled) return Promise.resolve(0);
    let payload = pickPayload(clips, settings.syncLimit);
    return writeSynced(payload).then(function () { return payload.length; });
  }

  function schedulePush() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      runPush();
    }, DEBOUNCE_MS);
  }

  function runPush() {
    if (pushing) { pendingPush = true; return; }
    pushing = true;
    pendingPush = false;
    Promise.all([
      root.QPSettings ? root.QPSettings.get() : Promise.resolve({}),
      root.QPStorage ? root.QPStorage.getClips() : Promise.resolve([]),
    ]).then(function (vals) {
      return push(vals[1], vals[0]);
    }).catch(function () { /* quota or transient; will retry next change */ })
      .finally(function () {
        pushing = false;
        if (pendingPush) runPush();
      });
  }

  // Merges synced items into local, skipping any id that already exists locally.
  function pull() {
    if (!root.QPSettings || !root.QPStorage) return Promise.resolve({ added: 0, skipped: 0 });
    return root.QPSettings.get().then(function (settings) {
      if (!settings.syncEnabled) return { added: 0, skipped: 0 };
      return readSynced().then(function (items) {
        if (!items.length) return { added: 0, skipped: 0 };
        return root.QPStorage.importClips(items);
      });
    });
  }

  function startAutoPush() {
    if (started) return;
    started = true;
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "local") return;
      if (!changes[CLIP_KEY]) return;
      schedulePush();
    });
    // Also push when syncEnabled flips on.
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync") return;
      if (!changes.settings) return;
      let oldV = (changes.settings.oldValue || {});
      let newV = (changes.settings.newValue || {});
      if (!oldV.syncEnabled && newV.syncEnabled) schedulePush();
    });
  }

  root.QPSync = {
    push: push,
    pull: pull,
    clear: clearSynced,
    schedulePush: schedulePush,
    startAutoPush: startAutoPush,
  };
})(typeof self !== "undefined" ? self : globalThis);
