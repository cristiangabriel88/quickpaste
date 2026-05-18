//* ============ THEME (dark / light) =====================
function applyTheme(theme) {
  let resolved = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", resolved);
  let radio = document.getElementById(resolved === "dark" ? "themeDark" : "themeLight");
  if (radio) radio.checked = true;
}

chrome.storage.sync.get({ theme: "light" }, function (result) {
  applyTheme(result.theme);
});

document.querySelectorAll('input[name="themeOption"]').forEach(function (el) {
  el.addEventListener("change", function () {
    let theme = el.value === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    chrome.storage.sync.set({ theme: theme });
  });
});

//* ============ SIDE PANEL TOGGLE =========================
let sidePanel = document.getElementById("sidePanel");
let sidePanelClose = document.getElementById("sidePanelClose");
let sidePanelTitle = document.getElementById("sidePanelTitle");
let panelToggles = document.querySelectorAll(".activity-bar__item[data-view]");
let panelContents = document.querySelectorAll(".side-panel__content[data-view]");
let activeView = null;
let lastFocusedToggle = null;

const VIEW_TITLES = { settings: "Settings", about: "About" };

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

//* Save notification preference instantly on change
document.querySelectorAll('input[name="notifOption"]').forEach(function (el) {
  el.addEventListener("change", function () {
    if (el.checked) {
      chrome.storage.sync.set({ notifOptions: el.value });
    }
  });
});

document.querySelectorAll('input[name="autoCopyOption"]').forEach(function (el) {
  el.addEventListener("change", function () {
    if (el.checked) {
      chrome.storage.sync.set({ autoCopy: el.value });
    }
  });
});

//* Get the current status of the checked radios to initialize the page
let notifOptions;
chrome.storage.sync.get(
  { notifOptions: "On", autoCopy: "On" },
  function (result) {
    notifOptions = result.notifOptions;
    let notifEl = document.getElementById(notifOptions === "Off" ? "notifOff" : "notifOn");
    if (notifEl) notifEl.checked = true;
    let autoEl = document.getElementById(result.autoCopy === "Off" ? "autoCopyOff" : "autoCopyOn");
    if (autoEl) autoEl.checked = true;
  }
);

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

  let ordered = QPStorage.sortForDisplay(clips);

  chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
    let selectedIds = new Set(
      (result.selectedCheckboxes || []).filter(function (v) { return typeof v === "string"; })
    );

    for (let clip of ordered) {
      let newContainer = document.createElement("div");
      newContainer.dataset.clipId = clip.id;
      newContainer.className = "paragraph-container" + (clip.pinned ? " paragraph-container--pinned" : "");
      newContainer.dataset.url = clip.url || "";

      let headerRow = document.createElement("div");
      headerRow.className = "paragraph-header";

      let newCheckbox = document.createElement("input");
      newCheckbox.type = "checkbox";
      newCheckbox.id = "checkbox-" + clip.id;
      newCheckbox.name = "checkbox";
      newCheckbox.dataset.clipId = clip.id;
      newCheckbox.checked = selectedIds.has(clip.id);
      if (newCheckbox.checked) newContainer.classList.add("is-selected");
      let newLabel = document.createElement("label");
      newLabel.htmlFor = newCheckbox.id;
      newLabel.innerHTML = "Select";

      newCheckbox.addEventListener("click", function () {
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
      });
      headerRow.appendChild(newCheckbox);
      headerRow.appendChild(newLabel);

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

      let paragraphsWrap = document.createElement("div");
      paragraphsWrap.className = "paragraph-body";
      let paragraphs = clip.text || [];
      for (let para of paragraphs) {
        let newParagraph = document.createElement("p");
        newParagraph.innerText = para;
        newParagraph.className = "paragraph-text";
        paragraphsWrap.appendChild(newParagraph);
      }
      newContainer.appendChild(paragraphsWrap);

      newContainer.insertBefore(headerRow, newContainer.firstChild);

      collectionContainer.appendChild(newContainer);
    }

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
    let query = searchInput.value.trim().toLowerCase();
    let cards = document.querySelectorAll("#collection-container .paragraph-container");
    cards.forEach(function (card) {
      let haystack = (card.innerText + " " + (card.dataset.url || "")).toLowerCase();
      card.style.display = (!query || haystack.includes(query)) ? "" : "none";
    });
  });

  // ***********DELETE SELECTED BUTTON FUNCTIONALITY********
  let deleteButton = document.getElementById("deleteSelected");
  deleteButton.addEventListener("click", function () {
    chrome.storage.local.get({ selectedCheckboxes: [] }, function (result) {
      let selectedIds = (result.selectedCheckboxes || []).filter(function (v) {
        return typeof v === "string";
      });
      if (selectedIds.length === 0) return;

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
      let combined = selectedIds
        .map(function (id) {
          let c = byId.get(id);
          return c ? (c.text || []).join("\n\n") : "";
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

  const duration = Math.min(2200, Math.max(1100, start * 0.9));
  const startTime = performance.now();
  const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start * (1 - easeInOutSine(t)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});
