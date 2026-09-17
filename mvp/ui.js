/* prod.rec MVP · shared UI: transitions.dev helpers, modal, toast, currency picker, avatars.
   Needs store.js and design-system/components.js (DS.init, DS.openFloat / DS.closeFloat). */
(function () {
  "use strict";

  const { store } = window.PR;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  /* Reads a duration token ("150ms" or "0.15s") in milliseconds. */
  function cssMs(name, el = document.documentElement, fallback = 150) {
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return fallback;
    return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
  }

  /* ── transitions.dev · number-pop-in (02) ── First render sets the value without motion. */
  function setNumber(el, value, animate = true) {
    if (!el) return;
    const text = String(value);
    if (el.dataset.value === text) return;
    const firstPaint = el.dataset.value === undefined;
    el.dataset.value = text;
    el.classList.add("t-digit-group");
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

  /* ── transitions.dev · text-states-swap (04) ── Duration is read from the element. */
  function swapText(el, next, animate = true) {
    if (!el) return;
    if (el._swapTo === next || (el._swapTo === undefined && el.textContent === next)) return;
    el._swapTo = next;
    el.classList.add("t-text-swap");
    clearTimeout(el._swapTimer);
    if (!animate || reduced.matches || !el.textContent) { el.textContent = next; return; }
    el.classList.remove("is-enter-start");
    el.classList.add("is-exit");
    el._swapTimer = setTimeout(() => {
      el.textContent = next;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
    }, cssMs("--text-swap-dur", el));
  }

  /* ── transitions.dev · menu-dropdown (05) through design-system .ds-float ── */
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

  /* Page scroll lock while a sheet or modal is open. iOS Safari still scrolls the page under
     `overflow: hidden`, so the body is pinned with position: fixed and put back where it was. */
  const locks = new Set();
  let lockedY = 0;
  function lockPage(key, on) {
    const was = locks.size > 0;
    if (on) locks.add(key); else locks.delete(key);
    const now = locks.size > 0;
    if (was === now) return;
    const s = document.body.style;
    if (now) {
      lockedY = window.scrollY;
      Object.assign(s, { position: "fixed", top: `${-lockedY}px`, left: "0", right: "0" });
    } else {
      Object.assign(s, { position: "", top: "", left: "", right: "" });
      window.scrollTo(0, lockedY);
    }
  }

  /* Every float on the page registers a closer, so opening one closes the rest. */
  const floats = new Set();
  const closeFloats = (except) => floats.forEach((fn) => fn !== except && fn());

  /* ───── Avatars ───── */

  const avatarSrc = (avatar) => (!avatar ? "assets/avatars/pink.png" : avatar.startsWith("data:") ? avatar : `assets/avatars/${avatar}.png`);

  /* Resize an uploaded picture to 120px so it fits localStorage. */
  function readAvatar(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const size = 120;
          const c = document.createElement("canvas");
          c.width = c.height = size;
          const ctx = c.getContext("2d");
          const s = Math.min(img.width, img.height);
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
          resolve(c.toDataURL("image/jpeg", 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── transitions.dev · avatar-group-hover (11), delegated for any .t-avatar row ── */
  function bindAvatarHover(root, groupSel) {
    const cs = getComputedStyle(document.documentElement);
    const num = (name, fb) => { const v = parseFloat(cs.getPropertyValue(name)); return Number.isFinite(v) ? v : fb; };
    const ease = (name, fb) => cs.getPropertyValue(name).trim() || fb;
    function setShifts(group, activeIdx, phase) {
      const lift = num("--avatar-lift", -4);
      const falloff = num("--avatar-falloff", 0.45);
      const scale = num("--avatar-scale", 1.05);
      const tf = phase === "out" ? ease("--avatar-ease-out", "cubic-bezier(0.34, 3.85, 0.64, 1)") : ease("--avatar-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)");
      group.querySelectorAll(".t-avatar").forEach((el, i) => {
        el.style.transitionTimingFunction = tf;
        if (activeIdx == null) { el.style.setProperty("--shift", "0px"); el.style.setProperty("--scale-active", "1"); return; }
        const d = Math.abs(i - activeIdx);
        el.style.setProperty("--shift", (lift * Math.pow(falloff, d)).toFixed(3) + "px");
        el.style.setProperty("--scale-active", i === activeIdx ? String(scale) : "1");
      });
    }
    root.addEventListener("pointerover", (e) => {
      const a = e.target.closest(".t-avatar");
      const group = a && a.closest(groupSel);
      if (group) setShifts(group, [...group.querySelectorAll(".t-avatar")].indexOf(a), "in");
    });
    root.addEventListener("pointerout", (e) => {
      const group = e.target.closest(groupSel);
      if (group && !group.contains(e.relatedTarget)) setShifts(group, null, "out");
    });
  }

  /* ───── Currency picker · Figma 269:35841 ─────
     One list, three triggers: the Billing badge, the project rate input, the Deductions badge. */
  const phone = window.matchMedia("(max-width: 645px)");
  function currencyPicker({ root, toggle, pop, get, choose }) {
    const input = pop.querySelector(".cur__input");
    const list = pop.querySelector(".cur__list");
    const empty = pop.querySelector(".ds-popover__empty");
    const listId = list.id || (list.id = `cur-list-${store.uid()}`);
    let activeIdx = -1;

    function render() {
      const q = input.value.trim().toLowerCase();
      const shown = store.CURRENCIES.filter((c) => !q || `${c.code} ${c.name} ${c.symbol}`.toLowerCase().includes(q));
      list.innerHTML = shown.map((c) => `
        <button class="ds-menu-item" type="button" role="option" tabindex="-1" id="${listId}-${c.code}" data-code="${c.code}" aria-selected="${c.code === get()}">
          <span class="cur__sym">${esc(c.symbol)}</span><span class="cur__code">${c.code}</span><span class="cur__name">${esc(c.name)}</span>
        </button>`).join("");
      empty.hidden = shown.length > 0;
      setActive(q ? 0 : -1);
    }
    function setActive(i) {
      const opts = [...list.children];
      activeIdx = opts.length ? Math.max(-1, Math.min(i, opts.length - 1)) : -1;
      opts.forEach((o, n) => o.toggleAttribute("data-active", n === activeIdx));
      if (activeIdx >= 0) { input.setAttribute("aria-activedescendant", opts[activeIdx].id); opts[activeIdx].scrollIntoView({ block: "nearest" }); }
      else input.removeAttribute("aria-activedescendant");
    }
    function set(open) {
      if (open === isOpen(pop)) return;
      if (open) {
        closeFloats(closer);
        input.value = "";
        render();
        openFloat(pop);
        if (phone.matches) lockPage(pop, true);
        const sel = list.querySelector('[aria-selected="true"]');
        if (sel) sel.scrollIntoView({ block: "nearest" });
        // On a phone the picker is a sheet: focusing search would throw up the keyboard over six options.
        if (!phone.matches) input.focus({ preventScroll: true });
      } else {
        closeFloat(pop);
        lockPage(pop, false);
        if (pop.contains(document.activeElement)) toggle.focus({ preventScroll: true });
      }
      toggle.setAttribute("aria-expanded", String(open));
    }
    const closer = () => set(false);
    floats.add(closer);

    toggle.setAttribute("aria-haspopup", "listbox");
    toggle.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", listId);
    toggle.addEventListener("click", () => set(!isOpen(pop)));
    input.addEventListener("input", render);
    pop.querySelector(".cur__scrim").addEventListener("click", () => set(false));
    list.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-code]");
      if (!opt) return;
      choose(opt.dataset.code);
      set(false);
    });
    input.addEventListener("keydown", (e) => {
      const count = list.children.length;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive(activeIdx < count - 1 ? activeIdx + 1 : 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(activeIdx > 0 ? activeIdx - 1 : count - 1); }
      else if (e.key === "Enter" && activeIdx >= 0) { e.preventDefault(); list.children[activeIdx].click(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); set(false); }
      else if (e.key === "Tab") set(false);
    });
    document.addEventListener("pointerdown", (e) => { if (!root.contains(e.target)) set(false); });
    return { close: closer };
  }

  const pickerMarkup = (extraClass = "") => `
    <div class="ds-float ds-popover cur__pop ${extraClass}">
      <span class="cur__scrim" aria-hidden="true"></span>
      <label class="cur__search">
        <img src="assets/search.svg" alt="">
        <input class="cur__input" type="text" placeholder="Search currency" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-label="Search currency">
      </label>
      <div class="cur__list" role="listbox" aria-label="Currency"></div>
      <p class="ds-popover__empty" hidden>Nothing found</p>
    </div>`;

  /* ───── Modal · transitions.dev 06 ─────
     One layer at a time. Opening while another is open swaps them: close, then open. */
  const layer = document.createElement("div");
  layer.className = "modal-layer";
  layer.hidden = true;
  layer.innerHTML = `<div class="modal-scrim" data-close></div>`;
  document.body.appendChild(layer);

  let current = null;
  let returnFocus = null;
  let closeTimer;

  function openModal(dialog, { onClose, initialFocus } = {}) {
    const wasOpen = !!current;
    if (current) closeModal({ keepLayer: true, restore: false });
    clearTimeout(closeTimer);
    closeFloats();
    if (!wasOpen) returnFocus = document.activeElement;
    dialog.classList.add("modal", "t-modal");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    layer.appendChild(dialog);
    layer.hidden = false;
    document.documentElement.classList.add("has-modal");
    lockPage("modal", true);
    if (window.DS) DS.init(dialog);
    current = { dialog, onClose };
    void dialog.offsetWidth;
    requestAnimationFrame(() => {
      layer.classList.add("is-open");
      dialog.classList.add("is-open");
      const target = (initialFocus && dialog.querySelector(initialFocus)) || dialog.querySelector("input, button:not([data-close-x])");
      if (target) target.focus({ preventScroll: true });
    });
  }

  function closeModal({ keepLayer = false, restore = true } = {}) {
    if (!current) return;
    const { dialog, onClose } = current;
    current = null;
    dialog.classList.remove("is-open");
    dialog.classList.add("is-closing");
    const ms = cssMs("--modal-close-dur");
    setTimeout(() => dialog.remove(), ms);
    if (!keepLayer) {
      layer.classList.remove("is-open");
      closeTimer = setTimeout(() => { if (!current) { layer.hidden = true; document.documentElement.classList.remove("has-modal"); lockPage("modal", false); } }, ms);
      if (restore && returnFocus && document.contains(returnFocus)) returnFocus.focus({ preventScroll: true });
    }
    if (onClose) onClose();
  }

  // The scrim and every [data-close] button inside a dialog close it.
  layer.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });

  /* Mobile: dialogs are bottom sheets (app.css), and a downward swipe that starts on the head closes them.
     Centred confirmations (.modal--confirm) don't swipe. */
  const sheets = window.matchMedia("(max-width: 645px)");
  layer.addEventListener("pointerdown", (e) => {
    if (!current || !sheets.matches || current.dialog.classList.contains("modal--confirm")) return;
    const head = e.target.closest(".modal__head, .dsheet__head");
    if (!head || !current.dialog.contains(head) || e.target.closest("button, input")) return;
    const dialog = current.dialog;
    const y0 = e.clientY;
    let dy = 0;
    head.setPointerCapture(e.pointerId);
    dialog.style.transition = "none";
    const move = (ev) => { dy = Math.max(0, ev.clientY - y0); dialog.style.transform = `translateY(${dy}px)`; };
    const up = () => {
      head.removeEventListener("pointermove", move);
      head.removeEventListener("pointerup", up);
      head.removeEventListener("pointercancel", up);
      dialog.style.transition = "";
      dialog.style.transform = "";
      if (dy > 80 && current && current.dialog === dialog) closeModal();
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", up);
    head.addEventListener("pointercancel", up);
  });
  document.addEventListener("keydown", (e) => {
    if (!current) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); return; }
    if (e.key !== "Tab") return;
    // Focus trap inside the open dialog.
    const focusables = [...current.dialog.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex='0']")].filter((el) => el.offsetParent !== null && !el.closest(".ds-float:not(.is-open)"));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);

  /* ───── Toast · Figma 292:107912, transitions.dev 22 via design-system .ds-toast[data-motion] ───── */
  const region = document.createElement("div");
  region.className = "ds-toast-region";
  region.setAttribute("aria-live", "polite");
  document.body.appendChild(region);

  function toast({ title, action = "Reset", onAction, duration = 6000 }) {
    region.querySelectorAll(".ds-toast").forEach((t) => t._dismiss && t._dismiss());
    const el = document.createElement("div");
    el.className = "ds-toast toast";
    el.dataset.motion = "";
    el.dataset.type = "danger";
    el.setAttribute("role", "status");
    el.innerHTML = `
      <span class="ds-toast__glow" aria-hidden="true"></span>
      <div class="ds-toast__main toast__main">
        <span class="ds-toast__icon"><img src="assets/folder-delete-16.svg" alt="" width="16" height="16"></span>
        <div class="ds-toast__text"><div class="ds-toast__title">${esc(title)}</div></div>
      </div>
      ${onAction ? `<button class="ds-btn" data-type="secondary" type="button"><img src="assets/refresh.svg" alt="" width="18" height="18"><span>${esc(action)}</span></button>` : ""}`;
    region.appendChild(el);
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      el._dismiss = null;
      el.classList.remove("is-open");
      setTimeout(() => el.remove(), cssMs("--toast-close", undefined, 250) + 40);
    };
    el._dismiss = dismiss;
    const arm = () => { clearTimeout(timer); timer = setTimeout(dismiss, duration); };
    el.addEventListener("pointerenter", () => clearTimeout(timer));
    el.addEventListener("pointerleave", arm);
    const btn = el.querySelector(".ds-btn");
    if (btn) btn.addEventListener("click", () => { onAction(); dismiss(); });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-open")));
    arm();
    return dismiss;
  }

  window.PR = Object.assign(window.PR, {
    ui: {
      esc, cssMs, reduced, setNumber, swapText, openFloat, closeFloat, isOpen, floats, closeFloats,
      avatarSrc, readAvatar, bindAvatarHover, currencyPicker, pickerMarkup,
      openModal, closeModal, modalOpen: () => !!current, toast,
    },
  });
})();
