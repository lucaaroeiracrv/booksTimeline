import { Router } from "express";
import { booksData } from "../../../frontend/js/data/booksData.js";

function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeKey(title, author) {
  return `${normalizeText(title)}|${normalizeText(author)}`;
}

const catalogById = new Map();
const catalogByKey = new Map();

for (const book of booksData) {
  if (book?.id) catalogById.set(String(book.id), book);

  if (book?.title && book?.author) {
    catalogByKey.set(makeKey(book.title, book.author), book);
  }

  if (book?.searchTitle && book?.author) {
    catalogByKey.set(makeKey(book.searchTitle, book.author), book);
  }
}

export function createCoversRouter() {
  const router = Router();

  router.get("/resolve", (req, res) => {
    const id = String(req.query.id || "").trim();
    const title = String(req.query.title || "").trim();
    const searchTitle = String(req.query.searchTitle || "").trim();
    const author = String(req.query.author || "").trim();

    let book = null;

    if (id && catalogById.has(id)) {
      book = catalogById.get(id);
    }

    if (!book && title && author) {
      book = catalogByKey.get(makeKey(title, author)) || null;
    }

    if (!book && searchTitle && author) {
      book = catalogByKey.get(makeKey(searchTitle, author)) || null;
    }

    if (!book) {
      return res.json({ cover: null, source: "catalog" });
    }

    return res.json({
      cover: typeof book.cover === "string" ? book.cover : null,
      source: "catalog"
    });
  });

  return router;
}
