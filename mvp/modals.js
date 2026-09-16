/* prod.rec MVP · modals · Figma 292:107695 and 321:54140.
   New project (292:99846), Edit project (292:106995), Deductions (292:107589),
   history confirmation (292:107376, reusable for any confirmation),
   Commission (321:54144), Extra hours (321:54172), Extra payments (321:54200). Needs store.js, ui.js. */
(function () {
  "use strict";

  const { store, ui } = window.PR;
  const { esc } = ui;

  const closeBtn = `<button class="ds-icon-btn" data-type="secondary" type="button" aria-label="Close" data-close><img src="assets/close-14.svg" alt="" width="14" height="14"></button>`;
  const separator = `<span class="ds-separator" role="presentation"></span>`;

  function field({ id, placeholder, value = "", inputmode, cls = "" }) {
    return `<div class="ds-field ${cls}" data-size="md" data-width="fill"><div class="ds-field__control"><span class="ds-field__slot"><input class="ds-field__input" id="${id}" type="text" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off"${inputmode ? ` inputmode="${inputmode}"` : ""}></span></div></div>`;
  }

  const parseNum = (v) => {
    const n = parseFloat(String(v).replace(/\s|’|'/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  /* ───── New / Edit project ───── */

  function projectModal(projectId) {
    const editing = projectId ? store.project(projectId) : null;
    const draft = editing
      ? { name: editing.name, rate: editing.rate, currency: editing.currency, avatar: editing.avatar }
      : { name: "", rate: "", currency: store.state.currency, avatar: store.AVATARS[0] };
    const initial = JSON.stringify(draft);
    const nextName = `Project ${String(store.state.projects.length + 1).padStart(2, "0")}`;
    const all = editing ? store.projectAllTime(editing) : null;
    const created = editing && editing.createdAt ? editing.createdAt.split("-").reverse().map((x, i) => (i === 2 ? x.slice(2) : x)).join(".") : "";
    const sym = (code) => store.currency(code).symbol;

    const el = document.createElement("div");
    el.setAttribute("aria-labelledby", "pm-title");
    el.innerHTML = `
      <div class="modal__head">
        <div class="modal__title">
          ${editing ? "" : `<img class="modal__avatar" id="pm-head-avatar" src="${ui.avatarSrc(draft.avatar)}" alt="" width="24" height="24">`}
          <div class="modal__titles">
            <h2 class="modal__h" id="pm-title">${editing ? "Edit project" : "New project"}</h2>
            ${editing ? `<p class="modal__sub">Changes apply to every month, past and future.</p>` : ""}
          </div>
        </div>
        ${closeBtn}
      </div>
      ${editing && all.hours > 0 ? `
      <div class="pm-summary">
        <div class="pm-summary__cell"><span class="pm-summary__value">${esc(sym(editing.currency))} ${store.fmt.number(all.amount)}</span><span class="pm-summary__label">Total profit</span></div>
        <span class="pm-summary__sep" aria-hidden="true"></span>
        <div class="pm-summary__cell"><span class="pm-summary__value">${store.fmt.hours(all.hours)} h.</span><span class="pm-summary__label">Total time</span></div>
        <span class="pm-summary__sep" aria-hidden="true"></span>
        <div class="pm-summary__cell"><span class="pm-summary__value">${esc(created)}</span><span class="pm-summary__label">Created</span></div>
      </div>` : ""}
      ${separator}
      <div class="pm-avatars" role="radiogroup" aria-label="Project picture"></div>
      <input type="file" accept="image/*" hidden id="pm-file">
      ${separator}
      <div class="pm-form">
        <div class="pm-row">
          <label class="pm-label" for="pm-name">Project name</label>
          ${field({ id: "pm-name", placeholder: nextName, value: draft.name })}
        </div>
        <div class="pm-row">
          <label class="pm-label" for="pm-rate">Hour rate</label>
          ${field({ id: "pm-rate", placeholder: "0", value: draft.rate === "" ? "" : String(draft.rate), inputmode: "decimal", cls: "pm-rate" })}
          <div class="cur pm-cur">
            <button class="cur-select" type="button" aria-label="Rate currency"><span class="cur-select__sym"></span><span class="cur-select__code"></span><img src="assets/selector-14.svg" alt="" width="14" height="14"></button>
            ${ui.pickerMarkup("pm-cur__pop")}
          </div>
        </div>
      </div>
      ${separator}
      <div class="modal__foot">
        ${editing
          ? `<button class="ds-btn" data-type="secondary" data-size="lg" type="button" id="pm-delete"><img src="assets/delete-24.svg" alt="" width="24" height="24"><span>Delete</span></button>
             <button class="ds-btn" data-size="lg" type="button" id="pm-submit" disabled>Save changes</button>`
          : `<button class="ds-btn" data-type="secondary" data-size="lg" type="button" data-close>Cancel</button>
             <button class="ds-btn" data-size="lg" type="button" id="pm-submit">Create project</button>`}
      </div>`;

    const $ = (s) => el.querySelector(s);
    const avatars = $(".pm-avatars");
    const file = $("#pm-file");
    const submit = $("#pm-submit");
    let custom = draft.avatar && draft.avatar.startsWith("data:") ? draft.avatar : null;

    function renderAvatars() {
      const tile = (value, src, label) => `<button class="pm-avatar t-avatar" type="button" role="radio" aria-checked="${draft.avatar === value}" aria-label="${esc(label)}" data-avatar="${esc(value)}"><img src="${src}" alt=""></button>`;
      const first = custom
        ? tile(custom, custom, "Uploaded picture").replace('data-avatar', 'data-custom data-avatar')
        : `<button class="ds-icon-btn pm-upload t-avatar" data-type="secondary" data-size="lg" type="button" aria-label="Upload picture" data-upload><img src="assets/upload.svg" alt="" width="20" height="20"></button>`;
      avatars.innerHTML = first + store.AVATARS.map((a) => tile(a, ui.avatarSrc(a), `${a} picture`)).join("");
    }
    function pickAvatar(value) {
      draft.avatar = value;
      avatars.querySelectorAll("[role='radio']").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.avatar === value)));
      const head = $("#pm-head-avatar");
      if (head) { head.src = ui.avatarSrc(value); head.classList.remove("is-swapped"); void head.offsetWidth; head.classList.add("is-swapped"); }
      sync();
    }
    avatars.addEventListener("click", (e) => {
      const up = e.target.closest("[data-upload]");
      const opt = e.target.closest("[data-avatar]");
      // Annotation 288:46534: upload a picture. A selected uploaded picture opens the picker again to replace it.
      if (up || (opt && opt.hasAttribute("data-custom") && opt.getAttribute("aria-checked") === "true")) { file.click(); return; }
      if (opt) pickAvatar(opt.dataset.avatar);
    });
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      try {
        custom = await ui.readAvatar(f);
        renderAvatars();
        pickAvatar(custom);
      } catch (err) { /* unreadable image: keep the current picture */ }
      file.value = "";
    });
    ui.bindAvatarHover(avatars, ".pm-avatars");
    renderAvatars();

    const curRoot = $(".pm-cur");
    function renderCurrency() {
      $(".cur-select__sym").textContent = sym(draft.currency);
      $(".cur-select__code").textContent = draft.currency;
    }
    renderCurrency();
    ui.currencyPicker({
      root: curRoot,
      toggle: $(".cur-select"),
      pop: $(".cur__pop"),
      get: () => draft.currency,
      choose: (code) => { draft.currency = code; renderCurrency(); sync(); },
    });

    const nameInput = $("#pm-name");
    const rateInput = $("#pm-rate");
    nameInput.addEventListener("input", () => { draft.name = nameInput.value; sync(); });
    rateInput.addEventListener("input", () => {
      const clean = rateInput.value.replace(/[^\d.,]/g, "");
      if (clean !== rateInput.value) rateInput.value = clean;
      draft.rate = clean;
      sync();
    });

    function values() {
      const rate = parseNum(draft.rate);
      return { name: draft.name.trim() || nextName, rate: Number.isFinite(rate) ? rate : 0, currency: draft.currency, avatar: draft.avatar };
    }
    // Save changes stays disabled (Figma 292:107119, 50%) until something actually differs.
    const norm = (d) => JSON.stringify({ name: String(d.name).trim(), rate: d.rate === "" ? "" : parseNum(d.rate), currency: d.currency, avatar: d.avatar });
    function sync() {
      if (!editing) return;
      submit.disabled = norm(draft) === norm(JSON.parse(initial));
    }

    function done() {
      const v = values();
      if (editing) store.updateProject(editing.id, v);
      else store.addProject(v);
      ui.closeModal();
    }
    submit.addEventListener("click", done);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches(".pm-form input") && !submit.disabled) { e.preventDefault(); done(); }
    });

    if (editing) {
      $("#pm-delete").addEventListener("click", () => requestDelete(editing.id));
    }

    ui.openModal(el, { initialFocus: "#pm-name" });
  }

  /* ───── Delete: no history → delete now with an undo toast; history → confirmation ───── */

  function requestDelete(id) {
    const p = store.project(id);
    const h = store.projectAllTime(p).hours;
    if (h > 0) { confirmHistory(p, h); return; }
    deleteWithUndo(p);
  }

  function deleteWithUndo(p) {
    const snap = store.snapshot();
    store.deleteProject(p.id);
    ui.closeModal();
    ui.toast({ title: `${p.name} deleted`, onAction: () => store.restore(snap) });
  }

  /* Figma 292:107376 · "We can use this layout for any action confirmation". */
  function confirmModal({ avatar, title, text, secondary, primary }) {
    const el = document.createElement("div");
    el.classList.add("modal--confirm");
    el.setAttribute("aria-labelledby", "cm-title");
    el.setAttribute("aria-describedby", "cm-text");
    el.innerHTML = `
      <div class="modal__head">
        <div class="modal__title">
          ${avatar ? `<img class="modal__avatar" src="${avatar}" alt="" width="24" height="24">` : ""}
          <h2 class="modal__h" id="cm-title">${esc(title)}</h2>
        </div>
        ${closeBtn}
      </div>
      <p class="modal__text" id="cm-text">${esc(text)}</p>
      ${separator}
      <div class="modal__foot">
        <button class="ds-btn" data-type="secondary" data-size="lg" type="button" data-act="secondary">${secondary.icon ? `<img src="${secondary.icon}" alt="" width="24" height="24">` : ""}<span>${esc(secondary.label)}</span></button>
        <button class="ds-btn" data-size="lg" type="button" data-act="primary">${primary.icon ? `<img src="${primary.icon}" alt="" width="24" height="24">` : ""}<span>${esc(primary.label)}</span></button>
      </div>`;
    el.querySelector("[data-act='secondary']").addEventListener("click", secondary.run);
    el.querySelector("[data-act='primary']").addEventListener("click", primary.run);
    ui.openModal(el, { initialFocus: "[data-act='primary']" });
  }

  function confirmHistory(p, h) {
    confirmModal({
      avatar: ui.avatarSrc(p.avatar),
      title: `${p.name} has ${store.fmt.hours(h)} h. of history`,
      text: "Archiving hides it from the calendar and keeps those hours in the months you already worked. Deleting erases them from those months too, and can't be undone.",
      secondary: { label: "Delete anyway", icon: "assets/delete-24.svg", run: () => { store.deleteProject(p.id); ui.closeModal(); } },
      primary: { label: "Archive", icon: "assets/archive-24-white.svg", run: () => { store.archiveProject(p.id); ui.closeModal(); } },
    });
  }

  /* [?] Deleting from the Archived tab is not drawn. Same layout, archive swapped for keep. */
  function confirmArchivedDelete(id) {
    const p = store.project(id);
    const h = store.projectAllTime(p).hours;
    if (!h) { deleteWithUndo(p); return; }
    confirmModal({
      avatar: ui.avatarSrc(p.avatar),
      title: `${p.name} has ${store.fmt.hours(h)} h. of history`,
      text: "Deleting erases those hours from the months you already worked, and can't be undone.",
      secondary: { label: "Delete anyway", icon: "assets/delete-24.svg", run: () => { store.deleteProject(p.id); ui.closeModal(); } },
      primary: { label: "Keep archived", run: () => ui.closeModal() },
    });
  }

  /* ───── Sum lists: Deductions (292:107589), Commission (321:54144), Extra payments (321:54200) ─────
     One form, three configs. `typed` adds the % / $ segmented control; without it every row is a sum. */

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthBadge = (view) => `<span class="month-badge">${MONTHS[view.getMonth()]}</span>`;

  function listModal(cfg) {
    const blankRow = () => ({ id: store.uid(), name: "", value: "", type: cfg.typed ? "percent" : "fixed" });
    const draft = {
      currency: cfg.currency,
      rows: cfg.rows.length ? cfg.rows.map((d) => ({ ...d, value: String(d.value) })) : [blankRow()],
    };

    const el = document.createElement("div");
    el.setAttribute("aria-labelledby", "dd-title");
    el.innerHTML = `
      <div class="modal__head">
        <div class="modal__titles${cfg.view ? " modal__titles--badge" : ""}">
          ${cfg.view ? monthBadge(cfg.view) : ""}
          <div class="modal__titles">
            <h2 class="modal__h" id="dd-title">${esc(cfg.title)}</h2>
            <p class="modal__sub">${esc(cfg.subtitle)}</p>
          </div>
        </div>
        <div class="cur dd-cur">
          <button class="currency" type="button" aria-label="Currency for sums"><span class="t-text-swap dd-cur__code">${draft.currency}</span><img src="assets/selector-vertical.svg" alt=""></button>
          ${ui.pickerMarkup("dd-cur__pop")}
        </div>
      </div>
      ${separator}
      <div class="dd-form">
        <div class="dd-rows${cfg.typed ? "" : " dd-rows--sums"}"></div>
        <button class="dd-add" type="button"><img src="assets/add-20-pink.svg" alt="" width="20" height="20"><span>Add another</span></button>
      </div>
      ${separator}
      <p class="modal__note">${esc(cfg.note)}</p>
      <div class="modal__foot">
        <button class="ds-btn" data-type="secondary" data-size="lg" type="button" data-close>Close</button>
        <button class="ds-btn" data-size="lg" type="button" id="dd-save">Save</button>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const rowsEl = $(".dd-rows");
    const symbol = () => store.currency(draft.currency).symbol;

    function rowMarkup(r) {
      const unit = r.type === "percent" ? "%" : symbol();
      const type = cfg.typed ? `
          <div class="ds-segmented dd-type" data-size="lg" aria-label="Type">
            <button class="ds-segmented__item" type="button" data-value="percent" aria-checked="${r.type === "percent"}" data-ds-tooltip="Percent of total">%</button>
            <button class="ds-segmented__item dd-type__fixed" type="button" data-value="fixed" aria-checked="${r.type === "fixed"}" data-ds-tooltip="Fixed sum per month">${esc(symbol())}</button>
          </div>` : "";
      return `
        <div class="dd-row" data-id="${r.id}">
          ${field({ id: `dd-name-${r.id}`, placeholder: cfg.placeholder, value: r.name })}
          <label class="dd-value">
            <input class="dd-value__input" type="text" inputmode="decimal" placeholder="0" value="${esc(r.value)}" aria-label="Amount">
            <span class="dd-value__unit t-text-swap" aria-hidden="true">${esc(unit)}</span>
          </label>
          ${type}
          <button class="ds-icon-btn dd-remove" data-type="secondary" data-variant="link" type="button" aria-label="Remove"><img src="assets/close-14-muted.svg" alt="" width="14" height="14"></button>
        </div>`;
    }
    function renderRows() {
      rowsEl.innerHTML = draft.rows.map(rowMarkup).join("");
      if (window.DS) DS.init(rowsEl);
    }
    const rowOf = (node) => draft.rows.find((r) => r.id === node.closest(".dd-row").dataset.id);

    rowsEl.addEventListener("input", (e) => {
      const r = rowOf(e.target);
      if (e.target.matches(".ds-field__input")) r.name = e.target.value;
      if (e.target.matches(".dd-value__input")) {
        const clean = e.target.value.replace(/[^\d.,]/g, "");
        if (clean !== e.target.value) e.target.value = clean;
        r.value = clean;
      }
    });
    rowsEl.addEventListener("ds:change", (e) => {
      const r = rowOf(e.target);
      r.type = e.detail.value;
      ui.swapText(e.target.closest(".dd-row").querySelector(".dd-value__unit"), r.type === "percent" ? "%" : symbol());
    });
    rowsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".dd-remove");
      if (!btn) return;
      const row = btn.closest(".dd-row");
      draft.rows = draft.rows.filter((r) => r.id !== row.dataset.id);
      // Collapse the row, then drop it. Keep one empty row so the form never goes blank.
      row.style.blockSize = `${row.offsetHeight}px`;
      void row.offsetHeight;
      row.classList.add("is-leaving");
      setTimeout(() => {
        row.remove();
        if (!draft.rows.length) { draft.rows.push(blankRow()); renderRows(); }
      }, ui.cssMs("--duration-medium"));
    });
    $(".dd-add").addEventListener("click", () => {
      const r = blankRow();
      draft.rows.push(r);
      rowsEl.insertAdjacentHTML("beforeend", rowMarkup(r));
      const row = rowsEl.lastElementChild;
      row.classList.add("is-entering");
      if (window.DS) DS.init(row);
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove("is-entering")));
      row.querySelector(".ds-field__input").focus({ preventScroll: true });
    });

    ui.currencyPicker({
      root: $(".dd-cur"),
      toggle: $(".dd-cur .currency"),
      pop: $(".dd-cur .cur__pop"),
      get: () => draft.currency,
      choose: (code) => {
        draft.currency = code;
        ui.swapText($(".dd-cur__code"), code);
        rowsEl.querySelectorAll(".dd-type__fixed").forEach((b) => ui.swapText(b, symbol()));
        rowsEl.querySelectorAll(".dd-row").forEach((row) => {
          if (rowOf(row).type === "fixed") ui.swapText(row.querySelector(".dd-value__unit"), symbol());
        });
      },
    });

    $("#dd-save").addEventListener("click", () => {
      const list = draft.rows
        .map((r) => ({ id: r.id, name: r.name.trim(), value: parseNum(r.value), type: r.type }))
        .filter((r) => Number.isFinite(r.value) && r.value > 0)
        .map((r) => ({ ...r, name: r.name || cfg.fallbackName(r), value: r.type === "percent" ? Math.min(r.value, 100) : r.value }));
      cfg.save(list, draft.currency);
      ui.closeModal();
    });

    renderRows();
    ui.openModal(el, { initialFocus: ".dd-row .ds-field__input" });
  }

  function deductionsModal() {
    listModal({
      title: "Deductions",
      subtitle: "Enter it once — it applies to every month.",
      note: "Percentages are calculated from the total amount. Fixed sums are charged once per month, even in a month with no work.",
      placeholder: "Category name",
      typed: true,
      currency: store.state.deductionsCurrency || store.state.currency,
      rows: store.state.deductions,
      fallbackName: (r) => (r.type === "percent" ? "Taxes" : "Fee"),
      save: (list, cur) => store.setDeductions(list, cur),
    });
  }

  function commissionModal(view) {
    const m = store.monthData(view);
    listModal({
      view,
      title: "Commission",
      subtitle: "Extra costs for this month only. They don't carry over.",
      note: `Applies to ${MONTHS[view.getMonth()]} only. Percentages are taken from that month's total amount.`,
      placeholder: "Expense name",
      typed: true,
      currency: m.commissionCurrency || store.state.currency,
      rows: m.commission || [],
      fallbackName: () => "Commission",
      save: (list, cur) => store.setMonthly(view, { commission: list, commissionCurrency: cur }),
    });
  }

  function paymentsModal(view) {
    const m = store.monthData(view);
    listModal({
      view,
      title: "Extra payments",
      subtitle: "Bonuses and other one-off income for this month.",
      note: `Added to ${MONTHS[view.getMonth()]}'s total amount, on top of your hours.`,
      placeholder: "Payment name",
      typed: false,
      currency: m.paymentsCurrency || store.state.currency,
      rows: m.payments || [],
      fallbackName: () => "Extra payment",
      save: (list, cur) => store.setMonthly(view, { payments: list, paymentsCurrency: cur }),
    });
  }

  /* ───── Extra hours · Figma 321:54172: hours per project for one month, all start at 0 ───── */

  function extraHoursModal(view) {
    const projects = store.active();
    const saved = store.monthData(view).extraHours || {};
    const draft = new Map(projects.map((p) => [p.id, Number(saved[p.id]) || 0]));
    const clamp = (v) => Math.min(999, Math.max(0, Math.round(v * 2) / 2));

    const el = document.createElement("div");
    el.setAttribute("aria-labelledby", "eh-title");
    el.innerHTML = `
      <div class="modal__head modal__head--stack">
        <div class="modal__titlerow">
          <h2 class="modal__h" id="eh-title">Extra hours</h2>
          ${monthBadge(view)}
        </div>
        <p class="modal__sub">Hours that don't sit on a calendar day. All start at 0.</p>
      </div>
      ${separator}
      <div class="eh-rows">
        ${projects.length ? projects.map((p) => `
          <div class="hrow eh-row" data-id="${p.id}">
            <div class="hrow__name"><img class="hrow__avatar" src="${ui.avatarSrc(p.avatar)}" alt=""><span class="hrow__label">${esc(p.name)}</span></div>
            <div class="hstep">
              <button class="ds-icon-btn" data-type="secondary" type="button" data-step="-1" aria-label="Fewer hours for ${esc(p.name)}"><img src="assets/arrow-left-14.svg" alt="" width="14" height="14"></button>
              <label class="hstep__value"><input class="hstep__input" type="text" inputmode="decimal" autocomplete="off" aria-label="Extra hours for ${esc(p.name)}"><span aria-hidden="true">h.</span></label>
              <button class="ds-icon-btn" data-type="secondary" type="button" data-step="1" aria-label="More hours for ${esc(p.name)}"><img src="assets/arrow-right-14.svg" alt="" width="14" height="14"></button>
            </div>
          </div>`).join("") : `<p class="modal__text">No active projects yet. Add a project to give it extra hours.</p>`}
      </div>
      ${separator}
      <p class="modal__note">Added to each project's hours in ${MONTHS[view.getMonth()]} and paid at its hour rate.</p>
      <div class="modal__foot">
        <button class="ds-btn" data-type="secondary" data-size="lg" type="button" data-close>Close</button>
        <button class="ds-btn" data-size="lg" type="button" id="eh-save"${projects.length ? "" : " disabled"}>Save</button>
      </div>`;

    const rows = el.querySelector(".eh-rows");
    function paint(row, dir) {
      const v = draft.get(row.dataset.id);
      const input = row.querySelector(".hstep__input");
      input.value = store.fmt.hours(v);
      row.querySelector("[data-step='-1']").disabled = v <= 0;
      row.toggleAttribute("data-selected", v > 0);
      if (dir) {
        // transitions.dev 02 · number pop-in, direction follows the arrow.
        input.style.setProperty("--digit-dir-y", "0");
        input.style.setProperty("--digit-dir-x", String(dir));
        input.classList.remove("is-bump");
        void input.offsetWidth;
        input.classList.add("is-bump");
      }
    }
    const set = (row, v, dir) => { draft.set(row.dataset.id, clamp(v)); paint(row, dir); };
    rows.querySelectorAll(".eh-row").forEach((row) => paint(row));
    rows.addEventListener("click", (e) => {
      const step = e.target.closest("[data-step]");
      if (!step) return;
      const row = step.closest(".eh-row");
      set(row, draft.get(row.dataset.id) + Number(step.dataset.step), Number(step.dataset.step));
    });
    rows.addEventListener("change", (e) => {
      if (!e.target.matches(".hstep__input")) return;
      const row = e.target.closest(".eh-row");
      const v = parseNum(e.target.value);
      set(row, Number.isFinite(v) ? v : draft.get(row.dataset.id), 0);
    });
    rows.addEventListener("keydown", (e) => {
      if (!e.target.matches(".hstep__input")) return;
      const row = e.target.closest(".eh-row");
      if (e.key === "ArrowUp") { e.preventDefault(); set(row, draft.get(row.dataset.id) + 1, 1); }
      if (e.key === "ArrowDown") { e.preventDefault(); set(row, draft.get(row.dataset.id) - 1, -1); }
      if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
    });

    el.querySelector("#eh-save").addEventListener("click", () => {
      // Commit a value still being typed.
      if (document.activeElement && document.activeElement.matches(".hstep__input")) document.activeElement.blur();
      const extraHours = {};
      draft.forEach((v, id) => { if (v > 0) extraHours[id] = v; });
      store.setMonthly(view, { extraHours });
      ui.closeModal();
    });

    ui.openModal(el, { initialFocus: ".hstep__input" });
  }

  window.PR = Object.assign(window.PR, {
    modals: { project: projectModal, deductions: deductionsModal, commission: commissionModal, payments: paymentsModal, extraHours: extraHoursModal, requestDelete, confirmArchivedDelete },
  });
})();
