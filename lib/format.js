// Tiny formatting helpers. Classic script — attaches to globalThis.QPFormat.

(function (root) {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  const MONTH_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function formatRelative(ts, now) {
    if (!ts || typeof ts !== "number") return "";
    let nowMs = typeof now === "number" ? now : Date.now();
    let diff = nowMs - ts;
    if (diff < 0) diff = 0;

    if (diff < 45 * 1000) return "Just now";
    if (diff < HOUR) {
      let m = Math.round(diff / MINUTE);
      return m + "m ago";
    }
    if (diff < DAY) {
      let h = Math.round(diff / HOUR);
      return h + "h ago";
    }
    if (diff < 2 * DAY) return "Yesterday";
    if (diff < WEEK) {
      let d = Math.round(diff / DAY);
      return d + "d ago";
    }

    let d = new Date(ts);
    let sameYear = new Date(nowMs).getFullYear() === d.getFullYear();
    let label = MONTH_SHORT[d.getMonth()] + " " + d.getDate();
    return sameYear ? label : label + ", " + d.getFullYear();
  }

  function formatAbsolute(ts) {
    if (!ts || typeof ts !== "number") return "";
    let d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function formatForCopy(clip, mode) {
    if (!clip) return "";
    let isImage = clip.kind === "image";
    let body = isImage
      ? (clip.src || "")
      : (clip.text || []).join("\n\n");
    let url = clip.url || "";
    let ts = clip.savedAt;

    switch (mode) {
      case "text-url":
        return url ? body + "\n\n— " + url : body;
      case "text-url-time": {
        let parts = [body];
        let trailer = [];
        if (url) trailer.push(url);
        if (ts) trailer.push(formatAbsolute(ts));
        if (trailer.length) parts.push("— " + trailer.join(" · "));
        return parts.join("\n\n");
      }
      case "markdown": {
        let mdBody = isImage
          ? "![](" + (clip.src || "") + ")"
          : body.split("\n").map(function (line) { return "> " + line; }).join("\n");
        let attribution = url ? "\n\n— [Source](" + url + ")" : "";
        return mdBody + attribution;
      }
      case "text":
      default:
        return body;
    }
  }

  root.QPFormat = {
    formatRelative: formatRelative,
    formatAbsolute: formatAbsolute,
    formatForCopy: formatForCopy,
  };
})(typeof self !== "undefined" ? self : globalThis);
