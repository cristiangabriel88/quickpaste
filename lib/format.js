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

  root.QPFormat = {
    formatRelative: formatRelative,
    formatAbsolute: formatAbsolute,
  };
})(typeof self !== "undefined" ? self : globalThis);
