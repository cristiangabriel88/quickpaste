// Saved searches (named query/date/tag filter combos). Attaches to globalThis.QPSavedSearches.
// Stored in chrome.storage.local under "saved_searches" as [{ id, name, query, dateRange, tag }].

(function (root) {
  const STORAGE_KEY = "saved_searches";

  function newId() {
    return "ss_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function readRaw() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEY], function (result) {
        resolve(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : []);
      });
    });
  }

  function writeRaw(list) {
    return new Promise(function (resolve) {
      chrome.storage.local.set({ [STORAGE_KEY]: list }, resolve);
    });
  }

  function list() {
    return readRaw();
  }

  // Adds a new saved search. Returns the stored record.
  function save(record) {
    let entry = {
      id: newId(),
      name: (record && record.name) || "Untitled",
      query: (record && record.query) || "",
      dateRange: (record && record.dateRange) || "all",
      tag: (record && record.tag) || "",
      savedAt: Date.now(),
    };
    return readRaw().then(function (current) {
      let next = current.concat([entry]);
      return writeRaw(next).then(function () { return entry; });
    });
  }

  function remove(id) {
    return readRaw().then(function (current) {
      let next = current.filter(function (e) { return e.id !== id; });
      return writeRaw(next).then(function () { return next; });
    });
  }

  function rename(id, name) {
    return readRaw().then(function (current) {
      let next = current.map(function (e) {
        return e.id === id ? Object.assign({}, e, { name: name }) : e;
      });
      return writeRaw(next).then(function () { return next; });
    });
  }

  root.QPSavedSearches = {
    list: list,
    save: save,
    remove: remove,
    rename: rename,
  };
})(typeof self !== "undefined" ? self : globalThis);
