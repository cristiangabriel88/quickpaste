// Tiny confirm dialog backed by <dialog>. Attaches to globalThis.QPConfirm.

(function (root) {
  function show(message, onConfirm, opts) {
    let options = opts || {};
    let dialog = document.createElement("dialog");
    dialog.className = "qp-confirm";

    let p = document.createElement("p");
    p.className = "qp-confirm__message";
    p.innerText = message;

    let actions = document.createElement("div");
    actions.className = "qp-confirm__actions";

    let cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "qp-confirm__btn";
    cancel.innerText = options.cancelLabel || "Cancel";

    let confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "qp-confirm__btn qp-confirm__btn--danger";
    confirm.innerText = options.confirmLabel || "Delete";

    actions.appendChild(cancel);
    actions.appendChild(confirm);
    dialog.appendChild(p);
    dialog.appendChild(actions);
    document.body.appendChild(dialog);

    function cleanup() {
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    cancel.addEventListener("click", function () {
      dialog.close();
    });
    confirm.addEventListener("click", function () {
      dialog.close();
      onConfirm();
    });
    dialog.addEventListener("close", cleanup);
    dialog.addEventListener("cancel", function (e) {
      // ESC: just close, don't confirm.
      e.preventDefault();
      dialog.close();
    });

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      if (window.confirm(message)) onConfirm();
      cleanup();
    }
  }

  root.QPConfirm = { show: show };
})(typeof self !== "undefined" ? self : globalThis);
