let appliedSettings = null;
let currentQuery = "";
let searchOpen = false;

function applyVisualSettings(settings) {
  let theme = settings.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.body.dataset.density = settings.density === "compact" ? "compact" : "comfortable";
  document.body.dataset.showUrl = settings.showUrl ? "true" : "false";
  document.body.dataset.showTimestamp = settings.showTimestamp ? "true" : "false";
  if (settings.accentColor) {
    document.documentElement.style.setProperty("--accent", settings.accentColor);
  } else {
    document.documentElement.style.removeProperty("--accent");
  }
}

const PIN_SVG_FILLED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
  '</svg>';

const PIN_SVG_OUTLINE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
  '</svg>';

const DELETE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<polyline points="3 6 5 6 21 6"></polyline>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
  '<path d="M10 11v6"></path><path d="M14 11v6"></path>' +
  '<path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>' +
  '</svg>';

const SOURCE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
  '<polyline points="15 3 21 3 21 9"></polyline>' +
  '<line x1="10" y1="14" x2="21" y2="3"></line>' +
  '</svg>';

const COPY_WITH_URL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
  '<path d="M14 14l5 5"></path>' +
  '<path d="M19 14h-5v5"></path>' +
  '</svg>';

const EDIT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
  '</svg>';

const COPY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
  '</svg>';

const SEND_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<line x1="22" y1="2" x2="11" y2="13"></line>' +
  '<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>' +
  '</svg>';

function enterPopupEditMode(clip, container) {
  if (container.classList.contains("is-editing")) return;
  container.classList.add("is-editing");

  let bodyEls = container.querySelectorAll(".paragraph-text, a, br, .clip-image");
  bodyEls.forEach(function (el) { el.style.display = "none"; });

  let editor = document.createElement("div");
  editor.className = "popup-edit";

  let textarea = document.createElement("textarea");
  textarea.className = "popup-edit__textarea";
  textarea.value = (clip.text || []).join("\n\n");
  textarea.rows = Math.max(3, Math.min(12, textarea.value.split("\n").length + 1));
  editor.appendChild(textarea);

  let actions = document.createElement("div");
  actions.className = "popup-edit__actions";

  let saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "popup-edit__btn";
  saveBtn.title = "Save changes";
  saveBtn.innerText = "Save";
  saveBtn.addEventListener("click", function () {
    let next = textarea.value
      .split(/\n\s*\n+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    if (next.length === 0) next = [textarea.value.trim()];
    QPStorage.updateClip(clip.id, { text: next }).then(function () {
      QPStorage.getClips().then(renderPopup);
    });
  });

  let cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "popup-edit__btn popup-edit__btn--secondary";
  cancelBtn.title = "Discard changes";
  cancelBtn.innerText = "Cancel";
  cancelBtn.addEventListener("click", function () {
    container.classList.remove("is-editing");
    editor.remove();
    bodyEls.forEach(function (el) { el.style.display = ""; });
  });

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  editor.appendChild(actions);

  let actionRowEl = container.querySelector(".clip-actions");
  if (actionRowEl) container.insertBefore(editor, actionRowEl);
  else container.appendChild(editor);

  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function flashButton(btn, label) {
  let original = btn.title;
  let originalAria = btn.getAttribute("aria-label");
  btn.title = label;
  btn.setAttribute("aria-label", label);
  btn.classList.add("icon-button--flash");
  setTimeout(function () {
    btn.title = original;
    btn.setAttribute("aria-label", originalAria);
    btn.classList.remove("icon-button--flash");
  }, 1200);
}

function renderPopup(clips) {
  let paragraphBox = document.querySelector("#paragraph-box");
  let searchInput = document.getElementById("popupSearch");
  paragraphBox.innerHTML = "";

  let sortMode = (appliedSettings && appliedSettings.sortMode) || "manual";
  let previewLength = Number(appliedSettings && appliedSettings.previewLength) || 500;
  let confirmDelete = !!(appliedSettings && appliedSettings.confirmDelete);

  let ordered = QPStorage.sortForDisplay(clips, sortMode);
  searchInput.style.display = searchOpen ? "" : "none";

  for (let clip of ordered) {
    let newContainer = document.createElement("div");
    newContainer.dataset.clipId = clip.id;
    newContainer.dataset.url = clip.url || "";
    let clipBodyText = clip.kind === "image" ? (clip.src || "") : (clip.text || []).join(" ");
    let clipTagsText = Array.isArray(clip.tags) ? clip.tags.join(" ") : "";
    newContainer.dataset.searchHaystack = (clipBodyText + " " + clipTagsText).toLowerCase();
    newContainer.className = "paragraph-container" + (clip.pinned ? " paragraph-container--pinned" : "");

    //?############# CLIP META HEADER ###########################
    let meta = document.createElement("div");
    meta.className = "clip-meta";

    let timestamp = document.createElement("span");
    timestamp.className = "clip-meta__time";
    timestamp.innerText = QPFormat.formatRelative(clip.savedAt);
    meta.appendChild(timestamp);

    newContainer.appendChild(meta);

    //?############# BODY (text or image) ###########################
    if (clip.kind === "image") {
      let img = document.createElement("img");
      img.className = "clip-image";
      img.src = clip.src || "";
      img.alt = "Saved image";
      img.loading = "lazy";
      newContainer.appendChild(img);
    } else {
      let paragraphs = clip.text || [];
      let remaining = previewLength;
      let truncated = false;
      for (let j = 0; j < paragraphs.length; j++) {
        let para = paragraphs[j];
        if (remaining <= 0) { truncated = true; break; }
        let newParagraph = document.createElement("p");
        newParagraph.className = "paragraph-text";
        if (para.length <= remaining) {
          newParagraph.dataset.originalText = para;
          newParagraph.appendChild(document.createTextNode(para));
          newContainer.appendChild(newParagraph);
          remaining -= para.length;
        } else {
          // Truncate at the last whitespace boundary so we don't slice mid-word;
          // if there's no whitespace to break on, accept the hard cut.
          let snippet = para.slice(0, remaining);
          let wsCut = snippet.search(/\s+\S*$/);
          if (wsCut > Math.floor(remaining * 0.5)) snippet = snippet.slice(0, wsCut);
          snippet = snippet.replace(/\s+$/, "") + "…";
          newParagraph.dataset.originalText = snippet;
          newParagraph.appendChild(document.createTextNode(snippet));
          newContainer.appendChild(newParagraph);
          truncated = true;
          break;
        }
      }
      if (truncated) {
        let linkForMore = document.createElement("a");
        linkForMore.href = "./options.html#" + encodeURIComponent(clip.id);
        linkForMore.target = "_blank";
        linkForMore.innerText = "View more...";
        newContainer.appendChild(linkForMore);
        newContainer.appendChild(document.createElement("br"));
      }
    }

    //?############# TAG PILLS ###########################
    if (Array.isArray(clip.tags) && clip.tags.length > 0) {
      let tagRow = document.createElement("div");
      tagRow.className = "clip-tags";
      clip.tags.forEach(function (tag) {
        let pill = document.createElement("span");
        pill.className = "clip-tag";
        pill.innerText = tag;
        tagRow.appendChild(pill);
      });
      newContainer.appendChild(tagRow);
    }

    paragraphBox.appendChild(newContainer);

    let actionRow = document.createElement("div");
    actionRow.className = "clip-actions";
    newContainer.appendChild(actionRow);

    //?############# PIN ###########################
    let pinButton = document.createElement("button");
    pinButton.className = "icon-button" + (clip.pinned ? " icon-button--pinned" : "");
    pinButton.title = clip.pinned ? "Unpin" : "Pin";
    pinButton.setAttribute("aria-label", pinButton.title);
    pinButton.innerHTML = clip.pinned ? PIN_SVG_FILLED : PIN_SVG_OUTLINE;
    pinButton.addEventListener("click", function () {
      QPStorage.updateClip(clip.id, { pinned: !clip.pinned }).then(function () {
        QPStorage.getClips().then(renderPopup);
      });
    });
    actionRow.appendChild(pinButton);

    //?############# EDIT ###########################
    if (clip.kind !== "image") {
      let editButton = document.createElement("button");
      editButton.className = "icon-button";
      editButton.title = "Edit";
      editButton.setAttribute("aria-label", "Edit");
      editButton.innerHTML = EDIT_SVG;
      editButton.addEventListener("click", function () {
        enterPopupEditMode(clip, newContainer);
      });
      actionRow.appendChild(editButton);
    }

    //?############# COPY (plain text) ###########################
    let copyButton = document.createElement("button");
    copyButton.className = "icon-button";
    copyButton.title = "Copy text";
    copyButton.setAttribute("aria-label", "Copy text");
    copyButton.innerHTML = COPY_SVG;
    copyButton.addEventListener("click", function () {
      let txt = clip.kind === "image" ? (clip.src || "") : (clip.text || []).join("\n\n");
      navigator.clipboard.writeText(txt).then(
        function () { flashButton(copyButton, "Copied"); },
        function () { flashButton(copyButton, "Copy failed"); }
      );
    });
    actionRow.appendChild(copyButton);

    //?############# COPY WITH SOURCE URL ###########################
    let copyWithUrlButton = document.createElement("button");
    copyWithUrlButton.className = "icon-button";
    copyWithUrlButton.title = "Copy with source URL";
    copyWithUrlButton.setAttribute("aria-label", "Copy with source URL");
    copyWithUrlButton.innerHTML = COPY_WITH_URL_SVG;
    copyWithUrlButton.addEventListener("click", function () {
      if (!clip.url) {
        flashButton(copyWithUrlButton, "No source URL");
        return;
      }
      let payload = QPFormat.formatForCopy(clip, "text-url");
      navigator.clipboard.writeText(payload).then(
        function () { flashButton(copyWithUrlButton, "Copied with URL"); },
        function () { flashButton(copyWithUrlButton, "Copy failed"); }
      );
    });
    actionRow.appendChild(copyWithUrlButton);

    //?############# SOURCE URL ###########################
    // Hand-written clips (Quick Save) have no url — skip the button entirely.
    if (clip.url && clip.url.startsWith("http")) {
      let sourceButton = document.createElement("button");
      sourceButton.className = "icon-button";
      sourceButton.dataset.role = "view-url";
      sourceButton.title = "View URL";
      sourceButton.setAttribute("aria-label", "View URL");
      sourceButton.innerHTML = SOURCE_SVG;
      sourceButton.addEventListener("click", function () {
        window.open(clip.url, "_blank");
      });
      actionRow.appendChild(sourceButton);
    }

    //?############# SEND TO ###########################
    let sendTo = document.createElement("details");
    sendTo.className = "send-to";
    let sendSummary = document.createElement("summary");
    sendSummary.className = "icon-button send-to__summary";
    sendSummary.title = "Send to...";
    sendSummary.setAttribute("aria-label", "Send to");
    sendSummary.innerHTML = SEND_SVG;
    sendTo.appendChild(sendSummary);
    let sendMenu = document.createElement("div");
    sendMenu.className = "send-to__menu";
    function addSendOption(label, action) {
      let btn = document.createElement("button");
      btn.type = "button";
      btn.className = "send-to__item";
      btn.innerText = label;
      btn.addEventListener("click", function () {
        action();
        sendTo.removeAttribute("open");
      });
      sendMenu.appendChild(btn);
    }
    if (appliedSettings && appliedSettings.obsidianVault) {
      addSendOption("Obsidian", function () {
        QPSendTo.obsidian(clip, appliedSettings.obsidianVault);
      });
    }
    addSendOption("Notion (copy + open)", function () {
      QPSendTo.notion(clip).then(
        function () { flashButton(sendSummary, "Copied — paste in Notion"); },
        function () { flashButton(sendSummary, "Copy failed"); }
      );
    });
    addSendOption("Google Docs (copy + open)", function () {
      QPSendTo.googleDocs(clip).then(
        function () { flashButton(sendSummary, "Copied — paste in Docs"); },
        function () { flashButton(sendSummary, "Copy failed"); }
      );
    });
    sendTo.appendChild(sendMenu);
    actionRow.appendChild(sendTo);

    //?############# DELETE ###########################
    let deleteButton = document.createElement("button");
    deleteButton.className = "icon-button icon-button--danger";
    deleteButton.title = "Delete clip";
    deleteButton.setAttribute("aria-label", "Delete clip");
    deleteButton.innerHTML = DELETE_SVG;
    deleteButton.addEventListener("click", function () {
      let runDelete = function () {
        QPStorage.deleteClips([clip.id]).then(function (snapshot) {
          QPStorage.getClips().then(function (after) {
            renderPopup(after);
            QPToast.show("Clip deleted", function () {
              QPStorage.restoreClips(snapshot).then(function (restored) {
                renderPopup(restored);
              });
            });
          });
        });
      };
      if (confirmDelete) {
        QPConfirm.show("Delete this clip?", runDelete);
      } else {
        runDelete();
      }
    });
    actionRow.appendChild(deleteButton);

    let horizontalLine = document.createElement("hr");
    horizontalLine.className = "horizontal-line";
    newContainer.appendChild(horizontalLine);
  }

  applySearchFilter();
}

function applySearchFilter() {
  let scope = (appliedSettings && appliedSettings.searchScope) || "both";
  let q = currentQuery.toLowerCase();
  let cards = document.querySelectorAll("#paragraph-box .paragraph-container");
  cards.forEach(function (card) {
    if (!q) { card.style.display = ""; return; }
    let textPart = card.dataset.searchHaystack || "";
    let urlPart = (card.dataset.url || "").toLowerCase();
    let haystack;
    if (scope === "text") haystack = textPart;
    else if (scope === "url") haystack = urlPart;
    else haystack = textPart + " " + urlPart;
    card.style.display = haystack.indexOf(q) !== -1 ? "" : "none";
  });
  applyHighlights();
}

// Re-decorate visible cards' paragraph text with <mark> spans around query matches.
// Reads from p.dataset.originalText so repeated calls don't compound highlights.
function applyHighlights() {
  let q = currentQuery;
  let cards = document.querySelectorAll("#paragraph-box .paragraph-container");
  cards.forEach(function (card) {
    if (card.style.display === "none") return;
    let paragraphs = card.querySelectorAll(".paragraph-text");
    paragraphs.forEach(function (p) {
      let text = p.dataset.originalText != null ? p.dataset.originalText : p.textContent;
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(QPSearch.highlight(text, q));
    });
  });
}

document.getElementById("popupSearch").addEventListener("input", function () {
  currentQuery = (this.value || "").trim();
  applySearchFilter();
});

//* ============ TAG BANNER ============
function maybeShowTagBanner(settings) {
  if (!settings.promptForTag) return;
  chrome.storage.local.get({ pendingTagClipId: "" }, function (result) {
    let id = result.pendingTagClipId;
    if (!id) return;
    let banner = document.getElementById("tagBanner");
    let input = document.getElementById("tagBannerInput");
    let saveBtn = document.getElementById("tagBannerSave");
    let skipBtn = document.getElementById("tagBannerSkip");
    banner.hidden = false;
    input.value = "";
    setTimeout(function () { input.focus(); }, 30);

    let close = function () {
      banner.hidden = true;
      chrome.storage.local.remove("pendingTagClipId");
    };

    let commit = function () {
      let tag = input.value.trim();
      if (!tag) { close(); return; }
      QPStorage.getClips().then(function (clips) {
        let target = clips.find(function (c) { return c.id === id; });
        if (!target) { close(); return; }
        let existing = Array.isArray(target.tags) ? target.tags.slice() : [];
        if (existing.indexOf(tag) === -1) existing.push(tag);
        QPStorage.updateClip(id, { tags: existing }).then(function () {
          close();
          QPStorage.getClips().then(renderPopup);
        });
      });
    };

    saveBtn.onclick = commit;
    skipBtn.onclick = close;
    input.onkeydown = function (e) {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    };
  });
}

//* ============ SEARCH TOGGLE ============
(function () {
  let toggle = document.getElementById("searchToggle");
  let input = document.getElementById("popupSearch");
  if (!toggle || !input) return;
  toggle.addEventListener("click", function () {
    searchOpen = !searchOpen;
    toggle.setAttribute("aria-pressed", searchOpen ? "true" : "false");
    input.style.display = searchOpen ? "" : "none";
    if (searchOpen) {
      setTimeout(function () { input.focus(); }, 20);
    } else {
      if (input.value) {
        input.value = "";
        currentQuery = "";
        QPStorage.getClips().then(renderPopup);
      }
    }
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.preventDefault();
      toggle.click();
    }
  });
})();

//* ============ QUICK SAVE ============
(function () {
  let toggle = document.getElementById("quickSaveToggle");
  let area = document.getElementById("quickSaveArea");
  let text = document.getElementById("quickSaveText");
  let commit = document.getElementById("quickSaveCommit");
  let cancel = document.getElementById("quickSaveCancel");
  let paste = document.getElementById("quickSavePaste");
  if (!toggle || !area) return;

  function open() {
    area.hidden = false;
    setTimeout(function () { text.focus(); }, 30);
  }
  function close() {
    area.hidden = true;
    text.value = "";
  }

  toggle.addEventListener("click", function () {
    if (area.hidden) open(); else close();
  });
  cancel.addEventListener("click", close);
  paste.addEventListener("click", function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    navigator.clipboard.readText().then(function (t) {
      text.value = t || "";
      text.focus();
    }).catch(function () { /* clipboard access denied */ });
  });
  commit.addEventListener("click", function () {
    let val = text.value;
    if (!val || !val.trim()) return;
    let paragraphs = val.split(/\n\s*\n+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    if (paragraphs.length === 0) paragraphs = [val.trim()];
    let opts = appliedSettings ? {
      dedupMode: appliedSettings.dedupMode,
      trimWhitespace: appliedSettings.trimWhitespace,
      maxClipCount: Number(appliedSettings.maxClipCount) || 0,
    } : {};
    QPStorage.saveClip({ text: paragraphs, url: "" }, opts).then(function () {
      close();
      QPStorage.getClips().then(renderPopup);
    });
  });
  text.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit.click(); }
  });
})();

//* ============ INIT ============
QPSettings.get().then(function (settings) {
  appliedSettings = settings;
  applyVisualSettings(settings);
  return QPStorage.getClips();
}).then(function (clips) {
  renderPopup(clips);
  maybeShowTagBanner(appliedSettings);
});

QPSettings.onChanged(function (settings) {
  appliedSettings = settings;
  applyVisualSettings(settings);
  QPStorage.getClips().then(renderPopup);
});
