import { Router } from "express";

const cache = new Map();

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreDoc(title, author, year, doc) {
  const wantedTitle = normalizeText(title);
  const wantedAuthor = normalizeText(author);
  const docTitle = normalizeText(doc.title || "");
  const docAuthor = normalizeText((doc.author_name && doc.author_name[0]) || "");

  let score = 0;

  if (docTitle === wantedTitle) score += 80;
  else if (docTitle.includes(wantedTitle) || wantedTitle.includes(docTitle)) score += 40;

  if (docAuthor === wantedAuthor) score += 45;
  else if (docAuthor.includes(wantedAuthor) || wantedAuthor.includes(docAuthor)) score += 20;

  if (Number.isFinite(year) && Number.isFinite(doc.first_publish_year)) {
    const diff = Math.abs(doc.first_publish_year - year);
    if (diff <= 1) score += 30;
    else if (diff <= 5) score += 15;
  }

  if (doc.cover_edition_key || doc.cover_i) score += 15;

  return score;
}

async function fetchWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function createCoversRouter() {
  const router = Router();

  router.get("/resolve", async (req, res) => {
    const title = String(req.query.title || "").trim();
    const author = String(req.query.author || "").trim();
    const year = Number(req.query.year);

    if (!title || !author) {
      return res.status(400).json({ error: "title and author are required" });
    }

    const cacheKey = `${title}|${author}|${Number.isFinite(year) ? year : ""}`;
    if (cache.has(cacheKey)) {
      return res.json({ cover: cache.get(cacheKey), source: "cache" });
    }

    try {
      const params = new URLSearchParams({
        title,
        author,
        limit: "25"
      });

      const response = await fetchWithTimeout(`https://openlibrary.org/search.json?${params.toString()}`);
      if (!response.ok) {
        return res.status(502).json({ error: "cover lookup failed" });
      }

      const payload = await response.json();
      const docs = Array.isArray(payload.docs) ? payload.docs : [];

      if (!docs.length) {
        cache.set(cacheKey, null);
        return res.json({ cover: null, source: "lookup" });
      }

      const ranked = docs
        .map(doc => ({ doc, score: scoreDoc(title, author, year, doc) }))
        .sort((a, b) => b.score - a.score);

      const bestMatch = ranked[0];
      const best = bestMatch?.doc;
      let cover = null;

      if ((bestMatch?.score || 0) < 70) {
        cache.set(cacheKey, null);
        return res.json({ cover: null, source: "lookup" });
      }

      if (best?.cover_edition_key) {
        cover = `https://covers.openlibrary.org/b/olid/${best.cover_edition_key}-L.jpg`;
      } else if (best?.cover_i) {
        cover = `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`;
      }

      cache.set(cacheKey, cover);
      return res.json({ cover, source: "lookup" });
    } catch {
      return res.status(502).json({ error: "cover lookup unavailable" });
    }
  });

  return router;
}
