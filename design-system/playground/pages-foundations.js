/* Foundations: overview, colour, type, spacing, effects, motion, icons. */
(function () {
  "use strict";

  const T = window.DS_TOKENS;
  const H = DS.html;
  const esc = DS.esc;
  const col = (name) => T.collections.find((c) => c.name === name);

  const hexRgb = (hex) => {
    const h = hex.replace("#", "").slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  };
  const lum = (hex) => {
    const [r, g, b] = hexRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const ratioBadge = (r) => {
    const level = r >= 7 ? ["AAA", "green"] : r >= 4.5 ? ["AA", "green"] : r >= 3 ? ["AA 18px+", "yellow"] : ["Fail", "red"];
    return H.badge({ label: `${r.toFixed(2)} · ${level[0]}`, color: level[1], variant: "soft" });
  };

  /* ───────────────────────── Overview ───────────────────────── */

  PG.register({
    id: "overview",
    group: "foundations",
    title: "Огляд",
    glyph: "Ov",
    figma: "20:19",
    figmaName: "Overview",
    keywords: "overview start огляд старт",
    lede: "Живий код дизайн-системи prodrec, зібраний напряму з Figma-файлу через Figmosha: 260 змінних, 36 текстових стилів, 17 ефектів і 29 наборів компонентів. Кожне значення в CSS посилається на токен, кожна анімація — на шкалу transitions.dev.",
    meta: ["Light mode", "Figma → CSS 1:1", "MGC Icons v1.36"],
    render(ui) {
      const vars = T.collections.reduce((s, c) => s + c.count, 0);
      const stats = ui.grid(4, [
        ui.card("", "", ui.stat(String(vars), "змінних у 3 колекціях")),
        ui.card("", "", ui.stat(String(T.textStyles.length), "текстових стилів")),
        ui.card("", "", ui.stat("29", "наборів компонентів")),
        ui.card("", "", ui.stat(String(Object.keys(window.DS_ICONS).length), "іконок MGC")),
      ]);

      const tiers = ui.table(
        ["Рівень", "Колекція у Figma", "Змінних", "Приклад", "Як використовувати"],
        [
          ["1 · Примітиви", "Primitives", String(col("Primitives").count), ui.token("--color-pink-600"), "Сира палітра, шкала Scale і прозорості. У компонентах — лише коли Figma сама прив'язує примітив."],
          ["2 · Семантика", "Mapped", String(col("Mapped").count), ui.token("--bg-primary"), "Кольори за призначенням: текст, фон, межі. Основний рівень для екранів."],
          ["3 · Адаптивні", "Responsive", String(col("Responsive").count), ui.token("--spacing-md", { swatch: false }), "Кегль, інтерліньяж, відступи, радіуси, blur і брейкпоінти."],
          ["4 · Компоненти", "—", "—", ui.token("--btn-bg", { swatch: false }), "Локальні змінні в components.css (--btn-*, --f-*, --av-*), що посилаються на рівні 1–3."],
        ]
      );

      const files = ui.table(
        ["Файл", "Що всередині"],
        [
          ["<code>tokens.css</code>", "Згенеровано з Figma: усі змінні, композитні шрифти <code>--ts-*</code>, ефекти <code>--effect-*</code>, класи <code>.ts-*</code> і шкала руху."],
          ["<code>components.css</code>", "Стилі всіх компонентів, стани hover / focus / active / disabled, recipes transitions.dev, reduced motion."],
          ["<code>components.js</code>", "Поведінка: таби, сегменти, селектор, тултіпи, тости, прогрес, поля, скрол, аватари. <code>DS.init(root)</code>."],
          ["<code>markup.js</code>", "Будівники розмітки <code>DS.html.*</code> — ними зібраний і цей playground, і будуть екрани."],
          ["<code>icons.js</code> + <code>assets/icons</code>", "43 іконки MGC, експортовані з бібліотеки за скілом mgc-icons (keylines вимкнено, сітка 24px)."],
          ["<code>assets/flags</code>, <code>assets/cursors</code>, <code>assets/images</code>", "252 прапори, 9 курсорів і зображення зі сторінок Avatar, Popover, Tooltip."],
        ]
      );

      const usage = ui.code(
        `<!-- 1. Підключення -->
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="components.css">
<script src="icons.js"></script>
<script src="components.js"></script>
<script src="markup.js"></script>

<!-- 2. Розмітка вручну -->
<button class="ds-btn" data-variant="solid" data-size="md">Зберегти</button>

<script>
  // 3. Або будівниками, потім ініціалізація поведінки
  const host = document.querySelector('#screen');
  host.innerHTML = DS.html.field({ label: 'Назва проєкту', size: 'md' })
    + DS.html.button({ label: 'Зберегти', size: 'md' });
  DS.init(host);
  DS.toast({ type: 'success', title: 'Збережено' });
</script>`,
        { raw: true, radius: true, label: "Швидкий старт" }
      );

      const composition = PG.playground({
        surface: "tint",
        minHeight: 560,
        noMorph: true,
        render: () => `
<div class="pg-card" style="inline-size:min(560px,100%);display:grid;gap:var(--spacing-lg);padding:var(--spacing-xl);box-shadow:inset 0 0 0 1px var(--ext-stroke-subtle),var(--effect-popover-shadow-hard)">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--spacing-md)">
    <div style="display:flex;align-items:center;gap:var(--spacing-s)">
      ${H.avatar({ size: 44, color: "pink", initials: "PR", status: true })}
      <div><div class="ts-headline-h5-semibold">Новий проєкт</div><div class="ts-body-sm-regular" style="color:var(--text-secondary)">Годинна ставка · облік по днях</div></div>
    </div>
    ${H.badge({ label: "Чернетка", color: "yellow", variant: "surface", size: "md" })}
  </div>
  ${H.tabs({ items: [{ label: "Деталі" }, { label: "Ставка" }, { label: "Нотатки", count: 2 }], label: "Розділи проєкту", panels: [
    `<div style="display:grid;gap:var(--spacing-md)">
      ${H.field({ label: "Назва проєкту", placeholder: "Напр., Редизайн лендингу", size: "md", width: "fill", description: "Бачите тільки ви", id: "demo-name" })}
      ${H.select({ label: "Клієнт", size: "md", width: "fill", leadIcon: "user-user-2--cute-filled", options: [
        { title: "Emily Carter", desc: "Product Manager", media: H.avatar({ size: 32, color: "violet", initials: "EC" }), check: true },
        { title: "Sarah Johnson", desc: "Marketing Lead", media: H.avatar({ size: 32, color: "green", initials: "SJ" }), check: true },
        { title: "Michael Thompson", desc: "Founder", media: H.avatar({ size: 32, color: "orange", initials: "MT" }), check: true },
      ] })}
    </div>`,
    `<div style="display:grid;gap:var(--spacing-md)">
      <div style="display:flex;gap:var(--spacing-s);align-items:end;flex-wrap:wrap">
        ${H.field({ label: "Ставка за годину", size: "md", value: "32", type: "number", placeholder: "0", width: "fill" }).replace('class="ds-field"', 'class="ds-field" style="flex:1;min-inline-size:160px"')}
        ${H.segmented({ size: "lg", label: "Валюта", items: [{ label: "UAH" }, { label: "EUR" }, { label: "USD" }], selected: 2 })}
      </div>
      ${H.switchControl({ label: "Враховувати податок 5%", checked: true })}
      ${H.progress({ title: "Місячна ціль", value: 64, caption: "112 з 176 годин", width: "fill" })}
    </div>`,
    `${H.field({ label: "Нотатки", multiline: true, size: "md", width: "fill", placeholder: "Домовленості, контакти, дедлайни", maxLength: 280, count: true, description: " " })}`,
  ] })}
  ${H.callout({ color: "gray", variant: "surface", icon: "system-information--cute-light", text: "Години вписуються вручну, заднім числом — таймера немає." })}
  <div style="display:flex;justify-content:flex-end;gap:var(--spacing-xs)">
    ${H.button({ label: "Скасувати", type: "secondary", variant: "outline", size: "md" })}
    ${H.button({ label: "Зберегти проєкт", size: "md", loadable: true, busyLabel: "Зберігаю", attrs: 'data-demo="save"' })}
  </div>
</div>`,
        code: () => "<!-- Композиція зібрана будівниками DS.html.* — див. код кожного компонента на його сторінці -->",
        after(stage) {
          const save = stage.querySelector('[data-demo="save"]');
          save.addEventListener("click", () => {
            const field = stage.querySelector("#demo-name").closest(".ds-field");
            const input = field.querySelector("input");
            if (!input.value.trim()) {
              stage.querySelector(".ds-tab").click();
              DS.fieldError(field, "Вкажіть назву проєкту");
              input.focus();
              return;
            }
            DS.setLoading(save, true);
            setTimeout(() => {
              DS.setLoading(save, false);
              DS.toast({ type: "success", title: "Проєкт збережено", description: `«${input.value.trim()}» додано до календаря.` });
            }, 1100);
          });
        },
      });

      const notes = ui.notes([
        { tone: "figma", title: "Стара назва", text: "Шапки сторінок у Figma досі підписані «Invox v1.0–1.2» — це попередня назва системи." },
        { tone: "figma", title: "Застарілий експорт", text: "Сторінка «Tokens Export (JSON)» містить знімок з режимом In-Dark і назвами «Invox color system». Живі змінні мають лише режим In-Light, тож playground будується з них, а не з експорту." },
        { tone: "info", title: "Темна тема", text: "У колекціях немає темного режиму, тому CSS не вигадує його. Семантичний рівень готовий до перемикання через <code>[data-theme]</code>, коли режим з'явиться у Figma." },
        { tone: "a11y", title: "Доступність", text: "Фокус-кільце <code>--effect-focus-ring</code> показується тільки після навігації з клавіатури; усі анімації мають <code>prefers-reduced-motion</code>." },
      ]);

      return [
        stats,
        ui.section("Архітектура токенів", "Figma тримає три колекції; код додає четвертий, компонентний рівень. Значення завжди течуть згори вниз — примітив ніколи не посилається на семантику.", tiers),
        ui.section("Композиція", "Контрольний екран із prodrec, зібраний тільки з компонентів цієї системи. Спробуйте зберегти з порожньою назвою — поле відповість помилкою, струсом і автоматичним поверненням.", composition.html),
        ui.section("Файли", "Усе лежить у <code>prodrec/design-system</code> і відкривається з диска без збірки.", files),
        ui.section("Як підключити", "", usage),
        ui.section("Що варто знати про джерело", "", notes),
        { mount: composition.mount, html: "" },
      ];
    },
  });

  /* ───────────────────────── Colors ───────────────────────── */

  PG.register({
    id: "colors",
    group: "foundations",
    title: "Кольори",
    glyph: "Co",
    figma: "20:15",
    figmaName: "Colors",
    keywords: "color palette кольори палітра",
    lede: "Палітра «Custom Tailwind»: 10 відтінків по 11 кроків (сірий — 14) і 44 семантичні токени. Семантика будується з примітивів, а напівпрозорі версії — через <code>color-mix()</code> із колекції Transparency.",
    meta: ["123 примітиви", "44 семантичні", "7 прозоростей"],
    render(ui) {
      const prim = col("Primitives").vars.filter((v) => v.type === "COLOR");
      const hues = [];
      prim.forEach((v) => {
        const m = v.css.match(/^--color-([a-z]+)-(\d+)$/);
        if (!m) return;
        let h = hues.find((x) => x.name === m[1]);
        if (!h) hues.push((h = { name: m[1], steps: [] }));
        h.steps.push({ step: Number(m[2]), css: v.css, hex: v.resolved });
      });
      hues.forEach((h) => h.steps.sort((a, b) => a.step - b.step));
      const ramps = hues
        .map((h) => {
          const cells = h.steps
            .map((s) => {
              const on = contrast(s.hex, "#ffffff") >= contrast(s.hex, "#030a16") ? "#ffffff" : "#030a16";
              return `<button class="pg-swatch" type="button" style="--sw:${s.hex};--sw-fg:${on}" data-copy="var(${s.css})" aria-label="${s.css} ${s.hex}"><span class="pg-swatch__step">${s.step}</span><span class="pg-swatch__hex">${s.hex}</span></button>`;
            })
            .join("");
          const cols = h.steps.length;
          return `<div class="pg-ramp" style="grid-template-columns:110px repeat(${cols},minmax(0,1fr))"><div class="pg-ramp__name">${esc(h.name)}<span>${cols} кроків</span></div>${cells}</div>`;
        })
        .join('<div style="block-size:var(--spacing-2xs)"></div>');

      const mapped = col("Mapped").vars;
      const groups = [["text", "Текст"], ["background", "Фон"], ["border", "Межі"]];
      const semantic = groups
        .map(([key, label]) => {
          const items = mapped
            .filter((v) => v.figma.startsWith(key + "/"))
            .map((v) => `<div class="pg-semantic__item"><span class="pg-semantic__chip" style="--sw:var(${v.css})"></span><div><div class="pg-semantic__name">${ui.token(v.css, { swatch: false })}</div><div class="pg-semantic__alias">${esc(v.alias || v.value)}</div><div class="pg-semantic__alias">${esc(v.resolved)}</div></div></div>`)
            .join("");
          return `${ui.subtitle(label)}<div class="pg-semantic">${items}</div>`;
        })
        .join("");

      const textTokens = mapped.filter((v) => v.figma.startsWith("text/") && /^#/.test(v.resolved));
      const bg = "#fcfdfd";
      const contrastTable = ui.table(
        ["Токен тексту", "Значення", "На --bg-background", "На --bg-card", "Де вживається"],
        textTokens.map((v) => [
          ui.token(v.css),
          `<code>${v.resolved}</code>`,
          ratioBadge(contrast(v.resolved, bg)),
          ratioBadge(contrast(v.resolved, "#ffffff")),
          {
            "--text-primary": "Основний текст, назви, суми",
            "--text-secondary": "Підписи, описи, неактивні таби",
            "--text-tertiary": "Плейсхолдери, службові іконки",
            "--text-disabled": "Вимкнені елементи — декоративний контраст",
            "--text-on-fill": "Текст на --bg-primary",
            "--text-accent": "Посилання, активні таби, outline-кнопки",
            "--text-destructive": "Помилки, небезпечні дії",
            "--text-success": "Успіх",
          }[v.css] || "",
        ])
      );
      const onPrimary = contrast("#ffffff", "#e15fd8");

      const transparency = col("Primitives").vars.filter((v) => v.figma.startsWith("Transparency"));
      const alphaRow = `<div class="pg-grid" data-cols="auto">${transparency
        .map((v) => `<div class="pg-card" style="display:grid;gap:var(--spacing-xs)"><span class="pg-semantic__chip" style="inline-size:100%;--sw:color-mix(in srgb,var(--color-pink-600) var(${v.css}),transparent)"></span>${ui.token(v.css, { swatch: false })}<span class="pg-muted">${v.resolved}</span></div>`)
        .join("")}</div>`;

      return [
        ui.section("Примітиви", "Клік по кольору копіює <code>var(--color-*)</code>. Підпис автоматично перемикається на білий або чорний за контрастом.", `<div class="pg-card" style="display:grid;gap:var(--spacing-2xs)">${ramps}</div>`),
        ui.section("Семантичні токени", "Колекція Mapped. Під назвою — ланцюжок псевдоніма і фінальне значення. Напівпрозорі токени показані поверх шахматки.", semantic),
        ui.section("Контраст тексту", `Реальні коефіцієнти WCAG 2.2, пораховані з hex. Білий текст на <code>--bg-primary</code> дає ${onPrimary.toFixed(2)}:1 — цього вистачає лише для крупного або жирного тексту.`, contrastTable),
        ui.section("Прозорість", "Figma зберігає прозорість окремими FLOAT-змінними й комбінує їх з кольором. У коді це <code>color-mix(in srgb, var(колір) var(--transparency-N), transparent)</code>.", alphaRow),
        ui.section(
          "Нотатки з Figma",
          "",
          ui.notes([
            { tone: "figma", title: "Порядок sky", text: "У колекції <code>sky-50</code) стоїть перед teal, а решта відтінку — після. На значення не впливає, лише на порядок у панелі змінних." },
            { tone: "figma", title: "Прямі примітиви в компонентах", text: "Частина компонентів прив'язана до примітивів замість семантики: link-кнопка — <code>Colors/pink/pink-700</code> замість <code>text/text-accent</code>, бейджі й аватари — прямі кроки палітри. У коді збережено саме ці прив'язки." },
            { tone: "gap", title: "Значення без змінних", text: "Кілька компонентів використовують кольори з іншої бібліотеки: обведення <code>#e7e8e9</code> (тости, поповери, таби, картки), текст <code>#717579</code>, заливка <code>#f072e6</code> 10% у Callout. Вони винесені в <code>--ext-*</code> або зібрані з примітивів." },
            { tone: "a11y", title: "Декоративні межі", text: "<code>--border-default-60</code> має контраст близько 1.1:1 — він підходить для роздільників і карток, але не як єдина межа інтерактивного поля без додаткової підказки." },
          ])
        ),
      ];
    },
  });

  /* ───────────────────────── Typography ───────────────────────── */

  PG.register({
    id: "typography",
    group: "foundations",
    title: "Типографіка",
    glyph: "Ty",
    figma: "52:143",
    figmaName: "Typography",
    keywords: "type font typography шрифт типографіка",
    lede: "Дві гарнітури: <strong>Urbanist</strong> для заголовків h1–h6 і <strong>Inter</strong> для тексту, посилань і нотаток. Кожен стиль прив'язаний до змінних кегля, інтерліньяжу, ваги та відступу абзацу.",
    meta: ["36 стилів", "2 гарнітури", "4 ваги"],
    render(ui) {
      const groups = [["headline", "Заголовки · Urbanist"], ["body", "Текст · Inter"], ["link", "Посилання · Inter"], ["note", "Нотатки · Inter"]];
      const samples = { headline: "Скільки з цього моє", body: "Клікніть по дню, оберіть проєкт і впишіть години — підсумок перерахується сам.", link: "Відкрити звіт за вересень", note: "Оновлено 15.09" };
      const rows = groups
        .map(([key, label]) => {
          const list = T.textStyles.filter((s) => s.figma.startsWith(key + "/"));
          const body = list
            .map((s) => {
              const spec = [
                H.badge({ label: `${s.size}/${s.lineHeight.replace("px", "")}`, color: "gray", variant: "surface" }),
                H.badge({ label: `${s.style} · ${s.weight}`, color: "gray", variant: "surface" }),
                s.paragraphSpacing ? H.badge({ label: `¶ ${s.paragraphSpacing}`, color: "gray", variant: "surface" }) : "",
                s.decoration ? H.badge({ label: "underline", color: "gray", variant: "surface" }) : "",
              ].join("");
              return `<div class="pg-type-row"><div><div class="pg-muted pg-mono" style="margin-block-end:var(--spacing-2xs)">${esc(s.figma)} · <span data-copy="var(${s.var})" style="cursor:copy">.${s.class}</span></div><div class="pg-type-row__sample ${s.class}">${esc(samples[key])}</div></div><div class="pg-type-row__spec">${spec}</div></div>`;
            })
            .join("");
          return `${ui.subtitle(label)}<div>${body}</div>`;
        })
        .join("");

      const resp = col("Responsive").vars;
      const pick = (prefix) => resp.filter((v) => v.figma.startsWith(prefix));
      const scaleTable = ui.table(
        ["Рівень", "Кегль", "Інтерліньяж", "Відступ абзацу"],
        ["h1", "h2", "h3", "h4", "h5", "h6"].map((h) => [
          h,
          ui.token(`--fontsize-headline-${h}`, { swatch: false }) + ` <span class="pg-muted">${pick("fontsize/headline/" + h)[0].resolved}</span>`,
          ui.token(`--lineheight-heading-${h}`, { swatch: false }) + ` <span class="pg-muted">${pick("line height/heading/" + h)[0].resolved}</span>`,
          ui.token(`--paragraph-heading-${h}`, { swatch: false }) + ` <span class="pg-muted">${pick("paragraph spacing/heading/" + h)[0].resolved}</span>`,
        ]).concat(["sm", "md", "lg"].map((b) => [
          `body ${b}`,
          ui.token(`--fontsize-body-${b}`, { swatch: false }) + ` <span class="pg-muted">${pick("fontsize/body/" + b)[0].resolved}</span>`,
          ui.token(`--lineheight-body-${b}`, { swatch: false }) + ` <span class="pg-muted">${pick("line height/body/" + b)[0].resolved}</span>`,
          ui.token(`--paragraph-body-${b}`, { swatch: false }) + ` <span class="pg-muted">${pick("paragraph spacing/body/" + b)[0].resolved}</span>`,
        ]))
      );

      const families = ui.grid(2, [
        ui.card("Urbanist", "--font-family-heading · Regular 400, SemiBold 600, Bold 700", `<div class="ts-headline-h1-bold" style="margin-block-start:var(--spacing-md)">Aa Бб 0123</div><div class="ts-headline-h5-regular" style="color:var(--text-secondary)">абвгґдеєжзиіїйклмнопрстуфхцчшщьюя</div>`),
        ui.card("Inter", "--font-family-body · Regular 400, Medium 500, SemiBold 600", `<div style="font:var(--font-weight-semibold) 44px/56px var(--font-family-body);margin-block-start:var(--spacing-md)">Aa Бб 0123</div><div class="ts-body-lg-regular" style="color:var(--text-secondary)">абвгґдеєжзиіїйклмнопрстуфхцчшщьюя</div>`),
      ]);

      const usage = ui.code(
        `/* Класом */
<h2 class="ts-headline-h4-semibold">Вересень</h2>

/* Або шорткатом у власному CSS */
.summary-total { font: var(--ts-headline-h3-bold); }
.hint { font: var(--ts-body-sm-regular); color: var(--text-secondary); }`,
        { raw: true, radius: true, label: "CSS" }
      );

      return [
        ui.section("Гарнітури", "", families),
        ui.section("Усі стилі", "Клік по назві класу копіює змінну-шорткат. Текст зразків — із реального сценарію prodrec.", rows),
        ui.section("Шкала Responsive", "Колекція має один режим (Mode 1), тож поки ці значення однакові для всіх ширин.", scaleTable),
        ui.section("Використання", "", usage),
        ui.section(
          "Нотатки з Figma",
          "",
          ui.notes([
            { tone: "figma", title: "body/sm-medium насправді Regular", text: "Стиль прив'язаний до <code>Typo/font-weight/regular</code> і використовує Inter Regular. Код повторює Figma, тому бейджі й сегменти sm мають вагу 400, а не 500." },
            { tone: "figma", title: "Aileron у таблиці", text: "На сторінці Typography у колонці Typeface для заголовків вказано «Aileron», але самі стилі використовують Urbanist." },
            { tone: "figma", title: "Нотатки на токенах відступів", text: "<code>note/sm-*</code> беруть кегль із <code>Scale/10</code>, інтерліньяж зі <code>spacing/md</code> і відступ абзацу зі <code>spacing/s</code> — не з колекції типографіки." },
            { tone: "figma", title: "Посилання в кнопках", text: "Кнопки використовують стиль <code>link/md-medium</code>, але вимикають підкреслення на рівні шару. Тому в коді кнопка має <code>--ts-body-md-medium</code>." },
          ])
        ),
      ];
    },
  });

  /* ───────────────────────── Spacing & radius ───────────────────────── */

  PG.register({
    id: "spacing",
    group: "foundations",
    title: "Відступи й радіуси",
    glyph: "Sp",
    figma: "56:255",
    figmaName: "Spacing",
    keywords: "spacing radius scale breakpoints відступи радіус",
    lede: "Базова шкала <code>Scale</code> (21 крок від 0 до 160) живить 12 семантичних відступів і 13 радіусів. Брейкпоінти взяті з Tailwind і доповнені 375, 1440, 1920.",
    meta: ["21 крок Scale", "12 spacing", "13 radius", "9 breakpoints"],
    render(ui) {
      const prim = col("Primitives").vars.filter((v) => v.figma.startsWith("Scale/"));
      const resp = col("Responsive").vars;
      const bars = (list) => list.map((v, i) => `<div class="pg-scale-row">${ui.token(v.css, { swatch: false })}<span class="pg-muted pg-mono">${v.resolved}</span><span class="pg-scale-bar" style="--w:calc(var(${v.css}) * 3);--i:${i}"></span></div>`).join("");
      const spacing = resp.filter((v) => v.figma.startsWith("spacing/"));
      const radius = resp.filter((v) => v.figma.startsWith("radius/"));
      const bps = resp.filter((v) => v.figma.startsWith("break"));
      const radiusTiles = `<div class="pg-grid" data-cols="auto" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${radius
        .map((v) => `<div style="display:grid;gap:var(--spacing-xs)"><div class="pg-radius-tile" style="--r:var(${v.css})">${v.resolved}</div>${ui.token(v.css, { swatch: false })}</div>`)
        .join("")}</div>`;
      const bpTable = ui.table(["Токен", "Значення", "Призначення"], bps.map((v) => [ui.token(v.css, { swatch: false }), v.resolved, { "1196": "Висота робочої області (H)", "375": "Мобільний", "640": "sm", "768": "md", "1024": "lg", "1280": "xl", "1440": "Десктоп-макет", "1536": "2xl", "1920": "Широкий" }[v.resolved.replace("px", "")] || ""]));
      return [
        ui.section("Семантичні відступи", "Бар — значення × 3 для наочності. Спочатку більші зовнішні відступи, потім внутрішні: картка > група > елемент.", `<div class="pg-card">${bars(spacing)}</div>`),
        ui.section("Радіуси", "Радіуси синхронні з висотою контролу: sm-кнопка 30px — <code>rounded-xl</code> 10px, lg 40px — <code>rounded-2xl</code>, xl 48px — <code>rounded-3xl</code>.", radiusTiles),
        ui.section("Базова шкала", "Primitives / Scale. Компоненти Figma часто прив'язують відступи прямо сюди (<code>Scale/6</code>, <code>Scale/26</code>), бо в spacing немає таких кроків.", `<div class="pg-card">${bars(prim)}</div>`),
        ui.section("Брейкпоінти", "", bpTable),
        ui.section("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "«9 кроків»", text: "Текст на сторінці Spacing каже про 9-крокову шкалу, але Scale має 21 значення, spacing — 12, radius — 13." },
          { tone: "figma", title: "Радіус на токені відступу", text: "Кругла icon-кнопка в Pagination прив'язує радіус до <code>spacing/6xl</code> (120). У коді використано <code>--rounded-full</code>." },
          { tone: "info", title: "Кроки без токена", text: "Figma має raw-значення 9px (gap у Drop_item) і 26px. Перше в коді округлено до <code>--spacing-xs</code>, друге береться з <code>--scale-26</code>." },
        ])),
      ];
    },
  });

  /* ───────────────────────── Effects ───────────────────────── */

  PG.register({
    id: "effects",
    group: "foundations",
    title: "Ефекти й blur",
    glyph: "Fx",
    figma: "20:15",
    figmaName: "Colors → Shadows · Blur",
    keywords: "shadow blur effect focus ring тіні розмиття",
    lede: "17 ефект-стилів: фокус-кільце, внутрішня тінь чекбокса, дві тіні поповерів, 5 фонових і 8 шарових розмиттів. Figma вимірює blur радіусом, CSS — сигмою, тому в коді значення діляться на 2.",
    meta: ["4 тіні", "13 blur", "+1 локальний ефект"],
    render(ui) {
      const shadows = T.effects.filter((e) => !/blur/i.test(e.figma));
      const shadowTiles = ui.grid(3, shadows.concat([{ figma: "inner-bevel (локальний)", css: "--effect-inner-bevel", value: "" }]).map((e) => {
        const style = e.css === "--effect-focus-ring" ? `box-shadow:var(${e.css})` : `box-shadow:var(${e.css})${e.css.includes("checkbox") || e.css.includes("bevel") ? ",inset 0 0 0 1px var(--border-default-60)" : ""}`;
        const tileBg = e.css.includes("bevel") ? "background:var(--bg-primary);color:var(--text-on-fill)" : "";
        return `<div style="display:grid;gap:var(--spacing-s)"><div class="pg-effect-tile" style="${style};${tileBg}" tabindex="0">${esc(e.figma)}</div>${ui.token(e.css, { swatch: false })}<code class="pg-muted" style="font-size:11px;overflow-wrap:anywhere">${esc(e.value)}</code></div>`;
      }));

      const bg = T.effects.filter((e) => e.css.includes("bg-blur"));
      const layer = T.effects.filter((e) => e.css.includes("layer-blur"));
      const bgTiles = ui.grid(3, bg.map((e) => `<div style="display:grid;gap:var(--spacing-xs)"><div class="pg-blur-demo"><div class="pg-blur-demo__glass" style="backdrop-filter:var(${e.css});-webkit-backdrop-filter:var(${e.css})">${esc(e.figma.split("/")[1])}</div></div>${ui.token(e.css, { swatch: false })}</div>`));
      const layerTiles = ui.grid(4, layer.map((e) => `<div style="display:grid;gap:var(--spacing-xs)"><div class="pg-effect-tile" style="position:relative;overflow:hidden;background:var(--bg-card);box-shadow:inset 0 0 0 1px var(--ext-stroke-subtle)"><span style="position:absolute;inline-size:56px;block-size:56px;border-radius:50%;background:var(--color-pink-400);filter:var(${e.css})"></span><span style="position:relative">${esc(e.figma.split("/")[1])}</span></div>${ui.token(e.css, { swatch: false })}</div>`));

      const focusDemo = PG.playground({
        controls: [{ key: "el", label: "Елемент", options: [{ label: "Button", value: "btn" }, { label: "Field", value: "field" }, { label: "Switch", value: "switch" }] }],
        render: (s) => (s.el === "btn" ? H.button({ label: "Кнопка у фокусі", size: "lg", force: "focus" }) : s.el === "field" ? H.field({ label: "Поле у фокусі", force: "focus", size: "md" }) : H.switchControl({ label: "Перемикач", force: "focus", checked: true })),
      });

      return [
        ui.section("Тіні", "Фокус-кільце — два шари spread без розмиття: 1px <code>pink-50</code> всередині і 4px <code>pink-700</code> зовні. Tab по сторінці покаже його на реальних елементах.", shadowTiles),
        ui.section("Фокус-кільце на компонентах", "", focusDemo.html),
        ui.section("Фонове розмиття", "Для Tooltip, Popover Surface і сірого Toast. Скло лежить поверх кольорових плям.", bgTiles),
        ui.section("Шарове розмиття", "Для декоративних світінь, зокрема кольорової плями в Toast (3xl).", layerTiles),
        ui.section("Нотатки з Figma", "", ui.notes([
          { tone: "figma", title: "Назва не збігається зі змінною", text: "Стиль «BG Blur / Blur xl 64» прив'язаний до <code>blur/xxl</code>. У коді токен названо за змінною: <code>--effect-bg-blur-xxl</code>." },
          { tone: "figma", title: "Локальний ефект", text: "Кнопки outline з іконкою, повзунок Switch і плитка завантаження в Toast мають однакову подвійну внутрішню тінь, але вона не оформлена стилем. Вона стала <code>--effect-inner-bevel</code>." },
          { tone: "info", title: "Шари тіні", text: "У popover_shadow_soft останній шар має alpha 0 — він нічого не малює, але збережений для точності." },
        ])),
        { html: "", mount: focusDemo.mount },
      ];
    },
  });

  /* ───────────────────────── Motion ───────────────────────── */

  PG.register({
    id: "motion",
    group: "foundations",
    title: "Motion",
    glyph: "Mo",
    keywords: "motion animation transition анімація рух",
    lede: "Шкала руху transitions.dev: 7 тривалостей, 6 кривих, дистанції, масштаби і blur. Відкриття повільніше за закриття, hover-in коротший за hover-out, а overshoot лише на входах. Figma не має токенів руху, тому це єдиний шар, доданий у коді.",
    meta: ["transitions.dev", "reduced motion", "21 recipe у компонентах"],
    render(ui) {
      const durations = [["--duration-stagger", "40ms", "зсув між елементами списку"], ["--duration-micro", "80ms", "затримка тултіпа, сегмент струсу"], ["--duration-quick", "150ms", "закриття меню, заміна тексту, hover"], ["--duration-fast", "250ms", "відкриття меню, таби, сегменти"], ["--duration-medium", "350ms", "закриття панелі й тоста"], ["--duration-slow", "400ms", "поява панелі, контенту, очищення поля"], ["--duration-very-slow", "500ms", "акценти: бейдж, прогрес, поява тексту"]];
      const easings = [["--ease-smooth-out", "відкриття/закриття, слайди, зміна розміру"], ["--ease-in-out", "заміна іконок і тексту"], ["--ease-out", "тултіп"], ["--ease-linear", "шимер, спінер"], ["--ease-bounce", "pop-in бейджа"], ["--ease-bounce-strong", "пружне повернення аватарів"]];
      const track = (dur, ease) => `<div class="pg-motion-track" data-track><span class="pg-motion-dot" style="transition:translate var(${dur}) var(${ease})"></span></div>`;
      const durRows = durations.map(([t, v, use]) => `<div class="pg-motion-row"><div>${ui.token(t, { swatch: false })}<div class="pg-muted" style="font:var(--ts-body-sm-regular)">${use}</div></div><span class="pg-mono">${v}</span>${track(t, "--ease-smooth-out")}</div>`).join("");
      const easeRows = easings.map(([t, use]) => `<div class="pg-motion-row"><div>${ui.token(t, { swatch: false })}<div class="pg-muted" style="font:var(--ts-body-sm-regular)">${use}</div></div><span class="pg-mono">500ms</span>${track("--duration-very-slow", t)}</div>`).join("");
      const player = (rows, id) => `<div class="pg-card" id="${id}"><div style="display:flex;justify-content:flex-end;margin-block-end:var(--spacing-xs)">${H.button({ label: "Відтворити", type: "secondary", variant: "outline", size: "sm", iconLeft: "system-refresh-1--cute-light", attrs: `data-play="${id}"` })}</div>${rows}</div>`;

      const recipes = ui.table(
        ["Компонент", "Recipe", "Токени"],
        [
          ["Button · loading", "Text states swap", ui.tokens(["--text-swap-dur", "--text-swap-blur"])],
          ["Checkbox", "Checkbox check (fill + stroke draw)", ui.tokens(["--check-box", "--check-draw"])],
          ["Switch", "Toggle (double bounce)", ui.tokens(["--toggle-dur", "--toggle-ease"])],
          ["Radio", "Ring spread з overshoot", ui.tokens(["--duration-fast", "--toggle-ease"])],
          ["Tabs · Segmented", "Tabs sliding", ui.tokens(["--tabs-dur", "--tabs-ease"])],
          ["Tab panel", "Panel reveal (cross-blur)", ui.tokens(["--reveal-dur", "--reveal-blur"])],
          ["Selector · Popover", "Menu dropdown (origin-aware)", ui.tokens(["--dropdown-open-dur", "--dropdown-close-dur"])],
          ["Tooltip", "Tooltip (delay in, instant out, travel)", ui.tokens(["--tt-delay", "--tt-move-dur"])],
          ["Toast", "Toast + banner stacking", ui.tokens(["--toast-open", "--toast-close"])],
          ["Text field", "Error state shake + Input clear dissolve", ui.tokens(["--shake-dur-a", "--revert-hold"])],
          ["Password toggle · Progress", "Icon swap", ui.tokens(["--icon-swap-dur", "--icon-swap-start-scale"])],
          ["Indicators · Stepper", "Number pop-in", ui.tokens(["--digit-dur", "--digit-ease"])],
          ["Avatar group", "Avatar group hover", ui.tokens(["--ease-smooth-out", "--ease-bounce-strong"])],
          ["Callout · collapse", "Accordion expand", ui.tokens(["--acc-expand", "--acc-ease"])],
          ["Pagination dots", "Caterpillar (card resize)", ui.tokens(["--duration-slow", "--ease-smooth-out"])],
        ]
      );

      return [
        ui.section("Тривалості", "Однакова крива <code>--ease-smooth-out</code>, різна тривалість.", player(durRows, "pg-dur")),
        ui.section("Криві", "Однакова тривалість 500ms, різна крива. Зверніть увагу на overshoot у bounce.", player(easeRows, "pg-ease")),
        ui.section("Рецепти в компонентах", "Кожен компонент бере один рецепт transitions.dev і посилається на його токени, а не на числа.", recipes),
        ui.section("Правила", "", ui.notes([
          { tone: "motion", title: "Асиметрія", text: "Меню відкривається за 250ms і закривається за 150ms; тост — 350 / 250ms. Закриття ніколи не має затримки." },
          { tone: "motion", title: "Overshoot тільки на вході", text: "Пружні криві — для появи бейджа, цифр, повзунка Switch і повернення аватарів. Закриття завжди плавне." },
          { tone: "a11y", title: "prefers-reduced-motion", text: "Усі переходи й анімації скорочуються до 1ms, лишається тільки повільний спінер. Перевірити можна в налаштуваннях ОС." },
        ])),
      ];
    },
    afterRender(host) {
      host.querySelectorAll("[data-play]").forEach((btn) => {
        const card = host.querySelector("#" + btn.dataset.play);
        const tracks = [...card.querySelectorAll("[data-track]")];
        const run = () => {
          tracks.forEach((t) => t.style.setProperty("--track-w", `${t.clientWidth}px`));
          const on = !tracks[0].classList.contains("is-run");
          tracks.forEach((t) => t.classList.toggle("is-run", on));
        };
        btn.addEventListener("click", run);
        setTimeout(run, 600);
      });
    },
  });

  /* ───────────────────────── Icons ───────────────────────── */

  PG.register({
    id: "icons",
    group: "foundations",
    title: "Іконки",
    glyph: "Ic",
    keywords: "icons mingcute mgc іконки",
    lede: "MGC Icons v1.36 (MingCute) з командної бібліотеки. Кожну іконку експортовано за скілом <strong>mgc-icons</strong>: імпорт набору за ключем, потрібний стиль, keylines вимкнено, сітка 24px, SVG з компонента. Штрих лишається сталим при будь-якому розмірі — як resize у Figma.",
    meta: ["43 іконки", "7 стилів", "currentColor"],
    render(ui) {
      const meta = window.DS_ICON_META || {};
      const names = Object.keys(window.DS_ICONS).sort();
      const pg = PG.playground({
        controls: [
          { key: "size", label: "Розмір", options: [{ label: "16", value: "16" }, { label: "20", value: "20" }, { label: "24", value: "24" }], value: "24" },
          { key: "color", label: "Колір", options: [{ label: "Primary", value: "--text-primary" }, { label: "Accent", value: "--text-accent" }, { label: "Secondary", value: "--text-secondary" }] },
          { key: "q", label: "Фільтр", type: "text", placeholder: "system, arrow…", value: "" },
        ],
        noMorph: true,
        stageStyle: "display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));inline-size:100%;align-items:stretch",
        render: (s) => names
          .filter((n) => !s.q || n.includes(s.q.toLowerCase()) || (meta[n] && meta[n].set.includes(s.q.toLowerCase())))
          .map((n) => {
            const m = meta[n] || {};
            return `<button class="pg-icon-tile" type="button" data-copy="DS.icon('${n}')" style="--icon-size:${s.size}px;color:var(${s.color})" data-ds-tooltip="${esc((m.set || n) + " · " + (m.style || ""))}">${DS.icon(n)}<span class="pg-icon-tile__name">${esc(n)}</span></button>`;
          })
          .join("") || `<div class="pg-muted">Нічого не знайдено</div>`,
        code: (s) => `${H.icon("system-close--light", Number(s.size))}\n<!-- або в JS: DS.icon('system-close--light', { size: ${s.size} }) -->`,
      });

      const handoff = ui.table(
        ["Ключ у коді", "Бібліотека MGC", "Стиль", "Де використовується"],
        Object.keys(meta).sort().map((k) => [`<code>${k}</code>`, `<code>${esc(meta[k].set)}</code>`, esc(meta[k].style), esc(({
          "arrow-right--cute-light": "Button, Icon Button, Pagination",
          "arrow-left--cute-light": "Pagination",
          "arrow-up-small--cute-light": "Pagination stepper",
          "arrow-down-small--cute-light": "Pagination stepper",
          "arrow-selector-vertical--cute-light": "Selector",
          "system-check--light": "Checkbox, Progress",
          "system-minimize--light": "Checkbox indeterminate",
          "system-checks--cute-light": "Toast success",
          "system-checks--light": "Checkbox Cards (title)",
          "system-close--light": "Toast, Text field clear",
          "system-eye-close--light": "Text field password",
          "system-information--filled": "Label tip у полях, Progress",
          "system-question--filled": "Warning / Danger у полях",
          "system-loading-4--light": "Progress, Button loading",
          "system-fault--cute-light": "Toast upload",
          "logo-layers--cute-light": "Text field, Tabs",
          "nature-tree-4--cute-light": "Selector",
          "transport-brake--cute-light": "Callout",
          "user-user-2--filled": "Avatar",
          "user-user-2--cute-filled": "Indicators",
          "design-magic-2--light": "Badge (icon left)",
          "design-magic-3--sharp": "Badge (icon right)",
          "file-download-2--cute-regular": "Toast upload",
          "emoji-puzzled--cute-light": "Toast warning",
          "other-bomb--cute-light": "Toast danger",
        })[k] || "Playground")])
      );

      return [
        ui.section("Бібліотека", "Клік копіює виклик <code>DS.icon()</code>. Наведення показує назву набору MGC і стиль.", pg.html),
        ui.section("Handoff", "Назви для хендофу — точно як у бібліотеці: <code>category / icon_name</code> + стиль + розмір. Розробникам: <code>@mingcute/react</code>, імпорт у PascalCase з суфіксом стилю.", handoff),
        ui.section("Нотатки", "", ui.notes([
          { tone: "figma", title: "Змішані стилі", text: "Компоненти Figma поєднують сім стилів: cute light, light, filled, cute filled, cute regular, regular і sharp. Скіл радить regular як домашній стиль, але тут збережено стилі з файлу, а нові іконки playground взято в cute light — домінантному стилі системи." },
          { tone: "info", title: "Товщина штриха", text: "Деякі компоненти Figma стоншують штрих до 1px (icon-кнопка sm, іконка в полі). Для цього є атрибут <code>data-stroke=\"1\"</code>." },
        ])),
        { html: "", mount: pg.mount },
      ];
    },
  });
})();
