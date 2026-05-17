import { Router } from "express";

export function createScoresRouter() {
  const router = Router();
  const ranking = [];

  router.get("/", (_req, res) => {
    res.json(ranking);
  });

  router.post("/", (req, res) => {
    const { name, score, maxStreak } = req.body || {};

    if (!name || Number.isNaN(Number(score))) {
      return res.status(400).json({ error: "Payload invalido." });
    }

    ranking.push({
      name: String(name).slice(0, 16),
      score: Number(score),
      maxStreak: Number(maxStreak || 0),
      createdAt: new Date().toISOString()
    });

    ranking.sort((a, b) => b.score - a.score || b.maxStreak - a.maxStreak);

    if (ranking.length > 20) {
      ranking.length = 20;
    }

    return res.status(201).json({ ok: true, ranking });
  });

  return router;
}
