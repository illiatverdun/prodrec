/* prodrec design system — component behaviours.
   Vanilla JS, no dependencies. Works from file:// — load icons.js first.
   DS.init(root) wires every component inside `root`; it is safe to call again
   after re-rendering because each element is initialised once. */
(function () {
  "use strict";

  const ICONS = window.DS_ICONS || {};
  const root = document.documentElement;
  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cssMs = (name, fallback) => {
    const v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const once = (el, key) => {
    if (el["__ds_" + key]) return false;
    el["__ds_" + key] = true;
    return true;
  };
  const uid = (() => { let n = 0; return (p = "ds") => `${p}-${++n}`; })();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ───── Icons ───── */

  function icon(name, opts = {}) {
    const svg = ICONS[name];
    const size = opts.size ? ` style="--icon-size:${opts.size}px"` : "";
    const stroke = opts.stroke ? ` data-stroke="${opts.stroke}"` : "";
    const cls = opts.className ? " " + opts.className : "";
    const a11y = opts.label ? ` role="img" aria-label="${esc(opts.label)}"` : ` aria-hidden="true"`;
    const extra = opts.attrs ? " " + opts.attrs : "";
    return `<span class="ds-icon${cls}" data-icon="${esc(name)}"${size}${stroke}${a11y}${extra}>${svg || ""}</span>`;
  }

  function spinner(size = 16, attrs = "") {
    return `<span class="ds-spinner" style="--icon-size:${size}px" role="status" aria-label="Loading"${attrs ? " " + attrs : ""}>${ICONS["system-loading-4--light"] || ""}</span>`;
  }

  function hydrateIcons(scope) {
    scope.querySelectorAll(".ds-icon[data-icon]").forEach((el) => {
      if (!el.firstElementChild && ICONS[el.dataset.icon]) el.innerHTML = ICONS[el.dataset.icon];
    });
    scope.querySelectorAll(".ds-spinner").forEach((el) => {
      if (!el.firstElementChild && ICONS["system-loading-4--light"]) el.innerHTML = ICONS["system-loading-4--light"];
    });
  }

  /* ───── Input modality: keyboard focus rings only after keyboard use ───── */

  function trackModality() {
    if (!once(document, "modality")) return;
    root.dataset.input = "mouse";
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow")) root.dataset.input = "keyboard";
    }, true);
    document.addEventListener("pointerdown", () => { root.dataset.input = "mouse"; }, true);
  }

  /* ───── Switch: skip the return bounce on first paint ───── */

  function initSwitch(el) {
    if (!once(el, "switch")) return;
    const input = el.querySelector(".ds-switch__input");
    if (!input) return;
    input.addEventListener("change", () => el.classList.add("is-init"), { once: true });
  }

  /* ───── Checkbox: indeterminate from markup ───── */

  function initCheckbox(input) {
    if (!once(input, "checkbox")) return;
    if (input.hasAttribute("data-indeterminate")) input.indeterminate = true;
  }

  /* ───── Sliding indicators (tabs line, segmented pill) ───── */

  function slideTo(indicator, target, vars, animate, inset = 0, minW = 0) {
    const w = Math.max(minW, target.offsetWidth - inset * 2);
    const x = target.offsetLeft + (target.offsetWidth - w) / 2;
    if (!animate || reduceMotion()) {
      const prev = indicator.style.transition;
      indicator.style.transition = "none";
      indicator.style.setProperty(vars[0], `${x}px`);
      indicator.style.setProperty(vars[1], `${w}px`);
      void indicator.offsetWidth;
      indicator.style.transition = prev;
    } else {
      indicator.style.setProperty(vars[0], `${x}px`);
      indicator.style.setProperty(vars[1], `${w}px`);
    }
  }

  const resizeWatch = new ResizeObserver((entries) => {
    entries.forEach((entry) => entry.target.__ds_relayout && entry.target.__ds_relayout());
  });

  function rovingKeys(container, items, onPick, orientation = "horizontal") {
    container.addEventListener("keydown", (e) => {
      const list = items().filter((b) => !b.disabled && b.getAttribute("aria-disabled") !== "true");
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const next = orientation === "horizontal" ? ["ArrowRight", "ArrowLeft"] : ["ArrowDown", "ArrowUp"];
      let j = null;
      if (e.key === next[0]) j = (i + 1) % list.length;
      else if (e.key === next[1]) j = (i - 1 + list.length) % list.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = list.length - 1;
      if (j === null) return;
      e.preventDefault();
      list[j].focus();
      onPick(list[j]);
    });
  }

  function initTabs(bar) {
    if (!once(bar, "tabs")) return;
    let line = bar.querySelector(".ds-tabs__line");
    if (!line) {
      line = document.createElement("span");
      line.className = "ds-tabs__line";
      line.setAttribute("aria-hidden", "true");
      bar.appendChild(line);
    }
    const tabs = () => [...bar.querySelectorAll(".ds-tab")];
    const active = () => tabs().find((t) => t.getAttribute("aria-selected") === "true") || tabs()[0];
    const inset = () => (bar.dataset.size === "md" ? 40 : 40);
    const place = (animate) => { const a = active(); if (a) slideTo(line, a, ["--line-x", "--line-w"], animate, inset(), 12); };

    function select(tab, focus) {
      if (!tab || tab.disabled) return;
      const prev = active();
      tabs().forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        const panelId = t.getAttribute("aria-controls");
        const panel = panelId && document.getElementById(panelId);
        if (panel) {
          if (on) {
            panel.hidden = false;
            if (prev !== tab) {
              panel.classList.remove("is-entering");
              void panel.offsetWidth;
              panel.classList.add("is-entering");
            }
          } else panel.hidden = true;
        }
      });
      place(true);
      if (focus) tab.focus();
      if (prev !== tab) bar.dispatchEvent(new CustomEvent("ds:change", { bubbles: true, detail: { tab, index: tabs().indexOf(tab) } }));
    }

    tabs().forEach((t) => {
      t.setAttribute("role", "tab");
      t.tabIndex = t.getAttribute("aria-selected") === "true" ? 0 : -1;
      t.addEventListener("click", () => select(t));
    });
    bar.setAttribute("role", "tablist");
    rovingKeys(bar, tabs, (t) => select(t));
    bar.__ds_relayout = () => place(false);
    resizeWatch.observe(bar);
    requestAnimationFrame(() => place(false));
    if (document.fonts) document.fonts.ready.then(() => place(false));
  }

  function initSegmented(group) {
    if (!once(group, "segmented")) return;
    let pill = group.querySelector(".ds-segmented__pill");
    if (!pill) {
      pill = document.createElement("span");
      pill.className = "ds-segmented__pill";
      pill.setAttribute("aria-hidden", "true");
      group.prepend(pill);
    }
    const items = () => [...group.querySelectorAll(".ds-segmented__item")];
    const active = () => items().find((b) => b.getAttribute("aria-checked") === "true");
    const place = (animate) => {
      const a = active();
      pill.style.opacity = a ? "1" : "0";
      if (a) slideTo(pill, a, ["--pill-x", "--pill-w"], animate);
    };
    function select(item) {
      if (!item || item.disabled) return;
      const prev = active();
      items().forEach((b) => {
        const on = b === item;
        b.setAttribute("aria-checked", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
      });
      place(true);
      if (prev !== item) group.dispatchEvent(new CustomEvent("ds:change", { bubbles: true, detail: { value: item.dataset.value ?? item.textContent.trim(), item } }));
    }
    group.setAttribute("role", "radiogroup");
    items().forEach((b) => {
      b.setAttribute("role", "radio");
      if (!b.hasAttribute("aria-checked")) b.setAttribute("aria-checked", "false");
      b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
      b.addEventListener("click", () => select(b));
    });
    if (!active() && items()[0]) items()[0].tabIndex = 0;
    rovingKeys(group, items, select);
    group.__ds_select = select;
    group.__ds_relayout = () => place(false);
    resizeWatch.observe(group);
    requestAnimationFrame(() => place(false));
    if (document.fonts) document.fonts.ready.then(() => place(false));
  }

  /* ───── Pagination dots: caterpillar thumb ───── */

  function initDots(group) {
    if (!once(group, "dots")) return;
    let thumb = group.querySelector(".ds-dots__thumb");
    if (!thumb) {
      thumb = document.createElement("span");
      thumb.className = "ds-dots__thumb";
      thumb.setAttribute("aria-hidden", "true");
      group.appendChild(thumb);
    }
    const dots = () => [...group.querySelectorAll(".ds-dots__dot")];
    let current = Math.max(0, dots().findIndex((d) => d.getAttribute("aria-current") === "true"));
    const geom = (i) => ({ x: dots()[i].offsetLeft, w: dots()[i].offsetWidth });
    const snap = () => { const g = geom(current); thumb.style.translate = `${g.x}px 0`; thumb.style.width = `${g.w}px`; };

    function go(i) {
      if (i === current || i < 0 || i >= dots().length) return;
      const a = geom(current), b = geom(i);
      dots().forEach((d, k) => d.setAttribute("aria-current", k === i ? "true" : "false"));
      current = i;
      if (reduceMotion() || !thumb.animate) { snap(); return; }
      const left = Math.min(a.x, b.x);
      const span = Math.abs(b.x - a.x) + b.w;
      const dur = cssMs("--duration-slow", 400);
      thumb.animate(
        [
          { translate: `${a.x}px 0`, width: `${a.w}px` },
          { translate: `${left}px 0`, width: `${span}px`, offset: 0.45 },
          { translate: `${b.x}px 0`, width: `${b.w}px` },
        ],
        { duration: dur, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
      snap();
      group.dispatchEvent(new CustomEvent("ds:change", { bubbles: true, detail: { index: i } }));
    }
    dots().forEach((d, k) => {
      d.setAttribute("aria-label", d.getAttribute("aria-label") || `Page ${k + 1}`);
      d.addEventListener("click", () => go(k));
    });
    group.__ds_go = go;
    group.__ds_relayout = snap;
    resizeWatch.observe(group);
    requestAnimationFrame(snap);
  }

  /* ───── Floating surfaces (menu-dropdown recipe) ───── */

  function openFloat(el, origin) {
    clearTimeout(el.__ds_closeTimer);
    if (origin) el.style.setProperty("--float-origin", origin);
    el.classList.remove("is-closing");
    el.classList.add("is-open");
  }
  function closeFloat(el) {
    if (!el.classList.contains("is-open")) return;
    el.classList.remove("is-open");
    el.classList.add("is-closing");
    el.__ds_closeTimer = setTimeout(() => el.classList.remove("is-closing"), cssMs("--dropdown-close-dur", 150));
  }

  /* ───── Selector ───── */

  function initSelect(sel) {
    if (!once(sel, "select")) return;
    const trigger = sel.querySelector(".ds-select__trigger");
    const menu = sel.querySelector(".ds-float");
    const valueEl = sel.querySelector(".ds-select__value");
    if (!trigger || !menu) return;
    const listId = menu.id || uid("listbox");
    menu.id = listId;
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", listId);
    const list = menu.querySelector("[role='listbox']") || menu;
    list.setAttribute("role", "listbox");
    const options = () => [...menu.querySelectorAll(".ds-menu-item:not([hidden])")];
    let activeIndex = -1;

    const setActive = (i) => {
      const opts = options();
      opts.forEach((o, k) => o.toggleAttribute("data-active", k === i));
      activeIndex = i;
      const o = opts[i];
      if (o) {
        o.scrollIntoView({ block: "nearest" });
        trigger.setAttribute("aria-activedescendant", o.id || (o.id = uid("opt")));
      }
    };

    function place() {
      const r = trigger.getBoundingClientRect();
      const h = menu.offsetHeight || 280;
      const below = window.innerHeight - r.bottom;
      const up = below < h + 16 && r.top > below;
      const controlTop = trigger.offsetTop;
      menu.style.insetBlockStart = up ? "auto" : `${controlTop + trigger.offsetHeight + 4}px`;
      menu.style.insetBlockEnd = up ? `${sel.offsetHeight - controlTop + 4}px` : "auto";
      menu.style.minInlineSize = `${trigger.offsetWidth}px`;
      return up ? "bottom left" : "top left";
    }

    function open() {
      if (sel.hasAttribute("data-disabled") || sel.hasAttribute("data-open")) return;
      sel.setAttribute("data-open", "");
      trigger.setAttribute("aria-expanded", "true");
      openFloat(menu, place());
      const selIdx = options().findIndex((o) => o.getAttribute("aria-selected") === "true");
      setActive(selIdx >= 0 ? selIdx : 0);
      const search = menu.querySelector("input");
      if (search) setTimeout(() => search.focus({ preventScroll: true }), 30);
    }
    function close(focusTrigger) {
      if (!sel.hasAttribute("data-open")) return;
      sel.removeAttribute("data-open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      closeFloat(menu);
      if (focusTrigger) trigger.focus();
    }
    function choose(opt) {
      if (!opt || opt.getAttribute("aria-disabled") === "true") return;
      const multi = sel.hasAttribute("data-multiple");
      if (multi) {
        opt.setAttribute("aria-selected", opt.getAttribute("aria-selected") === "true" ? "false" : "true");
      } else {
        options().forEach((o) => o.setAttribute("aria-selected", o === opt ? "true" : "false"));
      }
      const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
      const label = chosen.map((o) => o.dataset.label || o.querySelector(".ds-menu-item__title")?.textContent.trim() || o.textContent.trim());
      if (valueEl) {
        const text = label.length ? (label.length > 2 ? `${label.length} selected` : label.join(", ")) : valueEl.dataset.placeholderText || "Select element";
        if (!valueEl.dataset.placeholderText && valueEl.hasAttribute("data-placeholder")) valueEl.dataset.placeholderText = valueEl.textContent;
        valueEl.textContent = text;
        valueEl.toggleAttribute("data-placeholder", !label.length);
        valueEl.classList.remove("ds-text-swap", "is-swapping");
        void valueEl.offsetWidth;
        valueEl.classList.add("ds-text-swap", "is-swapping");
      }
      sel.dispatchEvent(new CustomEvent("ds:change", { bubbles: true, detail: { values: chosen.map((o) => o.dataset.value ?? o.textContent.trim()), labels: label } }));
      if (!multi) close(true);
    }

    trigger.addEventListener("click", () => (sel.hasAttribute("data-open") ? close() : open()));
    trigger.addEventListener("keydown", (e) => {
      const opts = options();
      if (["ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        if (!sel.hasAttribute("data-open")) { open(); return; }
        const d = e.key === "ArrowDown" ? 1 : -1;
        setActive((activeIndex + d + opts.length) % opts.length);
      } else if (["Enter", " "].includes(e.key) && sel.hasAttribute("data-open")) {
        e.preventDefault();
        choose(opts[activeIndex]);
      } else if (e.key === "Escape") {
        close(true);
      } else if (e.key.length === 1 && /\S/.test(e.key)) {
        const k = e.key.toLowerCase();
        const i = opts.findIndex((o, idx) => idx > activeIndex && o.textContent.trim().toLowerCase().startsWith(k));
        const j = i >= 0 ? i : opts.findIndex((o) => o.textContent.trim().toLowerCase().startsWith(k));
        if (j >= 0) { if (!sel.hasAttribute("data-open")) open(); setActive(j); }
      }
    });
    menu.addEventListener("click", (e) => {
      const opt = e.target.closest(".ds-menu-item");
      if (opt && menu.contains(opt)) choose(opt);
    });
    menu.addEventListener("pointermove", (e) => {
      const opt = e.target.closest(".ds-menu-item");
      if (opt) setActive(options().indexOf(opt));
    });
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close(true);
      if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key) && e.target.matches("input")) {
        e.preventDefault();
        const opts = options();
        if (e.key === "Enter") choose(opts[activeIndex]);
        else setActive((activeIndex + (e.key === "ArrowDown" ? 1 : -1) + opts.length) % opts.length);
      }
    });
    const search = menu.querySelector("input[data-ds-filter]");
    if (search) {
      search.addEventListener("input", () => {
        const q = search.value.trim().toLowerCase();
        let shown = 0;
        menu.querySelectorAll(".ds-menu-item").forEach((o) => {
          const hit = !q || o.textContent.toLowerCase().includes(q);
          o.hidden = !hit;
          if (hit) shown++;
        });
        const empty = menu.querySelector(".ds-popover__empty");
        if (empty) empty.hidden = shown > 0;
        setActive(shown ? 0 : -1);
      });
    }
    document.addEventListener("pointerdown", (e) => { if (!sel.contains(e.target)) close(); });
    sel.__ds_open = open;
    sel.__ds_close = close;
  }

  /* ───── Text field: filled, password toggle, clear dissolve, counter ───── */

  function initField(field) {
    if (!once(field, "field")) return;
    const input = field.querySelector(".ds-field__input");
    if (!input) return;
    if (input.disabled) field.setAttribute("data-disabled", "");
    const control = field.querySelector(".ds-field__control");
    if (control && !field.classList.contains("ds-select")) {
      control.addEventListener("pointerdown", (e) => {
        if (e.target === control || e.target.classList.contains("ds-field__lead")) { e.preventDefault(); input.focus(); }
      });
    }
    const counter = field.querySelector(".ds-field__count");
    const sync = () => {
      if (counter) counter.textContent = `${input.value.length}${input.maxLength > 0 ? " / " + input.maxLength : ""}`;
      const clearBtn = field.querySelector("[data-ds-action='clear']");
      if (clearBtn) clearBtn.hidden = !input.value;
    };
    input.addEventListener("input", () => {
      sync();
      if (field.__ds_revert) {
        clearTimeout(field.__ds_revert);
        field.__ds_revert = null;
        restoreDescription(field);
      }
    });
    sync();

    field.querySelectorAll("[data-ds-action='toggle-password']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-pressed", show ? "true" : "false");
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
        const swap = btn.querySelector(".ds-swap");
        if (swap) swap.dataset.state = show ? "b" : "a";
        input.focus({ preventScroll: true });
      });
    });

    field.querySelectorAll("[data-ds-action='clear']").forEach((btn) => {
      const keep = (e) => { if (document.activeElement === input) e.preventDefault(); };
      btn.addEventListener("pointerdown", keep);
      btn.addEventListener("click", () => clearWithDissolve(field, input, sync));
    });
  }

  function clearWithDissolve(field, input, after) {
    if (!input.value || field.classList.contains("is-clearing")) return;
    const slot = input.closest(".ds-field__slot") || input.parentElement;
    if (reduceMotion()) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      after && after();
      return;
    }
    const mirror = document.createElement("div");
    mirror.className = "ds-clear-mirror";
    mirror.textContent = input.value;
    const ph = document.createElement("div");
    ph.className = "ds-clear-ph";
    ph.textContent = input.placeholder || "";
    const glow = document.createElement("div");
    glow.className = "ds-clear-glow";
    slot.append(mirror, ph, glow);
    const text = input.value;
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    field.classList.add("is-clearing");

    const canvas = document.createElement("canvas").getContext("2d");
    canvas.font = getComputedStyle(input).font;
    const w = slot.clientWidth || 240;
    const layers = [];
    let x = 0;
    text.split(/(\s+)/).forEach((seg) => {
      const segW = canvas.measureText(seg).width;
      if (seg.trim()) {
        const cx = x + segW / 2;
        const hw = Math.max(segW * 0.45, 8) * 1.5;
        [[0, 0.8, 7, 0.22], [hw * 0.45, 0.55, 8, 0.18], [-hw * 0.4, 0.65, 6, 0.16], [hw * 0.15, 0.9, 5, 0.14]].forEach(([dx, rwm, rh, a]) => {
          layers.push(`radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${(((cx + dx) / w) * 100).toFixed(2)}% 100%, rgba(195,72,187,${a}), transparent)`);
        });
      }
      x += segW;
    });
    glow.style.background = layers.join(", ");

    const total = 1000, outDur = 400, inDur = 400, fly = 12, blur = 2;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const t0 = performance.now();
    (function tick(now) {
      const el = now - t0;
      const eo = ease(Math.min(1, el / outDur));
      mirror.style.opacity = String(1 - eo);
      mirror.style.transform = `translateY(${(eo * fly).toFixed(1)}px)`;
      mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;
      const ei = ease(Math.min(1, el / inDur));
      ph.style.opacity = String(ei);
      ph.style.transform = `translateY(${(-fly + ei * fly).toFixed(1)}px)`;
      ph.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;
      let g = 0;
      if (el > 50) {
        const gp = Math.min(1, (el - 50) / (total - 50));
        g = gp < 0.15 ? gp / 0.15 : 1 - (gp - 0.15) / 0.85;
      }
      glow.style.opacity = String((g * 0.6).toFixed(3));
      if (el < total) requestAnimationFrame(tick);
      else {
        mirror.remove(); ph.remove(); glow.remove();
        field.classList.remove("is-clearing");
        input.focus({ preventScroll: true });
        after && after();
      }
    })(t0);
  }

  function restoreDescription(field) {
    field.removeAttribute("data-state");
    const desc = field.querySelector(".ds-field__desc");
    if (desc && desc.__ds_original !== undefined) {
      desc.innerHTML = desc.__ds_original;
      desc.hidden = desc.__ds_hidden;
      desc.classList.remove("is-swapping");
      void desc.offsetWidth;
      desc.classList.add("ds-text-swap", "is-swapping");
    }
  }

  function fieldError(field, message, state = "danger", opts = {}) {
    const control = field.querySelector(".ds-field__control");
    let desc = field.querySelector(".ds-field__desc");
    if (!desc) {
      desc = document.createElement("div");
      desc.className = "ds-field__desc";
      desc.hidden = true;
      field.appendChild(desc);
    }
    if (desc.__ds_original === undefined) {
      desc.__ds_original = desc.innerHTML;
      desc.__ds_hidden = desc.hidden;
    }
    field.setAttribute("data-state", state);
    desc.hidden = false;
    desc.innerHTML = `${icon("system-question--filled")}<span>${esc(message)}</span>`;
    desc.classList.remove("is-swapping");
    void desc.offsetWidth;
    desc.classList.add("ds-text-swap", "is-swapping");
    if (control) {
      control.classList.remove("is-shaking");
      void control.offsetWidth;
      control.classList.add("is-shaking");
      setTimeout(() => control.classList.remove("is-shaking"), cssMs("--shake-dur-a", 80) * 2 + cssMs("--shake-dur-b", 60) * 2 + 20);
    }
    clearTimeout(field.__ds_revert);
    if (opts.autoRevert !== false) {
      field.__ds_revert = setTimeout(() => { field.__ds_revert = null; restoreDescription(field); }, opts.hold || cssMs("--revert-hold", 3000));
    }
  }

  /* ───── Stepper (pagination page input) ───── */

  function initStepper(stepper) {
    if (!once(stepper, "stepper")) return;
    const target = stepper.dataset.target ? document.getElementById(stepper.dataset.target) : stepper.parentElement.querySelector("input");
    if (!target) return;
    const min = () => Number(target.min || 1);
    const max = () => Number(target.max || 100);
    const up = stepper.querySelector("[data-direction='up']");
    const down = stepper.querySelector("[data-direction='down']");
    const sync = () => {
      const v = Number(target.value || min());
      if (up) up.disabled = v >= max();
      if (down) down.disabled = v <= min();
    };
    const bump = (d) => {
      const v = Math.min(max(), Math.max(min(), Number(target.value || min()) + d));
      if (String(v) === target.value) return;
      target.value = String(v);
      target.classList.remove("is-bump");
      void target.offsetWidth;
      target.classList.add("is-bump");
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      sync();
    };
    up && up.addEventListener("click", () => bump(1));
    down && down.addEventListener("click", () => bump(-1));
    target.addEventListener("change", () => {
      const v = Math.min(max(), Math.max(min(), Math.round(Number(target.value) || min())));
      target.value = String(v);
      sync();
    });
    target.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); bump(1); }
      if (e.key === "ArrowDown") { e.preventDefault(); bump(-1); }
    });
    stepper.__ds_sync = sync;
    sync();
  }

  /* ───── Custom scroll area ───── */

  function initScroll(area) {
    if (!once(area, "scroll")) return;
    const vp = area.querySelector(".ds-scroll__viewport");
    const bar = area.querySelector(".ds-scroll__bar");
    const thumb = bar && bar.querySelector(".ds-scroll__thumb");
    const track = bar && bar.querySelector(".ds-scroll__track");
    if (!vp || !bar || !thumb || !track) return;
    const horizontal = bar.dataset.orientation === "horizontal";
    let hideTimer;
    const update = () => {
      const size = horizontal ? vp.clientWidth : vp.clientHeight;
      const content = horizontal ? vp.scrollWidth : vp.scrollHeight;
      const pos = horizontal ? vp.scrollLeft : vp.scrollTop;
      const trackSize = horizontal ? track.clientWidth : track.clientHeight;
      bar.hidden = content <= size + 1;
      const t = Math.max(24, (size / content) * trackSize);
      const maxPos = trackSize - t;
      const p = content - size > 0 ? (pos / (content - size)) * maxPos : 0;
      thumb.style.setProperty("--thumb-size", `${t}px`);
      thumb.style.setProperty("--thumb-pos", `${p}px`);
    };
    vp.addEventListener("scroll", () => {
      update();
      area.classList.add("is-scrolling");
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => area.classList.remove("is-scrolling"), 700);
    }, { passive: true });
    thumb.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);
      area.classList.add("is-dragging");
      const start = horizontal ? e.clientX : e.clientY;
      const startScroll = horizontal ? vp.scrollLeft : vp.scrollTop;
      const trackSize = horizontal ? track.clientWidth : track.clientHeight;
      const content = horizontal ? vp.scrollWidth : vp.scrollHeight;
      const size = horizontal ? vp.clientWidth : vp.clientHeight;
      const t = parseFloat(thumb.style.getPropertyValue("--thumb-size")) || 24;
      const ratio = (content - size) / Math.max(1, trackSize - t);
      const move = (ev) => {
        const d = (horizontal ? ev.clientX : ev.clientY) - start;
        if (horizontal) vp.scrollLeft = startScroll + d * ratio;
        else vp.scrollTop = startScroll + d * ratio;
      };
      const up = () => {
        area.classList.remove("is-dragging");
        thumb.removeEventListener("pointermove", move);
        thumb.removeEventListener("pointerup", up);
      };
      thumb.addEventListener("pointermove", move);
      thumb.addEventListener("pointerup", up);
    });
    track.addEventListener("pointerdown", (e) => {
      if (e.target !== track) return;
      const r = track.getBoundingClientRect();
      const frac = horizontal ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
      const content = horizontal ? vp.scrollWidth - vp.clientWidth : vp.scrollHeight - vp.clientHeight;
      vp.scrollTo({ [horizontal ? "left" : "top"]: frac * content, behavior: reduceMotion() ? "auto" : "smooth" });
    });
    area.__ds_relayout = update;
    resizeWatch.observe(area);
    new ResizeObserver(update).observe(vp.firstElementChild || vp);
    requestAnimationFrame(update);
  }

  /* ───── Tooltip (travels between triggers) ───── */

  let tipEl = null;
  let tipTimer = null;
  function tooltipEl() {
    if (tipEl) return tipEl;
    tipEl = document.createElement("div");
    tipEl.className = "ds-tooltip";
    tipEl.dataset.float = "";
    tipEl.dataset.compact = "";
    tipEl.id = "ds-tooltip";
    tipEl.setAttribute("role", "tooltip");
    tipEl.setAttribute("data-show", "false");
    document.body.appendChild(tipEl);
    return tipEl;
  }

  function showTip(trigger) {
    const tip = tooltipEl();
    clearTimeout(tipTimer);
    const showing = tip.getAttribute("data-show") === "true";
    const tpl = trigger.dataset.dsTooltipTemplate && document.getElementById(trigger.dataset.dsTooltipTemplate);
    if (tpl) {
      tip.removeAttribute("data-compact");
      tip.dataset.size = tpl.dataset.size || "sm";
      tip.innerHTML = tpl.innerHTML;
    } else {
      tip.setAttribute("data-compact", "");
      tip.removeAttribute("data-size");
      tip.textContent = trigger.dataset.dsTooltip;
    }
    tip.toggleAttribute("data-interactive", !!tpl && tpl.hasAttribute("data-interactive"));
    trigger.setAttribute("aria-describedby", tip.id);
    const r = trigger.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const gap = 8;
    let placement = trigger.dataset.dsTooltipPlacement || "top";
    if (placement === "top" && r.top < th + gap + 8) placement = "bottom";
    let x = r.left + r.width / 2 - tw / 2 + window.scrollX;
    x = Math.max(window.scrollX + 8, Math.min(x, window.scrollX + document.documentElement.clientWidth - tw - 8));
    const y = placement === "top" ? r.top + window.scrollY - th - gap : r.bottom + window.scrollY + gap;
    tip.style.setProperty("--tt-origin", placement === "top" ? "50% 100%" : "50% 0%");
    if (!showing) {
      tip.style.transition = "none";
      tip.style.setProperty("--tt-x", `${x}px`);
      tip.style.setProperty("--tt-y", `${y}px`);
      void tip.offsetWidth;
      tip.style.transition = "";
    } else {
      tip.style.setProperty("--tt-x", `${x}px`);
      tip.style.setProperty("--tt-y", `${y}px`);
    }
    tip.setAttribute("data-show", "true");
  }
  function hideTip(delay = 0) {
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { if (tipEl) tipEl.setAttribute("data-show", "false"); }, delay);
  }

  function initTooltips() {
    if (!once(document, "tooltips")) return;
    const find = (t) => t && t.closest && t.closest("[data-ds-tooltip], [data-ds-tooltip-template]");
    document.addEventListener("pointerover", (e) => { const t = find(e.target); if (t) showTip(t); });
    document.addEventListener("pointerout", (e) => {
      const t = find(e.target);
      if (!t || (e.relatedTarget && (t.contains(e.relatedTarget) || (tipEl && tipEl.contains(e.relatedTarget))))) return;
      if (find(e.relatedTarget)) return;
      hideTip(tipEl && tipEl.hasAttribute("data-interactive") ? 180 : 0);
    });
    document.addEventListener("focusin", (e) => { const t = find(e.target); if (t) showTip(t); });
    document.addEventListener("focusout", (e) => { if (find(e.target)) hideTip(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
    window.addEventListener("scroll", () => hideTip(), { passive: true });
    document.addEventListener("pointerover", (e) => { if (tipEl && tipEl.contains(e.target)) clearTimeout(tipTimer); });
    document.addEventListener("pointerout", (e) => {
      if (tipEl && tipEl.contains(e.target) && !tipEl.contains(e.relatedTarget)) hideTip(120);
    });
  }

  /* ───── Toasts (toast + banner-stacking recipes) ───── */

  const TOAST_ICONS = { success: "system-checks--cute-light", warning: "emoji-puzzled--cute-light", danger: "other-bomb--cute-light" };
  function region() {
    let r = document.querySelector(".ds-toast-region");
    if (!r) {
      r = document.createElement("div");
      r.className = "ds-toast-region";
      r.setAttribute("aria-live", "polite");
      r.addEventListener("pointerenter", () => { r.dataset.expanded = ""; restack(r); });
      r.addEventListener("pointerleave", () => { delete r.dataset.expanded; restack(r); });
      document.body.appendChild(r);
    }
    return r;
  }
  function restack(r) {
    const live = [...r.querySelectorAll(".ds-toast.is-open")].reverse();
    const expanded = r.hasAttribute("data-expanded");
    let offset = 0;
    live.forEach((t, i) => {
      if (expanded) {
        t.style.setProperty("--stack-y", `${-offset}px`);
        t.style.setProperty("--stack-s", "1");
        t.style.setProperty("--stack-o", "1");
        t.style.setProperty("--stack-blur", "0px");
        offset += t.offsetHeight + 8;
      } else {
        t.style.setProperty("--stack-y", `${-i * 12}px`);
        t.style.setProperty("--stack-s", String(1 - i * 0.06));
        t.style.setProperty("--stack-o", i > 2 ? "0" : String(1 - i * 0.25));
        t.style.setProperty("--stack-blur", `${Math.min(i, 2)}px`);
      }
      t.style.zIndex = String(100 - i);
      t.style.position = i === 0 ? "relative" : "absolute";
      t.style.insetBlockEnd = i === 0 ? "" : "0";
      t.style.insetInlineEnd = i === 0 ? "" : "0";
      t.inert = !expanded && i > 0;
    });
  }

  function toastMarkup(o) {
    const type = o.type || "success";
    const close = `<button class="ds-icon-btn ds-toast__close" data-type="secondary" data-variant="link" data-size="sm" aria-label="Dismiss">${icon("system-close--light", { size: 14 })}</button>`;
    if (type === "upload") {
      return `<div class="ds-toast__head"><div class="ds-toast__file"><span class="ds-toast__tile">${icon("file-download-2--cute-regular", { size: 20 })}</span><div class="ds-toast__text"><div class="ds-toast__titlerow"><span class="ds-toast__title">${esc(o.title || "Uploading")}</span><span class="ds-badge" data-color="gray" data-variant="${o.color === "gray" ? "surface" : "solid"}" data-size="sm">${esc(o.file || "file_name.pdf")}</span></div><div class="ds-toast__desc" data-size="sm">${esc(o.description || "Please wait while we upload your file.")}</div></div></div>${close}</div><div class="ds-toast__body"><div class="ds-progress" data-size="sm" data-orientation="inline" data-state="loading" data-width="fill"><div class="ds-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="ds-progress__fill" style="--value:0%"></span></div><span class="ds-progress__value"><span class="ds-progress__pct">0%</span><span class="ds-swap">${spinner(14, 'data-swap="a"')}${icon("system-check--light", { size: 14, stroke: "2", attrs: 'data-swap="b"' })}</span></span></div><div class="ds-toast__actions"><button class="ds-btn" data-variant="surface" data-size="sm" data-shape="pill">Upload another</button><button class="ds-btn" data-type="secondary" data-variant="surface" data-size="sm" data-shape="pill" data-ds-dismiss>${icon("system-fault--cute-light", { size: 18 })}Cancel</button></div></div>`;
    }
    return `<span class="ds-toast__glow" aria-hidden="true"></span><div class="ds-toast__main"><span class="ds-toast__icon">${icon(TOAST_ICONS[type] || TOAST_ICONS.success, { size: 16 })}</span><div class="ds-toast__text"><div class="ds-toast__title">${esc(o.title || "")}</div>${o.description ? `<div class="ds-toast__desc">${esc(o.description)}</div>` : ""}</div></div>${close}`;
  }

  function toast(o = {}) {
    const r = region();
    const el = document.createElement("div");
    el.className = "ds-toast";
    el.dataset.motion = "";
    el.dataset.type = o.type || "success";
    if (o.color) el.dataset.color = o.color;
    el.setAttribute("role", o.type === "danger" ? "alert" : "status");
    el.innerHTML = toastMarkup(o);
    r.appendChild(el);
    init(el);
    let timer;
    const dismiss = () => {
      clearTimeout(timer);
      el.classList.remove("is-open");
      restack(r);
      setTimeout(() => el.remove(), cssMs("--toast-close", 250) + 40);
    };
    const arm = () => {
      clearTimeout(timer);
      if (o.duration !== 0) timer = setTimeout(dismiss, o.duration || 4500);
    };
    el.addEventListener("pointerenter", () => clearTimeout(timer));
    el.addEventListener("pointerleave", arm);
    el.addEventListener("click", (e) => { if (e.target.closest(".ds-toast__close, [data-ds-dismiss]")) dismiss(); });
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add("is-open"); restack(r); }));
    if (o.type === "upload") {
      const prog = el.querySelector(".ds-progress");
      let v = 0;
      const step = () => {
        if (!el.isConnected) return;
        v = Math.min(100, v + 6 + Math.random() * 14);
        setProgress(prog, v, v >= 100 ? "success" : "loading");
        if (v < 100) setTimeout(step, 420);
        else {
          const title = el.querySelector(".ds-toast__title");
          swapText(title, "Uploaded");
          arm();
        }
      };
      setTimeout(step, 500);
    } else arm();
    return { el, dismiss };
  }

  /* ───── Progress, text swap, indicator value ───── */

  function swapText(el, text) {
    if (!el) return;
    el.textContent = text;
    el.classList.add("ds-text-swap");
    el.classList.remove("is-swapping");
    void el.offsetWidth;
    el.classList.add("is-swapping");
  }

  function setProgress(el, value, state) {
    if (!el) return;
    const v = Math.max(0, Math.min(100, value));
    const fill = el.querySelector(".ds-progress__fill");
    const track = el.querySelector(".ds-progress__track");
    if (fill) fill.style.setProperty("--value", `${v}%`);
    if (track) track.setAttribute("aria-valuenow", String(Math.round(v)));
    const pct = el.querySelector(".ds-progress__pct");
    const txt = `${Math.round(v)}%`;
    if (pct && pct.textContent !== txt) swapText(pct, txt);
    if (state) {
      el.dataset.state = state;
      const swap = el.querySelector(".ds-progress__value .ds-swap");
      if (swap) swap.dataset.state = state === "success" ? "b" : "a";
    }
  }

  function setIndicator(el, value) {
    if (!el) return;
    let v = el.querySelector(".ds-indicator__value");
    if (!v) {
      v = document.createElement("span");
      v.className = "ds-indicator__value";
      el.textContent = "";
      el.appendChild(v);
    }
    v.textContent = value;
    v.classList.remove("is-popping");
    void v.offsetWidth;
    v.classList.add("is-popping");
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.toggleAttribute("data-loading", !!loading);
    btn.setAttribute("aria-busy", loading ? "true" : "false");
  }

  /* ───── Avatar group hover (distance falloff lift) ───── */

  function initAvatarGroup(group) {
    if (!once(group, "avatargroup")) return;
    const items = () => [...group.querySelectorAll(":scope > .ds-avatar")];
    const lift = () => cssMs("--avatar-lift", -4);
    const scale = () => parseFloat(getComputedStyle(group).getPropertyValue("--avatar-scale")) || 1.05;
    const falloff = 0.45;
    items().forEach((a, i) => {
      a.addEventListener("pointerenter", () => {
        items().forEach((b, j) => {
          const d = Math.abs(i - j);
          const k = Math.max(0, 1 - d * falloff);
          b.style.transitionTimingFunction = "var(--avatar-ease-in)";
          b.style.setProperty("--shift", `${(lift() * k).toFixed(2)}px`);
          b.style.setProperty("--scale-active", d === 0 ? String(scale()) : "1");
          b.style.zIndex = String(10 - d);
        });
      });
    });
    group.addEventListener("pointerleave", () => {
      items().forEach((b) => {
        b.style.transitionTimingFunction = "var(--avatar-ease-out)";
        b.style.setProperty("--shift", "0px");
        b.style.setProperty("--scale-active", "1");
        b.style.zIndex = "";
      });
    });
  }

  /* ───── Collapse toggles ───── */

  function initCollapseTriggers(scope) {
    scope.querySelectorAll("[data-ds-collapse]").forEach((btn) => {
      if (!once(btn, "collapse")) return;
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.dsCollapse);
        if (!target) return;
        const open = target.getAttribute("data-open") !== "false";
        target.setAttribute("data-open", open ? "false" : "true");
        btn.setAttribute("aria-expanded", open ? "false" : "true");
      });
    });
  }

  /* ───── Init ───── */

  function init(scope = document) {
    trackModality();
    initTooltips();
    if (scope.querySelectorAll) hydrateIcons(scope.nodeType === 1 && scope.parentElement ? scope.parentElement : scope);
    const q =(s) => (scope.matches && scope.matches(s) ? [scope] : []).concat([...scope.querySelectorAll(s)]);
    q(".ds-switch").forEach(initSwitch);
    q(".ds-checkbox__input").forEach(initCheckbox);
    q(".ds-tabs").forEach(initTabs);
    q(".ds-segmented").forEach(initSegmented);
    q(".ds-dots").forEach(initDots);
    q(".ds-select").forEach(initSelect);
    q(".ds-field").forEach(initField);
    q(".ds-stepper").forEach(initStepper);
    q(".ds-scroll").forEach(initScroll);
    q(".ds-avatar-group").forEach(initAvatarGroup);
    initCollapseTriggers(scope);
  }

  window.DS = Object.assign(window.DS || {}, {
    icon,
    spinner,
    init,
    toast,
    setProgress,
    setIndicator,
    setLoading,
    swapText,
    fieldError,
    openFloat,
    closeFloat,
    esc,
    uid,
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
  else init();
})();
