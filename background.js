importScripts("lib/storage.js", "lib/format.js", "lib/settings.js", "lib/sync.js");

const OFFSCREEN_PATH = "offscreen.html";
const PRUNE_ALARM = "qp-prune-old-clips";
const DAY_MS = 24 * 60 * 60 * 1000;
let creatingOffscreen = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({
      id: "save-text",
      title: "Save text to QuickPaste",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: "save-image",
      title: "Save image to QuickPaste",
      contexts: ["image"],
    });
  });
  // Backfill missing id/savedAt/pinned/tags on any pre-existing clips and apply
  // settings migration on first install / upgrade.
  QPStorage.getClips();
  QPSettings.get();
  ensurePruneAlarm();
  QPSync.startAutoPush();
  QPSync.pull();
});

chrome.runtime.onStartup.addListener(() => {
  QPStorage.getClips();
  ensurePruneAlarm();
  runPruneNow();
  QPSync.startAutoPush();
  QPSync.pull();
});

function ensurePruneAlarm() {
  chrome.alarms.get(PRUNE_ALARM, function (existing) {
    if (existing) return;
    chrome.alarms.create(PRUNE_ALARM, {
      delayInMinutes: 60,
      periodInMinutes: 24 * 60,
    });
  });
}

function runPruneNow() {
  QPSettings.get().then(function (settings) {
    let days = Number(settings.autoDeleteDays) || 0;
    if (days <= 0) return;
    QPStorage.pruneOldClips(days * DAY_MS);
  });
}

chrome.alarms.onAlarm.addListener(function (alarm) {
  if (alarm.name === PRUNE_ALARM) runPruneNow();
});

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId === "save-image") {
    handleImageSave(clickData);
    return;
  }
  if (clickData.menuItemId !== "save-text") return;

  let raw = clickData.selectionText || "";
  let textArray = raw
    .split(/\s{2,}/)
    .map(function (line) { return line.trim(); })
    .filter(function (line) { return line.length > 0; });

  QPSettings.get().then(function (settings) {
    let saveOpts = {
      dedupMode: settings.dedupMode,
      trimWhitespace: settings.trimWhitespace,
      maxClipCount: Number(settings.maxClipCount) || 0,
    };

    QPStorage.saveClip({ text: textArray, url: clickData.pageUrl }, saveOpts).then(function (result) {
      let savedClip = result.clip;

      if (settings.autoCopy === "On") {
        copyToClipboard(QPFormat.formatForCopy(savedClip, settings.copyFormat));
      }

      if (settings.promptForTag && !result.deduped) {
        chrome.storage.local.set({ pendingTagClipId: savedClip.id });
      }

      if (settings.notifications === "On") {
        let body;
        if (settings.notificationPreview) {
          let snippet = (savedClip.text || []).join(" ").slice(0, 80);
          let prefix = result.deduped ? "Updated: " : "Saved: ";
          body = prefix + (snippet || "(empty clip)");
        } else {
          body = result.deduped
            ? "Duplicate clip — moved to most recent"
            : (settings.autoCopy === "On"
              ? "Saved & copied to clipboard"
              : "Your clip was saved");
        }
        chrome.notifications.create({
          type: "basic",
          iconUrl: "./icons/logo48x48-white.png",
          title: "QuickPaste:",
          message: body,
          requireInteraction: false,
        });
      }
    });
  });
});

chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || msg.type !== "qp-auto-capture") return;
  QPSettings.get().then(function (settings) {
    if (!settings.autoCapture) return;
    let raw = (msg.text || "").trim();
    if (!raw) return;
    let textArr = raw
      .split(/\n\s*\n+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    if (textArr.length === 0) textArr = [raw];
    QPStorage.saveClip({ text: textArr, url: msg.url || (sender && sender.url) || "" }, {
      dedupMode: settings.dedupMode,
      trimWhitespace: settings.trimWhitespace,
      maxClipCount: Number(settings.maxClipCount) || 0,
    });
  });
});

function handleImageSave(clickData) {
  let src = clickData.srcUrl || "";
  if (!src) return;
  QPSettings.get().then(function (settings) {
    QPStorage.saveClip({ kind: "image", src: src, url: clickData.pageUrl }, {
      maxClipCount: Number(settings.maxClipCount) || 0,
    }).then(function (result) {
      if (settings.notifications === "On") {
        let body = result.deduped
          ? "Image already saved — moved to most recent"
          : "Image saved";
        chrome.notifications.create({
          type: "basic",
          iconUrl: "./icons/logo48x48-white.png",
          title: "QuickPaste:",
          message: body,
          requireInteraction: false,
        });
      }
    });
  });
}

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
