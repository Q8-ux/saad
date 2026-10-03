"use strict";
(function (root) {
  const validId = value => typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value);
  const plain = (value, limit = 200) => typeof value === "string" ? value.trim().slice(0, limit) : "";
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = value => plain(value, 1000).toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/\s+/g, " ");
  function video(raw) {
    if (!raw || !validId(raw.videoId) || (raw.type && raw.type !== "video")) return null;
    const duration = Number(raw.lengthSeconds);
    return {
      videoId: raw.videoId, title: plain(raw.title) || "فيديو", originalTitle: plain(raw.originalTitle),
      author: plain(raw.author, 140), authorId: plain(raw.authorId, 80), topic: plain(raw.topic, 50),
      note: plain(raw.note, 400), description: plain(raw.description, 500), language: plain(raw.language, 20),
      lengthSeconds: Number.isFinite(duration) ? Math.max(0, Math.min(duration, 86400)) : 0,
      hasCaptions: raw.hasCaptions === true, curated: raw.curated === true
    };
  }
  function uniqueVideos(raw) {
    const seen = new Set();
    return (Array.isArray(raw) ? raw : []).map(video).filter(v => v && !seen.has(v.videoId) && seen.add(v.videoId));
  }
  function matches(v, query) {
    const terms = normalize(query).split(" ").filter(Boolean);
    const text = normalize([v.title, v.originalTitle, v.author, v.note, v.description].join(" "));
    return terms.every(term => text.includes(term));
  }
  function baseUrl(base) {
    const u = new URL(base);
    if (u.protocol !== "https:" || u.username || u.password || (u.pathname !== "/" && u.pathname !== "")) throw Error("invalid_endpoint");
    return u.origin;
  }
  function watchUrl(id) {
    if (!validId(id)) throw Error("invalid_video");
    return "https://www.youtube.com/watch?v=" + id;
  }
  function embedUrl(id, provider, base, start = 0) {
    if (!validId(id)) throw Error("invalid_video");
    const root = provider === "invidious" ? baseUrl(base) : "https://www.youtube-nocookie.com";
    const u = new URL(root + "/embed/" + id);
    u.searchParams.set("autoplay", "0");
    if (provider === "invidious") { u.searchParams.set("local", "1"); u.searchParams.set("quality", "dash"); }
    else { u.searchParams.set("rel", "0"); u.searchParams.set("playsinline", "1"); }
    const seconds = Number(start);
    if (Number.isFinite(seconds) && seconds > 0) u.searchParams.set("start", String(Math.floor(seconds)));
    return u.href;
  }
  function seconds(stamp) {
    const parts = stamp.replace(",", ".").split(":").map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some(n => !Number.isFinite(n) || n < 0)) return null;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  function captionText(text) {
    return text.replace(/<[^>]*>/g, "").replace(/&(amp|lt|gt|nbsp|quot|#39);/g, (_, key) => ({amp:"&",lt:"<",gt:">",nbsp:" ",quot:'"',"#39":"'"}[key])).trim();
  }
  function parseVtt(text) {
    if (typeof text !== "string" || text.length > 2000000 || !/^\uFEFF?WEBVTT(?:\s|$)/.test(text)) throw Error("invalid_captions");
    const cues = [];
    for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
      const lines = block.split("\n");
      const index = lines.findIndex(line => /^\s*(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}\s+-->/.test(line));
      if (index < 0) continue;
      const match = lines[index].match(/^\s*([\d:.,]+)\s+-->\s+([\d:.,]+)/);
      const start = seconds(match[1]), end = seconds(match[2]);
      const body = captionText(lines.slice(index + 1).join("\n"));
      if (start === null || end === null || end < start || !body) continue;
      cues.push({start, end, text: body});
      if (cues.length >= 15000) break;
    }
    return cues;
  }
  function duration(total) {
    const n = Math.max(0, Math.floor(Number(total) || 0));
    const h = Math.floor(n / 3600), m = Math.floor(n / 60) % 60, s = n % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s).padStart(2, "0");
  }
  async function request(base, path, params = {}, options = {}) {
    const controller = new AbortController();
    const external = options.signal;
    const abort = () => controller.abort();
    if (external?.aborted) abort(); else external?.addEventListener("abort", abort, {once: true});
    const timer = setTimeout(abort, options.timeout || 10000);
    try {
      if (!/^\/api\/v1\/(search|videos\/[A-Za-z0-9_-]{11}|captions\/[A-Za-z0-9_-]{11})$/.test(path)) throw Error("invalid_path");
      const u = new URL(baseUrl(base) + path);
      for (const [key, value] of Object.entries(params)) u.searchParams.set(key, String(value));
      const response = await (options.fetcher || fetch)(u.href, {signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer"});
      if (!response.ok) throw Error("source_unavailable");
      if (options.text) return await response.text();
      const data = await response.json();
      if (data?.error) throw Error("source_unavailable");
      return data;
    } finally {
      clearTimeout(timer);
      external?.removeEventListener("abort", abort);
    }
  }
  async function search(base, query, options = {}) {
    const q = plain(query, 160);
    if (!q) return [];
    const data = await request(base, "/api/v1/search", {q, type:"video", page:1}, options);
    if (!Array.isArray(data)) throw Error("invalid_results");
    return uniqueVideos(data).slice(0, 24);
  }
  const api = {validId, escape, normalize, video, uniqueVideos, matches, baseUrl, watchUrl, embedUrl, seconds, parseVtt, duration, request, search};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.NouraVideoCore = api;
})(typeof window !== "undefined" ? window : globalThis);
