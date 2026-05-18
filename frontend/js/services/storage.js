const RANKING_KEY = "books-timeline-ranking";
const THEME_KEY = "books-timeline-theme";

export function getRanking() {
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    if (!raw) {
      return [];
    }

    const ranking = JSON.parse(raw);
    if (!Array.isArray(ranking)) {
      return [];
    }

    return ranking;
  } catch {
    return [];
  }
}

export function saveScore(entry) {
  const ranking = getRanking();
  ranking.push(entry);
  ranking.sort((a, b) => b.score - a.score || b.maxStreak - a.maxStreak);
  const topTen = ranking.slice(0, 10);
  localStorage.setItem(RANKING_KEY, JSON.stringify(topTen));
  return topTen;
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
