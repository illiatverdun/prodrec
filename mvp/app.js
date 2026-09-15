/* prod.rec MVP · Calendar page · Empty state (Figma 93:1203).
   Month navigation, press-and-drag day selection (ported from timetracker.jsx),
   extra actions menu, number pop-in for every changing number. */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // ?today=YYYY-MM-DD pins "today" for design QA against Figma.
  const pinned = new URLSearchParams(location.search).get("today");
  const today = pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? new Date(`${pinned}T00:00:00`) : new Date();
  today.setHours(0, 0, 0, 0);

  const state = {
    view: new Date(today.getFullYear(), today.getMonth(), 1),
    // { "YYYY-MM-DD": [{ projectId, hours }] } — empty until projects exist (D-009).
    entries: {},
    taxRate: 0,
  };

  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isCurrentMonth = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();

  function workdaysIn(d) {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    let n = 0;
    for (let i = 1; i <= last; i++) {
      const w = new Date(d.getFullYear(), d.getMonth(), i).getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  }

  function monthStats(d) {
    const prefix = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    let days = 0, hours = 0;
    Object.entries(state.entries).forEach(([key, list]) => {
      if (!key.startsWith(prefix)) return;
      const h = list.reduce((s, e) => s + e.hours, 0);
      if (h > 0) { days++; hours += h; }
    });
    const gross = 0; // rates arrive with projects (D-009)
    const tax = gross * state.taxRate / 100;
    return { days, hours, gross, tax, net: gross - tax };
  }

  /* ── transitions.dev · number-pop-in (02-number-pop-in.md) ──
     Split into characters, stagger the last two, restart the animation.
     First render sets the value without motion. */
  function setNumber(el, value, animate) {
    const text = String(value);
    if (el.dataset.value === text) return;
    const firstPaint = el.dataset.value === undefined;
    el.dataset.value = text;
    el.classList.remove("is-animating");
    const chars = [...text];
    el.replaceChildren(...chars.map((ch, i) => {
      const span = document.createElement("span");
      span.className = "t-digit";
      span.textContent = ch;
      const fromEnd = chars.length - 1 - i;
      if (chars.length > 1 && fromEnd < 2) span.dataset.stagger = String(chars.length > 2 ? 2 - fromEnd : 1 - fromEnd);
      return span;
    }));
    if (firstPaint || !animate || reduced.matches) return;
    void el.offsetWidth;
    el.classList.add("is-animating");
  }

  /* ── transitions.dev · text-states-swap (04-text-states-swap.md) ── */
  function swapText(el, next, animate) {
    if (el.textContent === next) return;
    if (!animate || reduced.matches || !el.textContent) { el.textContent = next; return; }
    const raw = getComputedStyle(el).getPropertyValue("--text-swap-dur");
    const dur = parseFloat(raw) * (/\ds$/.test(raw.trim()) ? 1000 : 1) || 150;
    clearTimeout(el._swapTimer);
    el.classList.add("is-exit");
    el._swapTimer = setTimeout(() => {
      el.textContent = next;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
    }, dur);
  }

  /* ───── Header ───── */

  function renderHeader(dir, animate) {
    const v = state.view;
    const icon = $("#cal-icon");
    const current = isCurrentMonth(v);
    const label = MONTHS_SHORT[v.getMonth()];
    const day = current ? today.getDate() : 1;
    icon.dataset.dir = dir < 0 ? "prev" : "next";
    icon.dataset.current = String(current);
    icon.setAttribute("aria-label", `${label} ${day}`);
    swapText($("#cal-band"), label, animate);
    setNumber($("#cal-day"), day, animate);

    swapText($("#month-name"), MONTHS_LONG[v.getMonth()] + (v.getFullYear() !== today.getFullYear() ? ` ${v.getFullYear()}` : ""), animate);
    const s = monthStats(v);
    setNumber($("#meta-logged"), s.days, animate);
    setNumber($("#meta-workdays"), workdaysIn(v), animate);
    setNumber($("#meta-hours"), s.hours, animate);
  }

  function renderBilling(animate) {
    const s = monthStats(state.view);
    const money = (n) => n.toFixed(2).replace(".", ",");
    setNumber($("#bill-hours"), s.hours, animate);
    setNumber($("#bill-total"), money(s.gross), animate);
    setNumber($("#bill-tax-rate"), state.taxRate, animate);
    setNumber($("#bill-tax"), Math.round(s.tax), animate);
    setNumber($("#bill-net"), Math.round(s.net), animate);
  }

  /* ───── Days grid (Mon–Fri) ───── */

  const grid = $("#grid");

  function cellsFor(view) {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const firstIdx = (first.getDay() + 6) % 7; // 0 = Monday
    const lastIdx = (last.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() + (firstIdx > 4 ? 7 - firstIdx : -firstIdx));
    const end = new Date(last);
    end.setDate(last.getDate() + (lastIdx > 4 ? 4 - lastIdx : 4 - lastIdx));

    const out = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const w = d.getDay();
      if (w === 0 || w === 6) continue;
      const other = d.getMonth() !== view.getMonth();
      const isToday = d.getTime() === today.getTime();
      out.push(`<div class="day"${other ? " data-other" : ""}${isToday ? " data-today" : ""} data-key="${keyOf(d)}"><div class="day__card"><span class="day__num">${d.getDate()}</span></div></div>`);
    }
    return out.join("");
  }

  let gridTimer;
  function renderGrid(dir, animate) {
    clearTimeout(gridTimer);
    if (!animate || reduced.matches) { grid.innerHTML = cellsFor(state.view); return; }
    grid.style.setProperty("--dir", String(dir));
    grid.classList.add("is-exit");
    gridTimer = setTimeout(() => {
      grid.innerHTML = cellsFor(state.view);
      grid.classList.remove("is-exit");
      grid.classList.add("is-enter-start");
      void grid.offsetWidth;
      grid.classList.remove("is-enter-start");
    }, 160);
  }

  function go(delta) {
    const next = delta === 0
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(state.view.getFullYear(), state.view.getMonth() + delta, 1);
    if (next.getTime() === state.view.getTime()) return;
    const dir = next > state.view ? 1 : -1;
    state.view = next;
    closePop();
    clearRange();
    renderHeader(dir, true);
    renderGrid(dir, true);
    renderBilling(true);
  }

  $("#prev").addEventListener("click", () => go(-1));
  $("#next").addEventListener("click", () => go(1));
  $("#today").addEventListener("click", () => go(0));

  /* ───── Press and drag (timetracker.jsx: startDrag / dragOver / mouseup → popover) ───── */

  const drag = { active: false, start: null, end: null };

  function rangeKeys() {
    if (!drag.start) return [];
    const [a, b] = [drag.start, drag.end].sort();
    return [...grid.querySelectorAll(".day:not([data-other])")].map((c) => c.dataset.key).filter((k) => k >= a && k <= b);
  }
  function paintRange() {
    const keys = new Set(rangeKeys());
    grid.querySelectorAll(".day").forEach((c) => c.toggleAttribute("data-range", keys.has(c.dataset.key)));
  }
  function clearRange() {
    drag.active = false;
    drag.start = drag.end = null;
    paintRange();
  }

  grid.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    const cell = e.target.closest(".day:not([data-other])");
    if (!cell) return;
    e.preventDefault();
    closePop();
    drag.active = true;
    drag.start = drag.end = cell.dataset.key;
    paintRange();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag.active) return;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const cell = hit && hit.closest(".day:not([data-other])");
    if (cell && cell.dataset.key !== drag.end) { drag.end = cell.dataset.key; paintRange(); }
  });
  document.addEventListener("pointerup", () => {
    if (!drag.active) return;
    drag.active = false;
    const keys = rangeKeys();
    if (keys.length) openPop(keys, drag.end);
  });

  /* ───── [?] Selection popover (not in Figma) ───── */

  const pop = $("#pop");
  let popTimer;

  function openPop(keys, anchorKey) {
    const cell = grid.querySelector(`[data-key="${anchorKey}"]`);
    if (!cell) return;
    clearTimeout(popTimer);
    setNumber($("#pop-count"), keys.length, !pop.hidden);
    $("#pop-unit").textContent = keys.length === 1 ? "day" : "days";
    pop.hidden = false;
    const r = cell.getBoundingClientRect();
    const w = pop.offsetWidth;
    const right = r.right + 8 + w <= window.innerWidth - 16;
    pop.style.left = `${(right ? r.right + 8 : r.left - 8 - w) + window.scrollX}px`;
    pop.style.top = `${r.top + window.scrollY}px`;
    pop.style.setProperty("--origin", right ? "top left" : "top right");
    void pop.offsetWidth;
    pop.classList.add("is-open");
  }
  function closePop() {
    if (pop.hidden) return;
    pop.classList.remove("is-open");
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { pop.hidden = true; }, 150);
  }

  document.addEventListener("pointerdown", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest(".day")) { closePop(); clearRange(); }
  });

  /* ───── Extra actions ───── */

  const extra = $("#extra");
  const toggle = $("#extra-toggle");
  function setExtra(open) {
    extra.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close extra actions" : "Extra actions");
    extra.querySelectorAll(".extra__point").forEach((p) => { p.tabIndex = open ? 0 : -1; });
  }
  toggle.addEventListener("click", () => setExtra(extra.dataset.open !== "true"));
  document.addEventListener("pointerdown", (e) => {
    if (extra.dataset.open === "true" && !extra.contains(e.target)) setExtra(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePop(); clearRange(); setExtra(false); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  /* ───── Receipt barcode · Figma 93:1356 (width, or leftPad:width) ───── */

  $("#barcode").innerHTML = "8 3 6 8:6 8:1 2:1 2:2 4 8:6 5 2 1 1 3 8 12:6 3 6 8:6 8:1 2:1 2:2 4 8:6 5 2 1 1 3 12:6 5 5 5 2 1 1 2"
    .split(" ")
    .map((t) => { const [l, w] = t.includes(":") ? t.split(":") : [0, t]; return `<i style="inline-size:${w}px;margin-inline-start:${l}px"></i>`; })
    .join("");

  renderHeader(1, false);
  renderGrid(1, false);
  renderBilling(false);
})();
