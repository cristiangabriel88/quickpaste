// Export helpers — attaches to globalThis.QPExport.

(function (root) {
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function timestampSuffix() {
    let d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "-" +
           pad2(d.getHours()) + pad2(d.getMinutes());
  }

  function toJson(clips) {
    let payload = {
      app: "QuickPaste",
      v: 1,
      exportedAt: new Date().toISOString(),
      clips: Array.isArray(clips) ? clips : [],
    };
    return JSON.stringify(payload, null, 2);
  }

  function escapeMd(s) {
    return (s || "").replace(/\r\n/g, "\n");
  }

  function clipToMarkdown(clip) {
    let isImage = clip.kind === "image";
    let head = isImage
      ? "Image clip"
      : ((clip.text && clip.text[0]) ? clip.text[0].slice(0, 80) : "Clip");
    let lines = ["## " + escapeMd(head)];
    if (clip.pinned) lines.push("*(pinned)*");
    if (Array.isArray(clip.tags) && clip.tags.length) {
      lines.push("**Tags:** " + clip.tags.map(function (t) { return "`" + t + "`"; }).join(" "));
    }
    lines.push("");
    if (isImage) {
      lines.push("![](" + (clip.src || "") + ")");
    } else {
      let body = (clip.text || []).map(escapeMd).join("\n\n");
      lines.push(body);
    }
    lines.push("");
    let trailer = [];
    if (clip.url) trailer.push("[Source](" + clip.url + ")");
    if (clip.savedAt) trailer.push(new Date(clip.savedAt).toISOString());
    if (trailer.length) lines.push("— " + trailer.join(" · "));
    lines.push("");
    lines.push("---");
    return lines.join("\n");
  }

  function toMarkdown(clips) {
    let header = "# QuickPaste export\n\nExported " + new Date().toISOString() + " · " +
                 (clips || []).length + " clips\n\n---\n\n";
    let body = (clips || []).map(clipToMarkdown).join("\n\n");
    return header + body;
  }

  function download(content, mime, filename) {
    let blob = new Blob([content], { type: mime });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 250);
  }

  function downloadJson(clips) {
    download(toJson(clips), "application/json", "quickpaste-" + timestampSuffix() + ".json");
  }

  function downloadMarkdown(clips) {
    download(toMarkdown(clips), "text/markdown", "quickpaste-" + timestampSuffix() + ".md");
  }

  // Reads a File and returns the parsed `clips` array from a QuickPaste JSON export
  // (or accepts a raw array). Throws on invalid input.
  function parseImport(text) {
    let parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.clips)) return parsed.clips;
    throw new Error("Unrecognized import format");
  }

  root.QPExport = {
    toJson: toJson,
    toMarkdown: toMarkdown,
    downloadJson: downloadJson,
    downloadMarkdown: downloadMarkdown,
    parseImport: parseImport,
  };
})(typeof self !== "undefined" ? self : globalThis);
