import { Router } from "express";
import { loadBooks } from "../data/books.js";

export function createBooksRouter() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(loadBooks());
  });

  return router;
}
