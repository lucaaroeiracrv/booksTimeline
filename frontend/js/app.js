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
const COVER_CACHE_KEY = "booksTimeline.coverCache.v11";

// ── Small helpers ─────────────────────────────────────────────────────────────

function fallbackCover(title) {
  const safeTitle = String(title || "Livro").replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" role="img" aria-label="Capa temporaria de ${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d2b3f"/>
          <stop offset="100%" stop-color="#2c415e"/>
        </linearGradient>
      </defs>
      <rect width="300" height="450" rx="20" fill="url(#bg)"/>
      <rect x="22" y="22" width="256" height="406" rx="14" fill="none" stroke="#d9bf8a" stroke-opacity="0.55"/>
      <text x="150" y="200" text-anchor="middle" font-size="24" font-family="Nunito, sans-serif" fill="#e9e3d7" font-weight="800">Books Timeline</text>
      <text x="150" y="250" text-anchor="middle" font-size="18" font-family="Nunito, sans-serif" fill="#d9bf8a">Capa indisponivel</text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function hydrateCovers() {
  // Static mode: catalog is the single source of truth for covers.
  const stamped = {};

  for (const book of booksData) {
    if (!book.cover || typeof book.cover !== "string") {
      book.cover = fallbackCover(book.title);
    }

    stamped[book.id] = book.cover;
  }

  try {
    localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(stamped));
  } catch {
    // Ignore storage failures in static mode.
  }
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
  const imageSrc = book.cover || fallbackCover(book.title);
  const imageMarkup = imageSrc
    ? `<img src="${imageSrc}" alt="Capa de ${book.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackCover(book.title)}'"/>`
    : "";

  return `
    ${imageMarkup}
    <div class="c-info">
      <strong>${book.title}</strong>
      <span class="meta">${book.author}</span>
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
  els.candidateCard.setAttribute("draggable", "false");
}

function makeTimelineCard(book, opts = {}) {
  const cardClass = opts.cardClass || "";
  const yearClass = opts.yearClass || "";
  const div = document.createElement("div");
  div.className = `tl-card ${cardClass}`.trim();
  const imageSrc = book.cover || fallbackCover(book.title);
  const imageMarkup = imageSrc
    ? `<img src="${imageSrc}" alt="Capa de ${book.title}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallbackCover(book.title)}'"/>`
    : "";

  div.innerHTML = `
    ${imageMarkup}
    <div class="tl-info">
      <span class="tl-title">${book.title}</span>
      <span class="tl-author">${book.author}</span>
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
  const isInitialLayout = books.length === 1
    && opts.flashAt == null
    && opts.revealAt == null
    && opts.ghostBook == null;

  const scrollWrap = els.timeline.closest(".timeline-scroll");
  if (scrollWrap) {
    scrollWrap.classList.toggle("timeline-scroll--initial", isInitialLayout);
  }
  els.timeline.classList.toggle("timeline--initial", isInitialLayout);
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
      const centerTimelineViewport = () => {
        const wrap = els.timeline.closest(".timeline-scroll");
        if (!wrap) return;

        const left = Math.max(0, Math.round((els.timeline.scrollWidth - wrap.clientWidth) / 2));
        wrap.scrollTo({ left, behavior: "smooth" });
      };

      if (isInitialLayout) {
        centerTimelineViewport();
        return;
      }

      const target = opts.ghostAt != null
        ? els.timeline.querySelector(".tl-card--wrong")
        : opts.flashAt != null
          ? els.timeline.querySelectorAll(".tl-card")[opts.flashAt]
          : null;
      
      if (target) {
        target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      } else {
        centerTimelineViewport();
      }
    }, 50);
  });
}

// ── Game flow ─────────────────────────────────────────────────────────────────
async function handlePlace(slotIndex) {
  if (isAnimating) return;
  isAnimating = true;

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
  const drag = {
    pointerId: null,
    activeSlotEl: null,
    proxyEl: null,
    offsetX: 0,
    offsetY: 0,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    rafId: 0,
    active: false
  };

  function clearSlotPreview() {
    els.timeline.classList.remove("is-pointer-drag", "has-drop-target");
    els.timeline.querySelectorAll(".tl-slot")
      .forEach(slot => slot.classList.remove("drag-over", "drag-near", "drag-active"));
    els.timeline.querySelectorAll(".tl-card")
      .forEach(card => card.classList.remove("tl-card--push-right"));
    drag.activeSlotEl = null;
  }

  function clearActiveSlot() {
    els.timeline.classList.remove("has-drop-target");
    els.timeline.querySelectorAll(".tl-slot")
      .forEach(slot => slot.classList.remove("drag-over", "drag-near"));
    els.timeline.querySelectorAll(".tl-card")
      .forEach(card => card.classList.remove("tl-card--push-right"));
    drag.activeSlotEl = null;
  }

  function stopProxyAnimation() {
    if (drag.rafId) {
      cancelAnimationFrame(drag.rafId);
      drag.rafId = 0;
    }
  }

  function removeProxy() {
    stopProxyAnimation();
    if (drag.proxyEl) {
      drag.proxyEl.remove();
      drag.proxyEl = null;
    }
  }

  function findClosestSlot(clientX) {
    const slots = Array.from(els.timeline.querySelectorAll(".tl-slot"));
    if (!slots.length) return null;

    let closest = slots[0];
    let minDistance = Number.POSITIVE_INFINITY;

    for (const slot of slots) {
      const rect = slot.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(center - clientX);
      if (distance < minDistance) {
        minDistance = distance;
        closest = slot;
      }
    }

    return closest;
  }

  function previewGap(slotIndex) {
    els.timeline.querySelectorAll(".tl-card").forEach((card, index) => {
      card.classList.toggle("tl-card--push-right", index >= slotIndex);
    });
  }

  function setActiveSlot(slotEl) {
    if (!slotEl || drag.activeSlotEl === slotEl) return;

    clearActiveSlot();

    slotEl.classList.add("drag-over");
    drag.activeSlotEl = slotEl;
    els.timeline.classList.add("has-drop-target");
    previewGap(Number(slotEl.dataset.index));
  }

  function autoScrollTimeline(clientX) {
    const wrap = els.timeline.closest(".timeline-scroll");
    if (!wrap) return;

    const bounds = wrap.getBoundingClientRect();
    const edge = 90;

    if (clientX > bounds.right - edge) {
      wrap.scrollBy({ left: 18, behavior: "auto" });
    } else if (clientX < bounds.left + edge) {
      wrap.scrollBy({ left: -18, behavior: "auto" });
    }
  }

  function startProxyAnimation() {
    stopProxyAnimation();

    const tick = () => {
      if (!drag.proxyEl) return;

      drag.currentX += (drag.targetX - drag.currentX) * 0.24;
      drag.currentY += (drag.targetY - drag.currentY) * 0.24;

      drag.proxyEl.style.transform = `translate(${drag.currentX}px, ${drag.currentY}px) rotate(1.3deg) scale(1.02)`;
      drag.rafId = requestAnimationFrame(tick);
    };

    drag.rafId = requestAnimationFrame(tick);
  }

  function animateProxyTo(x, y, { scale = 1, rotate = 0, duration = 220 } = {}) {
    if (!drag.proxyEl) return Promise.resolve();

    stopProxyAnimation();
    drag.proxyEl.style.transition = `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${duration}ms ease`;
    drag.proxyEl.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;

    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };

      drag.proxyEl.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, duration + 40);
    });
  }

  function finishPointerDrag() {
    els.candidateCard.classList.remove("dragging", "dragging-source");
    drag.active = false;
    removeProxy();
    clearSlotPreview();
    if (drag.pointerId != null && els.candidateCard.hasPointerCapture(drag.pointerId)) {
      els.candidateCard.releasePointerCapture(drag.pointerId);
    }
    drag.pointerId = null;
  }

  function onPointerMove(event) {
    if (!drag.active || drag.pointerId == null || event.pointerId !== drag.pointerId) return;

    event.preventDefault();

    drag.targetX = event.clientX - drag.offsetX;
    drag.targetY = event.clientY - drag.offsetY;

    autoScrollTimeline(event.clientX);

    const timelineBounds = els.timeline.getBoundingClientRect();
    const nearTimelineY = event.clientY >= timelineBounds.top - 80
      && event.clientY <= timelineBounds.bottom + 80;

    if (!nearTimelineY) {
      clearActiveSlot();
      return;
    }

    const slot = findClosestSlot(event.clientX);
    if (slot) setActiveSlot(slot);
  }

  async function onPointerUp(event) {
    if (!drag.active || drag.pointerId == null || event.pointerId !== drag.pointerId) return;

    const slotIndex = drag.activeSlotEl ? Number(drag.activeSlotEl.dataset.index) : null;

    if (drag.proxyEl && drag.activeSlotEl && Number.isInteger(slotIndex)) {
      const slotRect = drag.activeSlotEl.getBoundingClientRect();
      const proxyRect = drag.proxyEl.getBoundingClientRect();
      const snapX = slotRect.left + (slotRect.width - proxyRect.width) / 2;
      const snapY = slotRect.top + 8;
      await animateProxyTo(snapX, snapY, { scale: 0.98, rotate: 0.2, duration: 180 });
    } else if (drag.proxyEl) {
      const srcRect = els.candidateCard.getBoundingClientRect();
      await animateProxyTo(srcRect.left, srcRect.top, { scale: 1, rotate: 0, duration: 150 });
    }

    finishPointerDrag();

    if (!isAnimating && Number.isInteger(slotIndex) && engine.getState().candidateBook) {
      handlePlace(slotIndex);
    }
  }

  els.candidateCard.addEventListener("pointerdown", event => {
    if (event.button !== 0 || isAnimating || !engine.getState().candidateBook) return;

    event.preventDefault();
    drag.active = true;
    drag.pointerId = event.pointerId;
    els.candidateCard.setPointerCapture(event.pointerId);

    const sourceRect = els.candidateCard.getBoundingClientRect();
    drag.offsetX = event.clientX - sourceRect.left;
    drag.offsetY = event.clientY - sourceRect.top;

    drag.targetX = sourceRect.left;
    drag.targetY = sourceRect.top;
    drag.currentX = drag.targetX;
    drag.currentY = drag.targetY;

    const proxy = els.candidateCard.cloneNode(true);
    proxy.removeAttribute("id");
    proxy.classList.add("drag-proxy");
    proxy.style.width = `${sourceRect.width}px`;
    proxy.style.opacity = "1";
    proxy.style.transform = `translate(${drag.currentX}px, ${drag.currentY}px)`;
    document.body.appendChild(proxy);
    drag.proxyEl = proxy;

    els.candidateCard.classList.add("dragging", "dragging-source");
    els.timeline.classList.add("is-pointer-drag");
    els.timeline.querySelectorAll(".tl-slot")
      .forEach(slot => slot.classList.add("drag-active"));

    startProxyAnimation();
  });

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
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
  hydrateCovers();
}

init();
