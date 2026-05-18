const LEVELS = [
  { id: "easy",   label: "Facil",   minScore: 0,   multiplier: 1   },
  { id: "medium", label: "Medio",   minScore: 80,  multiplier: 1.4 },
  { id: "hard",   label: "Dificil", minScore: 180, multiplier: 1.9 }
];

const RECENT_HISTORY_KEY = "booksTimeline.recentDeck.v1";
const RECENT_HISTORY_MAX = 20;

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) return 0;

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLevelByScore(score) {
  let cur = LEVELS[0];
  for (const lv of LEVELS) { if (score >= lv.minScore) cur = lv; }
  return cur;
}

export class GameEngine {
  constructor(books) {
    this.allBooks = books.slice();
    this.deck = [];
    this.recentHistory = this._loadRecentHistory();
    this.reset("Leitor");
  }

  _loadRecentHistory() {
    if (typeof localStorage === "undefined") return [];
    try {
      const data = JSON.parse(localStorage.getItem(RECENT_HISTORY_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  _saveRecentHistory() {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(this.recentHistory));
    } catch {
      // Ignore storage failures.
    }
  }

  _buildDeck() {
    const recentSet = new Set(this.recentHistory);
    const freshPool = this.allBooks.filter(book => !recentSet.has(book.id));

    // If fresh pool is too small, keep full uniform pool.
    const source = freshPool.length >= Math.floor(this.allBooks.length * 0.6)
      ? freshPool
      : this.allBooks;

    this.deck = shuffle(source);
  }

  _rememberSelection(bookId) {
    this.recentHistory = [bookId, ...this.recentHistory.filter(id => id !== bookId)]
      .slice(0, RECENT_HISTORY_MAX);
    this._saveRecentHistory();
  }

  reset(playerName) {
    this.playerName   = String(playerName || "Leitor").slice(0, 16);
    this.score        = 0;
    this.lives        = 3;
    this.errors       = 0;
    this.streak       = 0;
    this.maxStreak    = 0;
    this.usedIds      = new Set();
    this.currentLevel = getLevelByScore(0);
    this.deckFinished = false;
    this._buildDeck();

    const first        = this._pick(this.currentLevel.id);
    this.timeline      = [first];
    this.candidateBook = this._pick(this.currentLevel.id);

    if (!this.candidateBook) {
      this.deckFinished = true;
    }
  }

  _pick(_preferredLevel) {
    let chosen = null;

    while (this.deck.length && !chosen) {
      const next = this.deck.pop();
      if (!this.usedIds.has(next.id)) {
        chosen = next;
      }
    }

    if (!chosen) {
      const remaining = this.allBooks.filter(book => !this.usedIds.has(book.id));
      if (!remaining.length) {
        return null;
      }
      chosen = shuffle(remaining)[0];
    }

    this.usedIds.add(chosen.id);
    this._rememberSelection(chosen.id);
    return chosen;
  }

  // Returns true if slotIndex is a valid position for the given year
  _validSlot(slotIndex, year) {
    const left  = slotIndex > 0                    ? this.timeline[slotIndex - 1].year : -Infinity;
    const right = slotIndex < this.timeline.length ? this.timeline[slotIndex].year     :  Infinity;
    return left <= year && year <= right;
  }

  // First valid slot index (used for hint/feedback)
  findCorrectSlot() {
    const y = this.candidateBook.year;
    for (let i = 0; i <= this.timeline.length; i++) {
      if (this._validSlot(i, y)) return i;
    }
    return this.timeline.length;
  }

  getState() {
    return {
      playerName:    this.playerName,
      score:         this.score,
      lives:         this.lives,
      errors:        this.errors,
      streak:        this.streak,
      maxStreak:     this.maxStreak,
      level:         this.currentLevel,
      timeline:      this.timeline.slice(),
      candidateBook: this.candidateBook ? { ...this.candidateBook } : null,
      deckFinished:  this.deckFinished
    };
  }

  evaluate(slotIndex) {
    if (!this.candidateBook) {
      this.deckFinished = true;
      return {
        isCorrect: false,
        correctSlot: -1,
        placedSlot: -1,
        insertedSlot: -1,
        candidate: null,
        pointsGained: 0,
        gameOver: true,
        state: this.getState()
      };
    }

    const boundedSlot = Math.max(0, Math.min(slotIndex, this.timeline.length));
    const candidate   = { ...this.candidateBook };
    const isCorrect   = this._validSlot(boundedSlot, candidate.year);
    const correctSlot = this.findCorrectSlot();
    let   pointsGained = 0;
    let   insertedSlot = boundedSlot;

    if (isCorrect) {
      this.timeline.splice(boundedSlot, 0, candidate);
      this.streak    += 1;
      this.maxStreak  = Math.max(this.maxStreak, this.streak);
      const bonus     = Math.min(this.streak - 1, 5) * 2;
      pointsGained    = Math.round((10 + bonus) * this.currentLevel.multiplier);
      this.score     += pointsGained;
      this.currentLevel = getLevelByScore(this.score);
    } else {
      this.errors += 1;
      this.lives   = Math.max(0, 3 - this.errors);
      this.streak  = 0;

      insertedSlot = correctSlot;
      this.timeline.splice(correctSlot, 0, candidate);
    }

    let gameOver = this.lives <= 0;
    if (!gameOver) {
      this.candidateBook = this._pick(this.currentLevel.id);
      if (!this.candidateBook) {
        this.deckFinished = true;
        gameOver = true;
      }
    }

    return {
      isCorrect,
      correctSlot,
      placedSlot: boundedSlot,
      insertedSlot,
      candidate,
      pointsGained,
      gameOver,
      state: this.getState()
    };
  }
}
