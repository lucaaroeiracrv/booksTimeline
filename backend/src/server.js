import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBooksRouter } from "./routes/books.js";
import { createCoversRouter } from "./routes/covers.js";
import { createScoresRouter } from "./routes/scores.js";

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, "../../frontend");

app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/books", createBooksRouter());
app.use("/api/covers", createCoversRouter());
app.use("/api/scores", createScoresRouter());

app.get("/", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Books Timeline API executando em http://localhost:${PORT}`);
});
