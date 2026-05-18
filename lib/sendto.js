// Send a clip to external destinations. Attaches to globalThis.QPSendTo.
//
// Obsidian: uses obsidian://new?vault=&name=&content= — fully pre-fills a note.
// Notion / Google Docs: no public URL scheme for pre-filling, so we copy the
// formatted clip to the clipboard and open the "new page" URL in a new tab.
// The user pastes (Ctrl+V) once they land on the page.

(function (root) {
  const NOTION_NEW = "https://www.notion.so/new";
  const DOCS_NEW = "https://docs.google.com/document/create";

  function titleFor(clip) {
    if (clip.kind === "image") return "Image clip";
    let first = (clip.text && clip.text[0]) || "Clip";
    return first.split("\n")[0].slice(0, 80);
  }

  function bodyFor(clip) {
    if (root.QPFormat && typeof root.QPFormat.formatForCopy === "function") {
      return root.QPFormat.formatForCopy(clip, "markdown");
    }
    if (clip.kind === "image") return clip.src || "";
    return (clip.text || []).join("\n\n");
  }

  function openTab(url) {
    if (chrome && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: url });
    } else {
      window.open(url, "_blank");
    }
  }

  function writeClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {});
    }
    return Promise.resolve();
  }

  // Returns true if launched, false if vault is missing.
  function obsidian(clip, vault) {
    let v = (vault || "").trim();
    if (!v) return false;
    let url = "obsidian://new?vault=" + encodeURIComponent(v) +
              "&name=" + encodeURIComponent(titleFor(clip)) +
              "&content=" + encodeURIComponent(bodyFor(clip));
    openTab(url);
    return true;
  }

  function notion(clip) {
    return writeClipboard(bodyFor(clip)).then(function () { openTab(NOTION_NEW); });
  }

  function googleDocs(clip) {
    return writeClipboard(bodyFor(clip)).then(function () { openTab(DOCS_NEW); });
  }

  root.QPSendTo = {
    obsidian: obsidian,
    notion: notion,
    googleDocs: googleDocs,
  };

  // Close behavior for any <details class="send-to"> dropdown rendered by the
  // popup or options page: click outside closes it, opening one closes the
  // others, and Escape closes whatever is open.
  if (typeof document !== "undefined") {
    function closeAllExcept(except) {
      const open = document.querySelectorAll("details.send-to[open]");
      for (let i = 0; i < open.length; i++) {
        if (open[i] !== except) open[i].removeAttribute("open");
      }
    }
    document.addEventListener("click", function (e) {
      const inside = e.target.closest && e.target.closest("details.send-to");
      closeAllExcept(inside || null);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAllExcept(null);
    });
  }
})(typeof self !== "undefined" ? self : globalThis);
