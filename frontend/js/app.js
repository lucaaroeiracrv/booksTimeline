import { booksData }                         from "./data/booksData.js";
import { GameEngine }                        from "./gameLogic.js";
import { getRanking, saveScore, getTheme, setTheme } from "./services/storage.js";
import { sounds }                            from "./services/audio.js";

// ── DOM refs ─────────────────────────────────────────────────────────────────
const els = {
  startScreen:    document.getElementById("start-screen"),
  gameScreen:     document.getElementById("game-screen"),
  gameOverScreen: document.getElementById("gameover-screen"),

  startBtn:    document.getElementById("start-btn"),
  restartBtn:  document.getElementById("restart-btn"),
  backHomeBtn: document.getElementById("back-home-btn"),
  themeToggle: document.getElementById("theme-toggle"),

  playerNameInput: document.getElementById("player-name"),
  hudPlayer: document.getElementById("hud-player"),
  hudScore:  document.getElementById("hud-score"),
  hudLives:  document.getElementById("hud-lives"),
  hudLevel:  document.getElementById("hud-level"),
  feedback:  document.getElementById("feedback"),

  candidateCard: document.getElementById("candidate-card"),
  timeline:      document.getElementById("timeline"),

  gameOverPlayer: document.getElementById("gameover-player"),
  gameOverScore:  document.getElementById("gameover-score"),
  gameOverStreak: document.getElementById("gameover-streak"),

  rankingList:         document.getElementById("ranking-list"),
  gameoverRankingList: document.getElementById("gameover-ranking-list")
};

// ── Runtime state ─────────────────────────────────────────────────────────────
const engine      = new GameEngine(booksData);
let   isAnimating = false;
const sleep       = ms => new Promise(r => setTimeout(r, ms));

// ── Small helpers ─────────────────────────────────────────────────────────────
function fallbackCover(title) {
  return `https://placehold.co/300x450/e8e0cf/2d221a?text=${encodeURIComponent(title.slice(0, 18))}`;
}

function heartsHtml(lives) {
  return `<span class="heart-full">${"♥".repeat(lives)}</span>`
       + `<span class="heart-empty">${"♡".repeat(3 - lives)}</span>`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  setTheme(theme);
}

function switchScreen(target) {
  [els.startScreen, els.gameScreen, els.gameOverScreen]
    .forEach(s => s.classList.toggle("active", s === target));
}

function showFeedback(msg, type) {
  els.feedback.textContent = msg;
  els.feedback.className   = "feedback " + type;
}

function updateHUD(state) {
  els.hudPlayer.textContent = state.playerName;
  els.hudScore.textContent  = String(state.score);
  els.hudLives.innerHTML    = heartsHtml(state.lives);
  els.hudLevel.textContent  = state.level.label;
}

function renderRanking(listEl) {
  const r = getRanking();
  listEl.innerHTML = r.length
    ? r.map(e => `<li>${e.name} — ${e.score} pts (seq ${e.maxStreak})</li>`).join("")
    : "<li>Nenhuma pontuacao ainda.</li>";
}

// ── Card builders ─────────────────────────────────────────────────────────────
function candidateCardHtml(book) {
  return `
    <img src="${book.cover}" alt="${book.title}"
         onerror="this.src='${fallbackCover(book.title)}'"/>
    <div class="c-info">
      <strong>${book.title}</strong>
      <span class="meta">${book.author}</span>
      <span class="year year--hidden">Data desconhecida</span>
    </div>`;
}

function setCandidateCard(book) {
  if (!book) {
    els.candidateCard.innerHTML = `
      <div class="c-info">
        <strong>Sem mais cartas disponiveis</strong>
      </div>`;
    els.candidateCard.setAttribute("draggable", "false");
    return;
  }

  els.candidateCard.innerHTML = candidateCardHtml(book);
  els.candidateCard.setAttribute("draggable", "true");
}

function makeTimelineCard(book, opts = {}) {
  const cardClass = opts.cardClass || "";
  const yearClass = opts.yearClass || "";
  const div = document.createElement("div");
  div.className = `tl-card ${cardClass}`.trim();
  div.innerHTML = `
    <img src="${book.cover}" alt="${book.title}"
         onerror="this.src='${fallbackCover(book.title)}'"/>
    <div class="tl-info">
      <span class="tl-title">${book.title}</span>
      <span class="tl-year ${yearClass}">${book.year}</span>
    </div>`;
  return div;
}

function makeSlot(index) {
  const btn = document.createElement("button");
  btn.className         = "tl-slot";
  btn.dataset.index     = String(index);
  btn.setAttribute("aria-label", `Inserir na posicao ${index + 1}`);
  btn.innerHTML         = `<span class="slot-icon">↓</span>`;

  // Always attach listeners, listeners check animation state at invocation time
  btn.addEventListener("click", () => {
    if (!isAnimating) handlePlace(index);
  });
  
  btn.addEventListener("dragover", e => {
    e.preventDefault();
    if (!isAnimating) btn.classList.add("drag-over");
  });
  
  btn.addEventListener("dragleave", () => {
    btn.classList.remove("drag-over");
  });
  
  btn.addEventListener("drop", e => {
    e.preventDefault();
    btn.classList.remove("drag-over");
    if (!isAnimating) handlePlace(index);
  });
  
  return btn;
}

// ── Timeline renderer ─────────────────────────────────────────────────────────
// opts: { ghostBook, ghostAt, correctAt, flashAt, revealAt, revealTone, suppressAt }
function renderTimeline(books, opts = {}) {
  els.timeline.innerHTML = "";

  for (let i = 0; i <= books.length; i++) {
    // — drop slot —
    const slot = makeSlot(i);
    if (opts.correctAt === i) slot.classList.add("correct-hint");
    els.timeline.appendChild(slot);

    // — ghost card (wrong placement) —
    if (opts.ghostBook && opts.ghostAt === i) {
      els.timeline.appendChild(makeTimelineCard(opts.ghostBook, {
        cardClass: "tl-card--wrong tl-card--reveal",
        yearClass: "tl-year--error"
      }));
    }

    // — confirmed card —
    if (i < books.length && opts.suppressAt !== i) {
      const classList = [];
      if (opts.flashAt === i) classList.push("tl-card--flash");
      if (opts.revealAt === i) classList.push("tl-card--reveal");

      const yearClass = opts.revealAt === i
        ? (opts.revealTone === "error" ? "tl-year--error" : "tl-year--ok")
        : "";

      els.timeline.appendChild(makeTimelineCard(books[i], {
        cardClass: classList.join(" "),
        yearClass
      }));
    }
  }

  // Scroll to the relevant card with better timing
  requestAnimationFrame(() => {
    setTimeout(() => {
      const target = opts.ghostAt != null
        ? els.timeline.querySelector(".tl-card--wrong")
        : opts.flashAt != null
          ? els.timeline.querySelectorAll(".tl-card")[opts.flashAt]
          : null;
      
      if (target) {
        target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        // Scroll to the end (latest card) by default
        const lastCard = els.timeline.querySelector(".tl-card:last-of-type");
        if (lastCard) {
          lastCard.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
        }
      }
    }, 50);
  });
}

// ── Game flow ─────────────────────────────────────────────────────────────────
async function handlePlace(slotIndex) {
  if (isAnimating) return;
  isAnimating = true;
  els.candidateCard.setAttribute("draggable", "false");

  try {
    const result = engine.evaluate(slotIndex);
    updateHUD(result.state);

    if (result.isCorrect) {
      sounds.success();
      showFeedback(`Correto! ${result.candidate.year} | +${result.pointsGained} pts`, "ok");

      renderTimeline(result.state.timeline, {
        flashAt: result.insertedSlot,
        revealAt: result.insertedSlot,
        revealTone: "ok"
      });
      await sleep(850);

      if (result.gameOver) {
        endGame(result.state);
        return;
      }

      renderTimeline(result.state.timeline);
      setCandidateCard(result.state.candidateBook);
      els.feedback.textContent    = "";
      els.candidateCard.setAttribute("draggable", "true");

    } else {
      sounds.error();
      showFeedback(`Errado! O ano era ${result.candidate.year}`, "error");

      // Phase 1: show attempted placement and target insertion slot.
      renderTimeline(engine.getState().timeline, {
        ghostBook: result.candidate,
        ghostAt:   result.placedSlot,
        correctAt: result.correctSlot,
        suppressAt: result.correctSlot
      });

      await sleep(800);

      // Phase 2: move card into its real chronological position.
      renderTimeline(result.state.timeline, {
        flashAt: result.correctSlot,
        revealAt: result.correctSlot,
        revealTone: "error"
      });

      await sleep(1300);

      if (result.gameOver) {
        endGame(result.state);
        return;
      }

      renderTimeline(result.state.timeline);
      setCandidateCard(result.state.candidateBook);
      els.feedback.textContent    = "";
      els.candidateCard.setAttribute("draggable", "true");
    }
  } finally {
    isAnimating = false;
  }
}

function startGame() {
  const name = els.playerNameInput.value.trim() || "Leitor";
  engine.reset(name);
  isAnimating = false;

  const state = engine.getState();
  updateHUD(state);
  setCandidateCard(state.candidateBook);
  els.feedback.textContent    = "";
  renderTimeline(state.timeline);
  switchScreen(els.gameScreen);
}

function endGame(state) {
  saveScore({
    name:      state.playerName,
    score:     state.score,
    maxStreak: state.maxStreak,
    date:      new Date().toISOString()
  });

  els.gameOverPlayer.textContent = state.playerName;
  els.gameOverScore.textContent  = String(state.score);
  els.gameOverStreak.textContent = String(state.maxStreak);

  renderRanking(els.rankingList);
  renderRanking(els.gameoverRankingList);
  switchScreen(els.gameOverScreen);
}

// ── Drag & Drop on candidate card ─────────────────────────────────────────────
function wireDrag() {
  let currentDragSlot = null;

  els.candidateCard.addEventListener("dragstart", e => {
    if (isAnimating || !engine.getState().candidateBook) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(els.candidateCard, 120, 170);
    
    els.candidateCard.classList.add("dragging");
    els.timeline.classList.add("is-dragging");
    
    els.timeline.querySelectorAll(".tl-slot")
      .forEach(s => {
        s.classList.add("drag-active");
        s.disabled = false;
      });
  });

  els.candidateCard.addEventListener("dragend", () => {
    els.candidateCard.classList.remove("dragging");
    els.timeline.classList.remove("is-dragging");
    
    els.timeline.querySelectorAll(".tl-slot")
      .forEach(s => {
        s.classList.remove("drag-active", "drag-over", "drag-near");
        s.disabled = isAnimating;
      });

    currentDragSlot = null;
  });

  // Enhance slot interaction with visual hierarchy
  const slots = els.timeline.querySelectorAll(".tl-slot");
  slots.forEach(slot => {
    slot.addEventListener("dragover", e => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!isAnimating) {
        // Remove from other slots
        slots.forEach(s => s.classList.remove("drag-over"));
        
        // Add to current slot with smooth transition
        slot.classList.add("drag-over");
        currentDragSlot = slot;
        
        e.dataTransfer.dropEffect = "move";
      }
    });

    slot.addEventListener("dragleave", e => {
      e.stopPropagation();
      if (e.target === slot) {
        slot.classList.remove("drag-over");
      }
    });

    slot.addEventListener("drop", e => {
      e.preventDefault();
      e.stopPropagation();
      
      slot.classList.remove("drag-over");
      
      if (!isAnimating && engine.getState().candidateBook) {
        const slotIndex = parseInt(slot.dataset.index, 10);
        handlePlace(slotIndex);
      }
    });
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
function init() {
  applyTheme(getTheme());
  renderRanking(els.rankingList);
  renderRanking(els.gameoverRankingList);

  els.startBtn.addEventListener("click",    () => { sounds.click(); startGame(); });
  els.restartBtn.addEventListener("click",  () => { sounds.click(); startGame(); });
  els.backHomeBtn.addEventListener("click", () => {
    sounds.click();
    renderRanking(els.rankingList);
    switchScreen(els.startScreen);
  });
  els.themeToggle.addEventListener("click", () => {
    sounds.click();
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  });

  wireDrag();
}

init();
