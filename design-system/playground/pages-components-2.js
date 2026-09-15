/* Components B: Pagination · Progress · Radio · Scroll Bar · Segmented · Selector · Popover · Separator · Slot · Switch · Tabs · Text area · Text field · Toast · Tooltip */
(function () {
  "use strict";
  const H = DS.html;
  const ui = PG.ui;
  const sec = ui.section;
  const opt = (l) => l.map((v) => ({ label: v, value: v }));
  const STATES = [["Normal", ""], ["Hover", "hover"], ["Focus", "focus"], ["Active", "active"], ["Disabled", "disabled"]];
  const reg = (o) => PG.register({ group: "components", ...o });
  const USERS = [["Illia Tverdun", "Product Designer", "pink", "IT"], ["Emily Carter", "Product Manager", "violet", "EC"], ["Sarah Johnson", "Marketing Lead", "green", "SJ"], ["Michael Thompson", "Founder", "orange", "MT"]];
  const userOpts = (sel = 0) => USERS.map(([t, d, c, i], k) => ({ title: t, desc: d, media: H.avatar({ size: 32, color: c, initials: i }), check: true, selected: k === sel }));

  reg({
    id: "pagination", title: "Pagination", glyph: "Pg", figma: "385:9295", figmaName: "_Pagination · Pag item · Pagination_counter",
    lede: "Перемикання сторінок: кнопка «Next page», поле номера зі степером і точки-слайдер.", meta: ["Start · Middle · End", "Dots sm · md · lg"],
    render() {
      const nav = PG.playground({
        noMorph: true, stageStyle: "inline-size:100%",
        controls: [{ key: "page", label: "Сторінка", options: opt(["1", "12", "100"]), value: "1" }],
        render: (s) => H.pagination({ page: Number(s.page), variant: s.page === "1" ? "start" : s.page === "100" ? "end" : "middle", id: "pg-page-input" }),
        after(stage) {
          const input = stage.querySelector("input");
          const go = (d) => { input.value = String(Math.min(100, Math.max(1, Number(input.value) + d))); input.dispatchEvent(new Event("change", { bubbles: true })); };
          stage.querySelectorAll("[data-ds-page]").forEach((b) => b.addEventListener("click", () => go(b.dataset.dsPage === "next" ? 1 : -1)));
        },
      });
      const dots = PG.playground({
        controls: [{ key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "lg" }],
        render: (s) => H.dots({ size: s.size, count: 8, current: 0 }),
      });
      const stepper = ui.matrix(["Normal", "Hover", "Press", "Disable"], ["Up", "Down"].map((d) => ({ label: d, cells: ["", "hover", "active", "disabled"].map((f) => H.stepper(d === "Up" ? { forceUp: f && f !== "disabled" ? f : null, upDisabled: f === "disabled" } : { forceDown: f && f !== "disabled" ? f : null, downDisabled: f === "disabled" })) })));
      return [
        sec("Навігація", "Стрілки ↑/↓ у полі теж змінюють номер.", nav.html),
        sec("Точки", "Активна точка переповзає до нової (caterpillar).", dots.html),
        sec("Степер", "", stepper),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Друкарська помилка", text: "Властивість названа «Diraction». Колір стрілок <code>#717579</code> — поза змінними." },
          { tone: "figma", title: "Surface icon button", text: "Кнопка «назад» використовує круглий Surface-варіант, якого немає в наборі Icon Button." },
        ])),
        { html: "", mount: nav.mount }, { html: "", mount: dots.mount },
      ];
    },
  });

  reg({
    id: "progress", title: "Progress", glyph: "Pr", figma: "218:5798", figmaName: "Progress · 16 варіантів",
    lede: "Прогрес завантаження або цілі: заголовок, відсоток зі спінером, трек і підпис.", meta: ["sm · md", "Normal · Oneline", "0% · 50% · Success · Error"],
    render() {
      const live = PG.playground({
        stageStyle: "inline-size:min(420px,100%)",
        controls: [
          { key: "size", label: "Size", options: opt(["sm", "md"]) },
          { key: "orientation", label: "Orientation", options: [{ label: "Normal", value: "stacked" }, { label: "Oneline", value: "inline" }] },
          { key: "state", label: "State", options: opt(["loading", "success", "error"]) },
          { key: "value", label: "Value", options: opt(["0", "25", "50", "95", "100"]), value: "50" },
        ],
        actions: [{ label: "Симулювати", icon: "system-refresh-1--cute-light", run: (stage) => { const p = stage.querySelector(".ds-progress"); let v = 0; DS.setProgress(p, 0, "loading"); const t = setInterval(() => { v += 8 + Math.random() * 12; DS.setProgress(p, v, v >= 100 ? "success" : "loading"); if (v >= 100) clearInterval(t); }, 350); } }],
        render: (s) => H.progress({ size: s.size, orientation: s.orientation, state: s.state, value: Number(s.value), width: "fill" }),
      });
      return [
        sec("Playground", "Ширина заповнення анімується 500ms, відсоток змінюється заміною тексту, спінер перетворюється на галочку.", live.html),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "gap", title: "Спінер у Success/Error", text: "У Figma спінер у цих станах перефарбовано в <code>#f7f9fc</code>, тож він фактично зникає. Код показує галочку для Success і прибирає спінер." }])),
        { html: "", mount: live.mount },
      ];
    },
  });

  reg({
    id: "radio", title: "Radio", glyph: "Rd", figma: "234:870", figmaName: "Radio button · 8 варіантів",
    lede: "Один вибір із кількох. Під курсором обідок стає товстішим, при виборі перетворюється на рожеве кільце з пружиною.", meta: ["Off · On", "5 станів"],
    render() {
      const group = `<div class="ds-radio-group" role="radiogroup" aria-label="Одиниця обліку">${["Години", "Дні", "Проєкт цілком"].map((l, i) => H.radio({ label: l, name: "unit", checked: i === 0 })).join("")}</div>`;
      const states = ui.matrix(STATES.map((s) => s[0]), [["Off", false], ["On", true]].map(([l, c]) => ({ label: l, cells: STATES.map(([, f]) => H.radio({ label: "Label", name: `r-${l}-${f}`, checked: c, force: f && f !== "disabled" ? f : null, disabled: f === "disabled" })) })));
      return [sec("Група", "", `<div class="pg-card">${group}</div>`), sec("Стани", "", states), sec("Код", "", ui.code(H.radio({ label: "Години", name: "unit", checked: true }), { radius: true }))];
    },
  });

  reg({
    id: "scroll-bar", title: "Scroll Bar", glyph: "Sb", figma: "238:756", figmaName: "Scroll bar · 24 варіанти",
    lede: "Тонкий кастомний скролбар для списків і поповерів: sm 4px, md 8px, вертикальний і горизонтальний, перетягується.", meta: ["sm · md", "V · H"],
    render() {
      const text = "Explore the vast universe of possibilities with our innovative software solutions designed to elevate your productivity and creativity. Dive in and discover how we can transform your workflow! ".repeat(6);
      const live = PG.playground({
        stageStyle: "inline-size:min(420px,100%)",
        controls: [{ key: "size", label: "Size", options: opt(["sm", "md"]) }, { key: "autohide", label: "Autohide", type: "switch", value: false }],
        render: (s) => `<div class="pg-card" style="padding:0;inline-size:100%">${H.scrollArea({ size: s.size, autohide: s.autohide, height: 200, content: `<p class="ts-body-md-regular" style="padding:var(--spacing-md) var(--spacing-xl) var(--spacing-md) var(--spacing-md);color:var(--text-secondary)">${text}</p>` })}</div>`,
      });
      return [
        sec("Playground", "", live.html),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "gap", title: "Майже невидимий", text: "Повзунок <code>bg-secondary-20</code> на треку <code>bg-secondary-10</code> має контраст близько 1.02:1. Код повторює Figma; для реальних списків варто взяти <code>--bg-secondary</code>, як у <code>.ds-native-scroll</code>." }])),
        { html: "", mount: live.mount },
      ];
    },
  });

  reg({
    id: "segmented-control", title: "Segmented Control", glyph: "Sc", figma: "238:4128", figmaName: "Segmented control · Item",
    lede: "Взаємовиключні опції в один ряд; активна плашка переїжджає між пунктами.", meta: ["sm · md · lg", "2–6 пунктів"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "count", label: "Пунктів", options: opt(["2", "3", "4", "6"]), value: "3" },
          { key: "icon", label: "Icon", type: "switch", value: false },
          { key: "ind", label: "Indicator", type: "switch", value: false },
        ],
        noMorph: true,
        render: (s) => H.segmented({ size: s.size, items: ["День", "Тиждень", "Місяць", "Квартал", "Рік", "Все"].slice(0, Number(s.count)).map((l, i) => ({ label: l, icon: s.icon ? "logo-layers--cute-light" : null, count: s.ind && i === 1 ? "+2" : undefined })) }),
      });
      const states = ui.matrix(["Normal", "Hover", "Selected", "Focus"], ["sm", "md", "lg"].map((sz) => ({ label: sz, cells: [H.segmented({ size: sz, items: [{ label: "Item" }], selected: -1 }), H.segmented({ size: sz, items: [{ label: "Item", force: "hover" }], selected: -1 }), H.segmented({ size: sz, items: [{ label: "Item" }] }), H.segmented({ size: sz, items: [{ label: "Item", force: "focus" }], selected: -1 })] })));
      return [sec("Playground", "Клавіші ← → перемикають пункти.", live.html), sec("Стани", "", states),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Selected", text: "Фон обраного пункту дорівнює фону контейнера (<code>bg-secondary-10</code>) — вибір тримається лише на обведенні. Шапки сторінки скопійовані з Scroll bar." }])),
        { html: "", mount: live.mount }];
    },
  });

  reg({
    id: "selector", title: "Selector", glyph: "Se", figma: "249:7524", figmaName: "Selector · 21 варіант",
    lede: "Поле-тригер зі списком у поповері: пошук, аватари, мультивибір, клавіатура ↑ ↓ Enter Esc і набір першої літери.", meta: ["sm · md · lg", "7 станів", "Classic · Surface"],
    render() {
      const live = PG.playground({
        minHeight: 480, noMorph: true, stageStyle: "align-self:start;padding-block-start:var(--spacing-xl)",
        controls: [
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "state", label: "State", options: opt(["default", "error", "disabled"]) },
          { key: "variant", label: "Popover", options: opt(["classic", "surface"]) },
          { key: "search", label: "Search", type: "switch", value: true },
          { key: "multiple", label: "Multiple", type: "switch", value: false },
          { key: "lead", label: "Main icon", type: "switch", value: true },
        ],
        render: (s) => H.select({ label: "Клієнт", tip: "Кому виставляєте рахунок", size: s.size, state: s.state === "error" ? "error" : null, disabled: s.state === "disabled", variant: s.variant, search: s.search ? "Пошук" : null, multiple: s.multiple, leadIcon: s.lead ? "nature-tree-4--cute-light" : null, description: s.state === "error" ? "Оберіть клієнта" : "Some description", options: userOpts(-1), maxHeight: 220 }),
      });
      const states = ui.matrix(["sm", "md", "lg"], [["Normal", {}], ["Hover", { force: "hover" }], ["Active", { force: "active" }], ["Filled", { options: userOpts(1) }], ["Error", { state: "error" }], ["Disable", { disabled: true }]].map(([l, o]) => ({ label: l, cells: ["sm", "md", "lg"].map((sz) => H.select({ label: "Title", size: sz, leadIcon: "nature-tree-4--cute-light", description: "Some description", options: userOpts(-1), ...o })) })));
      return [sec("Playground", "", live.html), sec("Стани", "", states),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Документація", text: "Опис згадує варіанти Classic | Gray | Surface — у наборі їх немає. Підпис sm — <code>body/md-medium</code>, md/lg — <code>body/lg-medium</code>, а в Text Field — semibold." }])),
        { html: "", mount: live.mount }];
    },
  });

  reg({
    id: "popover", title: "Popover", glyph: "Po", figma: "400:4246", figmaName: "Popover · Drop_item",
    lede: "Контейнер для випадних списків: слоти зверху й знизу, пункти з медіа, розділювач, скрол. Classic на картці, Surface — матове скло.", meta: ["Classic · Surface", "Drop item: Normal · Hover · Selected"],
    render() {
      const pop = (variant) => H.popover({ variant, header: "Users", search: true, items: [...userOpts(0).slice(0, 3), "separator", { title: "Save file", trail: H.kbd("Ctrl+S"), media: DS.icon("file-download-2--cute-regular") }, { title: "Switzerland", media: H.flag("switzerland", { size: 32 }), trail: H.badge({ label: "CHF", color: "gray", variant: "surface" }) }] });
      const stage = `<div style="display:flex;flex-wrap:wrap;gap:var(--spacing-xl);align-items:start;padding:var(--spacing-xl);border-radius:var(--rounded-5xl);background:radial-gradient(circle at 20% 30%,var(--color-pink-300),transparent 40%),radial-gradient(circle at 80% 70%,var(--color-sky-300),transparent 40%),var(--bg-subtle)">${pop("classic")}${pop("surface")}</div>`;
      const items = ui.matrix(["Normal", "Hover", "Selected"], [{ label: "Drop item", cells: ["", "hover", "selected"].map((f) => `<div class="ds-popover" style="inline-size:260px">${H.menuItem({ ...userOpts(-1)[0], force: f || null })}</div>`) }]);
      return [sec("Classic і Surface", "", stage), sec("Пункт", "", items), sec("Код", "", ui.code(pop("classic"), { radius: true }))];
    },
    afterRender(host) { DS.init(host); },
  });

  reg({
    id: "separator", title: "Separator", glyph: "Sr", figma: "238:3861", figmaName: "Separator · 4 варіанти",
    lede: "Роздільник секцій: 1px (sm) або 2px (md), горизонтальний чи вертикальний, з вбудованим вертикальним ритмом 6/8px.", meta: ["sm · md", "H · V"],
    render() {
      const demo = `<div class="pg-card" style="display:grid;gap:var(--spacing-md)"><div>Горизонтальний sm${H.separator()}Горизонтальний md${H.separator({ size: "md" })}</div><div style="display:flex;align-items:center;block-size:32px">Години${H.separator({ orientation: "vertical" })}Гроші${H.separator({ orientation: "vertical", size: "md" })}Податок</div></div>`;
      return [sec("Приклади", "", demo), sec("Код", "", ui.code(H.separator() + H.separator({ orientation: "vertical", size: "md" }), { radius: true }))];
    },
  });

  reg({
    id: "slot", title: "Slot", glyph: "Sl", figma: "246:4984", figmaName: "Slot",
    lede: "Замінник для довільного вмісту всередині Popover, Drop item і Tooltip. У коді — фіолетова плашка-плейсхолдер, яку ви заміщуєте власним вмістом.", meta: ["100 × 40", "violet-200"],
    render() {
      return [sec("Приклади", "", `<div class="pg-card" style="display:flex;gap:var(--spacing-md);flex-wrap:wrap;align-items:center">${H.slot({ label: "Slot", style: "inline-size:100px;block-size:40px" })}${H.slot({ label: "32", style: "inline-size:32px;block-size:32px;border-radius:var(--rounded-sm)" })}${H.slot({ label: "Top slot 292 × 40", style: "inline-size:292px;block-size:40px" })}</div>`), sec("Код", "", ui.code(H.slot({ label: "Slot" }), { radius: true }))];
    },
  });

  reg({
    id: "switch", title: "Switch", glyph: "Sw", figma: "260:1070", figmaName: "Switch · 8 варіантів",
    lede: "Миттєве ввімкнення налаштування. Повзунок їде з подвійним відскоком, під курсором стискається.", meta: ["Unchecked · Checked", "5 станів"],
    render() {
      const list = `<div class="pg-card" style="display:grid;gap:var(--spacing-s);inline-size:min(420px,100%)">${[["Враховувати податок 5%", true], ["Округлювати до 15 хвилин", false], ["Показувати вихідні", true], ["Експорт у EUR", false, true]].map(([l, c, d]) => `<div style="display:flex;justify-content:space-between;align-items:center"><span class="ts-body-md-medium">${l}</span>${H.switchControl({ checked: c, disabled: d, ariaLabel: l })}</div>`).join(H.separator())}</div>`;
      const states = ui.matrix(STATES.map((s) => s[0]), [["Unchecked", false], ["Checked", true]].map(([l, c]) => ({ label: l, cells: STATES.map(([, f]) => H.switchControl({ checked: c, force: f && f !== "disabled" ? f : null, disabled: f === "disabled" })) })));
      return [sec("Налаштування", "", list), sec("Стани", "", states),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Документація", text: "Опис згадує розміри sm | md, Classic | Surface і стан Press — набір має лише md. Підпис (<code>body/lg-medium</code>) прихований за замовчуванням." }]))];
    },
  });

  reg({
    id: "tabs", title: "Tabs", glyph: "Tb", figma: "275:6350", figmaName: "Tabs · tabs_item",
    lede: "Перемикання розділів одного екрана. Підкреслення переїжджає до обраного таба, панель проявляється з легким розмиттям.", meta: ["sm · md", "Icon · Indicator", "до 8 табів"],
    render() {
      const live = PG.playground({
        noMorph: true, stageStyle: "inline-size:100%;display:block",
        controls: [{ key: "size", label: "Size", options: opt(["sm", "md"]) }, { key: "icon", label: "Icon", type: "switch", value: true }, { key: "count", label: "Indicator", type: "switch", value: true }],
        render: (s) => H.tabs({ size: s.size, items: [{ label: "Календар", icon: s.icon ? "logo-layers--cute-light" : null }, { label: "Проєкти", icon: s.icon ? "logo-layers--cute-light" : null, count: s.count ? "+2" : undefined }, { label: "Підсумок", icon: s.icon ? "logo-layers--cute-light" : null }, { label: "Архів", disabled: true }], panels: ["Полотно днів місяця.", "Три активні проєкти.", "Години, брутто, податок, чистими.", ""].map((t) => `<p class="ts-body-md-regular" style="color:var(--text-secondary)">${t}</p>`) }),
      });
      return [sec("Playground", "Клавіші ← → Home End.", live.html),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Невидима лінія", text: "Звичайний таб має смужку <code>bg-subtle</code> (#f9fafb) — її майже не видно; hover — <code>border-muted</code>, selected — <code>bg-primary-50</code>." }])),
        { html: "", mount: live.mount }];
    },
  });

  const fieldPage = (multi) => ({
    render() {
      const live = PG.playground({
        stageStyle: "inline-size:min(360px,100%)",
        controls: [
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "state", label: "State", options: opt(["default", "warning", "danger"]) },
          { key: "disabled", label: "Disable", type: "switch", value: false },
          ...(multi ? [] : [{ key: "action", label: "Action", options: opt(["none", "password", "clear"]), value: "password" }, { key: "lead", label: "Left icon", type: "switch", value: true }]),
        ],
        actions: [{ label: "Помилка", icon: "system-fault--cute-light", run: (stage) => DS.fieldError(stage.querySelector(".ds-field"), multi ? "Опис занадто короткий" : "Пароль має містити від 8 символів") }],
        render: (s) => H.field({ label: multi ? "Нотатки" : "Пароль", tip: "Підказка", multiline: multi, size: s.size, state: s.state === "default" ? null : s.state, disabled: s.disabled, action: multi || s.action === "none" ? null : s.action, leadIcon: !multi && s.lead ? "logo-layers--cute-light" : null, value: !multi && s.action === "clear" ? "Редизайн лендингу" : "", description: s.state === "warning" ? "Warning text" : s.state === "danger" ? "Danger text" : "Placeholder", width: "fill", count: multi, maxLength: multi ? 200 : undefined }),
      });
      const cols = ["sm", "md", "lg"];
      const rows = [["Normal", {}], ["Hover", { force: "hover" }], ["Active", { force: "active" }], ["Focus", { force: "focus" }], ["Filled", { value: "Filled value" }], ["Warning", { state: "warning", description: "Warning text" }], ["Danger", { state: "danger", description: "Danger text" }], ["Disable", { disabled: true }]];
      const states = ui.matrix(cols, rows.map(([l, o]) => ({ label: l, cells: cols.map((sz) => H.field({ label: "Title", tip: "Tip", size: sz, multiline: multi, leadIcon: multi ? null : "logo-layers--cute-light", action: multi ? null : "icon", description: "Placeholder", ...o })) })));
      return [sec("Playground", "«Помилка» запускає струс, заміну опису і автоповернення через 3 с; введення тексту скасовує помилку.", live.html), sec("Стани", "Hover, Active і Focus зафіксовані. Active — рожеве обведення під час введення, Focus — кільце після Tab.", states), { html: "", mount: live.mount }];
    },
  });

  reg({ id: "text-area", title: "Text area", glyph: "Ta", figma: "386:4875", figmaName: "Text Area · 24 варіанти", lede: "Багаторядкове поле: 60 / 100 / 140px, розтягується вертикально, лічильник символів.", meta: ["sm · md · lg", "8 станів"], ...fieldPage(true) });
  reg({ id: "text-field", title: "Text field", glyph: "Tf", figma: "328:2578", figmaName: "Text Field · 24 варіанти", lede: "Однорядкове поле з підписом, підказкою, іконкою зліва і кнопкою справа (пароль або очищення з розчиненням тексту).", meta: ["sm · md · lg", "8 станів"], ...fieldPage(false) });

  reg({
    id: "toast", title: "Toast", glyph: "To", figma: "386:10636", figmaName: "Toast · 8 варіантів",
    lede: "Тимчасове повідомлення з кольоровим світінням. Піднімається знизу, складається в стос і розгортається під курсором.", meta: ["Success · Warning · Danger · Upload", "White · Gray"],
    render() {
      const triggers = `<div class="pg-card" style="display:flex;flex-wrap:wrap;gap:var(--spacing-xs)">${[["success", "Успіх"], ["warning", "Попередження"], ["danger", "Помилка"], ["upload", "Завантаження"]].map(([t, l]) => H.button({ label: l, type: t === "success" ? "primary" : "secondary", variant: t === "success" ? "solid" : "outline", attrs: `data-toast="${t}"` })).join("")}${H.button({ label: "Gray", type: "secondary", variant: "surface", attrs: 'data-toast="success" data-gray' })}</div>`;
      const statics = ui.grid(2, ["success", "warning", "danger", "upload"].flatMap((t) => [H.toast({ type: t }), H.toast({ type: t, color: "gray" })]));
      return [sec("Живі тости", "Натисніть кілька разів — нові піднімаються, старі відходять назад.", triggers), sec("Варіанти", "", `<div style="padding:var(--spacing-xl);border-radius:var(--rounded-5xl);background:radial-gradient(circle at 30% 40%,var(--color-pink-200),transparent 45%),var(--bg-subtle)">${statics}</div>`),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Друкарська помилка", text: "Кнопка в Upload підписана «Cencel»; у коді — «Cancel». Шапку сторінки скопійовано з Text Field." }]))];
    },
    afterRender(host) {
      const texts = { success: ["Проєкт збережено", "Години за 15.09 додано."], warning: ["Немає ставки", "Вкажіть ставку для «Лендингу»."], danger: ["Не вдалося зберегти", "Перевірте з'єднання."], upload: ["Uploading", ""] };
      host.querySelectorAll("[data-toast]").forEach((b) => b.addEventListener("click", () => { const t = b.dataset.toast; DS.toast({ type: t, color: b.hasAttribute("data-gray") ? "gray" : null, title: texts[t][0], description: texts[t][1] || undefined, file: "september.csv" }); }));
    },
  });

  reg({
    id: "tooltip", title: "Tooltip", glyph: "Tt", figma: "370:5197", figmaName: "Tolltip · 2 варіанти",
    lede: "Контекстна підказка на матовому склі. З'являється із затримкою 80ms, зникає одразу й переїжджає між сусідніми тригерами.", meta: ["sm · md", "Image · Separator · Button"],
    render() {
      const cards = `<div style="display:flex;flex-wrap:wrap;gap:var(--spacing-lg);padding:var(--spacing-xl);border-radius:var(--rounded-5xl);background:radial-gradient(circle at 25% 30%,var(--color-sky-300),transparent 40%),radial-gradient(circle at 75% 70%,var(--color-pink-300),transparent 40%),var(--bg-subtle)">${H.tooltipCard()}${H.tooltipCard({ size: "md", image: true, separator: true, button: "Add to library" })}</div>`;
      const live = `<template id="tt-rich" data-size="sm" data-interactive><div class="ds-tooltip__title">Add to library</div><div class="ds-tooltip__text">Quickly save this item to your library for easy access later!</div>${H.button({ label: "Button", type: "secondary", variant: "outline" }).replace('class="ds-btn"', 'class="ds-btn ds-tooltip__action"')}</template><div class="pg-card" style="display:flex;gap:var(--spacing-xs);align-items:center;flex-wrap:wrap">${["Календар", "Проєкти", "Підсумок", "Експорт"].map((t) => H.button({ label: t, type: "secondary", variant: "outline", attrs: `data-ds-tooltip="Відкрити «${t}»"` })).join("")}${H.button({ label: "Rich tooltip", attrs: 'data-ds-tooltip-template="tt-rich"' })}</div>`;
      return [sec("Живі підказки", "Проведіть уздовж ряду кнопок; остання показує інтерактивний тултіп із кнопкою.", live), sec("Варіанти", "", cards),
        sec("Нотатки з Figma", "", ui.notes([{ tone: "figma", title: "Назви", text: "Набір названо «Tolltip», шапка скопійована з Text Field. Компактна текстова підказка в коді — доповнення для icon-кнопок, у Figma її немає." }]))];
    },
  });
})();
