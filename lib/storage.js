// Central clip storage: shape migration + CRUD.
// Loaded as a classic script in popup/options HTML and via importScripts in the service worker.
// Exposes globalThis.QPStorage.

(function (root) {
  const STORAGE_KEY = "text";

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  // Idempotent. Fills missing fields on legacy clips; returns { clips, changed }.
  function migrate(rawArray) {
    let clips = Array.isArray(rawArray) ? rawArray : [];
    let changed = false;
    let seenIds = new Set();
    let out = clips.map(function (clip) {
      if (!clip || typeof clip !== "object") {
        changed = true;
        return {
          id: newId(),
          text: [],
          url: "",
          savedAt: 0,
          pinned: false,
          tags: [],
        };
      }
      let next = clip;
      let mutated = false;
      if (!next.id || seenIds.has(next.id)) {
        next = Object.assign({}, next, { id: newId() });
        mutated = true;
      }
      seenIds.add(next.id);
      if (!Array.isArray(next.text)) {
        next = Object.assign({}, next, { text: [] });
        mutated = true;
      }
      if (typeof next.url !== "string") {
        next = Object.assign({}, next, { url: "" });
        mutated = true;
      }
      if (typeof next.savedAt !== "number") {
        next = Object.assign({}, next, { savedAt: 0 });
        mutated = true;
      }
      if (typeof next.pinned !== "boolean") {
        next = Object.assign({}, next, { pinned: false });
        mutated = true;
      }
      if (!Array.isArray(next.tags)) {
        next = Object.assign({}, next, { tags: [] });
        mutated = true;
      }
      if (mutated) changed = true;
      return next;
    });
    return { clips: out, changed: changed };
  }

  function readRaw() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY], function (result) {
        resolve(result[STORAGE_KEY] || []);
      });
    });
  }

  function writeRaw(clips) {
    return new Promise(function (resolve) {
      chrome.storage.local.set({ [STORAGE_KEY]: clips }, resolve);
    });
  }

  // Reads, migrates if needed (writing back), returns clips.
  function getClips() {
    return readRaw().then(function (raw) {
      let result = migrate(raw);
      if (result.changed) {
        return writeRaw(result.clips).then(function () {
          return result.clips;
        });
      }
      return result.clips;
    });
  }

  function normalizeText(textArr) {
    return (textArr || [])
      .join(" ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  // Accepts a partial clip ({ text, url }); stamps id/savedAt/pinned/tags and appends.
  // If an existing clip has matching normalized text, it is removed and re-appended fresh
  // (preserving id/pinned/tags). Returns { clip, deduped }.
  function saveClip(input) {
    return getClips().then(function (clips) {
      let textArr = Array.isArray(input && input.text) ? input.text : [];
      let url = (input && input.url) || "";
      let key = normalizeText(textArr);

      let existingIdx = -1;
      if (key.length > 0) {
        existingIdx = clips.findIndex(function (c) {
          return normalizeText(c.text) === key;
        });
      }

      let next;
      let clip;
      if (existingIdx !== -1) {
        let prev = clips[existingIdx];
        clip = Object.assign({}, prev, {
          text: textArr,
          url: url || prev.url,
          savedAt: Date.now(),
        });
        next = clips.slice();
        next.splice(existingIdx, 1);
        next.push(clip);
        return writeRaw(next).then(function () {
          return { clip: clip, deduped: true };
        });
      }

      clip = {
        id: newId(),
        text: textArr,
        url: url,
        savedAt: Date.now(),
        pinned: false,
        tags: [],
      };
      next = clips.concat([clip]);
      return writeRaw(next).then(function () {
        return { clip: clip, deduped: false };
      });
    });
  }

  // Returns clips reordered for display: pinned first (in stored order), then unpinned (in stored order).
  function sortForDisplay(clips) {
    let pinned = [];
    let rest = [];
    for (let c of clips) {
      if (c && c.pinned) pinned.push(c);
      else rest.push(c);
    }
    return pinned.concat(rest);
  }

  function updateClip(id, patch) {
    return getClips().then(function (clips) {
      let idx = clips.findIndex(function (c) { return c.id === id; });
      if (idx === -1) return null;
      let updated = Object.assign({}, clips[idx], patch);
      let next = clips.slice();
      next[idx] = updated;
      return writeRaw(next).then(function () {
        return updated;
      });
    });
  }

  // Removes clips by id. Returns a snapshot [{ index, clip }] for restoreClips.
  function deleteClips(ids) {
    let idSet = new Set(ids);
    return getClips().then(function (clips) {
      let snapshot = [];
      let next = [];
      for (let i = 0; i < clips.length; i++) {
        if (idSet.has(clips[i].id)) {
          snapshot.push({ index: i, clip: clips[i] });
        } else {
          next.push(clips[i]);
        }
      }
      return writeRaw(next).then(function () {
        return snapshot;
      });
    });
  }

  // Re-inserts snapshot entries at their original indices (ascending).
  function restoreClips(snapshot) {
    if (!snapshot || snapshot.length === 0) return Promise.resolve([]);
    let ordered = snapshot.slice().sort(function (a, b) { return a.index - b.index; });
    return getClips().then(function (clips) {
      let next = clips.slice();
      for (let entry of ordered) {
        let pos = Math.min(entry.index, next.length);
        next.splice(pos, 0, entry.clip);
      }
      return writeRaw(next).then(function () {
        return next;
      });
    });
  }

  root.QPStorage = {
    migrate: migrate,
    getClips: getClips,
    saveClip: saveClip,
    updateClip: updateClip,
    deleteClips: deleteClips,
    restoreClips: restoreClips,
    sortForDisplay: sortForDisplay,
    normalizeText: normalizeText,
    newId: newId,
  };
})(typeof self !== "undefined" ? self : globalThis);
