// QuickPaste auto-capture content script.
// Listens to copy events on the page; if settings.autoCapture is on and the page's
// hostname is not in settings.autoCaptureBlocklist, sends the copied plain text
// to the background to be saved as a clip.
//
// No-op by default — the autoCapture setting is off until the user opts in.

(function () {
  function shouldCapture(settings) {
    if (!settings || !settings.autoCapture) return false;
    let host = (location.hostname || "").toLowerCase();
    let blocklist = Array.isArray(settings.autoCaptureBlocklist) ? settings.autoCaptureBlocklist : [];
    for (let entry of blocklist) {
      let pat = (entry || "").trim().toLowerCase();
      if (!pat) continue;
      if (host === pat || host.endsWith("." + pat)) return false;
    }
    return true;
  }

  function extractCopyText(event) {
    let text = "";
    if (event && event.clipboardData) {
      try { text = event.clipboardData.getData("text/plain") || ""; } catch (e) {}
    }
    if (!text) {
      let sel = window.getSelection && window.getSelection();
      if (sel) text = sel.toString();
    }
    return text;
  }

  document.addEventListener("copy", function (event) {
    let text = extractCopyText(event);
    if (!text || !text.trim()) return;

    chrome.storage.sync.get(["settings"], function (result) {
      if (chrome.runtime.lastError) return;
      let settings = (result && result.settings) || {};
      if (!shouldCapture(settings)) return;
      try {
        chrome.runtime.sendMessage({
          type: "qp-auto-capture",
          text: text,
          url: location.href,
        });
      } catch (e) {
        // Extension context invalidated (e.g., during reload) — ignore.
      }
    });
  }, true);
})();
