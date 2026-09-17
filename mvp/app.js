/* prod.rec MVP · Calendar page (Figma 93:1203 empty, 100:2437 filled, prototype 292:110846).
   Month navigation, press-and-drag day selection (ported from timetracker.jsx), hours popover,
   Projects section, Billing, Onboarding, calendar menu, extra actions.
   Needs calendar-item.js, store.js, ui.js, modals.js. */
(function () {
  "use strict";

  const { store, ui, modals } = window.PR;
  const { state } = store;
  const $ = (sel) => document.querySelector(sel);
  const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // ?today=YYYY-MM-DD pins "today" for design QA against Figma.
  const pinned = new URLSearchParams(location.search).get("today");
  const today = pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? new Date(`${pinned}T00:00:00`) : new Date();
  today.setHours(0, 0, 0, 0);

  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  // Mobile · Figma 277:42013: one column, tabs, summary card. Tablet stops at 646px (582 column + 32 + 32).
  const mobile = window.matchMedia("(max-width: 645px)");
  const isCurrentMonth = (d) => d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
  const sym = () => store.currency(state.currency).symbol;

  // Annotation I288:64844;93:1225: available days change with weekends, 5 → 7 days a week.
  function workdaysIn(d) {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    if (state.weekends) return last;
    let n = 0;
    for (let i = 1; i <= last; i++) {
      const w = new Date(d.getFullYear(), d.getMonth(), i).getDay();
      if (w !== 0 && w !== 6) n++;
    }
    return n;
  }

  /* Grid-rows fold: opens and closes a block by animating its height (transitions.dev 01 timing). */
  function fold(el, folded, animate = true) {
    if (el.hasAttribute("data-folded") === folded) return;
    el.inert = folded;
    if (!animate || ui.reduced.matches) { el.toggleAttribute("data-folded", folded); return; }
    el.classList.add("is-folding");
    el.toggleAttribute("data-folded", folded);
    clearTimeout(el._foldTimer);
    el._foldTimer = setTimeout(() => el.classList.remove("is-folding"), ui.cssMs("--resize-dur") + 40);
  }

  /* transitions.dev 01 · card resize: measure, mutate, tween between the two heights. */
  function resizeCard(card, mutate, animate = true) {
    const from = card.offsetHeight;
    mutate();
    if (!animate || ui.reduced.matches || !from) return;
    card.style.height = "";
    const to = card.offsetHeight;
    if (Math.abs(from - to) < 1) return;
    card.classList.remove("t-resize");
    card.style.height = `${from}px`;
    void card.offsetHeight;
    card.classList.add("t-resize");
    card.style.height = `${to}px`;
    clearTimeout(card._resizeTimer);
    card._resizeTimer = setTimeout(() => { card.style.height = ""; card.classList.remove("t-resize"); }, ui.cssMs("--resize-dur") + 40);
  }

  /* ───── Header ───── */

  function renderHeader(dir, animate) {
    const icon = $("#cal-icon");
    const current = isCurrentMonth(view);
    const label = MONTHS_SHORT[view.getMonth()];
    const day = current ? today.getDate() : 1;
    icon.dataset.dir = dir < 0 ? "prev" : "next";
    icon.dataset.current = String(current);
    icon.setAttribute("aria-label", `${label} ${day}`);
    ui.swapText($("#cal-band"), label, animate);
    ui.setNumber($("#cal-day"), day, animate);
    const long = MONTHS_LONG[view.getMonth()] + (view.getFullYear() !== today.getFullYear() ? ` ${view.getFullYear()}` : "");
    ui.swapText($("#month-name"), long, animate);
    $("#menu-month").textContent = MONTHS_LONG[view.getMonth()];
    renderMeta(animate);
  }

  // Annotation I288:64844;93:1225: filled days / available days · total working hours.
  function renderMeta(animate) {
    const m = store.month(view);
    ui.setNumber($("#meta-logged"), m.days, animate);
    ui.setNumber($("#meta-workdays"), workdaysIn(view), animate);
    ui.setNumber($("#meta-hours"), store.fmt.hours(m.hours), animate);
  }

  /* ───── Days grid (Mon–Fri) ───── */

  const grid = $("#grid");
  CalendarItem.bindAvatarHover(grid);
  let shownDayProjects = new Map(); // key → Set(projectId), to pop in only the avatars that are new

  function cellsFor(v, markFresh) {
    const first = new Date(v.getFullYear(), v.getMonth(), 1);
    const last = new Date(v.getFullYear(), v.getMonth() + 1, 0);
    const firstIdx = (first.getDay() + 6) % 7; // 0 = Monday
    const lastIdx = (last.getDay() + 6) % 7;
    const week = state.weekends; // 7 days (Figma 292:91118) or Mon–Fri
    const start = new Date(first);
    start.setDate(first.getDate() + (!week && firstIdx > 4 ? 7 - firstIdx : -firstIdx));
    // Annotation 113:8558: always 6 lines, so the card keeps its height from month to month.
    const end = new Date(start);
    end.setDate(start.getDate() + 6 * 7 - (week ? 1 : 3));

    const next = new Map();
    const out = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const w = d.getDay();
      if (!week && (w === 0 || w === 6)) continue;
      const key = store.keyOf(d);
      const list = store.dayEntries(key).filter((e) => store.project(e.projectId));
      const before = shownDayProjects.get(key) || new Set();
      next.set(key, new Set(list.map((e) => e.projectId)));
      out.push(CalendarItem.markup({
        day: d.getDate(),
        key,
        today: d.getTime() === today.getTime(),
        disabled: d.getMonth() !== v.getMonth(),
        selected: list.length > 0,
        avatars: list.map((e) => ({ src: ui.avatarSrc(store.project(e.projectId).avatar), fresh: markFresh && !before.has(e.projectId) })),
      }));
    }
    shownDayProjects = next;
    return out.join("");
  }

  let gridTimer;
  function renderGrid(dir, animate) {
    clearTimeout(gridTimer);
    if (!animate || ui.reduced.matches) { grid.innerHTML = cellsFor(view, false); return; }
    grid.style.setProperty("--dir", String(dir));
    grid.classList.remove("is-enter-start");
    grid.classList.add("is-exit");
    gridTimer = setTimeout(() => {
      grid.innerHTML = cellsFor(view, false);
      grid.classList.remove("is-exit");
      grid.classList.add("is-enter-start");
      void grid.offsetWidth;
      grid.classList.remove("is-enter-start");
    }, ui.cssMs("--duration-quick"));
  }
  /* Same month, new data: redraw in place and keep the selection. */
  function refreshGrid() {
    grid.innerHTML = cellsFor(view, true);
    paintRange();
  }

  function go(delta) {
    const next = delta === 0
      ? new Date(today.getFullYear(), today.getMonth(), 1)
      : new Date(view.getFullYear(), view.getMonth() + delta, 1);
    if (next.getTime() === view.getTime()) return;
    const dir = next > view ? 1 : -1;
    view = next;
    closeDayPopovers();
    renderHeader(dir, true);
    renderGrid(dir, true);
    renderBilling(true);
    renderProjects(true);
    renderSummary(true);
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
    closeDayPopovers({ keepRange: true });
    drag.active = true;
    drag.start = drag.end = cell.dataset.key;
    paintRange();
  });
  document.addEventListener("pointermove", (e) => {
    if (!drag.active || mobile.matches) return; // mobile: one day per tap, dragging would fight the page scroll
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const cell = hit && hit.closest(ACTIVE_DAY);
    if (cell && cell.dataset.key !== drag.end) { drag.end = cell.dataset.key; paintRange(); }
  });
  document.addEventListener("pointerup", () => {
    if (!drag.active) return;
    drag.active = false;
    const keys = rangeKeys();
    if (!keys.length) return;
    if (mobile.matches) { clearRange(); openDay(keys[0]); return; }
    if (store.active().length) openHours(keys, drag.end);
    else openPop(keys, drag.end);
  });
  // A touch that turns into a scroll is cancelled by the browser: no selection, no drawer.
  document.addEventListener("pointercancel", () => { if (drag.active) clearRange(); });

  /* Place a popover centred under the anchor day, or above it when there is no room below. */
  function place(pop, cell) {
    const r = cell.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const gap = 8;
    const below = r.bottom + gap + h <= window.innerHeight - 16 || r.top - gap - h < 16;
    const left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, document.documentElement.clientWidth - w - 16));
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${(below ? r.bottom + gap : r.top - gap - h) + window.scrollY}px`;
    pop.style.setProperty("--float-origin", below ? "top center" : "bottom center");
    pop.style.setProperty("--origin", below ? "top center" : "bottom center");
  }

  /* ───── [?] No-projects popover (not in Figma) ───── */

  const pop = $("#pop");
  let popTimer;

  function openPop(keys, anchorKey) {
    const cell = grid.querySelector(`[data-key="${anchorKey}"]`);
    if (!cell) return;
    clearTimeout(popTimer);
    ui.setNumber($("#pop-count"), keys.length, !pop.hidden);
    $("#pop-unit").textContent = keys.length === 1 ? "day" : "days";
    pop.hidden = false;
    pop.classList.remove("is-open");
    place(pop, cell);
    void pop.offsetWidth;
    pop.classList.add("is-open");
  }
  function closePop() {
    if (pop.hidden) return;
    pop.classList.remove("is-open");
    clearTimeout(popTimer);
    popTimer = setTimeout(() => { pop.hidden = true; }, ui.cssMs("--dropdown-close-dur"));
  }
  $("#pop-cta").addEventListener("click", () => { closeDayPopovers(); modals.project(); });

  /* ───── Hours popover · Figma 292:113465 ───── */

  const hpop = $("#hpop");
  const hlist = $("#hpop-list");
  let hours = null; // { keys, anchorKey, drafts: Map(projectId → hours) }
  const clampHours = (v) => Math.min(24, Math.max(0.5, Math.round(v * 2) / 2));

  function openHours(keys, anchorKey) {
    const cell = grid.querySelector(`[data-key="${anchorKey}"]`);
    if (!cell) return;
    ui.closeFloats(closeHoursFloat);
    hours = { keys, anchorKey, drafts: hours && hours.anchorKey === anchorKey ? hours.drafts : new Map() };
    const d = new Date(`${anchorKey}T00:00:00`);
    hpop.setAttribute("aria-label", keys.length > 1 ? `Hours for ${keys.length} days` : `Hours for ${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`);
    hlist.innerHTML = "";
    renderHours();
    hpop.classList.remove("is-open", "is-closing");
    place(hpop, cell);
    void hpop.offsetWidth;
    ui.openFloat(hpop);
  }

  function projectState(p) {
    const lists = hours.keys.map((k) => store.dayEntries(k).find((e) => e.projectId === p.id));
    const selected = lists.every(Boolean);
    const value = selected ? lists[0].hours : hours.drafts.get(p.id) ?? store.DEFAULT_HOURS;
    return { selected, value };
  }

  function renderHours() {
    if (!hours) return;
    const projects = store.active();
    const existing = new Map([...hlist.children].map((row) => [row.dataset.id, row]));
    projects.forEach((p) => {
      const { selected, value } = projectState(p);
      let row = existing.get(p.id);
      if (!row) {
        hlist.insertAdjacentHTML("beforeend", `
          <div class="hrow" data-id="${p.id}">
            <div class="hrow__name"><img class="hrow__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><span class="hrow__label">${ui.esc(p.name)}</span></div>
            <div class="hstep">
              <button class="ds-icon-btn" data-type="secondary" type="button" data-step="-1" aria-label="Fewer hours"><img src="assets/arrow-left-14.svg" alt="" width="14" height="14"></button>
              <label class="hstep__value"><input class="hstep__input" type="text" inputmode="decimal" autocomplete="off"><span aria-hidden="true">h.</span></label>
              <button class="ds-icon-btn" data-type="secondary" type="button" data-step="1" aria-label="More hours"><img src="assets/arrow-right-14.svg" alt="" width="14" height="14"></button>
            </div>
            <button class="ds-icon-btn hrow__act" type="button">
              <img class="t-icon" data-icon="add" src="assets/add-14-white.svg" alt="" width="14" height="14">
              <img class="t-icon" data-icon="remove" src="assets/minimize-14.svg" alt="" width="14" height="14">
            </button>
          </div>`);
        row = hlist.lastElementChild;
      }
      existing.delete(p.id);
      hlist.appendChild(row);
      row.querySelector(".hrow__avatar").src = ui.avatarSrc(p.avatar);
      row.querySelector(".hrow__label").textContent = p.name;
      row.toggleAttribute("data-selected", selected);
      const act = row.querySelector(".hrow__act");
      act.dataset.type = selected ? "secondary" : "";
      if (!selected) act.removeAttribute("data-type");
      act.setAttribute("aria-label", selected ? `Remove ${p.name} from ${hours.keys.length > 1 ? "these days" : "this day"}` : `Add ${p.name}`);
      const input = row.querySelector(".hstep__input");
      input.setAttribute("aria-label", `Hours for ${p.name}`);
      if (document.activeElement !== input) input.value = store.fmt.hours(value);
      row.querySelector("[data-step='-1']").disabled = value <= 0.5;
      row.querySelector("[data-step='1']").disabled = value >= 24;
    });
    existing.forEach((row) => row.remove());
  }

  function setRowHours(row, v, dir) {
    const p = store.project(row.dataset.id);
    const value = clampHours(v);
    const input = row.querySelector(".hstep__input");
    input.value = store.fmt.hours(value);
    // transitions.dev 02 · number pop-in on the whole value, direction follows the arrow.
    input.style.setProperty("--digit-dir-y", "0");
    input.style.setProperty("--digit-dir-x", String(dir || 0));
    input.classList.remove("is-bump");
    void input.offsetWidth;
    if (dir) input.classList.add("is-bump");
    if (projectState(p).selected) store.setHours(hours.keys, p.id, value);
    else { hours.drafts.set(p.id, value); renderHours(); }
  }

  hlist.addEventListener("click", (e) => {
    const row = e.target.closest(".hrow");
    if (!row) return;
    const step = e.target.closest("[data-step]");
    const p = store.project(row.dataset.id);
    const { selected, value } = projectState(p);
    if (step) { setRowHours(row, value + Number(step.dataset.step), Number(step.dataset.step)); return; }
    if (e.target.closest(".hrow__act")) {
      if (selected) store.removeFromDays(hours.keys, p.id);
      else store.setHours(hours.keys, p.id, value);
    }
  });
  hlist.addEventListener("change", (e) => {
    if (!e.target.matches(".hstep__input")) return;
    const row = e.target.closest(".hrow");
    const v = parseFloat(e.target.value.replace(",", "."));
    if (Number.isFinite(v)) setRowHours(row, v, 0);
    else renderHours();
  });
  hlist.addEventListener("keydown", (e) => {
    if (!e.target.matches(".hstep__input")) return;
    const row = e.target.closest(".hrow");
    const { value } = projectState(store.project(row.dataset.id));
    if (e.key === "ArrowUp") { e.preventDefault(); setRowHours(row, value + 1, 1); }
    if (e.key === "ArrowDown") { e.preventDefault(); setRowHours(row, value - 1, -1); }
    if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
  });

  function closeHoursFloat() {
    if (!ui.isOpen(hpop)) return;
    ui.closeFloat(hpop);
    hours = null;
  }
  ui.floats.add(closeHoursFloat);

  function closeDayPopovers({ keepRange = false } = {}) {
    closePop();
    closeHoursFloat();
    if (!keepRange) clearRange();
  }

  /* ───── Day drawer · mobile, Figma 288:44918 ─────
     Empty (292:98556) → project list (288:45002, 288:45112) → hours ruler (288:45141, 292:97017).
     Projects are added and edited from here: mobile has no Projects section. [?] Ruler steps by 0.5 h,
     0.5–16; the big number opens the keyboard for any value up to 24. Hours of a project already on the day
     save as the ruler stops; Clear day removes only that project, with Reset in the toast. */

  let daySheet = null; // { el, key, mode: "list" | "time", projectId, value, added }
  const RULER_MAX = 16;
  const HOUR_PX = 40; // 10 ticks of 4px per hour
  const dayTitle = (key) => { const d = new Date(`${key}T00:00:00`); return `${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`; };

  function openDay(key, { projectId } = {}) {
    const el = document.createElement("div");
    el.className = "dsheet";
    el.setAttribute("aria-label", dayTitle(key));
    daySheet = { el, key, mode: "list", projectId: null, value: store.DEFAULT_HOURS, added: false };
    el.addEventListener("click", onDayClick);
    ui.openModal(el, { initialFocus: "[data-sheet-title]", onClose: () => { if (daySheet && daySheet.el === el) daySheet = null; } });
    if (projectId) showTime(projectId);
    else renderDay();
  }
  // Back to the drawer once a project modal has closed.
  const reopenDay = (key, opts) => setTimeout(() => openDay(key, opts), ui.cssMs("--modal-close-dur"));

  function renderDay() {
    const { el, key } = daySheet;
    daySheet.mode = "list";
    const active = store.active();
    const entries = store.dayEntries(key).filter((e) => { const p = store.project(e.projectId); return p && !p.archived; });
    const onDay = new Map(entries.map((e) => [e.projectId, e.hours]));
    const total = entries.reduce((a, e) => a + e.hours, 0);
    const row = (p) => {
      const h = onDay.get(p.id);
      return `
        <div class="drow" data-id="${p.id}"${h != null ? " data-selected" : ""}>
          <button class="ds-icon-btn drow__settings" data-type="secondary" type="button" data-act="edit" aria-label="Edit ${ui.esc(p.name)}"><img src="assets/settings-24.svg" alt="" width="24" height="24"></button>
          <button class="drow__main" type="button" data-act="time" aria-label="${ui.esc(p.name)}${h != null ? `, ${store.fmt.hours(h)} hours` : ""}">
            <span class="drow__who"><img class="drow__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><span class="drow__name">${ui.esc(p.name)}</span></span>
            ${h != null ? `<span class="drow__hours">${store.fmt.hours(h)} h</span>` : ""}
          </button>
          <span class="drow__chev" data-act="time" aria-hidden="true"><img src="assets/chevron-right-pink.svg" alt="" width="24" height="24"></span>
        </div>`;
    };
    const selected = active.filter((p) => onDay.has(p.id));
    const rest = active.filter((p) => !onDay.has(p.id));
    el.dataset.mode = active.length ? "list" : "empty";
    el.innerHTML = `
      <div class="dsheet__head">
        <h2 class="dsheet__title" tabindex="-1" data-sheet-title>${dayTitle(key)}</h2>
        <span class="chip">${entries.length} added · ${store.fmt.hours(total)} h</span>
      </div>
      ${active.length ? `<div class="dsheet__list">${selected.map(row).join("")}${selected.length && rest.length ? `<span class="dsheet__sep" aria-hidden="true"></span>` : ""}${rest.map(row).join("")}</div>` : ""}
      <div class="dsheet__foot">
        <button class="ds-btn"${active.length ? ' data-type="secondary"' : ""} data-size="md" type="button" data-act="new"><img src="assets/${active.length ? "add-24" : "add-circle"}.svg" alt="" width="24" height="24"><span>Add new project</span></button>
      </div>`;
  }

  function showTime(projectId) {
    const p = store.project(projectId);
    if (!p) { renderDay(); return; }
    const entry = store.dayEntries(daySheet.key).find((e) => e.projectId === p.id);
    Object.assign(daySheet, { mode: "time", projectId: p.id, value: entry ? entry.hours : store.DEFAULT_HOURS, added: !!entry });
    const { el } = daySheet;
    el.dataset.mode = "time";
    el.innerHTML = `
      <img class="dsheet__bg" src="assets/logo-bg.svg" alt="">
      <div class="dsheet__head dsheet__head--time">
        <button class="ds-icon-btn" data-type="secondary" data-variant="ghost" type="button" data-act="back" aria-label="Back to ${dayTitle(daySheet.key)}"><img src="assets/arrow-left.svg" alt="" width="20" height="20"></button>
        <span class="dsheet__who"><img class="drow__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><h2 class="dsheet__name" tabindex="-1" data-sheet-title>${ui.esc(p.name)}</h2></span>
      </div>
      <div class="hours">
        <label class="hours__value">
          <input class="hours__input" type="text" inputmode="decimal" autocomplete="off" aria-label="Hours for ${ui.esc(p.name)}">
          <span class="hours__num" aria-hidden="true"></span><span class="hours__unit" aria-hidden="true">h</span>
        </label>
        <div class="hours__ruler">
          <div class="ruler" role="slider" tabindex="0" aria-label="Hours" aria-valuemin="0.5" aria-valuemax="${RULER_MAX}">
            <div class="ruler__window"><div class="ruler__track"></div></div>
            <img class="ruler__thumb" src="assets/ruler-thumb.svg" alt="">
          </div>
          <div class="ruler__scale" aria-hidden="true"><span>0</span><span>${RULER_MAX}</span></div>
        </div>
      </div>
      <div class="dsheet__foot">
        ${daySheet.added
          ? `<button class="ds-btn" data-type="secondary" data-size="md" type="button" data-act="clear"><img src="assets/delete-24.svg" alt="" width="24" height="24"><span>Clear day</span></button>`
          : `<button class="ds-btn" data-size="md" type="button" data-act="add"><span>Add <span class="dsheet__cta-value"></span>&nbsp;h.</span></button>`}
      </div>`;
    bindRuler();
    setDayHours(daySheet.value, false);
  }

  function setDayHours(v, animate = true) {
    const value = Math.min(24, Math.max(0.5, Math.round(v * 2) / 2));
    daySheet.value = value;
    const { el } = daySheet;
    const ruler = el.querySelector(".ruler");
    ruler.style.setProperty("--v", String(Math.min(value, RULER_MAX)));
    ruler.setAttribute("aria-valuenow", String(value));
    ruler.setAttribute("aria-valuetext", `${store.fmt.hours(value)} hours`);
    ui.setNumber(el.querySelector(".hours__num"), store.fmt.hours(value), animate);
    const input = el.querySelector(".hours__input");
    if (document.activeElement !== input) input.value = store.fmt.hours(value);
    const cta = el.querySelector(".dsheet__cta-value");
    if (cta) cta.textContent = store.fmt.hours(value);
  }
  // A project already on the day saves as soon as the value settles.
  function commitDayHours() {
    if (daySheet && daySheet.mode === "time" && daySheet.added) store.setHours([daySheet.key], daySheet.projectId, daySheet.value);
  }

  function bindRuler() {
    const ruler = daySheet.el.querySelector(".ruler");
    const input = daySheet.el.querySelector(".hours__input");
    let grab = null;
    ruler.addEventListener("pointerdown", (e) => {
      ruler.setPointerCapture(e.pointerId);
      grab = { x: e.clientX, v: daySheet.value };
      ruler.classList.add("is-dragging");
    });
    ruler.addEventListener("pointermove", (e) => {
      if (!grab) return;
      const next = Math.min(RULER_MAX, grab.v - (e.clientX - grab.x) / HOUR_PX);
      if (Math.round(next * 2) / 2 !== daySheet.value) setDayHours(next);
    });
    const release = () => {
      if (!grab) return;
      grab = null;
      ruler.classList.remove("is-dragging");
      commitDayHours();
    };
    ruler.addEventListener("pointerup", release);
    ruler.addEventListener("pointercancel", release);
    ruler.addEventListener("keydown", (e) => {
      const steps = { ArrowLeft: -0.5, ArrowDown: -0.5, ArrowRight: 0.5, ArrowUp: 0.5 };
      if (e.key in steps) { e.preventDefault(); setDayHours(Math.min(RULER_MAX, daySheet.value + steps[e.key])); commitDayHours(); }
      if (e.key === "Home" || e.key === "End") { e.preventDefault(); setDayHours(e.key === "Home" ? 0.5 : RULER_MAX); commitDayHours(); }
    });
    input.addEventListener("focus", () => input.select());
    input.addEventListener("change", () => {
      const v = parseFloat(input.value.replace(",", "."));
      if (Number.isFinite(v)) { setDayHours(v); commitDayHours(); } else setDayHours(daySheet.value, false);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); input.blur(); } });
  }

  function onDayClick(e) {
    const act = e.target.closest("[data-act]");
    if (!act || !daySheet) return;
    const { key } = daySheet;
    const id = act.closest(".drow") && act.closest(".drow").dataset.id;
    switch (act.dataset.act) {
      case "time": showTime(id); break;
      case "edit": modals.project(id, { onSaved: () => reopenDay(key) }); break;
      case "new": modals.project(null, { onSaved: () => reopenDay(key) }); break; // back to the project list, not straight to hours
      case "back": renderDay(); break;
      case "add":
        store.setHours([key], daySheet.projectId, daySheet.value);
        renderDay();
        break;
      case "clear": {
        const p = store.project(daySheet.projectId);
        const snap = store.snapshot();
        store.removeFromDays([key], p.id);
        renderDay();
        ui.toast({ title: `${p.name} cleared`, onAction: () => store.restore(snap) });
        break;
      }
    }
  }

  /* ───── Calendar menu · Figma 199:11366 ───── */

  const menu = $("#menu");
  const menuToggle = $("#menu-toggle");
  const menuPop = $("#menu-pop");
  const menuItems = () => [...menuPop.querySelectorAll(".ds-menu-item")];
  const weekendsItem = $("#weekends-item");
  const weekendsSwitch = $("#weekends");

  function setMenu(open, { focus = false } = {}) {
    if (open === ui.isOpen(menuPop)) return;
    if (open) {
      ui.closeFloats(closeMenu);
      ui.openFloat(menuPop);
      if (focus) menuItems()[0].focus({ preventScroll: true });
    } else {
      ui.closeFloat(menuPop);
      if (menuPop.contains(document.activeElement)) menuToggle.focus({ preventScroll: true });
    }
    menuToggle.setAttribute("aria-expanded", String(open));
  }
  const closeMenu = () => setMenu(false);
  ui.floats.add(closeMenu);

  /* Weekends on/off · Figma 292:91118. The whole week area (labels and days) swaps out and back in
     with the same blur as a month change, then settles into 7 or 5 columns. */
  const days = $(".days");
  const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function applyWeek() {
    days.dataset.week = state.weekends ? "7" : "5";
    $(".days__head").innerHTML = LABELS.slice(0, state.weekends ? 7 : 5).map((l) => `<span>${l}</span>`).join("");
    grid.innerHTML = cellsFor(view, false);
    paintRange();
  }
  let weekTimer;
  function swapWeek(animate) {
    const parts = [$(".days__head"), grid];
    clearTimeout(weekTimer);
    clearTimeout(gridTimer);
    if (!animate || ui.reduced.matches) { applyWeek(); return; }
    parts.forEach((el) => { el.style.setProperty("--dir", "0"); el.classList.remove("is-enter-start"); el.classList.add("is-exit"); });
    weekTimer = setTimeout(() => {
      applyWeek();
      parts.forEach((el) => { el.classList.remove("is-exit"); el.classList.add("is-enter-start"); });
      void grid.offsetWidth;
      parts.forEach((el) => el.classList.remove("is-enter-start"));
    }, ui.cssMs("--duration-quick"));
  }

  function renderWeekends() {
    weekendsSwitch.querySelector("input").checked = state.weekends;
    weekendsItem.setAttribute("aria-checked", String(state.weekends));
  }

  menuToggle.addEventListener("click", () => setMenu(!ui.isOpen(menuPop)));
  menuToggle.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setMenu(true, { focus: true }); }
  });
  menuPop.addEventListener("click", (e) => {
    const item = e.target.closest(".ds-menu-item");
    if (!item) return;
    if (item === weekendsItem) {
      weekendsSwitch.classList.add("is-init"); // toggle keyframes only after the first interaction
      store.set("weekends", !state.weekends);
      return;
    }
    if (item.dataset.action === "clear") {
      const snap = store.snapshot();
      const month = MONTHS_LONG[view.getMonth()];
      if (store.clearMonth(view)) ui.toast({ title: `${month} is clear now`, onAction: () => store.restore(snap) });
    }
    if (item.hasAttribute("data-close")) setMenu(false); // D-009: "Copy previous month" has no action yet
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

  /* ───── Onboarding · prototype 292:110846 ───── */

  const ONB_CTA = ["", "Set up project", "Set up taxes"];

  function renderOnboarding(animate) {
    const step = store.onboardingStep();
    fold($("#onb-fold"), step === 0, animate);
    if (step === 0) return;
    [...$("#onb-list").children].forEach((li, i) => {
      li.dataset.state = i + 1 < step ? "done" : i + 1 === step ? "active" : "todo";
      li.toggleAttribute("aria-current", i + 1 === step);
      if (i + 1 === step) li.setAttribute("aria-current", "step");
    });
    [...$(".onb__rail").children].forEach((dot, i) => dot.toggleAttribute("data-active", i + 1 === step));
    fold($("#onb-cta-fold"), step >= 3, animate);
    if (step < 3) ui.swapText($("#onb-cta-label"), ONB_CTA[step], animate);
  }
  $("#onb-cta").addEventListener("click", () => {
    if (store.onboardingStep() === 1) modals.project();
    else if (store.onboardingStep() === 2) modals.deductions();
  });

  /* ───── Projects · Figma 145:5130 ───── */

  const proj = $("#proj");
  const projList = $("#proj-list");
  const projTabs = $("#proj-tabs");
  let projTab = "active";
  let projOpen = false;
  let projMonth = null;

  function itemMarkup(p, archived) {
    const actions = archived
      ? `<button class="ds-icon-btn pitem__btn" data-type="secondary" data-size="lg" type="button" data-act="restore" aria-label="Restore ${ui.esc(p.name)}" data-ds-tooltip="Restore"><img src="assets/restore.svg" alt="" width="20" height="20"></button>
         <button class="ds-icon-btn pitem__btn" data-type="secondary" data-size="lg" type="button" data-act="delete" aria-label="Delete ${ui.esc(p.name)}" data-ds-tooltip="Delete"><img src="assets/delete-20-red.svg" alt="" width="20" height="20"></button>`
      : `<button class="pitem__edit" type="button" data-act="edit" aria-label="Edit ${ui.esc(p.name)}"><img src="assets/settings.svg" alt="" width="20" height="20"></button>`;
    return `
      <div class="pitem" data-id="${p.id}"${archived ? " data-archived" : ""}>
        <div class="pitem__info">
          <span class="pitem__who"><img class="pitem__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><span class="pitem__name">${ui.esc(p.name)}</span></span>
          ${archived ? "" : `<span class="pitem__stat"></span>`}
        </div>
        ${actions}
      </div>`;
  }

  function renderProjects(animate) {
    const active = store.active();
    const archived = store.archived();
    fold($("#proj-fold"), !state.projects.length, animate);
    if (!archived.length) projTab = "active";
    const tab = projTab;
    const list = tab === "active" ? active : archived;
    const collapsible = !archived.length && active.length >= 3; // annotation 288:38739
    const single = !archived.length && active.length === 1;
    const m = store.month(view);

    resizeCard(proj, () => {
      const tabsWereHidden = projTabs.hidden;
      projTabs.hidden = !archived.length;
      if (tabsWereHidden && !projTabs.hidden && projTabs.__ds_relayout) requestAnimationFrame(() => projTabs.__ds_relayout());
      ui.swapText($("#proj-title-text"), single ? "Project" : "Projects", animate);
      const count = $("#proj-count");
      count.hidden = single;
      ui.setNumber(count, list.length, animate);

      const tops = new Map([...projList.children].map((n) => [n, n.offsetTop]));
      const sameTab = projList.dataset.tab === tab;
      const existing = new Map(sameTab ? [...projList.children].filter((n) => !n.classList.contains("is-leaving")).map((n) => [n.dataset.id, n]) : []);
      if (!sameTab) projList.replaceChildren();
      projList.dataset.tab = tab;
      list.forEach((p, i) => {
        let node = existing.get(p.id);
        if (node && node.hasAttribute("data-archived") !== (tab === "archived")) node = null;
        if (!node) {
          projList.insertAdjacentHTML("beforeend", itemMarkup(p, tab === "archived"));
          node = projList.lastElementChild;
          if (animate && (sameTab || projMonth)) {
            node.classList.add("is-entering");
            node.style.setProperty("--i", String(sameTab ? 0 : i));
            requestAnimationFrame(() => requestAnimationFrame(() => node.classList.remove("is-entering")));
          }
        }
        existing.delete(p.id);
        projList.appendChild(node);
        node.querySelector(".pitem__avatar").src = ui.avatarSrc(p.avatar);
        node.querySelector(".pitem__name").textContent = p.name;
        const stat = node.querySelector(".pitem__stat");
        if (stat) {
          const row = m.per.get(p.id) || { hours: 0, days: 0 };
          node.dataset.hours = `${store.fmt.hours(row.hours)} h.`;
          node.dataset.days = `${row.days} d.`;
          ui.swapText(stat, node.matches(":hover, :focus-within") ? node.dataset.days : node.dataset.hours, animate && !!stat.textContent);
        }
      });
      existing.forEach((node) => {
        node.style.top = `${tops.get(node) || 0}px`; // leaves the flow in place, so the card can resize at once
        node.classList.add("is-leaving");
        setTimeout(() => node.remove(), ui.cssMs("--duration-medium"));
      });
      if (window.DS) DS.init(projList);

      proj.toggleAttribute("data-collapsible", collapsible);
      proj.toggleAttribute("data-open", collapsible && projOpen);
      $("#proj-more").setAttribute("aria-expanded", String(projOpen));
      $("#proj-more").inert = !collapsible || projOpen;
      $("#proj-less").inert = !collapsible || !projOpen;
    }, animate && !!projMonth);
    projMonth = view;
  }

  // Annotation 35:995: on hover the hours swap to days in the month.
  const collapsed = () => proj.hasAttribute("data-collapsible") && !proj.hasAttribute("data-open");
  projList.addEventListener("pointerover", (e) => {
    if (collapsed()) return; // no row hover while collapsed: the rows sit under Show all
    const item = e.target.closest(".pitem:not([data-archived])");
    if (item && !item.contains(e.relatedTarget)) ui.swapText(item.querySelector(".pitem__stat"), item.dataset.days);
  });
  projList.addEventListener("pointerout", (e) => {
    const item = e.target.closest(".pitem:not([data-archived])");
    if (item && !item.contains(e.relatedTarget) && !item.contains(document.activeElement)) ui.swapText(item.querySelector(".pitem__stat"), item.dataset.hours);
  });
  projList.addEventListener("focusin", (e) => {
    const item = e.target.closest(".pitem:not([data-archived])");
    if (item) ui.swapText(item.querySelector(".pitem__stat"), item.dataset.days);
  });
  projList.addEventListener("focusout", (e) => {
    const item = e.target.closest(".pitem:not([data-archived])");
    if (item && !item.contains(e.relatedTarget) && !item.matches(":hover")) ui.swapText(item.querySelector(".pitem__stat"), item.dataset.hours);
  });
  projList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const id = btn.closest(".pitem").dataset.id;
    if (btn.dataset.act === "edit") modals.project(id);
    if (btn.dataset.act === "restore") store.archiveProject(id, false);
    if (btn.dataset.act === "delete") modals.confirmArchivedDelete(id);
  });
  projTabs.addEventListener("ds:change", (e) => {
    projTab = e.detail.value;
    projOpen = false;
    renderProjects(true);
  });
  $("#proj-add").addEventListener("click", () => modals.project());
  $("#sum-add").addEventListener("click", () => modals.project()); // mobile summary: tap the project count
  $("#proj-more").addEventListener("click", () => { projOpen = true; renderProjects(true); $("#proj-less").focus({ preventScroll: true }); });
  $("#proj-less").addEventListener("click", () => { projOpen = false; renderProjects(true); });

  /* Archived projects · mobile, Figma 288:39424. [?] Restore is immediate with Reset in the toast;
     delete goes through the same confirmation as the Archived tab on desktop. */
  function renderArchive() {
    const list = store.archived();
    $("#arch").hidden = !list.length;
    $("#arch-list").innerHTML = list.map((p) => `
      <div class="drow arch__row" data-id="${p.id}">
        <span class="arch__main"><span class="drow__who"><img class="drow__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><span class="drow__name">${ui.esc(p.name)}</span></span></span>
        <button class="ds-icon-btn arch__btn" data-type="secondary" data-variant="ghost" type="button" data-act="restore" aria-label="Restore ${ui.esc(p.name)}"><img src="assets/restore-24.svg" alt="" width="24" height="24"></button>
        <button class="ds-icon-btn arch__btn" data-type="secondary" type="button" data-act="delete" aria-label="Delete ${ui.esc(p.name)}"><img src="assets/delete-24-red.svg" alt="" width="24" height="24"></button>
      </div>`).join("");
  }
  $("#arch-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]");
    if (!btn) return;
    const p = store.project(btn.closest(".arch__row").dataset.id);
    if (btn.dataset.act === "delete") { modals.confirmArchivedDelete(p.id); return; }
    const snap = store.snapshot();
    store.archiveProject(p.id, false);
    ui.toast({ title: `${p.name} restored`, onAction: () => store.restore(snap) });
  });

  /* ───── Billing · Figma 100:2521 ───── */

  $("#bill-cur").insertAdjacentHTML("beforeend", ui.pickerMarkup());
  ui.currencyPicker({
    root: $("#bill-cur"),
    toggle: $("#bill-cur .currency"),
    pop: $("#bill-cur .cur__pop"),
    get: () => state.currency,
    choose: (code) => store.set("currency", code),
  });

  const billProjects = $("#bill-projects");
  const billDeductions = $("#bill-deductions");

  function renderBilling(animate) {
    const m = store.month(view);
    ui.swapText($("#cur-code"), state.currency, animate);
    document.querySelectorAll("[data-cur-symbol]").forEach((el) => ui.swapText(el, sym(), animate));

    // Projects with hours in this month. All area is clickable for copy (annotation 288:40251).
    fold($("#bill-projects-fold"), !m.rows.length && !m.payments.length, animate);
    const seen = new Map([...billProjects.children].map((n) => [n.dataset.id, n]));
    // Project rows, then extra payments of this month (Figma 321:54200) in the same list.
    const lines = [
      ...m.rows.map((r) => ({ id: r.project.id, name: r.project.name, amount: r.amount })),
      ...m.payments.map((pm) => ({ id: `pay-${pm.payment.id}`, name: pm.payment.name, amount: pm.amount })),
    ];
    lines.forEach((row) => {
      let node = seen.get(row.id);
      if (!node) {
        billProjects.insertAdjacentHTML("beforeend", `
          <button class="receipt__proj" type="button" data-id="${ui.esc(row.id)}">
            <span class="receipt__pname"></span>
            <span class="receipt__pamount">
              <span class="copy-swap" data-state="copy" aria-hidden="true"><img data-icon="copy" src="assets/copy.svg" alt="" width="16" height="16"><img data-icon="done" src="assets/check-circle.svg" alt="" width="16" height="16"></span>
              <span class="receipt__pvalue"><span data-cur-symbol>${ui.esc(sym())}</span><span class="receipt__pnum"></span></span>
            </span>
          </button>`);
        node = billProjects.lastElementChild;
      }
      seen.delete(row.id);
      billProjects.appendChild(node);
      node.querySelector(".receipt__pname").textContent = row.name;
      node.dataset.copy = row.amount.toFixed(2);
      node.setAttribute("aria-label", `Copy ${row.name}: ${sym()}${store.fmt.number(row.amount)}`);
      ui.setNumber(node.querySelector(".receipt__pnum"), store.fmt.number(row.amount), animate);
    });
    seen.forEach((node) => node.remove());

    ui.setNumber($("#bill-hours"), store.fmt.hours(m.hours), animate);
    ui.setNumber($("#bill-total"), store.fmt.number(m.gross), animate);

    // No deductions yet → the empty design's "Taxes 0% -$0" row, still editable.
    const rows = m.deductions.some((d) => d.kind === "global")
      ? m.deductions
      : [{ deduction: { id: "none", name: "Taxes" }, amount: 0, pct: 0, kind: "global" }, ...m.deductions];
    const known = new Map([...billDeductions.children].map((n) => [n.dataset.id, n]));
    rows.forEach((d, i) => {
      let node = known.get(d.deduction.id);
      if (!node) {
        billDeductions.insertAdjacentHTML("beforeend", `
          <div class="receipt__row" data-id="${ui.esc(d.deduction.id)}">
            <span class="receipt__label" data-tone="muted"><span class="receipt__dname"></span></span>
            <span class="receipt__tax">
              <span class="chip"><span class="receipt__dpct"></span>%</span>
              <span class="receipt__value">-<span data-cur-symbol>${ui.esc(sym())}</span><span class="receipt__damount"></span></span>
            </span>
          </div>`);
        node = billDeductions.lastElementChild;
      }
      known.delete(d.deduction.id);
      billDeductions.appendChild(node);
      node.dataset.kind = d.kind;
      node.querySelector(".receipt__dname").textContent = d.deduction.name;
      // A pencil on the first row of each group: deductions for every month, commission for this one.
      const label = node.querySelector(".receipt__label");
      const edit = label.querySelector(".receipt__edit");
      const firstOfKind = rows.findIndex((x) => x.kind === d.kind) === i;
      const tip = d.kind === "month" ? "Edit commission" : "Edit deductions";
      if (edit && (!firstOfKind || edit.dataset.edit !== d.kind)) edit.remove();
      if (firstOfKind && !label.querySelector(".receipt__edit")) label.insertAdjacentHTML("beforeend", `<button class="receipt__edit" type="button" data-edit="${d.kind}" aria-label="${tip}" data-ds-tooltip="${tip}"><img src="assets/pencil.svg" alt="" width="16" height="16"></button>`);
      ui.setNumber(node.querySelector(".receipt__dpct"), String(Math.round(d.pct * 100) / 100), animate);
      ui.setNumber(node.querySelector(".receipt__damount"), store.fmt.number(d.amount), animate);
    });
    known.forEach((node) => node.remove());

    $("#bill-net-sign").textContent = m.net < 0 ? "-" : "";
    ui.setNumber($("#bill-net"), store.fmt.number(m.net), animate);
  }

  billProjects.addEventListener("click", async (e) => {
    const btn = e.target.closest(".receipt__proj");
    if (!btn) return;
    try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (err) { return; }
    const swap = btn.querySelector(".copy-swap");
    swap.dataset.state = "done";
    clearTimeout(btn._copyTimer);
    btn._copyTimer = setTimeout(() => { swap.dataset.state = "copy"; }, 1400);
  });
  billDeductions.addEventListener("click", (e) => {
    // Mobile, annotation 288:40288: the whole deductions box is clickable; a commission row opens commission.
    const target = e.target.closest(".receipt__edit") || (mobile.matches && e.target.closest(".receipt__row"));
    if (!target) return;
    if ((target.dataset.edit || target.dataset.kind) === "month") modals.commission(view);
    else modals.deductions();
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
  // Each point opens its modal for the month on screen · Figma 321:54140.
  extra.addEventListener("click", (e) => {
    const point = e.target.closest(".extra__point[data-action]");
    if (!point) return;
    setExtra(false);
    modals[point.dataset.action](view);
  });

  /* ───── Mobile · Figma 277:42013 (empty), 288:39208 (calendar tab), 288:40202 (billing tab) ─────
     The same nodes change slots: Onboarding moves into the summary card, the month title
     follows the open tab, Extra actions leaves the calendar card for the Billing tab. */

  const TAB_KEY = "prodrec.mvp.tab";
  const onbFold = $("#onb-fold");
  const calLead = $(".cal-head__lead");
  const calNav = $(".cal-nav");
  let tab = "calendar";
  try { if (localStorage.getItem(TAB_KEY) === "billing") tab = "billing"; } catch (e) { /* storage blocked */ }

  function placeNodes() {
    const m = mobile.matches;
    if (m && onbFold.parentElement !== $("#sum")) $("#sum").appendChild(onbFold);
    if (!m && onbFold.parentElement !== $(".side")) $(".side").prepend(onbFold);
    const leadHome = m && tab === "billing" ? $(".bill .card__title") : $(".cal-head");
    if (calLead.parentElement !== leadHome) leadHome.prepend(calLead);
    // Month arrows follow the title, so Billing can switch months too.
    const onBill = m && tab === "billing";
    if (onBill && calNav.parentElement !== $(".bill")) $(".bill .card__title").after(calNav);
    if (!onBill && calNav.parentElement !== $(".cal-head__actions")) $(".cal-head__actions").prepend(calNav);
    const extraHome = m ? $(".page") : $(".cal");
    if (extra.parentElement !== extraHome) extraHome.appendChild(extra);
  }

  function setTab(next, { save = true } = {}) {
    tab = next;
    document.documentElement.dataset.tab = tab;
    document.querySelectorAll(".tabs__item").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    if (save) { try { localStorage.setItem(TAB_KEY, tab); } catch (e) { /* storage blocked */ } }
    closeDayPopovers();
    setMenu(false);
    setExtra(false);
    ui.closeFloats();
    placeNodes();
  }
  $(".tabs").addEventListener("click", (e) => {
    const item = e.target.closest(".tabs__item");
    if (!item || item.dataset.tab === tab) return;
    setTab(item.dataset.tab);
    window.scrollTo({ top: 0 });
  });
  mobile.addEventListener("change", () => {
    setExtra(false);
    if (daySheet) ui.closeModal(); // the drawer is mobile-only; desktop uses the hours popover
    placeNodes();
  });
  $(".extra__glow").addEventListener("click", () => setExtra(false));

  /* Summary card. [?] "still empty" counts working days before today with no hours
     (weekends only when they are on); tax is the sum of percentage deductions, fee the fixed ones. */
  function ago(ms) {
    const min = Math.floor(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const h = Math.floor(min / 60);
    return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
  }
  function emptyDays(v) {
    if (v > today) return 0;
    const last = isCurrentMonth(v) ? today.getDate() - 1 : new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
    let n = 0;
    for (let i = 1; i <= last; i++) {
      const d = new Date(v.getFullYear(), v.getMonth(), i);
      if (!state.weekends && (d.getDay() === 0 || d.getDay() === 6)) continue;
      if (!store.dayEntries(store.keyOf(d)).length) n++;
    }
    return n;
  }
  const plural = (n, one, many) => (n === 1 ? one : many);

  function renderSummary(animate) {
    const m = store.month(view);
    $("#sum-net-sign").textContent = m.net < 0 ? "-" : "";
    ui.setNumber($("#sum-net"), store.fmt.number(Math.round(Math.abs(m.net))), animate);
    ui.swapText($("#sum-month"), MONTHS_LONG[view.getMonth()], animate);
    ui.setNumber($("#sum-hours"), store.fmt.hours(m.hours), animate);
    ui.setNumber($("#sum-days"), m.days, animate);
    $("#sum-days-unit").textContent = plural(m.days, "day", "days");
    const n = m.rows.length;
    ui.setNumber($("#sum-projects"), n, animate);
    $("#sum-projects-unit").textContent = plural(n, "project", "projects");
    // Up to three avatars of this month's projects; the empty frame shows one neutral avatar.
    $("#sum-avatars").innerHTML = (n ? m.rows.slice(0, 3).map((r) => r.project.avatar) : ["black"])
      .map((a) => `<img class="sum__avatar" src="${ui.avatarSrc(a)}" alt="">`).join("");

    const empty = m.days ? emptyDays(view) : 0;
    const badge = $("#sum-empty");
    badge.hidden = !empty;
    if (empty) badge.textContent = `${empty} ${plural(empty, "day is", "days are")} still empty`;

    const s = sym();
    const pct = m.deductions.filter((d) => d.deduction.type === "percent").reduce((a, d) => a + d.deduction.value, 0);
    const fee = m.deductions.filter((d) => d.deduction.type !== "percent").reduce((a, d) => a + d.amount, 0);
    const parts = state.updatedAt ? [`Updated ${ago(Date.now() - state.updatedAt)}`] : [];
    parts.push(`Σ ${s}${store.fmt.number(Math.round(m.gross))}`, `tax ${Math.round(pct * 100) / 100}%`, `fee ${s}${store.fmt.number(Math.round(fee))}`);
    $("#sum-meta").textContent = parts.join(" · ");
  }
  setInterval(() => { if (mobile.matches) renderSummary(false); }, 60 * 1000);

  /* ───── Dismissal ───── */

  document.addEventListener("pointerdown", (e) => {
    if (ui.modalOpen()) return;
    const inDay = e.target.closest(".day");
    if (!pop.hidden && !pop.contains(e.target) && !inDay) { closePop(); clearRange(); }
    if (ui.isOpen(hpop) && !hpop.contains(e.target) && !inDay) { closeHoursFloat(); clearRange(); }
    if (!menu.contains(e.target)) setMenu(false);
    if (extra.dataset.open === "true" && !extra.contains(e.target)) setExtra(false);
  });

  document.addEventListener("keydown", (e) => {
    if (ui.modalOpen()) return;
    if (e.key === "Escape") {
      closeDayPopovers(); setMenu(false); ui.closeFloats(); setExtra(false);
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest("input, textarea, [role='menu'], .ds-segmented")) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  /* ───── Store → screen ───── */

  store.subscribe((reason) => {
    if (reason === "entries" || reason === "projects" || reason === "restore") refreshGrid();
    if (reason === "weekends" || reason === "restore") renderWeekends();
    if (reason === "weekends") { closeDayPopovers(); swapWeek(true); }
    renderMeta(true);
    renderBilling(true);
    renderProjects(true);
    renderOnboarding(true);
    renderSummary(true);
    renderArchive();
    if (daySheet && (daySheet.mode === "list" || !store.project(daySheet.projectId))) renderDay();
    if (hours) {
      if (!store.active().length) closeDayPopovers();
      else renderHours();
    }
  });

  /* ───── Receipt barcode · Figma 93:1356 (width, or leftPad:width) ───── */

  $("#barcode").innerHTML = "8 3 6 8:6 8:1 2:1 2:2 4 8:6 5 2 1 1 3 8 12:6 3 6 8:6 8:1 2:1 2:2 4 8:6 5 2 1 1 3 12:6 5 5 5 2 1 1 2"
    .split(" ")
    .map((t) => { const [l, w] = t.includes(":") ? t.split(":") : [0, t]; return `<i style="inline-size:${w}px;margin-inline-start:${l}px"></i>`; })
    .join("");

  days.dataset.week = state.weekends ? "7" : "5";
  $(".days__head").innerHTML = LABELS.slice(0, state.weekends ? 7 : 5).map((l) => `<span>${l}</span>`).join("");
  renderHeader(1, false);
  renderGrid(1, false);
  renderWeekends();
  renderOnboarding(false);
  renderProjects(false);
  renderBilling(false);
  renderSummary(false);
  renderArchive();
  setTab(tab, { save: false });
})();
