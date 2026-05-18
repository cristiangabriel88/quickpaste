// Fuzzy / substring search and highlight. No deps. Attaches to globalThis.QPSearch.
//
// Matching strategy (in order):
//   1. Exact substring match (case-insensitive) → best score; ranges = each occurrence.
//   2. Per-token subsequence: every query token must appear in haystack with edit-distance ≤ 1.
// Score is higher for better matches; 0 means no match.

(function (root) {
  function lower(s) { return (s || "").toLowerCase(); }

  function clipHaystack(clip) {
    if (!clip) return "";
    let parts = [];
    if (clip.kind === "image") {
      if (clip.src) parts.push(clip.src);
    } else if (Array.isArray(clip.text)) {
      parts.push(clip.text.join(" "));
    }
    if (clip.url) parts.push(clip.url);
    if (Array.isArray(clip.tags) && clip.tags.length) parts.push(clip.tags.join(" "));
    return parts.join(" ");
  }

  // Damerau-Levenshtein (capped). Returns -1 if distance > maxDist.
  function editDistance(a, b, maxDist) {
    let la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maxDist) return -1;
    let prev = new Array(lb + 1);
    let curr = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      curr[0] = i;
      let rowMin = curr[0];
      for (let j = 1; j <= lb; j++) {
        let cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,
          prev[j] + 1,
          prev[j - 1] + cost
        );
        if (i > 1 && j > 1 &&
            a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
            a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
          curr[j] = Math.min(curr[j], prev[j - 1] - 1 + cost + 1);
        }
        if (curr[j] < rowMin) rowMin = curr[j];
      }
      if (rowMin > maxDist) return -1;
      let tmp = prev; prev = curr; curr = tmp;
    }
    let d = prev[lb];
    return d > maxDist ? -1 : d;
  }

  function tokenize(s) {
    return s.split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  function findSubstringRanges(haystackLower, needleLower) {
    let ranges = [];
    if (!needleLower) return ranges;
    let i = 0;
    while (true) {
      let idx = haystackLower.indexOf(needleLower, i);
      if (idx === -1) break;
      ranges.push([idx, idx + needleLower.length]);
      i = idx + needleLower.length;
    }
    return ranges;
  }

  function tokenFuzzyMatches(haystackTokens, needleToken) {
    let nl = needleToken.length;
    if (nl === 0) return true;
    let maxDist = nl <= 3 ? 0 : 1;
    for (let t of haystackTokens) {
      if (maxDist === 0) {
        if (t.indexOf(needleToken) !== -1) return true;
      } else {
        if (t.indexOf(needleToken) !== -1) return true;
        // Check small windows of the token for typo-tolerant match
        let windowLen = nl;
        if (t.length >= windowLen) {
          for (let i = 0; i + windowLen <= t.length; i++) {
            let slice = t.substr(i, windowLen);
            if (editDistance(slice, needleToken, maxDist) !== -1) return true;
          }
        }
        // Also try the whole token if lengths are close
        if (Math.abs(t.length - nl) <= maxDist) {
          if (editDistance(t, needleToken, maxDist) !== -1) return true;
        }
      }
    }
    return false;
  }

  // Returns { score, ranges } where score > 0 indicates a match.
  // ranges are character offsets into the haystack for substring matches only;
  // for fuzzy matches, ranges may be empty (highlight falls back to substring spans).
  function match(query, clipOrText) {
    let raw = (query || "").trim();
    if (!raw) return { score: 0, ranges: [] };

    let haystack = typeof clipOrText === "string"
      ? clipOrText
      : clipHaystack(clipOrText);
    let hLower = lower(haystack);
    let qLower = lower(raw);

    // Tier 1: exact substring
    let subRanges = findSubstringRanges(hLower, qLower);
    if (subRanges.length > 0) {
      return { score: 100 + subRanges.length, ranges: subRanges };
    }

    // Tier 2: token-wise fuzzy
    let qTokens = tokenize(qLower);
    let hTokens = tokenize(hLower);
    if (qTokens.length === 0) return { score: 0, ranges: [] };
    let matched = 0;
    for (let qt of qTokens) {
      if (tokenFuzzyMatches(hTokens, qt)) matched++;
      else return { score: 0, ranges: [] };
    }
    let perTokenRanges = [];
    for (let qt of qTokens) {
      let r = findSubstringRanges(hLower, qt);
      for (let rr of r) perTokenRanges.push(rr);
    }
    return { score: 40 + matched, ranges: perTokenRanges };
  }

  // Builds a DocumentFragment with <mark> spans around matched substrings.
  // For each query token, every case-insensitive occurrence is highlighted.
  function highlight(text, query) {
    let frag = document.createDocumentFragment();
    let raw = (text == null ? "" : String(text));
    let q = (query || "").trim();
    if (!q) {
      frag.appendChild(document.createTextNode(raw));
      return frag;
    }
    let tokens = tokenize(lower(q));
    if (q.length > 1) tokens.unshift(lower(q));

    let lowerText = lower(raw);
    let ranges = [];
    for (let tok of tokens) {
      if (!tok) continue;
      let r = findSubstringRanges(lowerText, tok);
      for (let rr of r) ranges.push(rr);
    }
    if (ranges.length === 0) {
      frag.appendChild(document.createTextNode(raw));
      return frag;
    }
    ranges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    let merged = [ranges[0].slice()];
    for (let i = 1; i < ranges.length; i++) {
      let last = merged[merged.length - 1];
      let cur = ranges[i];
      if (cur[0] <= last[1]) {
        if (cur[1] > last[1]) last[1] = cur[1];
      } else {
        merged.push(cur.slice());
      }
    }

    let cursor = 0;
    for (let r of merged) {
      if (cursor < r[0]) frag.appendChild(document.createTextNode(raw.substring(cursor, r[0])));
      let mark = document.createElement("mark");
      mark.className = "qp-mark";
      mark.appendChild(document.createTextNode(raw.substring(r[0], r[1])));
      frag.appendChild(mark);
      cursor = r[1];
    }
    if (cursor < raw.length) frag.appendChild(document.createTextNode(raw.substring(cursor)));
    return frag;
  }

  root.QPSearch = {
    match: match,
    highlight: highlight,
    clipHaystack: clipHaystack,
  };
})(typeof self !== "undefined" ? self : globalThis);
