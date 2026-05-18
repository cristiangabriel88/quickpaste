// Offscreen document — exists solely to write text to the system clipboard
// from the MV3 service worker (which has no DOM / no navigator.clipboard).

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.target !== "qp-offscreen" || msg.type !== "copy") return;

  let text = typeof msg.text === "string" ? msg.text : "";
  let ok = false;
  let err = null;

  try {
    let ta = document.getElementById("sink");
    ta.value = text;
    ta.focus();
    ta.select();
    ok = document.execCommand("copy");
    ta.value = "";
  } catch (e) {
    err = String(e);
  }

  if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      function () { sendResponse({ ok: true }); },
      function (e) { sendResponse({ ok: false, error: String(e) }); }
    );
    return true; // async response
  }

  sendResponse({ ok: ok, error: err });
});
