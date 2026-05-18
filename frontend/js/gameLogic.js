const LEVELS = [
  { id: "easy",   label: "Facil",   minScore: 0,   multiplier: 1   },
  { id: "medium", label: "Medio",   minScore: 80,  multiplier: 1.4 },
  { id: "hard",   label: "Dificil", minScore: 180, multiplier: 1.9 }
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getLevelByScore(score) {
  let cur = LEVELS[0];
  for (const lv of LEVELS) { if (score >= lv.minScore) cur = lv; }
  return cur;
}

export class GameEngine {
  constructor(books) {
    this.allBooks = books.slice();
    this.reset("Leitor");
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

    const first        = this._pick(this.currentLevel.id);
    this.timeline      = [first];
    this.candidateBook = this._pick(this.currentLevel.id);

    if (!this.candidateBook) {
      this.deckFinished = true;
    }
  }

  _pick(preferredLevel) {
    const pool = this.allBooks.filter(b => !this.usedIds.has(b.id));
    if (!pool.length) {
      return null;
    }

    const lvPool  = pool.filter(b => b.difficulty === preferredLevel);
    const chosen  = randomItem(lvPool.length ? lvPool : pool);
    this.usedIds.add(chosen.id);
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
