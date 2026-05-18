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
          kind: "text",
          text: [],
          src: "",
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
      if (next.kind !== "text" && next.kind !== "image") {
        next = Object.assign({}, next, { kind: "text" });
        mutated = true;
      }
      if (!Array.isArray(next.text)) {
        next = Object.assign({}, next, { text: [] });
        mutated = true;
      }
      if (typeof next.src !== "string") {
        next = Object.assign({}, next, { src: "" });
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

  function strictEqualText(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function trimTextArray(textArr) {
    let trimmed = textArr.map(function (s) {
      return (typeof s === "string" ? s : "").replace(/^\s+|\s+$/g, "");
    });
    while (trimmed.length && trimmed[0] === "") trimmed.shift();
    while (trimmed.length && trimmed[trimmed.length - 1] === "") trimmed.pop();
    return trimmed;
  }

  // Accepts a partial clip ({ kind?, text?, src?, url? }); stamps id/savedAt/pinned/tags and appends.
  // opts: { dedupMode: "strict"|"normalized"|"off", trimWhitespace: bool, maxClipCount: number }.
  // For text clips: dedupe by text per `dedupMode`. For image clips: dedupe by `src`.
  // On dedupe, the existing clip is removed and re-appended fresh (preserving id/pinned/tags).
  // Returns { clip, deduped }.
  function saveClip(input, opts) {
    let options = opts || {};
    let dedupMode = options.dedupMode || "normalized";
    let trimWhitespace = !!options.trimWhitespace;
    let maxClipCount = typeof options.maxClipCount === "number" ? options.maxClipCount : 0;
    let kind = (input && input.kind === "image") ? "image" : "text";

    return getClips().then(function (clips) {
      let textArr = Array.isArray(input && input.text) ? input.text : [];
      if (kind === "text" && trimWhitespace) textArr = trimTextArray(textArr);
      let src = (input && input.src) || "";
      let url = (input && input.url) || "";

      let existingIdx = -1;
      if (kind === "image") {
        if (src) {
          existingIdx = clips.findIndex(function (c) {
            return c.kind === "image" && c.src === src;
          });
        }
      } else if (dedupMode === "normalized") {
        let key = normalizeText(textArr);
        if (key.length > 0) {
          existingIdx = clips.findIndex(function (c) {
            return c.kind !== "image" && normalizeText(c.text) === key;
          });
        }
      } else if (dedupMode === "strict") {
        existingIdx = clips.findIndex(function (c) {
          return c.kind !== "image" && strictEqualText(c.text, textArr);
        });
      }

      let next;
      let clip;
      if (existingIdx !== -1) {
        let prev = clips[existingIdx];
        clip = Object.assign({}, prev, {
          text: textArr,
          src: src || prev.src,
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
        kind: kind,
        text: textArr,
        src: src,
        url: url,
        savedAt: Date.now(),
        pinned: false,
        tags: [],
      };
      next = clips.concat([clip]);

      if (maxClipCount > 0 && next.length > maxClipCount) {
        // Drop oldest unpinned clips (preserving insertion order, never dropping the just-saved clip).
        let excess = next.length - maxClipCount;
        let pruned = 0;
        let result = [];
        for (let i = 0; i < next.length; i++) {
          let c = next[i];
          if (pruned < excess && !c.pinned && c.id !== clip.id) {
            pruned++;
            continue;
          }
          result.push(c);
        }
        next = result;
      }

      return writeRaw(next).then(function () {
        return { clip: clip, deduped: false };
      });
    });
  }

  // Returns clips reordered for display.
  // Pinned always first, in stored order. Remainder ordered by `mode`:
  //   "manual" (default) → stored insertion order
  //   "newest"           → savedAt descending
  //   "oldest"           → savedAt ascending
  //   "az"               → alphabetical by clip text
  function sortForDisplay(clips, mode) {
    let pinned = [];
    let rest = [];
    for (let c of clips) {
      if (c && c.pinned) pinned.push(c);
      else rest.push(c);
    }
    if (mode === "newest") {
      rest.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    } else if (mode === "oldest") {
      rest.sort(function (a, b) { return (a.savedAt || 0) - (b.savedAt || 0); });
    } else if (mode === "az") {
      rest.sort(function (a, b) {
        let ax = (a.text || []).join(" ").toLowerCase();
        let bx = (b.text || []).join(" ").toLowerCase();
        if (ax < bx) return -1;
        if (ax > bx) return 1;
        return 0;
      });
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

  // Rewrites stored order. `orderedUnpinnedIds` is the desired order of unpinned clips;
  // pinned clips stay at their current positions (interleaved). Unknown ids are ignored.
  function reorderClips(orderedUnpinnedIds) {
    return getClips().then(function (clips) {
      let byId = new Map(clips.map(function (c) { return [c.id, c]; }));
      let reordered = orderedUnpinnedIds
        .map(function (id) { return byId.get(id); })
        .filter(function (c) { return c && !c.pinned; });
      let reorderedIds = new Set(reordered.map(function (c) { return c.id; }));
      // Append any unpinned clips not present in the input (defensive).
      for (let c of clips) {
        if (!c.pinned && !reorderedIds.has(c.id)) reordered.push(c);
      }
      // Walk clips, replacing unpinned positions with the new sequence in order.
      let cursor = 0;
      let next = clips.map(function (c) {
        if (c.pinned) return c;
        let replacement = reordered[cursor];
        cursor++;
        return replacement;
      });
      return writeRaw(next).then(function () { return next; });
    });
  }

  // Merges incoming clips, skipping any whose id already exists. Returns { added, skipped }.
  function importClips(incoming) {
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return Promise.resolve({ added: 0, skipped: 0 });
    }
    return getClips().then(function (clips) {
      let existingIds = new Set(clips.map(function (c) { return c.id; }));
      let added = 0;
      let skipped = 0;
      let next = clips.slice();
      for (let raw of incoming) {
        if (!raw || typeof raw !== "object" || !raw.id) { skipped++; continue; }
        if (existingIds.has(raw.id)) { skipped++; continue; }
        next.push(raw);
        existingIds.add(raw.id);
        added++;
      }
      // Run migration on the merged set so imported clips get any missing default fields.
      let migrated = migrate(next);
      return writeRaw(migrated.clips).then(function () { return { added: added, skipped: skipped }; });
    });
  }

  // Removes unpinned clips older than maxAgeMs. Returns count removed.
  function pruneOldClips(maxAgeMs) {
    if (!maxAgeMs || maxAgeMs <= 0) return Promise.resolve(0);
    let cutoff = Date.now() - maxAgeMs;
    return getClips().then(function (clips) {
      let next = clips.filter(function (c) {
        if (c.pinned) return true;
        if (!c.savedAt) return true;
        return c.savedAt >= cutoff;
      });
      let removed = clips.length - next.length;
      if (removed === 0) return 0;
      return writeRaw(next).then(function () { return removed; });
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
    reorderClips: reorderClips,
    importClips: importClips,
    pruneOldClips: pruneOldClips,
    restoreClips: restoreClips,
    sortForDisplay: sortForDisplay,
    normalizeText: normalizeText,
    newId: newId,
  };
})(typeof self !== "undefined" ? self : globalThis);
