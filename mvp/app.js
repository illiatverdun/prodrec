/* prod.rec MVP · Calendar page · Empty state (Figma 93:1203).
   Month navigation, press-and-drag day selection (ported from timetracker.jsx),
   calendar menu, currency dropdown, extra actions, number pop-in for every changing number.
   Needs calendar-item.js. */
(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Figma 269:35841 lists the first five. UAH comes from timetracker.jsx (CURRENCY_SYMBOLS).
  const CURRENCIES = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  ];

  // ?today=YYYY-MM-DD pins "today" for design QA against Figma.
  const pinned = new URLSearchParams(location.search).get("today");
  const today = pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? new Date(`${pinned}T00:00:00`) : new Date();
  today.setHours(0, 0, 0, 0);

  const state = {
    view: new Date(today.getFullYear(), today.getMonth(), 1),
    // { "YYYY-MM-DD": [{ projectId, hours }] } — empty until projects exist (D-009).
    entries: {},
    // { projectId: { avatar } } — empty until projects exist (D-009).
    projects: {},
    taxRate: 0,
    currency: "USD",
    weekends: false,
  };

  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const isCurrentMonth = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();

  /* Reads a duration token ("150ms" or "0.15s") in milliseconds. */
  function cssMs(name, el = document.documentElement, fallback = 150) {
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
  }

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

  /* ── transitions.dev · text-states-swap (04-text-states-swap.md) ──
     Exit up with blur, swap the text, enter from below. The duration is read
     from the element, so the icon's local 110ms and the title's 150ms both hold. */
  function swapText(el, next, animate) {
    if (el._swapTo === next || (el._swapTo === undefined && el.textContent === next)) return;
    el._swapTo = next;
    if (!animate || reduced.matches || !el.textContent) { clearTimeout(el._swapTimer); el.textContent = next; return; }
    clearTimeout(el._swapTimer);
    el.classList.remove("is-enter-start");
    el.classList.add("is-exit");
    el._swapTimer = setTimeout(() => {
      el.textContent = next;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight; // force reflow so the next change transitions
      el.classList.remove("is-enter-start");
    }, cssMs("--text-swap-dur", el));
  }

  /* ── transitions.dev · menu-dropdown (05-menu-dropdown.md) via design-system .ds-float ── */
  function openFloat(el) {
    clearTimeout(el._closeTimer);
    el.classList.remove("is-closing");
    el.classList.add("is-open");
  }
  function closeFloat(el) {
    if (!el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.classList.add("is-closing");
    el._closeTimer = setTimeout(() => el.classList.remove("is-closing"), cssMs("--dropdown-close-dur", el));
  }
  const isOpen = (el) => el.classList.contains("is-open");

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

    const long = MONTHS_LONG[v.getMonth()] + (v.getFullYear() !== today.getFullYear() ? ` ${v.getFullYear()}` : "");
    swapText($("#month-name"), long, animate);
    $("#menu-month").textContent = MONTHS_LONG[v.getMonth()];
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
  CalendarItem.bindAvatarHover(grid);

  function cellsFor(view) {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const last = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    const firstIdx = (first.getDay() + 6) % 7; // 0 = Monday
    const lastIdx = (last.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() + (firstIdx > 4 ? 7 - firstIdx : -firstIdx));
    const end = new Date(last);
    end.setDate(last.getDate() + 4 - lastIdx);

    const out = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const w = d.getDay();
      if (w === 0 || w === 6) continue;
      const key = keyOf(d);
      const list = state.entries[key] || [];
      out.push(CalendarItem.markup({
        day: d.getDate(),
        key,
        today: d.getTime() === today.getTime(),
        disabled: d.getMonth() !== view.getMonth(),
        selected: list.length > 0,
        avatars: list.map((e) => state.projects[e.projectId] && state.projects[e.projectId].avatar).filter(Boolean),
      }));
    }
    return out.join("");
  }

  let gridTimer;
  function renderGrid(dir, animate) {
    clearTimeout(gridTimer);
    if (!animate || reduced.matches) { grid.innerHTML = cellsFor(state.view); return; }
    grid.style.setProperty("--dir", String(dir));
    grid.classList.remove("is-enter-start");
    grid.classList.add("is-exit");
    gridTimer = setTimeout(() => {
      grid.innerHTML = cellsFor(state.view);
      grid.classList.remove("is-exit");
      grid.classList.add("is-enter-start");
      void grid.offsetWidth;
      grid.classList.remove("is-enter-start");
    }, cssMs("--duration-quick"));
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
  const ACTIVE_DAY = ".day:not([data-disabled])";

  function rangeKeys() {
    if (!drag.start) return [];
    const [a, b] = [drag.start, drag.end].sort();
    return [...grid.querySelectorAll(ACTIVE_DAY)].map((c) => c.dataset.key).filter((k) => k >= a && k <= b);
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
    const cell = e.target.closest(ACTIVE_DAY);
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
    const cell = hit && hit.closest(ACTIVE_DAY);
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
    popTimer = setTimeout(() => { pop.hidden = true; }, cssMs("--dropdown-close-dur"));
  }

  /* ───── Calendar menu · Figma 199:11366 ───── */

  const menu = $("#menu");
  const menuToggle = $("#menu-toggle");
  const menuPop = $("#menu-pop");
  const menuItems = () => [...menuPop.querySelectorAll(".ds-menu-item")];
  const weekendsItem = $("#weekends-item");
  const weekendsSwitch = $("#weekends");

  function setMenu(open, { focus = false } = {}) {
    if (open === isOpen(menuPop)) return;
    if (open) {
      setCurrency(false);
      openFloat(menuPop);
      if (focus) menuItems()[0].focus({ preventScroll: true });
    } else {
      closeFloat(menuPop);
      if (menuPop.contains(document.activeElement)) menuToggle.focus({ preventScroll: true });
    }
    menuToggle.setAttribute("aria-expanded", String(open));
  }

  function toggleWeekends() {
    state.weekends = !state.weekends;
    weekendsSwitch.classList.add("is-init"); // toggle keyframes only after the first interaction
    weekendsSwitch.querySelector("input").checked = state.weekends;
    weekendsItem.setAttribute("aria-checked", String(state.weekends));
    // D-009: the Mon–Fri grid does not show weekends yet; Figma has no layout for 7 columns in this card.
  }

  menuToggle.addEventListener("click", () => setMenu(!isOpen(menuPop), { focus: false }));
  menuToggle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setMenu(true, { focus: true }); }
  });
  menuPop.addEventListener("click", (e) => {
    const item = e.target.closest(".ds-menu-item");
    if (!item) return;
    if (item === weekendsItem) toggleWeekends();
    if (item.hasAttribute("data-close")) setMenu(false); // D-009: copy and clear have no action yet
  });
  menuPop.addEventListener("keydown", (e) => {
    const items = menuItems();
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
    } else if ((e.key === "Enter" || e.key === " ") && i >= 0) {
      e.preventDefault();
      items[i].click();
    } else if (e.key === "Tab") {
      setMenu(false);
    }
  });

  /* ───── Currency dropdown · Figma 269:35841 ───── */

  const curToggle = $("#cur-toggle");
  const curPop = $("#cur-pop");
  const curInput = $("#cur-input");
  const curList = $("#cur-list");
  const curEmpty = $("#cur-empty");
  let curActive = -1;

  function renderCurrencies() {
    const q = curInput.value.trim().toLowerCase();
    const shown = CURRENCIES.filter((c) => !q || `${c.code} ${c.name} ${c.symbol}`.toLowerCase().includes(q));
    curList.innerHTML = shown.map((c) => `
      <button class="ds-menu-item" type="button" role="option" tabindex="-1" id="cur-${c.code}" data-code="${c.code}" aria-selected="${c.code === state.currency}">
        <span class="cur__sym">${c.symbol}</span><span class="cur__code">${c.code}</span><span class="cur__name">${c.name}</span>
      </button>`).join("");
    curEmpty.hidden = shown.length > 0;
    setActive(q ? 0 : -1);
  }

  function setActive(i) {
    const opts = [...curList.children];
    curActive = opts.length ? Math.max(-1, Math.min(i, opts.length - 1)) : -1;
    opts.forEach((o, n) => o.toggleAttribute("data-active", n === curActive));
    if (curActive >= 0) {
      curInput.setAttribute("aria-activedescendant", opts[curActive].id);
      opts[curActive].scrollIntoView({ block: "nearest" });
    } else {
      curInput.removeAttribute("aria-activedescendant");
    }
  }

  function setCurrency(open) {
    if (open === isOpen(curPop)) return;
    if (open) {
      setMenu(false);
      curInput.value = "";
      renderCurrencies();
      openFloat(curPop);
      const selected = curList.querySelector('[aria-selected="true"]');
      if (selected) selected.scrollIntoView({ block: "nearest" });
      curInput.focus({ preventScroll: true });
    } else {
      closeFloat(curPop);
      if (curPop.contains(document.activeElement)) curToggle.focus({ preventScroll: true });
    }
    curToggle.setAttribute("aria-expanded", String(open));
  }

  function chooseCurrency(code) {
    const c = CURRENCIES.find((x) => x.code === code);
    if (!c) return;
    state.currency = c.code;
    swapText($("#cur-code"), c.code, true);
    document.querySelectorAll("[data-cur-symbol]").forEach((el) => swapText(el, c.symbol, true));
    curToggle.setAttribute("aria-label", `Currency: ${c.code}`);
    setCurrency(false);
  }

  curToggle.addEventListener("click", () => setCurrency(!isOpen(curPop)));
  curInput.addEventListener("input", renderCurrencies);
  curList.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-code]");
    if (opt) chooseCurrency(opt.dataset.code);
  });
  curList.addEventListener("pointermove", (e) => {
    const opt = e.target.closest("[data-code]");
    if (opt && curActive >= 0) setActive([...curList.children].indexOf(opt));
  });
  curInput.addEventListener("keydown", (e) => {
    const count = curList.children.length;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(curActive < count - 1 ? curActive + 1 : 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(curActive > 0 ? curActive - 1 : count - 1); }
    else if (e.key === "Enter" && curActive >= 0) { e.preventDefault(); curList.children[curActive].click(); }
    else if (e.key === "Tab") setCurrency(false);
  });

  /* ───── Extra actions ───── */

  const extra = $("#extra");
  const toggle = $("#extra-toggle");
  function setExtra(open) {
    if (String(open) === extra.dataset.open) return;
    extra.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close extra actions" : "Extra actions");
    extra.querySelectorAll(".extra__point").forEach((p) => { p.tabIndex = open ? 0 : -1; });
    if (!open && extra.contains(document.activeElement) && document.activeElement !== toggle) toggle.focus({ preventScroll: true });
  }
  toggle.addEventListener("click", () => setExtra(extra.dataset.open !== "true"));

  /* ───── Dismissal ───── */

  document.addEventListener("pointerdown", (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest(".day")) { closePop(); clearRange(); }
    if (!menu.contains(e.target)) setMenu(false);
    if (!$("#cur").contains(e.target)) setCurrency(false);
    if (extra.dataset.open === "true" && !extra.contains(e.target)) setExtra(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePop(); clearRange(); setMenu(false); setCurrency(false); setExtra(false);
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, [role='menu']")) return;
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
