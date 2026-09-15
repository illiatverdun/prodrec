/* prodrec design system — markup builders.
   DS.html.<component>(options) returns an HTML string that matches components.css.
   Use them to assemble screens; call DS.init(container) after inserting. */
(function () {
  "use strict";

  const DS = (window.DS = window.DS || {});
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const attr = (name, value) => (value === undefined || value === null || value === false ? "" : value === true ? ` ${name}` : ` ${name}="${esc(value)}"`);
  const ic = (name, size, stroke, extra) => `<span class="ds-icon" data-icon="${esc(name)}"${size ? ` style="--icon-size:${size}px"` : ""}${stroke ? ` data-stroke="${stroke}"` : ""} aria-hidden="true"${extra ? " " + extra : ""}></span>`;
  let n = 0;
  const id = (p) => `${p}-${++n}`;

  const CHECK_PATH = "M1.17148 3.94311L3.0571 5.82873L6.82834 2.05749";
  const DASH_PATH = "M1.66667 4H6.33334";
  const AVATAR_SRC = "assets/images/size-16-picture-on-text-off-icon-off-color-blue-dark-off-f37dc501.png";
  const SLOT_SRC = "assets/images/background-aa821462.png";
  const MEDIA_SRC = "assets/images/slide-16-9-1-6d2d9940.jpg";

  const html = {
    icon: ic,

    button(o = {}) {
      const label = o.label ?? "Button";
      const left = o.iconLeft ? ic(o.iconLeft) : "";
      const right = o.iconRight ? ic(o.iconRight) : "";
      const inner = o.loadable
        ? `<span class="ds-btn__label"><span class="ds-btn__idle">${esc(label)}</span><span class="ds-btn__busy"><span class="ds-spinner" style="--icon-size:16px" aria-hidden="true"></span>${esc(o.busyLabel || "Saving")}</span></span>`
        : esc(label);
      return `<button class="ds-btn"${attr("data-type", o.type && o.type !== "primary" ? o.type : null)}${attr("data-variant", o.variant || "solid")}${attr("data-size", o.size || "sm")}${attr("data-shape", o.shape)}${attr("data-force", o.force)}${attr("data-loading", o.loading)}${attr("disabled", o.disabled)}${attr("type", o.htmlType || "button")}${o.attrs ? " " + o.attrs : ""}>${left}${inner}${right}</button>`;
    },

    iconButton(o = {}) {
      const size = o.size || "sm";
      return `<button class="ds-icon-btn"${attr("data-type", o.type && o.type !== "primary" ? o.type : null)}${attr("data-variant", o.variant || "solid")}${attr("data-size", size)}${attr("data-shape", o.shape)}${attr("data-force", o.force)}${attr("disabled", o.disabled)} type="button" aria-label="${esc(o.label || "Action")}"${o.tooltip ? ` data-ds-tooltip="${esc(o.tooltip)}"` : ""}${o.attrs ? " " + o.attrs : ""}>${ic(o.icon || "arrow-right--cute-light", null, o.stroke)}</button>`;
    },

    badge(o = {}) {
      return `<span class="ds-badge"${attr("data-color", o.color && o.color !== "pink" ? o.color : null)}${attr("data-variant", o.variant && o.variant !== "solid" ? o.variant : null)}${attr("data-size", o.size && o.size !== "sm" ? o.size : null)}${attr("data-animate", o.animate)}>${o.iconLeft ? ic(o.iconLeft) : ""}${esc(o.label ?? "Badge")}${o.iconRight ? ic(o.iconRight) : ""}</span>`;
    },

    indicator(o = {}) {
      const content = o.content || "dot";
      const body = content === "number" ? `<span class="ds-indicator__value">${esc(o.value ?? "+2")}</span>` : content === "icon" ? ic(o.icon || "user-user-2--cute-filled") : "";
      const label = o.label || (content === "number" ? `${o.value ?? "+2"} notifications` : "Status");
      return `<span class="ds-indicator"${attr("data-color", o.color && o.color !== "green" ? o.color : null)}${attr("data-size", o.size && o.size !== "sm" ? o.size : null)}${attr("data-content", content !== "dot" ? content : null)}${attr("data-pulse", o.pulse)} role="status" aria-label="${esc(label)}"${o.className ? "" : ""}${o.attrs ? " " + o.attrs : ""}>${body}</span>`;
    },

    avatar(o = {}) {
      const size = String(o.size || 40);
      const s = Number(size);
      const indSize = s <= 32 ? "sm" : s <= 44 ? "md" : "lg";
      const iconSizes = { 16: 8, 20: 8, 24: 12, 32: 16, 40: 16, 44: 20, 60: 24, 80: 40, 120: 40 };
      const mode = o.mode || "initials";
      let body = "";
      if (mode === "picture") body = `<img class="ds-avatar__img" src="${esc(o.src || AVATAR_SRC)}" alt="${esc(o.alt || "")}">`;
      else if (mode === "icon") body = ic(o.icon || "user-user-2--filled", iconSizes[size]);
      else body = `<span>${esc((o.initials || "IN").slice(0, 2))}</span>`;
      const status = o.status ? html.indicator({ color: o.status === true ? "green" : o.status, size: indSize, label: o.statusLabel || "Online", attrs: 'data-slot="status"' }).replace('class="ds-indicator"', 'class="ds-indicator ds-avatar__status"') : "";
      const notif = o.notification ? html.indicator({ color: "red", size: indSize, label: "New notification" }).replace('class="ds-indicator"', 'class="ds-indicator ds-avatar__notif"') : "";
      const label = mode === "picture" ? "" : ` role="img" aria-label="${esc(o.alt || o.initials || "User")}"`;
      return `<span class="ds-avatar" data-size="${esc(size)}"${attr("data-color", mode === "picture" ? null : o.color && o.color !== "blue" ? o.color : null)}${attr("data-dark", o.dark)}${label}>${body}${status}${notif}</span>`;
    },

    avatarGroup(list = [], o = {}) {
      return `<div class="ds-avatar-group" role="group" aria-label="${esc(o.label || "Team")}">${list.map((a) => html.avatar({ size: o.size || 40, ...a })).join("")}</div>`;
    },

    callout(o = {}) {
      const size = o.size || "sm";
      const action = o.action
        ? html.button({ label: o.action, variant: "surface", size: size === "lg" ? "md" : "sm", shape: "pill" })
        : "";
      return `<div class="ds-callout"${attr("data-color", o.color && o.color !== "accent" ? o.color : null)}${attr("data-variant", o.variant && o.variant !== "solid" ? o.variant : null)}${attr("data-size", size !== "sm" ? size : null)} role="${o.role || "note"}">${ic(o.icon || "transport-brake--cute-light")}<span class="ds-callout__text">${esc(o.text ?? "Text")}</span>${action}</div>`;
    },

    separator(o = {}) {
      return `<span class="ds-separator"${attr("data-size", o.size && o.size !== "sm" ? o.size : null)}${attr("data-orientation", o.orientation === "vertical" ? "vertical" : null)} role="separator"${o.orientation === "vertical" ? ' aria-orientation="vertical"' : ""}></span>`;
    },

    slot(o = {}) {
      return `<div class="ds-slot"${o.style ? ` style="${esc(o.style)}"` : ""}>${esc(o.label ?? "")}</div>`;
    },

    checkbox(o = {}) {
      const box = `<span class="ds-checkbox__box" aria-hidden="true"><svg class="ds-checkbox__check" viewBox="0 0 8 8"><path pathLength="1" d="${CHECK_PATH}"/></svg><svg class="ds-checkbox__dash" viewBox="0 0 8 8"><path pathLength="1" d="${DASH_PATH}"/></svg></span>`;
      const label = o.label === null ? "" : `<span class="ds-checkbox__label">${esc(o.label ?? "Label")}</span>`;
      return `<label class="ds-checkbox"${attr("data-size", o.size === "sm" ? "sm" : null)}${attr("data-force", o.force)}><input class="ds-checkbox__input" type="checkbox"${attr("name", o.name)}${attr("value", o.value)}${attr("checked", o.checked)}${attr("disabled", o.disabled)}${attr("data-indeterminate", o.indeterminate)}${o.label === null ? ` aria-label="${esc(o.ariaLabel || "Select")}"` : ""}>${box}${label}</label>`;
    },

    radio(o = {}) {
      const label = o.label === null ? "" : `<span class="ds-radio__label">${esc(o.label ?? "Label")}</span>`;
      return `<label class="ds-radio"${attr("data-force", o.force)}><input class="ds-radio__input" type="radio" name="${esc(o.name || "radio")}"${attr("value", o.value)}${attr("checked", o.checked)}${attr("disabled", o.disabled)}><span class="ds-radio__dot" aria-hidden="true"></span>${label}</label>`;
    },

    switchControl(o = {}) {
      const label = o.label ? `<span class="ds-switch__label">${esc(o.label)}</span>` : "";
      return `<label class="ds-switch"${attr("data-force", o.force)}><input class="ds-switch__input" type="checkbox" role="switch"${attr("checked", o.checked)}${attr("disabled", o.disabled)}${!o.label ? ` aria-label="${esc(o.ariaLabel || "Toggle")}"` : ""}><span class="ds-switch__track" aria-hidden="true"><span class="ds-switch__thumb"></span></span>${label}</label>`;
    },

    checkCard(o = {}) {
      return `<label class="ds-check-card"${attr("data-size", o.size && o.size !== "sm" ? o.size : null)}${attr("data-width", o.width)}${attr("data-force", o.force)}><input class="ds-check-card__input ds-checkbox__input" type="checkbox"${attr("name", o.name)}${attr("checked", o.checked)}${attr("disabled", o.disabled)}><span class="ds-check-card__body"><span class="ds-check-card__title">${o.icon ? ic(o.icon) : ""}${esc(o.title ?? "Title")}</span><span class="ds-check-card__desc">${esc(o.desc ?? "Subtitle")}</span></span><span class="ds-checkbox__box" data-size="sm" aria-hidden="true"><svg class="ds-checkbox__check" viewBox="0 0 8 8"><path pathLength="1" d="${CHECK_PATH}"/></svg></span></label>`;
    },

    tabs(o = {}) {
      const base = o.id || id("tabs");
      const items = o.items || [{ label: "Tabs text" }, { label: "Tabs text" }, { label: "Tabs text" }];
      const sel = o.selected ?? 0;
      const tabs = items
        .map((t, i) => {
          const count = t.count !== undefined ? html.indicator({ content: "number", value: t.count, label: `${t.count} items` }) : "";
          return `<button class="ds-tab" type="button" id="${base}-tab-${i}" aria-selected="${i === sel}"${o.panels ? ` aria-controls="${base}-panel-${i}"` : ""}${attr("disabled", t.disabled)}${attr("data-force", t.force)}>${t.icon ? ic(t.icon, null, "1.5") : ""}<span class="ds-tab__label">${esc(t.label)}</span>${count}</button>`;
        })
        .join("");
      const bar = `<div class="ds-tabs"${attr("data-size", o.size && o.size !== "sm" ? o.size : null)} role="tablist" aria-label="${esc(o.label || "Tabs")}">${tabs}</div>`;
      if (!o.panels) return bar;
      const panels = o.panels.map((p, i) => `<div class="ds-tab-panel" role="tabpanel" id="${base}-panel-${i}" aria-labelledby="${base}-tab-${i}"${i === sel ? "" : " hidden"}>${p}</div>`).join("");
      return bar + panels;
    },

    segmented(o = {}) {
      const items = o.items || [{ label: "Item" }, { label: "Item" }, { label: "Item" }];
      const sel = o.selected ?? 0;
      return `<div class="ds-segmented"${attr("data-size", o.size && o.size !== "sm" ? o.size : null)} role="radiogroup" aria-label="${esc(o.label || "Options")}"><span class="ds-segmented__pill" aria-hidden="true"></span>${items
        .map((it, i) => `<button class="ds-segmented__item" type="button" role="radio" aria-checked="${i === sel}"${attr("data-value", it.value ?? it.label)}${attr("disabled", it.disabled)}${attr("data-force", it.force)}>${it.icon ? ic(it.icon) : ""}${esc(it.label)}${it.count !== undefined ? html.indicator({ content: "number", value: it.count }) : ""}</button>`)
        .join("")}</div>`;
    },

    field(o = {}) {
      const fid = o.id || id("field");
      const size = o.size || "sm";
      const multiline = !!o.multiline;
      const tip = o.tip ? `<span class="ds-field__tip" data-ds-tooltip="${esc(o.tip)}" tabindex="0">${ic("system-information--filled")}</span>` : "";
      const label = o.label ? `<div class="ds-field__label"><label for="${fid}">${esc(o.label)}</label>${tip}</div>` : "";
      const lead = !multiline && o.leadIcon ? `<span class="ds-field__lead">${ic(o.leadIcon, null, "1")}</span>` : "";
      const descId = `${fid}-desc`;
      const common = `class="ds-field__input" id="${fid}"${attr("placeholder", o.placeholder ?? "Placeholder")}${attr("disabled", o.disabled)}${attr("maxlength", o.maxLength)}${o.description ? ` aria-describedby="${descId}"` : ""}${o.state === "danger" ? ' aria-invalid="true"' : ""}${attr("name", o.name)}${attr("inputmode", o.inputmode)}${attr("min", o.min)}${attr("max", o.max)}${attr("autocomplete", o.autocomplete)}`;
      const input = multiline
        ? `<textarea ${common} rows="${o.rows || 2}">${esc(o.value ?? "")}</textarea>`
        : `<input ${common} type="${o.action === "password" ? "password" : o.type || "text"}"${attr("value", o.value)}>`;
      let action = "";
      if (o.action === "password") {
        action = `<button class="ds-icon-btn ds-field__action" data-type="secondary" data-variant="link" data-size="sm" type="button" aria-label="Show password" aria-pressed="false" data-ds-action="toggle-password"><span class="ds-swap">${ic("system-eye-close--light", 14, null, 'data-swap="a"')}${ic("part-eye-2--light", 14, null, 'data-swap="b"')}</span></button>`;
      } else if (o.action === "clear") {
        action = `<button class="ds-icon-btn ds-field__action" data-type="secondary" data-variant="link" data-size="sm" type="button" aria-label="Clear" data-ds-action="clear"${o.value ? "" : " hidden"}>${ic("system-close--light", 14)}</button>`;
      } else if (o.action === "icon") {
        action = `<button class="ds-icon-btn ds-field__action" data-type="secondary" data-variant="link" data-size="sm" type="button" aria-label="Action">${ic("system-eye-close--light", 14)}</button>`;
      }
      let desc = "";
      if (o.description || o.count) {
        const stateIcon = o.state === "warning" || o.state === "danger" ? ic("system-question--filled") : "";
        const count = o.count ? `<span class="ds-field__count"></span>` : "";
        desc = `<div class="ds-field__desc" id="${descId}">${stateIcon}<span>${esc(o.description || "")}</span>${count}</div>`;
      }
      return `<div class="ds-field"${attr("data-size", size !== "sm" ? size : null)}${attr("data-state", o.state && o.state !== "default" ? o.state : null)}${attr("data-multiline", multiline)}${attr("data-width", o.width)}${attr("data-disabled", o.disabled)}${attr("data-force", o.force)}>${label}<div class="ds-field__control">${lead}<span class="ds-field__slot">${input}</span>${action}</div>${desc}</div>`;
    },

    menuItem(o = {}) {
      const media = o.media ? `<span class="ds-menu-item__media">${o.media}</span>` : "";
      const desc = o.desc ? `<span class="ds-menu-item__desc">${esc(o.desc)}</span>` : "";
      const check = o.check ? ic("system-check--cute-light", 16, null, 'class="ds-menu-item__check"').replace('class="ds-icon" data-icon', 'class="ds-icon ds-menu-item__check" data-icon').replace(' class="ds-menu-item__check"', "") : "";
      const trail = o.trail || check ? `<span class="ds-menu-item__trail">${o.trail || ""}${check}</span>` : "";
      return `<div class="ds-menu-item" role="option" tabindex="-1" aria-selected="${!!o.selected}"${attr("data-value", o.value ?? o.title)}${attr("data-label", o.title)}${attr("data-force", o.force)}${o.disabled ? ' aria-disabled="true"' : ""}><span class="ds-menu-item__main">${media}<span class="ds-menu-item__text"><span class="ds-menu-item__title">${esc(o.title ?? "Illia Tverdun")}</span>${desc}</span></span>${trail}</div>`;
    },

    popover(o = {}) {
      const items = (o.items || []).map((it) => (it === "separator" ? html.separator() : html.menuItem(it))).join("");
      const search = o.search
        ? `<div class="ds-popover__search">${html.field({ size: "sm", placeholder: o.search === true ? "Search" : o.search, leadIcon: "file-search--cute-light", width: "fill", action: "clear" }).replace('class="ds-field__input"', 'class="ds-field__input" data-ds-filter')}</div>`
        : "";
      const header = o.header ? `<div class="ds-popover__header">${esc(o.header)}</div>` : "";
      const list = `<div class="ds-popover__list" role="listbox"${o.multiple ? ' aria-multiselectable="true"' : ""}>${items}<div class="ds-popover__empty" hidden>Nothing found</div></div>`;
      const extra = o.className ? " " + o.className : "";
      const scroll = o.maxHeight ? `<div class="ds-scroll" data-autohide style="max-block-size:${o.maxHeight}px"><div class="ds-scroll__viewport" style="max-block-size:${o.maxHeight}px">${list}</div><div class="ds-scroll__bar" data-orientation="vertical"><div class="ds-scroll__track"><span class="ds-scroll__thumb"></span></div></div></div>` : list;
      return `<div class="ds-popover${extra}"${attr("data-variant", o.variant && o.variant !== "classic" ? o.variant : null)}${o.id ? ` id="${esc(o.id)}"` : ""}>${search}${header}${scroll}</div>`;
    },

    select(o = {}) {
      const fid = o.id || id("select");
      const size = o.size || "sm";
      const selected = (o.options || []).filter((op) => op.selected);
      const valueText = selected.length ? selected.map((s) => s.title).join(", ") : o.placeholder || "Select element";
      const tip = o.tip ? `<span class="ds-field__tip" data-ds-tooltip="${esc(o.tip)}" tabindex="0">${ic("system-information--filled")}</span>` : "";
      const label = o.label ? `<div class="ds-field__label"><span id="${fid}-label">${esc(o.label)}</span>${tip}</div>` : "";
      const lead = o.leadIcon ? `<span class="ds-field__lead">${ic(o.leadIcon, null, size === "lg" ? "1.5" : "1")}</span>` : "";
      const num = o.number ? `<span class="ds-select__num">${esc(o.number)}</span>` : "";
      const count = o.count !== undefined ? html.indicator({ content: "number", color: "blue", value: o.count }) : "";
      const desc = o.description ? `<div class="ds-field__desc">${esc(o.description)}</div>` : "";
      const pop = html.popover({ variant: o.variant, search: o.search, items: o.options || [], multiple: o.multiple, maxHeight: o.maxHeight, className: "ds-float" });
      return `<div class="ds-select ds-field"${attr("data-size", size !== "sm" ? size : null)}${attr("data-state", o.state === "error" ? "error" : null)}${attr("data-disabled", o.disabled)}${attr("data-multiple", o.multiple)}${attr("data-width", o.width)}${attr("data-force", o.force)}${attr("data-open", o.open)}>${label}<button class="ds-field__control ds-select__trigger" type="button"${o.label ? ` aria-labelledby="${fid}-label ${fid}-value"` : ` aria-label="${esc(o.ariaLabel || "Select")}"`}${attr("disabled", o.disabled)}>${lead}<span class="ds-select__value" id="${fid}-value"${selected.length ? "" : " data-placeholder"}>${esc(valueText)}</span>${num}${count}<span class="ds-select__chevron">${ic("arrow-selector-vertical--cute-light", null, "1.5")}</span></button>${desc}${pop}</div>`;
    },

    progress(o = {}) {
      const v = Math.max(0, Math.min(100, o.value ?? 50));
      const state = o.state || (v >= 100 ? "success" : "loading");
      const inline = o.orientation === "inline";
      const title = o.title === null ? "" : `<span class="ds-progress__title">${esc(o.title ?? "Title")}${o.tip === false ? "" : ic("system-information--filled")}</span>`;
      const value = `<span class="ds-progress__value"><span class="ds-progress__pct">${Math.round(v)}%</span><span class="ds-swap"${state === "success" ? ' data-state="b"' : ""}><span class="ds-spinner" style="--icon-size:14px" aria-hidden="true" data-swap="a"></span>${ic("system-check--light", 14, "2", 'data-swap="b"')}</span></span>`;
      const track = `<div class="ds-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"${o.title ? ` aria-label="${esc(o.title)}"` : ""}><span class="ds-progress__fill" style="--value:${v}%"></span></div>`;
      const caption = o.caption === null || inline ? "" : `<div class="ds-progress__caption">${esc(o.caption ?? (state === "error" ? "Ooops, something went wrong" : "30MB from 60MB"))}</div>`;
      const attrs = `${attr("data-size", o.size && o.size !== "sm" ? o.size : null)} data-state="${state}"${attr("data-orientation", inline ? "inline" : null)}${attr("data-width", o.width)}`;
      if (inline) return `<div class="ds-progress"${attrs}>${title}${track}${value}</div>`;
      return `<div class="ds-progress"${attrs}><div class="ds-progress__head">${title}${value}</div>${track}${caption}</div>`;
    },

    stepper(o = {}) {
      return `<div class="ds-stepper"${attr("data-target", o.target)} role="group" aria-label="Change page"><button class="ds-stepper__btn" data-direction="up" type="button" aria-label="Next"${attr("data-force", o.forceUp)}${attr("disabled", o.upDisabled)}>${ic("arrow-up-small--cute-light")}</button><button class="ds-stepper__btn" data-direction="down" type="button" aria-label="Previous"${attr("data-force", o.forceDown)}${attr("disabled", o.downDisabled)}>${ic("arrow-down-small--cute-light")}</button></div>`;
    },

    pagination(o = {}) {
      const variant = o.variant || "start";
      const total = o.total || 100;
      const page = o.page ?? (variant === "start" ? 1 : variant === "end" ? total : 12);
      const inputId = o.id || id("page");
      const back = variant !== "start" ? html.iconButton({ icon: "arrow-left--cute-light", type: "secondary", variant: "surface", size: "lg", shape: "pill", label: "Previous page", attrs: 'data-ds-page="prev"' }) : "";
      const next = variant !== "end" ? html.button({ label: "Next page", size: "lg", iconRight: "arrow-right--cute-light", attrs: 'data-ds-page="next"' }) : "";
      const field = html.field({ id: inputId, size: "md", placeholder: "1", value: String(page), type: "number", inputmode: "numeric", min: 1, max: total }).replace('class="ds-field"', 'class="ds-field"').replace('data-size="md"', 'data-size="md" data-filled');
      return `<nav class="ds-pagination" aria-label="Pagination"><div class="ds-pagination__nav">${back}${next}</div><div class="ds-pagination__pages"><label for="${inputId}">Page</label><div class="ds-pagination__input">${field}${html.stepper({ target: inputId })}</div><span>from ${total}</span></div></nav>`;
    },

    dots(o = {}) {
      const count = o.count || 8;
      const cur = o.current ?? 0;
      return `<div class="ds-dots"${attr("data-size", o.size && o.size !== "lg" ? o.size : null)} role="group" aria-label="${esc(o.label || "Slides")}">${Array.from({ length: count }, (_, i) => `<button class="ds-dots__dot" type="button" aria-current="${i === cur}" aria-label="Slide ${i + 1}"${attr("data-force", o.forceIndex === i ? o.force : null)}></button>`).join("")}<span class="ds-dots__thumb" aria-hidden="true"></span></div>`;
    },

    scrollArea(o = {}) {
      const horizontal = o.orientation === "horizontal";
      return `<div class="ds-scroll"${attr("data-size", o.size && o.size !== "sm" ? o.size : null)}${attr("data-autohide", o.autohide)}${attr("data-force", o.force)} style="${horizontal ? "" : `block-size:${o.height || 220}px;`}${o.style || ""}"><div class="ds-scroll__viewport" tabindex="0" aria-label="${esc(o.label || "Scrollable content")}" style="${horizontal ? "overflow-y:hidden;" : ""}">${o.content || ""}</div><div class="ds-scroll__bar" data-orientation="${horizontal ? "horizontal" : "vertical"}" aria-hidden="true"><div class="ds-scroll__track"><span class="ds-scroll__thumb"></span></div></div></div>`;
    },

    toast(o = {}) {
      const type = o.type || "success";
      const close = `<button class="ds-icon-btn ds-toast__close" data-type="secondary" data-variant="link" data-size="sm" type="button" aria-label="Dismiss">${ic("system-close--light", 14)}</button>`;
      const icons = { success: "system-checks--cute-light", warning: "emoji-puzzled--cute-light", danger: "other-bomb--cute-light" };
      const titles = { success: "Successfully Message", warning: "Warning Message", danger: "Danger Message", upload: "Uploading" };
      const attrs = ` data-type="${type}"${attr("data-color", o.color && o.color !== "white" ? o.color : null)} role="${type === "danger" ? "alert" : "status"}"`;
      if (type === "upload") {
        const badge = html.badge({ label: o.file || "file_name.pdf", color: "gray", variant: o.color === "gray" ? "surface" : "solid" });
        return `<div class="ds-toast"${attrs}><div class="ds-toast__head"><div class="ds-toast__file"><span class="ds-toast__tile">${ic("file-download-2--cute-regular", 20)}</span><div class="ds-toast__text"><div class="ds-toast__titlerow"><span class="ds-toast__title">${esc(o.title || titles.upload)}</span>${badge}</div><div class="ds-toast__desc" data-size="sm">${esc(o.description ?? "Please wait while we upload your file.")}</div></div></div>${close}</div><div class="ds-toast__body">${html.progress({ orientation: "inline", title: null, value: o.value ?? 50, width: "fill" })}<div class="ds-toast__actions">${html.button({ label: "Upload another", variant: "surface", shape: "pill" })}${html.button({ label: "Cancel", type: "secondary", variant: "surface", shape: "pill", iconLeft: "system-fault--cute-light" })}</div></div></div>`;
      }
      const desc = o.description === null ? "" : `<div class="ds-toast__desc">${esc(o.description ?? titles[type])}</div>`;
      return `<div class="ds-toast"${attrs}><span class="ds-toast__glow" aria-hidden="true"></span><div class="ds-toast__main">${o.icon === false ? "" : `<span class="ds-toast__icon">${ic(icons[type], 16)}</span>`}<div class="ds-toast__text"><div class="ds-toast__title">${esc(o.title || titles[type])}</div>${desc}</div></div>${close}</div>`;
    },

    tooltipCard(o = {}) {
      const parts = [];
      if (o.title !== null) parts.push(`<div class="ds-tooltip__title">${esc(o.title ?? "Add to library")}</div>`);
      if (o.image) parts.push(`<img class="ds-tooltip__media" src="${MEDIA_SRC}" alt="">`);
      if (o.slotTop) parts.push(html.slot());
      parts.push(`<div class="ds-tooltip__text">${esc(o.text ?? "Quickly save this item to your library for easy access later!")}</div>`);
      if (o.slotBottom) parts.push(html.slot());
      if (o.separator) parts.push(html.separator());
      if (o.button) parts.push(html.button({ label: o.button === true ? "Button" : o.button, type: "secondary", variant: "outline", attrs: 'class="ds-tooltip__action"' }).replace('class="ds-btn" ', 'class="ds-btn ds-tooltip__action" ').replace(' class="ds-tooltip__action"', ""));
      return `<div class="ds-tooltip"${attr("data-size", o.size === "md" ? "md" : null)} role="tooltip">${parts.join("")}</div>`;
    },

    flag(file, o = {}) {
      return `<img class="ds-flag" src="assets/flags/${esc(file)}.svg" alt="${esc(o.alt || "")}"${o.size ? ` style="--flag-size:${o.size}px"` : ""} loading="lazy">`;
    },

    kbd(text) {
      return `<kbd class="ds-kbd">${esc(text)}</kbd>`;
    },

    assets: { AVATAR_SRC, SLOT_SRC, MEDIA_SRC },
  };

  DS.html = html;
})();
