// Shared undo toast. Attaches to globalThis.QPToast.

(function (root) {
  let undoTimer = null;

  function show(message, onUndo) {
    dismiss(true);

    let toast = document.createElement("div");
    toast.id = "undoToast";
    toast.className = "undo-toast";

    let label = document.createElement("span");
    label.className = "undo-toast__label";
    label.innerText = message;

    let btn = document.createElement("button");
    btn.type = "button";
    btn.className = "undo-toast__btn";
    btn.innerText = "Undo";
    btn.addEventListener("click", function () {
      onUndo();
      dismiss();
    });

    toast.appendChild(label);
    toast.appendChild(btn);
    document.body.appendChild(toast);

    void toast.offsetWidth;
    toast.classList.add("is-visible");

    undoTimer = setTimeout(dismiss, 6000);
  }

  function dismiss(immediate) {
    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
    let toast = document.getElementById("undoToast");
    if (!toast) return;
    if (immediate) {
      toast.remove();
      return;
    }
    toast.classList.remove("is-visible");
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  root.QPToast = { show: show, dismiss: dismiss };
})(typeof self !== "undefined" ? self : globalThis);
