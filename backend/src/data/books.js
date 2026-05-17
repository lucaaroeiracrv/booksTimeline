import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const booksFile = path.resolve(__dirname, "../../../database/books.json");

export function loadBooks() {
  const raw = fs.readFileSync(booksFile, "utf8");
  return JSON.parse(raw);
}
