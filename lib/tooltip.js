// Custom tooltip system: replaces native title="" tooltips with a styled
// element appended to <body>. Faster (default ~80ms vs the browser's ~500ms),
// themed to match the app, and survives dynamically-added elements via a
// MutationObserver that moves `title` into `data-qp-tip` so the native
// tooltip never fires.
(function () {
    const SHOW_DELAY = 80;
    const HIDE_DELAY = 60;
    const EDGE_MARGIN = 8;
    const GAP = 8;

    const tip = document.createElement("div");
    tip.className = "qp-tooltip";
    tip.setAttribute("role", "tooltip");
    tip.setAttribute("aria-hidden", "true");
    const arrow = document.createElement("span");
    arrow.className = "qp-tooltip__arrow";
    tip.appendChild(arrow);
    const label = document.createElement("span");
    label.className = "qp-tooltip__label";
    tip.appendChild(label);

    let attached = false;
    let currentTarget = null;
    let showTimer = null;
    let hideTimer = null;

    function attachTip() {
        if (attached || !document.body) return;
        document.body.appendChild(tip);
        attached = true;
    }

    function transferTitle(el) {
        if (!el || el.nodeType !== 1 || !el.hasAttribute) return;
        if (!el.hasAttribute("title")) return;
        const t = el.getAttribute("title");
        // Skip elements that want native tooltips (e.g. iframes, system UI hooks).
        if (el.dataset && el.dataset.qpTipSkip === "true") return;
        if (t) el.dataset.qpTip = t;
        // Strip the native attribute so the browser never shows the slow,
        // unstyled default tooltip. Property reads still work via the override
        // installed below.
        el.removeAttribute("title");
    }

    // Mirror the `title` property onto `data-qp-tip` so existing code that
    // does `el.title = "..."` or reads `el.title` keeps behaving normally —
    // e.g. flashButton() captures the current label, swaps in "Copied!", and
    // restores it on a timer. Without this shim the native attribute is gone
    // and the restore writes an empty string.
    (function installTitleShim() {
        const proto = HTMLElement.prototype;
        let descriptor = Object.getOwnPropertyDescriptor(proto, "title");
        if (!descriptor) descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "title");
        if (!descriptor || !descriptor.configurable) return;
        Object.defineProperty(proto, "title", {
            configurable: true,
            enumerable: descriptor.enumerable,
            get: function () {
                return (this.dataset && this.dataset.qpTip) || "";
            },
            set: function (value) {
                const v = value == null ? "" : String(value);
                if (this.hasAttribute("title")) this.removeAttribute("title");
                if (v) {
                    this.dataset.qpTip = v;
                    if (currentTarget === this) label.textContent = v;
                } else {
                    if (this.dataset) delete this.dataset.qpTip;
                    if (currentTarget === this) hide();
                }
            },
        });
    })();

    function scanRoot(root) {
        if (!root || root.nodeType !== 1 && root.nodeType !== 9) return;
        if (root.nodeType === 1 && root.hasAttribute("title")) transferTitle(root);
        if (root.querySelectorAll) {
            root.querySelectorAll("[title]").forEach(transferTitle);
        }
    }

    function show(target) {
        const text = target && target.dataset && target.dataset.qpTip;
        if (!text) return;
        attachTip();
        label.textContent = text;
        currentTarget = target;
        // Reset so measurements are correct.
        tip.classList.remove("is-flipped");
        tip.style.left = "0px";
        tip.style.top = "0px";
        tip.classList.add("is-visible");
        tip.setAttribute("aria-hidden", "false");
        position(target);
    }

    function position(target) {
        const r = target.getBoundingClientRect();
        const tr = tip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let left = r.left + r.width / 2 - tr.width / 2;
        let top = r.bottom + GAP;
        let flipped = false;

        if (top + tr.height > vh - EDGE_MARGIN) {
            top = r.top - tr.height - GAP;
            flipped = true;
        }
        if (left + tr.width > vw - EDGE_MARGIN) left = vw - EDGE_MARGIN - tr.width;
        if (left < EDGE_MARGIN) left = EDGE_MARGIN;

        tip.style.left = left + "px";
        tip.style.top = top + "px";
        tip.classList.toggle("is-flipped", flipped);

        const targetCenter = r.left + r.width / 2;
        let arrowLeft = targetCenter - left;
        const min = 10;
        const max = tr.width - 10;
        if (arrowLeft < min) arrowLeft = min;
        if (arrowLeft > max) arrowLeft = max;
        arrow.style.left = arrowLeft + "px";
    }

    function hide() {
        tip.classList.remove("is-visible");
        tip.setAttribute("aria-hidden", "true");
        currentTarget = null;
    }

    function findTarget(node) {
        if (!node || node.nodeType !== 1) return null;
        return node.closest("[data-qp-tip]");
    }

    document.addEventListener("pointerover", function (e) {
        const target = findTarget(e.target);
        if (!target) return;
        if (target === currentTarget) return;
        clearTimeout(hideTimer);
        clearTimeout(showTimer);
        showTimer = setTimeout(function () { show(target); }, SHOW_DELAY);
    });

    document.addEventListener("pointerout", function (e) {
        const target = findTarget(e.target);
        if (!target) return;
        if (e.relatedTarget && target.contains(e.relatedTarget)) return;
        clearTimeout(showTimer);
        hideTimer = setTimeout(hide, HIDE_DELAY);
    });

    document.addEventListener("focusin", function (e) {
        const target = findTarget(e.target);
        if (!target) return;
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        show(target);
    });

    document.addEventListener("focusout", function (e) {
        const target = findTarget(e.target);
        if (!target) return;
        hide();
    });

    document.addEventListener("click", function () { hide(); }, true);
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") hide();
    });
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide, { passive: true });

    function init() {
        attachTip();
        scanRoot(document.body);
        const obs = new MutationObserver(function (records) {
            for (let i = 0; i < records.length; i++) {
                const r = records[i];
                if (r.type === "attributes" && r.attributeName === "title") {
                    transferTitle(r.target);
                    if (r.target === currentTarget) {
                        const t = r.target.dataset.qpTip;
                        if (t) label.textContent = t;
                    }
                } else if (r.type === "childList") {
                    for (let j = 0; j < r.addedNodes.length; j++) scanRoot(r.addedNodes[j]);
                }
            }
        });
        obs.observe(document.body, {
            attributes: true,
            attributeFilter: ["title"],
            childList: true,
            subtree: true,
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
