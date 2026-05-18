//* ============ SETTINGS (theme, density, accent, visibility toggles) ============
let appliedSettings = null;
let currentQuery = "";
let currentDateRange = "all";   // "all" | "today" | "7" | "30" | "custom"
let currentDateStart = "";       // YYYY-MM-DD when range = "custom"
let currentDateEnd = "";
let currentTagFilter = "";       // tag string; empty = no tag filter
let lastDragEndTime = 0;         // suppresses click-to-select right after a drop

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

function hydrateSettingsPanel(settings) {
  let panel = document.querySelector('.side-panel__content[data-view="settings"]');
  if (!panel) return;
  panel.querySelectorAll("[data-setting]").forEach(function (el) {
    let key = el.dataset.setting;
    let type = el.dataset.settingControl;
    let value = settings[key];
    if (type === "radio") {
      el.checked = String(el.value) === String(value);
    } else if (type === "checkbox") {
      el.checked = !!value;
    } else if (type === "select" || type === "number" || type === "text") {
      el.value = (value == null) ? "" : String(value);
    } else if (type === "textarea-list") {
      el.value = Array.isArray(value) ? value.join("\n") : "";
    } else if (type === "color") {
      el.value = value || "#5b943e";
    }
  });
}

function readSettingValue(el) {
  let type = el.dataset.settingControl;
  if (type === "radio") return el.value;
  if (type === "checkbox") return el.checked;
  if (type === "number") {
    let n = Number(el.value);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === "select") {
    if (el.dataset.settingType === "number") return Number(el.value) || 0;
    return el.value;
  }
  if (type === "textarea-list") {
    return (el.value || "")
      .split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }
  if (type === "color") return el.value;
  return el.value;
}

function bindSettingsPanel() {
  let panel = document.querySelector('.side-panel__content[data-view="settings"]');
  if (!panel) return;
  panel.addEventListener("change", function (event) {
    let el = event.target;
    if (!el || !el.dataset || !el.dataset.setting) return;
    if (el.dataset.settingControl === "radio" && !el.checked) return;
    QPSettings.set({ [el.dataset.setting]: readSettingValue(el) });
  });
  panel.querySelectorAll("[data-reset]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      let key = btn.dataset.reset;
      QPSettings.set({ [key]: QPSettings.defaults[key] });
    });
  });
}

function dateRangeStart() {
  let now = Date.now();
  if (currentDateRange === "today") {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (currentDateRange === "7") return now - 7 * 86400000;
  if (currentDateRange === "30") return now - 30 * 86400000;
  if (currentDateRange === "custom" && currentDateStart) {
    let t = new Date(currentDateStart + "T00:00:00").getTime();
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function dateRangeEnd() {
  if (currentDateRange === "custom" && currentDateEnd) {
    let t = new Date(currentDateEnd + "T23:59:59").getTime();
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
  }
  return Number.MAX_SAFE_INTEGER;
}

function passesFilters(clip) {
  let start = dateRangeStart();
  let end = dateRangeEnd();
  let ts = clip.savedAt || 0;
  if (ts < start || ts > end) return false;
  if (currentTagFilter) {
    if (!Array.isArray(clip.tags) || clip.tags.indexOf(currentTagFilter) === -1) return false;
  }
  return true;
}

// DOM-side substring filter. Runs on every keystroke without re-rendering, so the
// list updates smoothly. Cards carry a pre-computed dataset.searchHaystack from render.
function applyCollectionSearchFilter() {
  let scope = (appliedSettings && appliedSettings.searchScope) || "both";
  let q = currentQuery.toLowerCase();
  let cards = document.querySelectorAll("#collection-container .paragraph-container");
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
  applyCollectionHighlights();
}

// Re-decorate visible cards' paragraph text with <mark> spans around query matches.
// Reads from p.dataset.originalText so repeated calls don't compound highlights.
function applyCollectionHighlights() {
  let q = currentQuery;
  let cards = document.querySelectorAll("#collection-container .paragraph-container");
  cards.forEach(function (card) {
    if (card.style.display === "none") return;
    if (card.classList.contains("is-editing")) return;
    let paragraphs = card.querySelectorAll(".paragraph-text");
    paragraphs.forEach(function (p) {
      let text = p.dataset.originalText != null ? p.dataset.originalText : p.textContent;
      while (p.firstChild) p.removeChild(p.firstChild);
      p.appendChild(QPSearch.highlight(text, q));
    });
  });
}

QPSettings.get().then(function (settings) {
  appliedSettings = settings;
  applyVisualSettings(settings);
  hydrateSettingsPanel(settings);
  bindSettingsPanel();
});

QPSettings.onChanged(function (settings) {
  appliedSettings = settings;
  applyVisualSettings(settings);
  hydrateSettingsPanel(settings);
  // Re-render so sort/density/visibility/tag changes take effect immediately.
  QPStorage.getClips().then(renderCollection);
});

//* ============ SIDE PANEL TOGGLE =========================
let sidePanel = document.getElementById("sidePanel");
let sidePanelClose = document.getElementById("sidePanelClose");
let sidePanelTitle = document.getElementById("sidePanelTitle");
let panelToggles = document.querySelectorAll(".activity-bar__item[data-view]");
let panelContents = document.querySelectorAll(".side-panel__content[data-view]");
let activeView = null;
let lastFocusedToggle = null;

const VIEW_TITLES = { settings: "Settings", backup: "Backup", about: "About" };

function setPanelView(view) {
  let open = view !== null;
  sidePanel.classList.toggle("is-open", open);
  sidePanel.setAttribute("aria-hidden", open ? "false" : "true");
  if (open) {
    sidePanelTitle.textContent = VIEW_TITLES[view] || "";
    sidePanel.setAttribute("aria-label", (VIEW_TITLES[view] || "") + " panel");
  }
  panelContents.forEach(function (el) {
    el.hidden = el.dataset.view !== view;
  });
  panelToggles.forEach(function (btn) {
    btn.setAttribute("aria-pressed", btn.dataset.view === view ? "true" : "false");
  });
  activeView = view;
}

panelToggles.forEach(function (btn) {
  btn.addEventListener("click", function () {
    let view = btn.dataset.view;
    lastFocusedToggle = btn;
    setPanelView(activeView === view ? null : view);
  });
});

sidePanelClose.addEventListener("click", function () {
  setPanelView(null);
  if (lastFocusedToggle) lastFocusedToggle.focus();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && sidePanel.classList.contains("is-open")) {
    setPanelView(null);
    if (lastFocusedToggle) lastFocusedToggle.focus();
  }
});

// * ============ COLLECTION RENDER =========================
const SVG_PIN_FILLED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
  '</svg>';

const SVG_PIN_OUTLINE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' +
  '</svg>';

const SVG_EDIT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>' +
  '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>' +
  '</svg>';

const SVG_COPY =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
  '</svg>';

const SVG_COPY_WITH_URL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
  '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>' +
  '<path d="M14 14l5 5"></path>' +
  '<path d="M19 14h-5v5"></path>' +
  '</svg>';

const SVG_SOURCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>' +
  '<polyline points="15 3 21 3 21 9"></polyline>' +
  '<line x1="10" y1="14" x2="21" y2="3"></line>' +
  '</svg>';

const SVG_SEND =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<line x1="22" y1="2" x2="11" y2="13"></line>' +
  '<polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>' +
  '</svg>';

const SVG_DELETE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<polyline points="3 6 5 6 21 6"></polyline>' +
  '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>' +
  '<path d="M10 11v6"></path><path d="M14 11v6"></path>' +
  '<path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>' +
  '</svg>';

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

function renderCollection(clips) {
  let collectionContainer = document.querySelector("#collection-container");
  collectionContainer.innerHTML = "";

  let hasClips = clips.length > 0;
  document.getElementById("deleteSelected").style.display = hasClips ? "block" : "none";
  document.getElementById("copySelected").style.display = hasClips ? "block" : "none";
  let selectAllButton = document.getElementById("selectAll");
  selectAllButton.style.display = hasClips ? "block" : "none";
  selectAllButton.innerText = "Select All";
  document.getElementById("collectionSearch").style.display = hasClips ? "block" : "none";

  let sortMode = (appliedSettings && appliedSettings.sortMode) || "manual";
  let ordered = QPStorage.sortForDisplay(clips, sortMode).filter(passesFilters);

  chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
    let selectedIds = new Set(
      (result.selectedCheckboxes || []).filter(function (v) { return typeof v === "string"; })
    );

    let dragMode = sortMode === "manual";
    for (let clip of ordered) {
      let newContainer = document.createElement("div");
      newContainer.dataset.clipId = clip.id;
      newContainer.className = "paragraph-container" + (clip.pinned ? " paragraph-container--pinned" : "");
      newContainer.dataset.url = clip.url || "";
      let clipBodyText = clip.kind === "image" ? (clip.src || "") : (clip.text || []).join(" ");
      let clipTagsText = Array.isArray(clip.tags) ? clip.tags.join(" ") : "";
      newContainer.dataset.searchHaystack = (clipBodyText + " " + clipTagsText).toLowerCase();
      if (dragMode && !clip.pinned) {
        newContainer.draggable = true;
        newContainer.classList.add("is-draggable");
      }

      let headerRow = document.createElement("div");
      headerRow.className = "paragraph-header";

      let newCheckbox = document.createElement("input");
      newCheckbox.type = "checkbox";
      newCheckbox.id = "checkbox-" + clip.id;
      newCheckbox.name = "checkbox";
      newCheckbox.dataset.clipId = clip.id;
      newCheckbox.checked = selectedIds.has(clip.id);
      newCheckbox.setAttribute("aria-label", "Select clip");
      newCheckbox.title = "Select";
      if (newCheckbox.checked) newContainer.classList.add("is-selected");

      function persistSelectionState() {
        chrome.storage.local.get({ selectedCheckboxes: [] }, function (res) {
          let list = (res.selectedCheckboxes || []).filter(function (v) {
            return typeof v === "string";
          });
          if (newCheckbox.checked) {
            if (list.indexOf(clip.id) === -1) list.push(clip.id);
            newContainer.classList.add("is-selected");
          } else {
            let idx = list.indexOf(clip.id);
            if (idx > -1) list.splice(idx, 1);
            newContainer.classList.remove("is-selected");
          }
          chrome.storage.local.set({ selectedCheckboxes: list }, function () {});
        });
      }
      newCheckbox.addEventListener("click", function (e) {
        e.stopPropagation();
        persistSelectionState();
      });
      headerRow.appendChild(newCheckbox);

      // Click anywhere on the card (except text body, buttons, or links) toggles selection.
      // Click-and-hold + move still initiates native drag (no click fires after a drag).
      newContainer.addEventListener("click", function (e) {
        if (Date.now() - lastDragEndTime < 200) return;
        if (newContainer.classList.contains("is-editing")) return;
        if (e.target.closest("button, input, label, summary, a, textarea, .clip-tag")) return;
        if (e.target.closest(".paragraph-text")) return;
        newCheckbox.checked = !newCheckbox.checked;
        persistSelectionState();
      });

      let timeLabel = document.createElement("span");
      timeLabel.className = "clip-meta__time";
      timeLabel.innerText = QPFormat.formatRelative(clip.savedAt);
      headerRow.appendChild(timeLabel);

      // Pin
      let pinButton = document.createElement("button");
      pinButton.className = "icon-button" + (clip.pinned ? " icon-button--pinned" : "");
      pinButton.title = clip.pinned ? "Unpin" : "Pin";
      pinButton.setAttribute("aria-label", pinButton.title);
      pinButton.innerHTML = clip.pinned ? SVG_PIN_FILLED : SVG_PIN_OUTLINE;
      pinButton.addEventListener("click", function () {
        QPStorage.updateClip(clip.id, { pinned: !clip.pinned }).then(function () {
          QPStorage.getClips().then(renderCollection);
        });
      });
      headerRow.appendChild(pinButton);

      // Edit
      let editButton = document.createElement("button");
      editButton.className = "icon-button";
      editButton.title = "Edit";
      editButton.setAttribute("aria-label", "Edit");
      editButton.innerHTML = SVG_EDIT;
      editButton.addEventListener("click", function () {
        enterEditMode(clip, newContainer);
      });
      headerRow.appendChild(editButton);

      // Copy text
      let copyButton = document.createElement("button");
      copyButton.className = "icon-button";
      copyButton.title = "Copy text";
      copyButton.setAttribute("aria-label", "Copy text");
      copyButton.innerHTML = SVG_COPY;
      copyButton.addEventListener("click", function () {
        let txt = (clip.text || []).join("\n\n");
        navigator.clipboard.writeText(txt).then(
          function () { flashButton(copyButton, "Copied"); },
          function () { flashButton(copyButton, "Copy failed"); }
        );
      });
      headerRow.appendChild(copyButton);

      // Copy with URL
      let copyWithUrlButton = document.createElement("button");
      copyWithUrlButton.className = "icon-button";
      copyWithUrlButton.title = "Copy with source URL";
      copyWithUrlButton.setAttribute("aria-label", "Copy with source URL");
      copyWithUrlButton.innerHTML = SVG_COPY_WITH_URL;
      copyWithUrlButton.addEventListener("click", function () {
        let body = (clip.text || []).join("\n\n");
        let withUrl = clip.url ? body + "\n\n— " + clip.url : body;
        navigator.clipboard.writeText(withUrl).then(
          function () { flashButton(copyWithUrlButton, "Copied with URL"); },
          function () { flashButton(copyWithUrlButton, "Copy failed"); }
        );
      });
      headerRow.appendChild(copyWithUrlButton);

      // Source URL
      let sourceButton = document.createElement("button");
      sourceButton.className = "icon-button";
      sourceButton.dataset.role = "view-url";
      sourceButton.title = "View URL";
      sourceButton.setAttribute("aria-label", "View URL");
      sourceButton.innerHTML = SVG_SOURCE;
      sourceButton.addEventListener("click", function () {
        let pageURL = clip.url;
        if (pageURL && pageURL.startsWith("http")) {
          window.open(pageURL, "_blank");
        }
      });
      headerRow.appendChild(sourceButton);

      // Send to ...
      let sendTo = document.createElement("details");
      sendTo.className = "send-to";
      let sendSummary = document.createElement("summary");
      sendSummary.className = "icon-button send-to__summary";
      sendSummary.title = "Send to...";
      sendSummary.setAttribute("aria-label", "Send to");
      sendSummary.innerHTML = SVG_SEND;
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
        QPSendTo.notion(clip);
        flashButton(sendSummary, "Copied — paste in Notion");
      });
      addSendOption("Google Docs (copy + open)", function () {
        QPSendTo.googleDocs(clip);
        flashButton(sendSummary, "Copied — paste in Docs");
      });
      sendTo.appendChild(sendMenu);
      headerRow.appendChild(sendTo);

      // Delete (per-clip)
      let deleteOneBtn = document.createElement("button");
      deleteOneBtn.className = "icon-button icon-button--danger";
      deleteOneBtn.title = "Delete clip";
      deleteOneBtn.setAttribute("aria-label", "Delete clip");
      deleteOneBtn.innerHTML = SVG_DELETE;
      deleteOneBtn.addEventListener("click", function () {
        let runDelete = function () {
          QPStorage.deleteClips([clip.id]).then(function (snapshot) {
            QPStorage.getClips().then(function (after) {
              renderCollection(after);
              QPToast.show("Clip deleted", function () {
                QPStorage.restoreClips(snapshot).then(function (restored) {
                  renderCollection(restored);
                });
              });
            });
          });
        };
        if (appliedSettings && appliedSettings.confirmDelete) {
          QPConfirm.show("Delete this clip?", runDelete);
        } else {
          runDelete();
        }
      });
      headerRow.appendChild(deleteOneBtn);

      let paragraphsWrap = document.createElement("div");
      paragraphsWrap.className = "paragraph-body";
      paragraphsWrap.setAttribute("draggable", "false");
      if (clip.kind === "image") {
        let img = document.createElement("img");
        img.className = "clip-image";
        img.src = clip.src || "";
        img.alt = "Saved image";
        img.loading = "lazy";
        img.draggable = false;
        paragraphsWrap.appendChild(img);
      } else {
        let paragraphs = clip.text || [];
        for (let para of paragraphs) {
          let newParagraph = document.createElement("p");
          newParagraph.className = "paragraph-text";
          newParagraph.dataset.originalText = para;
          newParagraph.appendChild(document.createTextNode(para));
          paragraphsWrap.appendChild(newParagraph);
        }
      }
      newContainer.appendChild(paragraphsWrap);

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

      newContainer.insertBefore(headerRow, newContainer.firstChild);

      collectionContainer.appendChild(newContainer);
    }

    applyCollectionSearchFilter();
    maybeScrollToHashClip();
  });
}

function enterEditMode(clip, container) {
  if (container.classList.contains("is-editing")) return;
  container.classList.add("is-editing");

  let body = container.querySelector(".paragraph-body");
  if (!body) return;
  let originalHTML = body.innerHTML;
  body.innerHTML = "";

  let textarea = document.createElement("textarea");
  textarea.className = "edit-textarea";
  textarea.value = (clip.text || []).join("\n\n");
  textarea.rows = Math.max(3, Math.min(20, textarea.value.split("\n").length + 1));
  body.appendChild(textarea);

  let actions = document.createElement("div");
  actions.className = "edit-actions";

  let saveBtn = document.createElement("button");
  saveBtn.className = "button";
  saveBtn.type = "button";
  saveBtn.innerText = "Save";
  saveBtn.addEventListener("click", function () {
    let next = textarea.value
      .split(/\n\s*\n+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
    if (next.length === 0) next = [textarea.value.trim()];
    QPStorage.updateClip(clip.id, { text: next }).then(function () {
      QPStorage.getClips().then(renderCollection);
    });
  });

  let cancelBtn = document.createElement("button");
  cancelBtn.className = "button";
  cancelBtn.type = "button";
  cancelBtn.innerText = "Cancel";
  cancelBtn.addEventListener("click", function () {
    container.classList.remove("is-editing");
    body.innerHTML = originalHTML;
  });

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  body.appendChild(actions);

  textarea.focus();
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function maybeScrollToHashClip() {
  let hash = (location.hash || "").replace(/^#/, "");
  if (!hash) return;
  try { hash = decodeURIComponent(hash); } catch (e) {}
  if (hash === "collection-container") return; // legacy popup link
  let target = document.querySelector(
    '#collection-container [data-clip-id="' + CSS.escape(hash) + '"]'
  );
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Undo toast lives in lib/toast.js (QPToast.show / QPToast.dismiss).

// * ============ INIT ======================================
// Reset selectedCheckboxes if it holds legacy numeric indices.
chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
  let list = result.selectedCheckboxes || [];
  let anyNonString = list.some(function (v) { return typeof v !== "string"; });
  if (anyNonString) {
    chrome.storage.local.set({ selectedCheckboxes: [] }, function () {});
  }
});

QPStorage.getClips().then(function (clips) {
  renderCollection(clips);

  // ***********SEARCH/FILTER FUNCTIONALITY********
  let searchInput = document.getElementById("collectionSearch");
  searchInput.addEventListener("input", function () {
    currentQuery = searchInput.value.trim();
    applyCollectionSearchFilter();
  });

  // ***********DATE-RANGE FILTER********
  let dateRangeSelect = document.getElementById("dateRangeFilter");
  let customWrap = document.getElementById("customDateRangeWrap");
  let dateStartInput = document.getElementById("dateRangeStart");
  let dateEndInput = document.getElementById("dateRangeEnd");
  if (dateRangeSelect) {
    dateRangeSelect.addEventListener("change", function () {
      currentDateRange = dateRangeSelect.value;
      if (customWrap) customWrap.hidden = currentDateRange !== "custom";
      QPStorage.getClips().then(renderCollection);
    });
  }
  if (dateStartInput) {
    dateStartInput.addEventListener("change", function () {
      currentDateStart = dateStartInput.value;
      QPStorage.getClips().then(renderCollection);
    });
  }
  if (dateEndInput) {
    dateEndInput.addEventListener("change", function () {
      currentDateEnd = dateEndInput.value;
      QPStorage.getClips().then(renderCollection);
    });
  }
  let dateResetBtn = document.getElementById("dateRangeReset");
  if (dateResetBtn) {
    dateResetBtn.addEventListener("click", function () {
      currentDateStart = "";
      currentDateEnd = "";
      if (dateStartInput) dateStartInput.value = "";
      if (dateEndInput) dateEndInput.value = "";
      QPStorage.getClips().then(renderCollection);
    });
  }

  // ***********SAVED SEARCHES********
  function refreshSavedSearches() {
    let panel = document.getElementById("savedSearchesList");
    if (!panel) return;
    QPSavedSearches.list().then(function (entries) {
      panel.innerHTML = "";
      if (entries.length === 0) {
        let empty = document.createElement("p");
        empty.className = "saved-search__empty";
        empty.innerText = "☆ None yet — type a query, then click “Save search” to pin it here.";
        panel.appendChild(empty);
        return;
      }
      entries.forEach(function (entry) {
        let row = document.createElement("div");
        row.className = "saved-search";
        let btn = document.createElement("button");
        btn.type = "button";
        btn.className = "saved-search__apply";
        btn.innerText = entry.name;
        btn.title = "Apply: " + (entry.query || "(no query)");
        btn.addEventListener("click", function () {
          currentQuery = entry.query || "";
          currentDateRange = entry.dateRange || "all";
          currentTagFilter = entry.tag || "";
          if (searchInput) searchInput.value = currentQuery;
          if (dateRangeSelect) dateRangeSelect.value = currentDateRange;
          if (customWrap) customWrap.hidden = currentDateRange !== "custom";
          QPStorage.getClips().then(renderCollection);
        });
        let del = document.createElement("button");
        del.type = "button";
        del.className = "saved-search__delete";
        del.title = "Delete";
        del.setAttribute("aria-label", "Delete saved search");
        del.innerText = "×";
        del.addEventListener("click", function () {
          QPSavedSearches.remove(entry.id).then(refreshSavedSearches);
        });
        row.appendChild(btn);
        row.appendChild(del);
        panel.appendChild(row);
      });
    });
  }

  let saveSearchBtn = document.getElementById("saveSearchBtn");
  if (saveSearchBtn) {
    saveSearchBtn.addEventListener("click", function () {
      let name = window.prompt("Name this search:", currentQuery || currentTagFilter || "Saved");
      if (!name) return;
      QPSavedSearches.save({
        name: name,
        query: currentQuery,
        dateRange: currentDateRange,
        tag: currentTagFilter,
      }).then(refreshSavedSearches);
    });
  }

  refreshSavedSearches();

  // ***********EXPORT / IMPORT********
  let exportJsonBtn = document.getElementById("exportJsonBtn");
  let exportMdBtn = document.getElementById("exportMdBtn");
  let importBtn = document.getElementById("importJsonBtn");
  let importInput = document.getElementById("importJsonInput");

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener("click", function () {
      QPStorage.getClips().then(function (clips) {
        QPExport.downloadJson(clips);
      });
    });
  }
  if (exportMdBtn) {
    exportMdBtn.addEventListener("click", function () {
      QPStorage.getClips().then(function (clips) {
        QPExport.downloadMarkdown(clips);
      });
    });
  }
  if (importBtn && importInput) {
    importBtn.addEventListener("click", function () { importInput.click(); });
    importInput.addEventListener("change", function () {
      let file = importInput.files && importInput.files[0];
      if (!file) return;
      let reader = new FileReader();
      reader.onload = function () {
        try {
          let parsed = QPExport.parseImport(String(reader.result || ""));
          QPStorage.importClips(parsed).then(function (res) {
            QPStorage.getClips().then(renderCollection);
            QPToast.show("Imported " + res.added + ", skipped " + res.skipped);
          });
        } catch (err) {
          QPToast.show("Import failed: " + err.message);
        }
        importInput.value = "";
      };
      reader.onerror = function () {
        QPToast.show("Could not read file");
        importInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  // ***********DRAG-AND-DROP REORDER (manual sort only)********
  (function setupDragDrop() {
    let container = document.getElementById("collection-container");
    if (!container) return;
    let draggingId = null;
    let lastMarked = null;
    let lastSide = "";

    function clearMark() {
      if (lastMarked) {
        lastMarked.classList.remove("drop-before", "drop-after");
        lastMarked = null;
        lastSide = "";
      }
    }

    container.addEventListener("dragstart", function (e) {
      let card = e.target.closest && e.target.closest(".paragraph-container");
      if (!card || !card.draggable) {
        e.preventDefault();
        return;
      }
      draggingId = card.dataset.clipId;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", draggingId); } catch (err) {}
      }
      card.classList.add("is-dragging");
    });

    container.addEventListener("dragend", function () {
      container.querySelectorAll(".paragraph-container.is-dragging").forEach(function (el) {
        el.classList.remove("is-dragging");
      });
      clearMark();
      draggingId = null;
      lastDragEndTime = Date.now();
    });

    container.addEventListener("dragover", function (e) {
      if (!draggingId) return;
      let card = e.target.closest && e.target.closest(".paragraph-container");
      if (!card || !card.classList.contains("is-draggable")) return;
      if (card.dataset.clipId === draggingId) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";

      let rect = card.getBoundingClientRect();
      let side = (e.clientY - rect.top) < (rect.height / 2) ? "before" : "after";
      if (card === lastMarked && side === lastSide) return;
      clearMark();
      card.classList.add(side === "before" ? "drop-before" : "drop-after");
      lastMarked = card;
      lastSide = side;
    });

    container.addEventListener("dragleave", function (e) {
      // Only clear when leaving the container entirely (not when crossing card borders).
      if (e.target === container || !container.contains(e.relatedTarget)) {
        clearMark();
      }
    });

    container.addEventListener("drop", function (e) {
      if (!draggingId) return;
      let targetCard = e.target.closest && e.target.closest(".paragraph-container");
      if (!targetCard || !targetCard.classList.contains("is-draggable")) return;
      e.preventDefault();
      let targetId = targetCard.dataset.clipId;
      if (targetId === draggingId) { clearMark(); return; }

      let side = lastSide || "before";
      let cards = Array.from(container.querySelectorAll(".paragraph-container[draggable='true']"));
      let order = cards.map(function (c) { return c.dataset.clipId; });
      let fromIdx = order.indexOf(draggingId);
      if (fromIdx === -1) { clearMark(); return; }
      order.splice(fromIdx, 1);
      let insertAt = order.indexOf(targetId);
      if (insertAt === -1) { clearMark(); return; }
      if (side === "after") insertAt += 1;
      order.splice(insertAt, 0, draggingId);

      clearMark();
      // Preserve scroll across the async re-render: lock the container's height so
      // the page doesn't collapse while renderCollection clears innerHTML, and
      // restore window.scrollY once the rebuild has painted.
      let savedScrollY = window.scrollY;
      container.style.minHeight = container.offsetHeight + "px";
      QPStorage.reorderClips(order).then(function () {
        QPStorage.getClips().then(function (clips) {
          renderCollection(clips);
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              window.scrollTo(0, savedScrollY);
              container.style.minHeight = "";
            });
          });
        });
      });
    });
  })();

  // ***********DELETE SELECTED BUTTON FUNCTIONALITY********
  let deleteButton = document.getElementById("deleteSelected");
  deleteButton.addEventListener("click", function () {
    chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
      let selectedIds = (result.selectedCheckboxes || []).filter(function (v) {
        return typeof v === "string";
      });
      if (selectedIds.length === 0) return;

      let runDelete = function () {
        QPStorage.deleteClips(selectedIds).then(function (snapshot) {
          chrome.storage.local.set({ selectedCheckboxes: [] }, function () {});
          QPStorage.getClips().then(function (after) {
            renderCollection(after);
            let count = snapshot.length;
            let message = count + " clip" + (count === 1 ? "" : "s") + " deleted";
            QPToast.show(message, function () {
              QPStorage.restoreClips(snapshot).then(function (restored) {
                chrome.storage.local.set({ selectedCheckboxes: [] }, function () {
                  renderCollection(restored);
                });
              });
            });
          });
        });
      };

      if (appliedSettings && appliedSettings.confirmDelete) {
        let n = selectedIds.length;
        QPConfirm.show("Delete " + n + " clip" + (n === 1 ? "" : "s") + "?", runDelete);
      } else {
        runDelete();
      }
    });
  });

  // ***********COPY SELECTED BUTTON FUNCTIONALITY********
  let copyButton = document.getElementById("copySelected");
  copyButton.addEventListener("click", function () {
    Promise.all([
      QPStorage.getClips(),
      new Promise(function (resolve) {
        chrome.storage.local.get({ selectedCheckboxes: [] }, function (r) {
          resolve(r.selectedCheckboxes || []);
        });
      }),
    ]).then(function (vals) {
      let clipsNow = vals[0];
      let selectedIds = vals[1].filter(function (v) { return typeof v === "string"; });
      if (selectedIds.length === 0) return;
      let byId = new Map(clipsNow.map(function (c) { return [c.id, c]; }));
      let mode = (appliedSettings && appliedSettings.copyFormat) || "text";
      let combined = selectedIds
        .map(function (id) {
          let c = byId.get(id);
          return c ? QPFormat.formatForCopy(c, mode) : "";
        })
        .filter(function (s) { return s.length > 0; })
        .join("\n\n");
      navigator.clipboard.writeText(combined).then(
        function () {
          let original = copyButton.innerText;
          copyButton.innerText = "Copied!";
          setTimeout(function () { copyButton.innerText = original; }, 1500);
        },
        function () {
          let original = copyButton.innerText;
          copyButton.innerText = "Copy failed";
          setTimeout(function () { copyButton.innerText = original; }, 1500);
        }
      );
    });
  });

  // ***********SELECT ALL BUTTON FUNCTIONALITY********
  let selectAllButton = document.getElementById("selectAll");
  selectAllButton.addEventListener("click", function () {
    let selecting = selectAllButton.innerText === "Select All";
    selectAllButton.innerText = selecting ? "Deselect All" : "Select All";

    chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
      let list = (result.selectedCheckboxes || []).filter(function (v) {
        return typeof v === "string";
      });

      let containers = document.querySelectorAll(
        "#collection-container .paragraph-container"
      );
      containers.forEach(function (container) {
        if (container.style.display === "none") return;
        let id = container.dataset.clipId;
        if (!id) return;
        let checkbox = container.querySelector('input[type="checkbox"]');
        if (!checkbox) return;
        if (selecting) {
          if (list.indexOf(id) === -1) list.push(id);
          checkbox.checked = true;
          container.classList.add("is-selected");
        } else {
          let idx = list.indexOf(id);
          if (idx > -1) list.splice(idx, 1);
          checkbox.checked = false;
          container.classList.remove("is-selected");
        }
      });

      chrome.storage.local.set({ selectedCheckboxes: list }, function () {});
    });
  });
});

window.addEventListener("hashchange", maybeScrollToHashClip);

// ***********BACK TO TOP BUTTON**************************
let bttButton = document.getElementById("bttButton");

const toggleBttVisibility = () => {
  if (window.scrollY > 240) {
    bttButton.classList.add("is-visible");
  } else {
    bttButton.classList.remove("is-visible");
  }
};
toggleBttVisibility();
window.addEventListener("scroll", toggleBttVisibility, { passive: true });

bttButton.addEventListener("click", function () {
  const start = window.scrollY || window.pageYOffset;
  if (start === 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    window.scrollTo(0, 0);
    return;
  }

  const duration = Math.min(380, Math.max(220, start * 0.18));
  // Pre-roll the clock so the synchronous first paint already shows
  // substantial motion instead of an imperceptible nudge.
  const startTime = performance.now() - 25;
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start * (1 - easeOutExpo(t)));
    if (t < 1) requestAnimationFrame(step);
  };
  step(performance.now());
  requestAnimationFrame(step);
});

// ***********SCROLL TO BOTTOM BUTTON**********************
let sttbButton = document.getElementById("sttbButton");

const toggleSttbVisibility = () => {
  const scrollPos = window.scrollY;
  const maxScroll =
    (document.documentElement.scrollHeight || document.body.scrollHeight) -
    window.innerHeight;
  // Show alongside the back-to-top trigger, but hide once we're near the
  // bottom so it doesn't sit there doing nothing.
  if (scrollPos > 240 && maxScroll - scrollPos > 120) {
    sttbButton.classList.add("is-visible");
  } else {
    sttbButton.classList.remove("is-visible");
  }
};
toggleSttbVisibility();
window.addEventListener("scroll", toggleSttbVisibility, { passive: true });
window.addEventListener("resize", toggleSttbVisibility, { passive: true });

sttbButton.addEventListener("click", function () {
  const start = window.scrollY || window.pageYOffset;
  const maxScroll =
    (document.documentElement.scrollHeight || document.body.scrollHeight) -
    window.innerHeight;
  const distance = maxScroll - start;
  if (distance <= 0) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) {
    window.scrollTo(0, maxScroll);
    return;
  }

  const duration = Math.min(380, Math.max(220, distance * 0.18));
  const startTime = performance.now() - 25;
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start + distance * easeOutExpo(t));
    if (t < 1) requestAnimationFrame(step);
  };
  step(performance.now());
  requestAnimationFrame(step);
});
