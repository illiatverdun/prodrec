/* Components A: Avatar · Badge · Button · Callout · Checkbox · Checkbox Cards · Cursors · Flags · Icon Button · Indicators */
(function () {
  "use strict";

  const H = DS.html;
  const esc = DS.esc;
  const ui = PG.ui;

  const STATES = [["Normal", ""], ["Hover", "hover"], ["Focus", "focus"], ["Active", "active"], ["Disabled", "disabled"]];
  const opt = (list) => list.map((v) => (typeof v === "string" ? { label: v, value: v } : v));
  const tokenTable = (rows) => ui.table(["Частина", "Властивість", "Токени"], rows.map((r) => [esc(r[0]), esc(r[1]), ui.tokens(r[2])]));
  const motionTable = (rows) => ui.table(["Взаємодія", "Рецепт", "Тривалість · крива"], rows.map((r) => [esc(r[0]), esc(r[1]), r[2]]));
  const sec = ui.section;

  /* ───────────────────────── Avatar ───────────────────────── */

  const AV_SIZES = ["16", "20", "24", "32", "40", "44", "60", "80", "120"];
  const AV_COLORS = ["blue", "green", "orange", "gray", "teal", "yellow", "pink", "violet"];

  PG.register({
    id: "avatar",
    group: "components",
    title: "Avatar",
    glyph: "Av",
    figma: "70:161",
    figmaName: "Avatar · 198 варіантів",
    keywords: "avatar user photo initials аватар",
    lede: "Фото, ініціали або іконка в скругленому квадраті. Радіус росте разом із розміром, а індикатори статусу й сповіщень ставляться в кути.",
    meta: ["9 розмірів", "8 кольорів", "3 режими", "Dark для Pink/Gray"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "size", label: "Size", type: "select", options: opt(AV_SIZES), value: "80" },
          { key: "mode", label: "Вміст", options: [{ label: "Photo", value: "picture" }, { label: "Initials", value: "initials" }, { label: "Icon", value: "icon" }], value: "initials" },
          { key: "color", label: "Color", type: "select", options: opt(AV_COLORS), value: "blue" },
          { key: "dark", label: "Dark (Pink, Gray)", type: "switch", value: false },
          { key: "status", label: "Status indicator", type: "switch", value: true },
          { key: "notif", label: "Notification indicator", type: "switch", value: false },
          { key: "initials", label: "Initials", type: "text", value: "IN" },
        ],
        render: (s) => H.avatar({ size: s.size, mode: s.mode, color: s.color, dark: s.dark, status: s.status, notification: s.notif, initials: s.initials || "IN", alt: "Illia Tverdun" }),
      });

      const sizes = ui.matrix(AV_SIZES, [
        { label: "Photo", cells: AV_SIZES.map((sz) => H.avatar({ size: sz, mode: "picture", status: Number(sz) >= 32 })) },
        { label: "Initials", cells: AV_SIZES.map((sz) => H.avatar({ size: sz, mode: "initials" })) },
        { label: "Icon", cells: AV_SIZES.map((sz) => H.avatar({ size: sz, mode: "icon", notification: Number(sz) >= 32 })) },
      ]);
      const colors = ui.matrix(AV_COLORS, [
        { label: "Initials", cells: AV_COLORS.map((c) => H.avatar({ size: 40, color: c })) },
        { label: "Icon", cells: AV_COLORS.map((c) => H.avatar({ size: 40, color: c, mode: "icon" })) },
        { label: "Dark", cells: AV_COLORS.map((c) => (c === "pink" || c === "gray" ? H.avatar({ size: 40, color: c, dark: true }) + H.avatar({ size: 40, color: c, dark: true, mode: "icon" }) : '<span class="pg-muted">—</span>')) },
      ]);
      const group = `<div class="pg-card" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-2xl)">${H.avatarGroup([{ mode: "picture" }, { color: "violet", initials: "EC" }, { color: "green", initials: "SJ" }, { color: "orange", initials: "MT" }, { color: "gray", initials: "+4" }], { size: 44, label: "Клієнти проєкту" })}${H.avatarGroup([{ color: "pink", initials: "IT" }, { color: "teal", initials: "AK" }, { color: "yellow", initials: "OL" }], { size: 32 })}<span class="pg-muted">Наведіть курсор: сусіди піднімаються з затуханням, повернення пружне.</span></div>`;

      return [
        sec("Playground", "", live.html),
        sec("Розміри × вміст", "Індикатори: sm для 16–32, md для 40–44, lg для 60–120. Відступи від кутів відтворюють Figma для кожного розміру.", sizes),
        sec("Кольори", "Кожен колір — <code>100</code> фон, <code>400</code> обведення, <code>900</code> текст або іконка. Pink використовує акцентні токени з прозорістю.", colors),
        sec("Група", "Рецепт transitions.dev «Avatar group hover».", group),
        sec("Властивості", "", ui.props([
          ["Size", "16 · 20 · 24 · 32 · 40 · 44 · 60 · 80 · 120", "16", '<code>data-size</code>'],
          ["Picture / Text / Icon", "On · Off", "Picture=On", '<code>mode: picture | initials | icon</code>'],
          ["Color", "Blue · Green · Orange · Gray · Tean · Yellow · Pink · Violet", "Blue", '<code>data-color</code> (teal)'],
          ["Dark", "On · Off", "Off", '<code>data-dark</code>'],
          ["Status / Notification indicator", "boolean", "false", '<code>.ds-avatar__status</code>, <code>.ds-avatar__notif</code>'],
          ["⮑ Initials", "text", "IN", "текст усередині"],
        ])),
        sec("Токени", "", tokenTable([
          ["Контейнер", "Розмір · радіус", ["--scale-40", "--rounded-2xl", "--rounded-7xl"]],
          ["Blue", "Фон · обведення · текст", ["--color-blue-100", "--color-blue-400", "--color-blue-900"]],
          ["Pink", "Фон · обведення · текст", ["--border-accent-20", "--text-accent"]],
          ["Dark Pink / Gray", "Фон · текст", ["--bg-secondary", "--text-secondary", "--color-gray-900"]],
          ["Ініціали", "Шрифт за розміром", ["--ts-body-sm-semibold", "--ts-body-lg-semibold", "--ts-headline-h2-semibold"]],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Tean", text: "Колір названо «Tean» — у коді <code>teal</code>. Документація на сторінці перелічує 6 кольорів, у наборі їх 8 (є Pink і Violet)." },
          { tone: "figma", title: "Dark", text: "Режим Dark реально змінює вигляд лише для Pink і Gray; для фото він ідентичний звичайному." },
          { tone: "figma", title: "Дрібні розміри", text: "Для 16 і 20px ініціали — raw 8px, для 24px — 10px, без текстового стилю. В аватарі 80px статус стоїть на 8px вище за низ, а сповіщення — на 8px лівіше краю: відтворено як у файлі." },
          { tone: "a11y", title: "Доступність", text: "Аватар з ініціалами має <code>role=\"img\"</code> і <code>aria-label</code>; фото — <code>alt</code>. Індикатори оголошуються як <code>role=\"status\"</code>." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });

  /* ───────────────────────── Badge ───────────────────────── */

  const BADGE_COLORS = [["pink", "Blue"], ["gray", "Gray [Muted]"], ["orange", "Orange"], ["red", "Red"], ["green", "Green"], ["violet", "Purple"], ["sky", "Sky"], ["teal", "Tean"], ["yellow", "Yellow"]];
  const BADGE_VARIANTS = ["solid", "soft", "outline", "surface"];

  PG.register({
    id: "badge",
    group: "components",
    title: "Badge",
    glyph: "Bd",
    figma: "70:162",
    figmaName: "Badge · 108 варіантів",
    keywords: "badge tag label chip бейдж",
    lede: "Короткий статус або мітка. Чотири типи насиченості на дев'яти кольорах і три розміри, опціонально з іконками з обох боків.",
    meta: ["9 кольорів", "4 типи", "3 розміри"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "color", label: "Color", type: "select", options: BADGE_COLORS.map(([v, l]) => ({ label: `${l} → ${v}`, value: v })), value: "pink" },
          { key: "variant", label: "Type", options: opt(BADGE_VARIANTS) },
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "left", label: "Icon left", type: "switch", value: true },
          { key: "right", label: "Icon right", type: "switch", value: false },
          { key: "label", label: "Text", type: "text", value: "Badge" },
        ],
        actions: [{ label: "Pop-in", icon: "system-refresh-1--cute-light", run: (stage) => { const b = stage.querySelector(".ds-badge"); b.removeAttribute("data-animate"); void b.offsetWidth; b.setAttribute("data-animate", ""); } }],
        render: (s) => H.badge({ color: s.color, variant: s.variant, size: s.size, label: s.label, iconLeft: s.left ? "design-magic-2--light" : null, iconRight: s.right ? "design-magic-3--sharp" : null }),
      });
      const matrix = ui.matrix(BADGE_VARIANTS.map((v) => v[0].toUpperCase() + v.slice(1)), BADGE_COLORS.map(([c, l]) => ({ label: `${l} · ${c}`, cells: BADGE_VARIANTS.map((v) => H.badge({ color: c, variant: v, label: "Badge" })) })));
      const sizes = ui.matrix(["sm · 20", "md · 24", "lg · 26"], BADGE_VARIANTS.map((v) => ({ label: v, cells: ["sm", "md", "lg"].map((sz) => H.badge({ variant: v, size: sz, iconLeft: "design-magic-2--light" })) })));
      const context = `<div class="pg-card" style="display:grid;gap:var(--spacing-s)">${[
        ["Проєкт «Лендинг»", H.badge({ label: "Активний", color: "green", variant: "soft" })],
        ["Рахунок №114", H.badge({ label: "Прострочено", color: "red", variant: "surface" })],
        ["Податок 5%", H.badge({ label: "ФОП 3 група", color: "gray", variant: "outline" })],
        ["Курс EUR", H.badge({ label: "Оновлено", color: "sky", variant: "soft", iconLeft: "system-refresh-1--cute-light" })],
      ].map(([t, b]) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:var(--spacing-md)"><span class="ts-body-md-medium">${t}</span>${b}</div>`).join(H.separator())}</div>`;
      return [
        sec("Playground", "", live.html),
        sec("Кольори × типи", "Назви кольорів у Figma не збігаються з відтінками — у лівій колонці показано обидві.", matrix),
        sec("Розміри", "Іконка 16px у всіх розмірах; lg переходить на <code>body/md-medium</code>.", sizes),
        sec("У контексті", "", context),
        sec("Властивості", "", ui.props([
          ["Color", "Blue · Gray [Muted] · Orange · Red · Green · Purple · Sky · Tean · Yellow", "Blue", '<code>data-color</code>: pink · gray · orange · red · green · violet · sky · teal · yellow'],
          ["Size", "sm · md · lg", "sm", '<code>data-size</code>'],
          ["Type", "Solid · Soft · Outline · Surface", "Solid", '<code>data-variant</code>'],
          ["Icon left / right", "boolean + instance swap", "false", "<code>.ds-icon</code> до чи після тексту"],
          ["Type_text", "text", "Badge", "текст"],
        ])),
        sec("Токени", "", tokenTable([
          ["Solid", "Фон · текст", ["--color-pink-700", "--color-pink-50"]],
          ["Soft", "Фон · текст", ["--color-pink-50", "--color-pink-800"]],
          ["Outline", "Обведення · текст", ["--color-pink-500", "--color-pink-800"]],
          ["Surface", "Фон · обведення · текст", ["--color-pink-100", "--color-pink-300", "--color-pink-800"]],
          ["Геометрія", "Висота · падінг · радіус", ["--spacing-xs", "--scale-6", "--rounded-lg", "--rounded-xl"]],
          ["Текст", "sm/md · lg", ["--ts-body-sm-medium", "--ts-body-md-medium"]],
        ])),
        sec("Анімація", "", motionTable([["Поява нового бейджа", "Badge pop (scale 0.6 → 1 + blur)", "500ms · <code>--badge-pop-ease</code>"], ["Зміна кольору/типу", "Колірний перехід", "150ms · <code>--ease-smooth-out</code>"]])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Blue — це pink", text: "Колір «Blue» використовує рожеву палітру, «Purple» — violet, «Tean» — teal. Документація на сторінці ще згадує Black, Pink і White, яких у наборі немає." },
          { tone: "figma", title: "Нерівні обведення", text: "Outline для Sky і Teal бере крок 800, для решти — 500. Solid для Sky, Teal, Green, Violet теж 800, для решти — 700." },
          { tone: "figma", title: "Вага тексту", text: "<code>body/sm-medium</code> фактично Regular, тому sm і md бейджі мають вагу 400." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });

  /* ───────────────────────── Button ───────────────────────── */

  const BTN_KINDS = [["primary", "solid"], ["primary", "outline"], ["primary", "link"], ["primary", "surface"], ["secondary", "solid"], ["secondary", "outline"], ["secondary", "link"], ["secondary", "surface"]];

  PG.register({
    id: "button",
    group: "components",
    title: "Button",
    glyph: "Bt",
    figma: "70:163",
    figmaName: "Button / Button · 288 варіантів",
    keywords: "button cta action кнопка",
    lede: "Основна дія. Primary веде рожевою заливкою, secondary лишається нейтральним. Чотири висоти 30–48px, іконка зліва або справа і всі інтерактивні стани, включно з натисканням і завантаженням.",
    meta: ["2 типи", "3 варіанти + surface", "4 розміри", "5 станів"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "type", label: "Type", options: opt(["primary", "secondary"]) },
          { key: "variant", label: "Variant", options: opt(["solid", "outline", "link", "surface"]) },
          { key: "size", label: "Size", options: opt(["sm", "md", "lg", "xl"]), value: "lg" },
          { key: "left", label: "Left icon", type: "switch", value: false },
          { key: "right", label: "Right icon", type: "switch", value: true },
          { key: "disabled", label: "Disabled", type: "switch", value: false },
          { key: "label", label: "Text", type: "text", value: "Next page" },
        ],
        actions: [{ label: "Loading", icon: "system-loading-4--light", run: (stage) => { const b = stage.querySelector(".ds-btn"); DS.setLoading(b, true); setTimeout(() => DS.setLoading(b, false), 1600); } }],
        render: (s) => H.button({ type: s.type, variant: s.variant, size: s.size, label: s.label, iconLeft: s.left ? "arrow-left--cute-light" : null, iconRight: s.right ? "arrow-right--cute-light" : null, disabled: s.disabled, loadable: true, busyLabel: "Loading" }),
        code: (s) => H.button({ type: s.type, variant: s.variant, size: s.size, label: s.label, iconLeft: s.left ? "arrow-left--cute-light" : null, iconRight: s.right ? "arrow-right--cute-light" : null, disabled: s.disabled }),
      });
      const sizes = ui.matrix(["sm · 30", "md · 34", "lg · 40", "xl · 48"], BTN_KINDS.map(([t, v]) => ({ label: `${t} · ${v}`, cells: ["sm", "md", "lg", "xl"].map((sz) => H.button({ type: t, variant: v, size: sz })) })));
      const states = ui.matrix(STATES.map((s) => s[0]), BTN_KINDS.map(([t, v]) => ({ label: `${t} · ${v}`, cells: STATES.map(([, f]) => H.button({ type: t, variant: v, size: "md", force: f || null, disabled: f === "disabled" })) })));
      const icons = ui.matrix(["sm", "md", "lg", "xl"], [
        { label: "Left icon", cells: ["sm", "md", "lg", "xl"].map((sz) => H.button({ size: sz, iconLeft: "arrow-left--cute-light", label: "Back" })) },
        { label: "Right icon", cells: ["sm", "md", "lg", "xl"].map((sz) => H.button({ size: sz, iconRight: "arrow-right--cute-light", label: "Next" })) },
        { label: "Both", cells: ["sm", "md", "lg", "xl"].map((sz) => H.button({ size: sz, type: "secondary", variant: "outline", iconLeft: "file-upload--cute-light", iconRight: "arrow-right--cute-light", label: "Upload" })) },
        { label: "Loading", cells: ["sm", "md", "lg", "xl"].map((sz) => H.button({ size: sz, loadable: true, loading: true, label: "Save", busyLabel: "Saving" })) },
      ]);
      return [
        sec("Playground", "Наведіть, натисніть і пройдіться Tab — стани реальні. Кнопка «Loading» показує заміну тексту на спінер без приглушення: завантаження не має виглядати вимкненим.", live.html),
        sec("Розміри", "", sizes),
        sec("Стани", "Стовпці Hover, Focus і Active зафіксовані через <code>data-force</code> для порівняння з Figma.", states),
        sec("Іконки й завантаження", "Іконка зменшує зовнішній падінг з її боку і змінює gap, як у Figma: sm 12/10, md 12/8, lg 16/12, xl 20/16.", icons),
        sec("Властивості", "", ui.props([
          ["Type", "Primary · Secondary", "Primary", '<code>data-type="secondary"</code>'],
          ["Variant", "solid · outline · link", "solid", '<code>data-variant</code> (+ surface з інстансів)'],
          ["Size", "sm · md · lg · xl", "sm", '<code>data-size</code>'],
          ["State", "Normal · Hover · Focus · Disable", "Normal", ':hover · :focus-visible · :active · <code>disabled</code>'],
          ["Left icon / Right icon", "Off · On", "Off", "<code>.ds-icon</code> першим або останнім"],
          ["Icon_name", "instance swap", "arrow / right", '<code>data-icon</code>'],
          ["-> Text", "text", "Button", "текст"],
        ])),
        sec("Токени", "", tokenTable([
          ["Primary solid", "Фон · hover · текст", ["--bg-primary", "--bg-primary-80", "--text-on-fill"]],
          ["Primary outline", "Обведення · hover · текст", ["--border-accent", "--bg-primary-10", "--border-accent-50", "--text-accent"]],
          ["Primary link", "Текст · hover", ["--text-accent", "--color-pink-600"]],
          ["Secondary", "Фон · hover · текст", ["--bg-secondary-20", "--bg-secondary-50", "--text-primary"]],
          ["Secondary outline", "Обведення · hover", ["--border-default-60", "--border-muted"]],
          ["Геометрія", "Радіус sm/md · lg · xl", ["--rounded-xl", "--rounded-2xl", "--rounded-3xl"]],
          ["Текст", "Усі розміри", ["--ts-body-md-medium"]],
          ["Фокус", "Кільце", ["--effect-focus-ring"]],
        ])),
        sec("Анімація", "", motionTable([
          ["Hover", "Колірний перехід фону й обведення", "150ms · <code>--ease-smooth-out</code>"],
          ["Натискання", "scale 0.97", "150ms · <code>--ease-smooth-out</code>"],
          ["Фокус", "Кільце виростає зі spread 0", "150ms"],
          ["Loading", "Text states swap: текст іде вгору з blur, спінер приходить знизу", "150ms · <code>--text-swap-*</code>"],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Документація не збігається з набором", text: "Текст на сторінці описує Color Blue/White/Black/Error, варіанти Primary/Outline/Surface і стани Press/Loading. Сам набір має Type Primary/Secondary, варіанти solid/outline/link і стани Normal/Hover/Focus/Disable. Press і Loading додано в коді." },
          { tone: "figma", title: "Surface поза набором", text: "Toast і Callout використовують кнопку «Button/Primary/surface» зі старої версії: pill-радіус, фон <code>bg-primary-10</code>. У коді це <code>data-variant=\"surface\" data-shape=\"pill\"</code>. Hover для surface у Figma відсутній, тому підібрано <code>pink-600</code> 18%." },
          { tone: "figma", title: "Непослідовна тінь", text: "Outline-варіанти з іконкою мають внутрішню bevel-тінь, а без іконки — ні. У коді її не додано, щоб outline виглядав однаково." },
          { tone: "gap", title: "Secondary link без hover", text: "У Figma hover для secondary link ідентичний звичайному стану, тож користувач не бачить відгуку. Код повторює файл, але варто додати зміну кольору." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });

  /* ───────────────────────── Callout ───────────────────────── */

  const CALLOUT_COLORS = [["accent", "Blue"], ["gray", "Gray"], ["green", "Green"], ["red", "Red"], ["orange", "Orange"]];

  PG.register({
    id: "callout",
    group: "components",
    title: "Callout",
    glyph: "Ca",
    figma: "151:4527",
    figmaName: "Callout · 45 варіантів",
    keywords: "callout alert banner notice повідомлення",
    lede: "Коротке вбудоване повідомлення, щоб привернути увагу: іконка, текст і необов'язкова дія. П'ять кольорів, три типи насиченості й три розміри.",
    meta: ["5 кольорів", "3 типи", "3 розміри"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "color", label: "Color", type: "select", options: CALLOUT_COLORS.map(([v, l]) => ({ label: `${l} → ${v}`, value: v })) },
          { key: "variant", label: "Type", options: opt(["solid", "surface", "outline"]) },
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "action", label: "Button", type: "switch", value: true },
          { key: "text", label: "Text", type: "text", value: "Курс EUR оновився — перерахуйте рахунок" },
        ],
        stageStyle: "inline-size:min(520px,100%)",
        render: (s) => H.callout({ color: s.color, variant: s.variant, size: s.size, text: s.text, action: s.action ? "Перерахувати" : null }),
      });
      const matrix = ui.matrix(["Solid", "Surface", "Outline"], CALLOUT_COLORS.map(([c, l]) => ({ label: `${l} · ${c}`, cells: ["solid", "surface", "outline"].map((v) => H.callout({ color: c, variant: v, text: "Text" })) })));
      const sizes = `<div class="pg-card" style="display:grid;gap:var(--spacing-s)">${["sm", "md", "lg"].map((sz) => H.callout({ size: sz, color: "gray", variant: "surface", text: `Size ${sz}`, action: "Button" })).join("")}</div>`;
      const dismiss = PG.playground({
        noMorph: true,
        stageStyle: "inline-size:min(520px,100%);display:grid;gap:var(--spacing-s)",
        render: () => `<div class="ds-collapse" id="callout-collapse" data-open="true"><div>${H.callout({ color: "orange", variant: "surface", size: "md", icon: "emoji-puzzled--cute-light", text: "Не вказано ставку для 3 днів у вересні" })}</div></div>${H.button({ label: "Сховати / показати", type: "secondary", variant: "outline", attrs: 'data-ds-collapse="callout-collapse" aria-expanded="true"' })}`,
      });
      return [
        sec("Playground", "", live.html),
        sec("Кольори × типи", "", matrix),
        sec("Розміри", "sm: падінг 8/8/8/12, md: 12/12/12/16, lg: 16/16/16/24 і шрифт <code>body/lg-medium</code>.", sizes),
        sec("Закриття", "Рецепт «Accordion expand»: висота згортається через <code>grid-template-rows</code>, без стрибка сусідів.", dismiss.html),
        sec("Токени", "", tokenTable([
          ["Blue (accent)", "Фон · обведення · текст", ["--color-pink-500", "--border-accent-50", "--border-accent", "--text-accent"]],
          ["Gray", "Фон · обведення · текст", ["--bg-secondary-20", "--border-default-60", "--text-primary"]],
          ["Green", "Фон · обведення · текст", ["--color-green-100", "--color-green-50", "--color-green-400", "--color-green-900"]],
          ["Red", "Фон · обведення · текст", ["--bg-destructive-10", "--border-destructive", "--text-destructive"]],
          ["Orange", "Фон · обведення · текст", ["--color-orange-50", "--color-orange-400", "--color-orange-900"]],
          ["Геометрія", "Радіус · gap", ["--rounded-3xl", "--spacing-xs"]],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Blue — акцентний рожевий", text: "«Blue» використовує рожевий акцент. Фон — <code>#f072e6</code> 10% (Surface: 5%) з іншої бібліотеки, у коді зібраний з <code>--color-pink-500</code>." },
          { tone: "figma", title: "Кнопка", text: "Прихована кнопка — стара Primary surface pill: sm/md-колаут бере кнопку sm, lg — md із <code>body/md-semibold</code>." },
          { tone: "a11y", title: "Роль", text: "За замовчуванням <code>role=\"note\"</code>. Для термінових повідомлень передайте <code>role: 'alert'</code>." },
        ])),
        { html: "", mount: live.mount },
        { html: "", mount: dismiss.mount },
      ];
    },
  });

  /* ───────────────────────── Checkbox ───────────────────────── */

  PG.register({
    id: "checkbox",
    group: "components",
    title: "Checkbox",
    glyph: "Cb",
    figma: "153:305",
    figmaName: "Checkbox · 12 варіантів",
    keywords: "checkbox check tick чекбокс",
    lede: "Вибір одного або кількох значень у формі. Під курсором спершу проявляється бліда галочка, а після кліку бокс заливається і галочка домальовується штрихом.",
    meta: ["3 статуси", "5 станів", "md + sm для карток"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "status", label: "Status", options: [{ label: "Unchecked", value: "off" }, { label: "Checked", value: "on" }, { label: "Indeterm.", value: "mixed" }], value: "on" },
          { key: "disabled", label: "Disabled", type: "switch", value: false },
          { key: "labelOn", label: "Label", type: "switch", value: true },
          { key: "label", label: "Text", type: "text", value: "I confirm privacy policy and terms of use" },
        ],
        render: (s) => H.checkbox({ checked: s.status === "on", indeterminate: s.status === "mixed", disabled: s.disabled, label: s.labelOn ? s.label : null }),
      });
      const states = ui.matrix(STATES.map((s) => s[0]), [["Unchecked", {}], ["Checked", { checked: true }], ["Indeterminate", { indeterminate: true }]].map(([l, o]) => ({ label: l, cells: STATES.map(([, f]) => H.checkbox({ ...o, label: "Label", force: f && f !== "disabled" ? f : null, disabled: f === "disabled" })) })));
      const group = PG.playground({
        noMorph: true,
        stageStyle: "display:grid;justify-items:start;gap:var(--spacing-xs)",
        render: () => `${H.checkbox({ label: "Усі дні вересня", indeterminate: true, attrs: "", name: "all" })}<div class="ds-checkbox-group" style="padding-inline-start:var(--spacing-xl)">${["Робочі дні (22)", "Вихідні з годинами (3)", "Лікарняні (1)"].map((t, i) => H.checkbox({ label: t, checked: i === 0, name: "day" })).join("")}</div>`,
        after(stage) {
          const all = stage.querySelector('input[name="all"]');
          const items = [...stage.querySelectorAll('input[name="day"]')];
          const sync = () => {
            const n = items.filter((i) => i.checked).length;
            all.checked = n === items.length;
            all.indeterminate = n > 0 && n < items.length;
          };
          all.addEventListener("change", () => { items.forEach((i) => { i.checked = all.checked; }); sync(); });
          items.forEach((i) => i.addEventListener("change", sync));
          sync();
        },
      });
      return [
        sec("Playground", "", live.html),
        sec("Стани", "Фокус обводить весь рядок разом із підписом, як у Figma.", states),
        sec("Група з батьківським чекбоксом", "Indeterminate з'являється, коли обрано частину елементів.", group.html),
        sec("Властивості", "", ui.props([
          ["Size", "md", "md", "sm — <code>data-size=\"sm\"</code> (з Checkbox Cards)"],
          ["State", "Normal · Hover · Focus · Disable", "Normal", ":hover · :focus-visible · <code>disabled</code>"],
          ["Status", "Unchecked · Checked · Indeterminated", "Unchecked", "<code>checked</code> · <code>data-indeterminate</code>"],
          ["Label / Text", "boolean · text", "true · Label", "<code>.ds-checkbox__label</code>"],
        ])),
        sec("Токени", "", tokenTable([
          ["Бокс", "Фон · обведення · тінь", ["--bg-background", "--border-default-60", "--effect-checkbox-inner-shadow"]],
          ["Hover", "Фон · прев'ю галочки", ["--bg-secondary-50", "--text-disabled"]],
          ["Checked", "Фон · hover · галочка", ["--bg-primary", "--bg-primary-80", "--text-on-fill"]],
          ["Indeterminate", "Фон · обведення · риска", ["--bg-secondary-20", "--border-accent", "--border-accent-50", "--text-accent"]],
          ["Текст", "Підпис", ["--ts-body-md-medium", "--text-primary"]],
        ])),
        sec("Анімація", "", motionTable([
          ["Check", "Checkbox check: заливка, потім stroke-draw галочки", "150ms + 350ms · <code>--check-ease</code>"],
          ["Uncheck", "Швидке стирання штриха", "150ms"],
          ["Hover", "Прев'ю: бліда галочка домальовується", "350ms"],
          ["Натискання", "scale 0.9 з пружним поверненням", "250ms · <code>--ease-bounce</code>"],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Документація ширша за набір", text: "Опис на сторінці згадує розміри sm | md і варіанти Classic | Surface. Набір має лише md без властивості Variant." },
          { tone: "figma", title: "Прихований sm", text: "Checkbox Cards використовує інший компонент «Checkbox/sm» (16px, радіус 4). Він відтворений як <code>data-size=\"sm\"</code>." },
          { tone: "a11y", title: "Нативний input", text: "Візуальний бокс керується прихованим <code>&lt;input type=checkbox&gt;</code>: працюють Space, форми і скрінрідери." },
        ])),
        { html: "", mount: live.mount },
        { html: "", mount: group.mount },
      ];
    },
  });

  /* ───────────────────────── Checkbox Cards ───────────────────────── */

  PG.register({
    id: "checkbox-cards",
    group: "components",
    title: "Checkbox Cards",
    glyph: "Cc",
    figma: "176:5725",
    figmaName: "Checkbox Cards · 15 варіантів",
    keywords: "checkbox card option plan картка вибір",
    lede: "Інтерактивна картка, де можна обрати кілька варіантів одночасно. Заголовок, опис і малий чекбокс справа; вся картка — одна ціль кліку.",
    meta: ["3 розміри", "5 станів"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "md" },
          { key: "checked", label: "Checked", type: "switch", value: true },
          { key: "disabled", label: "Disabled", type: "switch", value: false },
          { key: "icon", label: "Show icon", type: "switch", value: false },
          { key: "title", label: "Title", type: "text", value: "Погодинно" },
          { key: "desc", label: "Description", type: "text", value: "Ставка × години" },
        ],
        render: (s) => H.checkCard({ size: s.size, checked: s.checked, disabled: s.disabled, icon: s.icon ? "system-checks--light" : null, title: s.title, desc: s.desc }),
      });
      const states = ui.matrix(["Normal", "Hover", "Checked", "Focus", "Disable", "Disable checked"], ["sm", "md", "lg"].map((sz) => ({
        label: sz,
        cells: [H.checkCard({ size: sz }), H.checkCard({ size: sz, force: "hover" }), H.checkCard({ size: sz, checked: true }), H.checkCard({ size: sz, force: "focus" }), H.checkCard({ size: sz, disabled: true }), H.checkCard({ size: sz, disabled: true, checked: true })],
      })));
      const example = `<fieldset class="pg-card" style="border:0;display:grid;gap:var(--spacing-s)"><legend class="ts-headline-h6-semibold" style="margin-block-end:var(--spacing-s)">Що рахувати в підсумку</legend><div style="display:flex;flex-wrap:wrap;gap:var(--spacing-s)">${H.checkCard({ size: "md", title: "Податок", desc: "ФОП 3 група, 5%", checked: true })}${H.checkCard({ size: "md", title: "Комісія", desc: "Payoneer 1%", checked: true })}${H.checkCard({ size: "md", title: "Конвертація", desc: "Курс НБУ на день" })}</div></fieldset>`;
      return [
        sec("Playground", "", live.html),
        sec("Розміри × стани", "", states),
        sec("У контексті", "", example),
        sec("Токени", "", tokenTable([
          ["Картка", "Фон · обведення · радіус", ["--bg-background", "--ext-stroke-subtle", "--rounded-3xl"]],
          ["Hover / Checked", "Обведення", ["--border-accent-50", "--border-accent"]],
          ["Текст", "Заголовок · опис", ["--ts-headline-h6-semibold", "--ts-body-md-regular", "--ext-text-muted"]],
          ["Disabled", "Обведення · текст", ["--border-muted", "--color-gray-400"]],
          ["Фокус", "Кільце", ["--effect-focus-ring"]],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Checked не видно на картці", text: "У Figma стан Checked змінює лише чекбокс, а обведення картки лишається <code>#e7e8e9</code>. Код додає <code>--border-accent</code>, щоб вибір читався з відстані." },
          { tone: "gap", title: "Невидима галочка", text: "Вкладений sm-чекбокс у Checked має заливку <code>bg-subtle</code> з білою галочкою — вона практично невидима. Код використовує основний <code>--bg-primary</code>." },
          { tone: "figma", title: "Focus", text: "Окремого варіанта Focus немає — на сторінці написано «Add: focus-ring in shadow». Реалізовано саме так." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });

  /* ───────────────────────── Cursors ───────────────────────── */

  const CURSORS = [["normal", "Normal", "4 4"], ["pick", "Pick", "6 4"], ["toch", "Toch", "8 4"], ["grab", "Grab", "12 12"], ["text", "Text", "12 12"], ["scale", "Scale", "12 12"], ["lock", "Lock", "4 4"], ["zoom-in", "Zoom in", "10 10"], ["zoom-out", "Zoom out", "10 10"]];

  PG.register({
    id: "cursors",
    group: "components",
    title: "Cursors",
    glyph: "Cu",
    figma: "394:602",
    figmaName: "Cursors · 9 варіантів",
    keywords: "cursor pointer mouse курсор",
    lede: "Власні курсори для полотна календаря та редакторських дій. Наведіть на плитку — курсор зміниться на справжній SVG із Figma.",
    meta: ["9 курсорів", "SVG 24px"],
    render() {
      const zones = ui.grid(3, CURSORS.map(([file, label, hot]) => `<div class="pg-cursor-zone" style="cursor:url('assets/cursors/${file}.svg') ${hot}, auto"><img src="assets/cursors/${file}.svg" alt=""><span>${label}</span><code class="pg-muted">${file}.svg</code></div>`));
      return [
        sec("Наведіть курсор", "", zones),
        sec("Використання", "", ui.code(`.calendar-day { cursor: url("assets/cursors/pick.svg") 6 4, pointer; }
.calendar-day[aria-disabled="true"] { cursor: url("assets/cursors/lock.svg") 4 4, not-allowed; }
.drag-handle { cursor: url("assets/cursors/grab.svg") 12 12, grab; }`, { raw: true, radius: true, label: "CSS" })),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "gap", title: "Hotspot невідомий", text: "Figma не зберігає точку кліку курсора. Координати в CSS підібрані за формою іконки — перевірте їх на дотик." },
          { tone: "figma", title: "Скопійована шапка", text: "Сторінка Cursors має шапку від Checkbox card. Варіант «Toch» — ймовірно, «Touch»." },
        ])),
      ];
    },
  });

  /* ───────────────────────── Flags ───────────────────────── */

  PG.register({
    id: "flags",
    group: "components",
    title: "Flags icons",
    glyph: "Fl",
    figma: "687:24887",
    figmaName: "Flags · 252 варіанти",
    keywords: "flag country currency прапор країна",
    lede: "Прапори 252 країн і організацій для вибору валюти, країни клієнта і податкового резидентства. Дев'ять із них позначені як Special.",
    meta: ["252 прапори", "9 special", "SVG 32px"],
    render() {
      const flags = window.DS_FLAGS;
      const pg = PG.playground({
        controls: [
          { key: "q", label: "Пошук", type: "text", placeholder: "Ukraine, Poland…", value: "" },
          { key: "size", label: "Розмір", options: [{ label: "16", value: "16" }, { label: "24", value: "24" }, { label: "32", value: "32" }], value: "24" },
          { key: "special", label: "Лише special", type: "switch", value: false },
        ],
        noMorph: true,
        stageStyle: "inline-size:100%;display:block",
        render: (s) => {
          const list = flags.filter(([name, , sp]) => (!s.q || name.toLowerCase().includes(s.q.toLowerCase())) && (!s.special || sp === "Yes"));
          return `<div class="pg-muted" style="margin-block-end:var(--spacing-s)">${list.length} з ${flags.length}</div><div class="pg-flags">${list.map(([name, file], i) => `<div class="pg-flag" style="animation-delay:${Math.min(i, 30) * 12}ms" data-copy="assets/flags/${file}.svg">${H.flag(file, { size: s.size })}<span>${esc(name)}</span></div>`).join("")}</div>`;
        },
        code: (s) => H.flag("ukraine", { size: s.size, alt: "Ukraine" }),
      });
      const currency = H.select({
        label: "Валюта рахунку",
        size: "md",
        search: "Пошук країни",
        maxHeight: 240,
        options: [["Ukraine", "ukraine", "UAH"], ["European Union", "european-union-special", "EUR"], ["United States of America", "united-states-of-america", "USD"], ["Poland", "poland", "PLN"], ["United Kingdom of Great Britain and Northern Ireland", "united-kingdom-of-great-britain-and-northern-ireland", "GBP"], ["Switzerland", "switzerland", "CHF"]].map(([name, file, cur], i) => ({ title: cur, desc: name, value: cur, media: H.flag(file, { size: 32, alt: "" }), check: true, selected: i === 0 })),
      });
      return [
        sec("Бібліотека", "Клік копіює шлях до SVG.", pg.html),
        sec("У селекторі", "Прапор як медіа в пункті меню — так, як на сторінці Popover у Figma.", `<div class="pg-card" style="min-block-size:380px">${currency}</div>`),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Special", text: "Special: European Union, United Nations, Nato, Northern Cyprus, Somaliland, Easter Island, Bonaire, Transnistria і Unknown. У файлах до назви додано <code>-special</code>." },
          { tone: "figma", title: "Друкарські помилки", text: "У назвах варіантів є «Palestin» і «Congo (Democratic Repulic)» — у playground вони показані як у файлі." },
        ])),
        { html: "", mount: pg.mount },
      ];
    },
  });

  /* ───────────────────────── Icon Button ───────────────────────── */

  PG.register({
    id: "icon-button",
    group: "components",
    title: "Icon Button",
    glyph: "Ib",
    figma: "70:163",
    figmaName: "Button / Icon Button · 96 варіантів",
    keywords: "icon button toolbar кнопка іконка",
    lede: "Квадратна кнопка з однією іконкою для тулбарів, полів і закриття. Ділить кольори й стани з Button; обов'язково має <code>aria-label</code>, а підказку показує тултіп.",
    meta: ["2 типи", "3 варіанти + surface", "4 розміри"],
    render() {
      const live = PG.playground({
        controls: [
          { key: "type", label: "Type", options: opt(["primary", "secondary"]) },
          { key: "variant", label: "Variant", options: opt(["solid", "outline", "link", "surface"]) },
          { key: "size", label: "Size", options: opt(["sm", "md", "lg", "xl"]), value: "lg" },
          { key: "shape", label: "Round", type: "switch", value: false },
          { key: "icon", label: "Icon", type: "select", options: opt(["arrow-right--cute-light", "system-close--light", "file-copy--cute-light", "system-settings-1--cute-light", "file-upload--cute-light", "system-add--cute-light"]) },
          { key: "disabled", label: "Disabled", type: "switch", value: false },
        ],
        render: (s) => H.iconButton({ type: s.type, variant: s.variant, size: s.size, shape: s.shape ? "pill" : null, icon: s.icon, disabled: s.disabled, label: "Next", tooltip: "Next page" }),
      });
      const sizes = ui.matrix(["sm · 30", "md · 34", "lg · 40", "xl · 48"], BTN_KINDS.map(([t, v]) => ({ label: `${t} · ${v}`, cells: ["sm", "md", "lg", "xl"].map((sz) => H.iconButton({ type: t, variant: v, size: sz, stroke: sz === "sm" ? "1" : null })) })));
      const states = ui.matrix(STATES.map((s) => s[0]), BTN_KINDS.map(([t, v]) => ({ label: `${t} · ${v}`, cells: STATES.map(([, f]) => H.iconButton({ type: t, variant: v, size: "md", force: f && f !== "disabled" ? f : null, disabled: f === "disabled" })) })));
      const toolbar = `<div class="pg-card" style="display:flex;align-items:center;gap:var(--spacing-2xs);inline-size:max-content">${[["system-add--cute-light", "Додати день"], ["file-copy--cute-light", "Дублювати"], ["file-upload--cute-light", "Експорт CSV"], ["system-settings-1--cute-light", "Налаштування"]].map(([i, t]) => H.iconButton({ icon: i, type: "secondary", variant: "link", size: "md", label: t, tooltip: t })).join("")}${H.separator({ orientation: "vertical" })}${H.iconButton({ icon: "system-close--light", type: "secondary", variant: "outline", size: "md", label: "Закрити", tooltip: "Закрити" })}</div>`;
      return [
        sec("Playground", "", live.html),
        sec("Розміри", "Штрих іконки у sm — 1px, як у Figma (<code>data-stroke=\"1\"</code>).", sizes),
        sec("Стани", "", states),
        sec("Тулбар з тултіпами", "Проведіть курсором уздовж ряду: одна підказка переїжджає між кнопками, а не блимає заново.", toolbar),
        sec("Токени", "Кольори ті самі, що в Button.", tokenTable([
          ["Розмір", "30 · 34 · 40 · 48", ["--rounded-xl", "--rounded-2xl", "--rounded-3xl"]],
          ["Surface (Pagination)", "Фон · форма", ["--bg-secondary-10", "--rounded-full"]],
        ])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Порожня сторінка", text: "Сторінка «❖ Icon Button» у Figma порожня — набір лежить на сторінці Button." },
          { tone: "figma", title: "Link-розміри плавають", text: "Link sm — бокс 34 з іконкою 18, md — іконка 24; Link Hover схлопується до 18×18 без падінгу. Код тримає однакові бокси для всіх варіантів, щоб кнопка не стрибала." },
          { tone: "figma", title: "Surface поза набором", text: "Pagination використовує кругле «Icon button/Secondary/Surface/lg», якого немає в наборі. Відтворено як <code>data-variant=\"surface\" data-shape=\"pill\"</code>." },
          { tone: "a11y", title: "Назва", text: "Кнопка без тексту завжди отримує <code>aria-label</code>; тултіп лише дублює її для зрячих." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });

  /* ───────────────────────── Indicators ───────────────────────── */

  const IND_COLORS = ["green", "red", "blue", "white", "orange", "pink"];

  PG.register({
    id: "indicators",
    group: "components",
    title: "Indicators",
    glyph: "In",
    figma: "75:1321",
    figmaName: "Indicators · 54 варіанти",
    keywords: "indicator dot status notification count індикатор",
    lede: "Крапка статусу, лічильник або іконка в кружку з тонким світлим обідком. Застосовується в аватарах, табах, сегментах і селекторах.",
    meta: ["6 кольорів", "3 розміри", "dot · number · icon"],
    render() {
      let counter = 2;
      const live = PG.playground({
        controls: [
          { key: "color", label: "Color", type: "select", options: opt(IND_COLORS), value: "pink" },
          { key: "size", label: "Size", options: opt(["sm", "md", "lg"]), value: "lg" },
          { key: "content", label: "Content", options: opt(["dot", "number", "icon"]), value: "number" },
          { key: "pulse", label: "Pulse", type: "switch", value: false },
        ],
        actions: [{ label: "+1", icon: "system-add--cute-light", run: (stage) => { const el = stage.querySelector(".ds-indicator"); if (el.dataset.content === "number") DS.setIndicator(el, `+${++counter}`); } }],
        render: (s) => H.indicator({ color: s.color, size: s.size, content: s.content, value: `+${counter}`, pulse: s.pulse }),
      });
      const matrix = ui.matrix(IND_COLORS, ["dot", "number", "icon"].map((c) => ({ label: c, cells: IND_COLORS.map((col) => ["sm", "md", "lg"].map((sz) => H.indicator({ color: col, size: sz, content: c }))).map((x) => x.join("")) })));
      const context = `<div class="pg-card" style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--spacing-2xl)">${H.avatar({ size: 60, color: "violet", initials: "EC", status: true, notification: true })}${H.tabs({ items: [{ label: "Рахунки", count: 3 }, { label: "Архів", count: 12 }] })}${H.segmented({ size: "md", items: [{ label: "Дні" }, { label: "Тижні", count: "+2" }] })}<span style="position:relative;display:inline-flex">${H.iconButton({ icon: "system-settings-1--cute-light", type: "secondary", variant: "outline", size: "lg", label: "Налаштування" })}<span style="position:absolute;inset-block-start:-4px;inset-inline-end:-4px">${H.indicator({ color: "red", content: "number", value: "3" })}</span></span></div>`;
      return [
        sec("Playground", "Кнопка «+1» оновлює лічильник рецептом Number pop-in.", live.html),
        sec("Кольори × вміст × розмір", "У кожній клітинці sm, md і lg.", matrix),
        sec("У компонентах", "", context),
        sec("Властивості", "", ui.props([
          ["Color", "Green · Red · Blue · White · Orange · Pink", "Green", '<code>data-color</code>'],
          ["Size", "sm · md · lg", "sm", '<code>data-size</code>'],
          ["Icon / Number", "On · Off", "Off", '<code>data-content="icon | number"</code>'],
          ["⮑Text", "text", "+2", "<code>.ds-indicator__value</code>"],
        ])),
        sec("Токени", "", tokenTable([
          ["Green", "Заливка · обідок", ["--color-green-600", "--color-green-300"]],
          ["Blue", "Заливка · обідок", ["--color-blue-500", "--color-blue-300"]],
          ["White", "Заливка · обідок · текст", ["--bg-secondary-50", "--border-default-60", "--text-primary"]],
          ["Number", "Шрифт sm · md/lg", ["--ts-note-sm-semibold", "--ts-body-sm-semibold"]],
        ])),
        sec("Анімація", "", motionTable([["Зміна числа", "Number pop-in з пружиною", "500ms · <code>--digit-ease</code>"], ["Pulse", "Кільце розходиться і гасне (додано в коді)", "1600ms"]])),
        sec("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Документація", text: "Сторінка описує кольори Green | Red | Blue | White, а набір має ще Orange і Pink." },
          { tone: "figma", title: "Surface-варіант", text: "Сегменти посилаються на «Indicators/White/sm/Surface» (фон <code>bg-secondary-20</code>, обідок <code>#e7e8e9</code>), якого немає в наборі. Відтворено контекстно всередині <code>.ds-segmented</code>." },
          { tone: "a11y", title: "Не лише колір", text: "Статусна крапка повинна мати текстову пару поруч або <code>aria-label</code> — колір сам по собі не несе значення." },
        ])),
        { html: "", mount: live.mount },
      ];
    },
  });
})();
