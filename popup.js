//* Apply saved theme (light / dark) before rendering content
chrome.storage.sync.get({ theme: "light" }, function (result) {
  let theme = result.theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
});

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

  let ordered = QPStorage.sortForDisplay(clips);
  let hasClips = ordered.length > 0;
  searchInput.style.display = hasClips ? "" : "none";

  for (let clip of ordered) {
    let newContainer = document.createElement("div");
    newContainer.dataset.clipId = clip.id;
    newContainer.className = "paragraph-container" + (clip.pinned ? " paragraph-container--pinned" : "");

    //?############# CLIP META HEADER ###########################
    let meta = document.createElement("div");
    meta.className = "clip-meta";

    let timestamp = document.createElement("span");
    timestamp.className = "clip-meta__time";
    timestamp.innerText = QPFormat.formatRelative(clip.savedAt);
    meta.appendChild(timestamp);

    newContainer.appendChild(meta);

    //?############# PARAGRAPHS ###########################
    let letterCount = 0;
    let paragraphs = clip.text || [];
    for (let j = 0; j < paragraphs.length; j++) {
      letterCount += paragraphs[j].length;
      let newParagraph = document.createElement("p");
      if (letterCount < 500) {
        newParagraph.innerText = paragraphs[j];
        newParagraph.className = "paragraph-text";
        newContainer.appendChild(newParagraph);
      } else {
        let linkForMore = document.createElement("a");
        linkForMore.href = "./options.html#" + encodeURIComponent(clip.id);
        linkForMore.target = "_blank";
        linkForMore.innerText = "View more...";
        newContainer.appendChild(linkForMore);
        newContainer.appendChild(document.createElement("br"));
        break;
      }
    }

    paragraphBox.appendChild(newContainer);

    //?############# PIN BUTTON ###########################
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
    newContainer.appendChild(pinButton);

    //?############### URL BUTTON ###########################
    let sourceButton = document.createElement("button");
    sourceButton.className = "icon-button";
    sourceButton.title = "View URL";
    sourceButton.setAttribute("aria-label", "View URL");
    sourceButton.innerHTML = SOURCE_SVG;
    sourceButton.addEventListener("click", function () {
      let pageURL = clip.url;
      if (pageURL && pageURL.startsWith("http")) {
        window.open(pageURL, "_blank");
      }
    });
    newContainer.appendChild(sourceButton);

    //?############### COPY WITH SOURCE URL BUTTON ###########################
    let copyWithUrlButton = document.createElement("button");
    copyWithUrlButton.className = "icon-button";
    copyWithUrlButton.title = "Copy with source URL";
    copyWithUrlButton.setAttribute("aria-label", "Copy with source URL");
    copyWithUrlButton.innerHTML = COPY_WITH_URL_SVG;
    copyWithUrlButton.addEventListener("click", function () {
      let body = (clip.text || []).join("\n\n");
      let withUrl = clip.url ? body + "\n\n— " + clip.url : body;
      navigator.clipboard.writeText(withUrl).then(
        function () { flashButton(copyWithUrlButton, "Copied with URL"); },
        function () { flashButton(copyWithUrlButton, "Copy failed"); }
      );
    });
    newContainer.appendChild(copyWithUrlButton);

    //?############# DELETE BUTTON ###########################
    let deleteButton = document.createElement("button");
    deleteButton.className = "icon-button icon-button--danger";
    deleteButton.title = "Remove";
    deleteButton.setAttribute("aria-label", "Remove");
    deleteButton.innerHTML = DELETE_SVG;
    deleteButton.addEventListener("click", function () {
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
    });
    newContainer.appendChild(deleteButton);

    let horizontalLine = document.createElement("hr");
    horizontalLine.className = "horizontal-line";
    newContainer.appendChild(horizontalLine);
  }

  applySearchFilter();
}

function applySearchFilter() {
  let searchInput = document.getElementById("popupSearch");
  let query = (searchInput.value || "").trim().toLowerCase();
  let cards = document.querySelectorAll("#paragraph-box .paragraph-container");
  cards.forEach(function (card) {
    let haystack = card.innerText.toLowerCase();
    card.style.display = !query || haystack.includes(query) ? "" : "none";
  });
}

document.getElementById("popupSearch").addEventListener("input", applySearchFilter);

QPStorage.getClips().then(renderPopup);
