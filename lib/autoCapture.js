// Permission + content-script manager for the opt-in auto-capture feature.
// Loaded as a classic script in options.html and via importScripts in the service worker.
// Exposes globalThis.QPAutoCapture.

(function (root) {
  const HOST_ORIGINS = ["<all_urls>"];
  const SCRIPT_ID = "qp-capture";
  const SCRIPT_FILES = ["content/capture.js"];

  function hasHostPermission() {
    return new Promise(function (resolve) {
      try {
        chrome.permissions.contains({ origins: HOST_ORIGINS }, function (granted) {
          resolve(!!granted);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  // Must be called from a user-gesture handler in an extension UI page.
  function requestHostPermission() {
    return new Promise(function (resolve) {
      try {
        chrome.permissions.request({ origins: HOST_ORIGINS }, function (granted) {
          resolve(!!granted);
        });
      } catch (e) {
        resolve(false);
      }
    });
  }

  function isScriptRegistered() {
    if (!chrome.scripting || !chrome.scripting.getRegisteredContentScripts) {
      return Promise.resolve(false);
    }
    return chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })
      .then(function (list) { return Array.isArray(list) && list.length > 0; })
      .catch(function () { return false; });
  }

  function registerScript() {
    return isScriptRegistered().then(function (exists) {
      if (exists) return true;
      return chrome.scripting.registerContentScripts([{
        id: SCRIPT_ID,
        matches: ["<all_urls>"],
        js: SCRIPT_FILES,
        runAt: "document_idle",
        persistAcrossSessions: true,
      }]).then(function () { return true; })
        .catch(function () { return false; });
    });
  }

  function unregisterScript() {
    if (!chrome.scripting || !chrome.scripting.unregisterContentScripts) {
      return Promise.resolve();
    }
    return chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] })
      .catch(function () { /* not registered — fine */ });
  }

  // Inject the script into already-open http(s) tabs so the user doesn't need
  // to reload them after enabling auto-capture.
  function seedOpenTabs() {
    return new Promise(function (resolve) {
      if (!chrome.tabs || !chrome.tabs.query) { resolve(); return; }
      chrome.tabs.query({}, function (tabs) {
        let pending = (tabs || []).filter(function (t) {
          let url = t.url || "";
          return /^https?:\/\//i.test(url);
        });
        if (pending.length === 0) { resolve(); return; }
        let remaining = pending.length;
        pending.forEach(function (t) {
          try {
            chrome.scripting.executeScript({
              target: { tabId: t.id, allFrames: false },
              files: SCRIPT_FILES,
            }, function () {
              void chrome.runtime.lastError; // ignore chrome://, store, etc.
              if (--remaining === 0) resolve();
            });
          } catch (e) {
            if (--remaining === 0) resolve();
          }
        });
      });
    });
  }

  // Public: enable from the options-page user gesture. Resolves to
  // { granted: bool } — caller should revert the UI if granted is false.
  function enable() {
    return requestHostPermission().then(function (granted) {
      if (!granted) return { granted: false };
      return registerScript()
        .then(function () { return seedOpenTabs(); })
        .then(function () { return { granted: true }; });
    });
  }

  // Public: disable. Keeps the host-permission grant so re-enabling is silent;
  // the script is unregistered and any already-injected listeners will no-op
  // because they re-check the autoCapture setting on every copy event.
  function disable() {
    return unregisterScript().then(function () { return { granted: true }; });
  }

  // Public: called from the service worker on startup/install. Reconciles
  // registered script with current setting + permission state. If the setting
  // says auto-capture is on but the permission has been revoked (e.g. by the
  // user in chrome://extensions), flip the setting off so the UI matches.
  function ensureRegisteredIfEnabled(settings) {
    let on = !!(settings && settings.autoCapture);
    if (!on) {
      return unregisterScript().then(function () {
        return { registered: false };
      });
    }
    return hasHostPermission().then(function (granted) {
      if (!granted) {
        let setOff = (root.QPSettings && root.QPSettings.set)
          ? root.QPSettings.set({ autoCapture: false })
          : Promise.resolve();
        return setOff.then(function () {
          return { registered: false, permissionLost: true };
        });
      }
      return registerScript().then(function (ok) {
        return { registered: !!ok };
      });
    });
  }

  root.QPAutoCapture = {
    hasHostPermission: hasHostPermission,
    requestHostPermission: requestHostPermission,
    registerScript: registerScript,
    unregisterScript: unregisterScript,
    seedOpenTabs: seedOpenTabs,
    enable: enable,
    disable: disable,
    ensureRegisteredIfEnabled: ensureRegisteredIfEnabled,
  };
})(typeof self !== "undefined" ? self : globalThis);
