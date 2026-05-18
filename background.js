importScripts("lib/storage.js");

const OFFSCREEN_PATH = "offscreen.html";
let creatingOffscreen = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-text",
    title: "Save text to QuickPaste",
    contexts: ["selection"],
  });
  // Backfill missing id/savedAt/pinned/tags on any pre-existing clips.
  QPStorage.getClips();
});

chrome.runtime.onStartup.addListener(() => {
  QPStorage.getClips();
});

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId !== "save-text") return;

  let raw = clickData.selectionText || "";
  let textArray = raw
    .split(/\s{2,}/)
    .map(function (line) { return line.trim(); })
    .filter(function (line) { return line.length > 0; });

  QPStorage.saveClip({ text: textArray, url: clickData.pageUrl }).then(function (result) {
    chrome.storage.sync.get(
      { notifOptions: "On", autoCopy: "On" },
      function (settings) {
        if (settings.autoCopy === "On") {
          copyToClipboard(textArray.join("\n\n"));
        }
        if (settings.notifOptions === "On") {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "./icons/logo48x48.png",
            title: "QuickPaste:",
            message: result.deduped
              ? "Duplicate clip — moved to most recent"
              : (settings.autoCopy === "On"
                ? "Saved & copied to clipboard"
                : "Your clip was saved"),
            requireInteraction: false,
          });
        }
      }
    );
  });
});

function copyToClipboard(text) {
  if (!text) return;
  ensureOffscreen().then(function () {
    chrome.runtime.sendMessage({
      target: "qp-offscreen",
      type: "copy",
      text: text,
    });
  });
}

function ensureOffscreen() {
  if (creatingOffscreen) return creatingOffscreen;

  let hasDoc = chrome.offscreen && chrome.offscreen.hasDocument
    ? chrome.offscreen.hasDocument()
    : Promise.resolve(false);

  creatingOffscreen = hasDoc.then(function (exists) {
    if (exists) return;
    return chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Write saved clip text to the system clipboard.",
    });
  }).catch(function () {
    // Race: another caller created the document first.
  }).finally(function () {
    creatingOffscreen = null;
  });

  return creatingOffscreen;
}
