import { writeFile } from "node:fs/promises";
import { booksData } from "../../frontend/js/data/booksData.js";

const API_BASE = process.env.COVER_AUDIT_API_BASE || "http://localhost:3001";
const OUTPUT_FILE = process.env.COVER_AUDIT_OUT || "../../database/cover-audit-report.json";

async function auditBook(book) {
  const params = new URLSearchParams({
    title: book.title,
    searchTitle: book.searchTitle || "",
    author: book.author,
    year: String(book.year),
    id: book.id
  });

  const url = `${API_BASE}/api/covers/resolve?${params.toString()}`;

  try {
    const response = await fetch(url);
    const body = await response.json();

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      locked: Boolean(book.coverLocked),
      datasetCover: book.cover || null,
      source: body?.source || null,
      resolvedCover: body?.cover || null,
      status: body?.cover ? "ok" : "fallback-neutral"
    };
  } catch (error) {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      year: book.year,
      locked: Boolean(book.coverLocked),
      datasetCover: book.cover || null,
      source: null,
      resolvedCover: null,
      status: "resolver-error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const results = [];
  for (const book of booksData) {
    const result = await auditBook(book);
    results.push(result);
  }

  const summary = {
    total: results.length,
    ok: results.filter(r => r.status === "ok").length,
    fallbackNeutral: results.filter(r => r.status === "fallback-neutral").length,
    resolverError: results.filter(r => r.status === "resolver-error").length,
    bySource: {
      trusted: results.filter(r => r.source === "trusted").length,
      lookupExact: results.filter(r => r.source === "lookup-exact").length,
      lookup: results.filter(r => r.source === "lookup").length,
      cache: results.filter(r => r.source === "cache").length,
      null: results.filter(r => r.source == null).length
    }
  };

  const payload = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    summary,
    results
  };

  await writeFile(new URL(OUTPUT_FILE, import.meta.url), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
