// Label/tag editor dialog. Attaches to globalThis.QPLabelEditor.
// QPLabelEditor.show(currentTags, availableTags, onSave) — `availableTags` is the
// caller-supplied pool of existing labels (across all clips), rendered as
// one-click suggestions. onSave receives the new tag array only when the user
// clicks Save. Cancel / ESC discards changes.

(function (root) {
  function normalize(tag) {
    return (typeof tag === "string" ? tag : "")
      .replace(/^\s+|\s+$/g, "")
      .replace(/\s+/g, " ");
  }

  function dedupePreserveCase(list) {
    let seen = new Set();
    let out = [];
    list.forEach(function (t) {
      let k = t.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    });
    return out;
  }

  function show(currentTags, availableTags, onSave) {
    // Back-compat: old signature was (currentTags, onSave).
    if (typeof availableTags === "function") {
      onSave = availableTags;
      availableTags = [];
    }
    let tags = dedupePreserveCase(
      (Array.isArray(currentTags) ? currentTags : [])
        .map(normalize)
        .filter(function (t) { return t.length > 0; })
    );
    let pool = dedupePreserveCase(
      (Array.isArray(availableTags) ? availableTags : [])
        .map(normalize)
        .filter(function (t) { return t.length > 0; })
    );

    let dialog = document.createElement("dialog");
    dialog.className = "qp-confirm qp-label-editor";

    let heading = document.createElement("p");
    heading.className = "qp-confirm__message";
    heading.innerText = "Labels";
    dialog.appendChild(heading);

    let pillsWrap = document.createElement("div");
    pillsWrap.className = "qp-label-editor__pills";
    dialog.appendChild(pillsWrap);

    let empty = document.createElement("p");
    empty.className = "qp-label-editor__empty";
    empty.innerText = "No labels yet — add one below.";
    dialog.appendChild(empty);

    function renderPills() {
      pillsWrap.innerHTML = "";
      empty.style.display = tags.length === 0 ? "" : "none";
      tags.forEach(function (tag, idx) {
        let pill = document.createElement("span");
        pill.className = "qp-label-editor__pill";
        let text = document.createElement("span");
        text.className = "qp-label-editor__pill-text";
        text.innerText = tag;
        let remove = document.createElement("button");
        remove.type = "button";
        remove.className = "qp-label-editor__remove";
        remove.setAttribute("aria-label", "Remove label " + tag);
        remove.title = "Remove";
        remove.innerText = "×";
        remove.addEventListener("click", function () {
          tags.splice(idx, 1);
          renderPills();
          renderSuggestions();
        });
        pill.appendChild(text);
        pill.appendChild(remove);
        pillsWrap.appendChild(pill);
      });
    }

    let suggestionsLabel = document.createElement("p");
    suggestionsLabel.className = "qp-label-editor__suggest-title";
    suggestionsLabel.innerText = "Pick from existing";
    dialog.appendChild(suggestionsLabel);

    let suggestionsWrap = document.createElement("div");
    suggestionsWrap.className = "qp-label-editor__suggestions";
    dialog.appendChild(suggestionsWrap);

    let suggestionsEmpty = document.createElement("p");
    suggestionsEmpty.className = "qp-label-editor__empty qp-label-editor__suggest-empty";
    suggestionsEmpty.innerText = "No other labels yet.";
    dialog.appendChild(suggestionsEmpty);

    function renderSuggestions() {
      suggestionsWrap.innerHTML = "";
      let onClipKeys = new Set(tags.map(function (t) { return t.toLowerCase(); }));
      let available = pool.filter(function (t) {
        return !onClipKeys.has(t.toLowerCase());
      });
      let hasAny = available.length > 0;
      suggestionsLabel.style.display = pool.length === 0 ? "none" : "";
      suggestionsEmpty.style.display = !hasAny && pool.length > 0 ? "" : "none";
      suggestionsWrap.style.display = hasAny ? "" : "none";
      available.forEach(function (tag) {
        let chip = document.createElement("button");
        chip.type = "button";
        chip.className = "qp-label-editor__suggest";
        chip.innerText = tag;
        chip.title = "Add label";
        chip.addEventListener("click", function () {
          tags.push(tag);
          renderPills();
          renderSuggestions();
        });
        suggestionsWrap.appendChild(chip);
      });
    }

    let inputRow = document.createElement("div");
    inputRow.className = "qp-label-editor__inputrow";
    let input = document.createElement("input");
    input.type = "text";
    input.className = "qp-label-editor__input";
    input.placeholder = "Add a label…";
    input.maxLength = 40;
    let addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "qp-confirm__btn qp-label-editor__add";
    addBtn.innerText = "Add";
    inputRow.appendChild(input);
    inputRow.appendChild(addBtn);
    dialog.appendChild(inputRow);

    function tryAdd() {
      let val = normalize(input.value);
      if (!val) return;
      let key = val.toLowerCase();
      if (tags.some(function (t) { return t.toLowerCase() === key; })) {
        input.value = "";
        return;
      }
      tags.push(val);
      input.value = "";
      renderPills();
      renderSuggestions();
      input.focus();
    }

    addBtn.addEventListener("click", tryAdd);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        tryAdd();
      }
    });

    let actions = document.createElement("div");
    actions.className = "qp-confirm__actions";
    let cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "qp-confirm__btn";
    cancel.innerText = "Cancel";
    let save = document.createElement("button");
    save.type = "button";
    save.className = "qp-confirm__btn qp-label-editor__save";
    save.innerText = "Save";
    actions.appendChild(cancel);
    actions.appendChild(save);
    dialog.appendChild(actions);

    document.body.appendChild(dialog);

    function cleanup() {
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    cancel.addEventListener("click", function () { dialog.close(); });
    save.addEventListener("click", function () {
      // Commit whatever's typed but not yet added.
      tryAdd();
      dialog.close();
      onSave(tags.slice());
    });
    dialog.addEventListener("close", cleanup);
    dialog.addEventListener("cancel", function (e) {
      e.preventDefault();
      dialog.close();
    });

    renderPills();
    renderSuggestions();

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      setTimeout(function () { input.focus(); }, 0);
    } else {
      cleanup();
    }
  }

  root.QPLabelEditor = { show: show };
})(typeof self !== "undefined" ? self : globalThis);
