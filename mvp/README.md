# prod.rec · MVP

Нові екрани з фінального UI у Figma (`ZEFAWPi4a1vPyRZ0Mmh5Hi`, «[ProdREC] Sketches»).
Ванільний HTML/CSS/JS поверх `../design-system/` і `../prototypes/calendar-icon/`.

| Екран / компонент | Figma | Файли | Стан |
|---|---|---|---|
| Calendar page · Empty state · 1440 | `93:1203` | `index.html`, `app.css`, `app.js` | чернетка, лише десктоп |
| Calendar item · 12 варіантів | `113:8701` | `calendar-item.js`, `components.html` | готово |
| Меню календаря «⋯» | `199:11366` | у `index.html` | пункти без дії, крім Weekends |
| Дропдаун валюти | `269:35841` | у `index.html` | готово, без конвертації |
| Extra actions + підказки | `18:5882`, `97:1985` | у `index.html` | пункти без дії |

Відкрити: `index.html` у браузері. `?today=2026-09-24` фіксує «сьогодні» для звірки з Figma.
`components.html` показує всі варіанти картки дня; колонка Hover закріплена `data-force="hover"`.

Рух — сніпети transitions.dev (text swap, number pop-in, menu dropdown, icon swap, tooltip,
avatar group hover) на токенах із `design-system/tokens.css`. Змінні, яких у токенах немає,
лежать на початку `app.css` — без них браузер відкидає анімацію цілком.

Що свідомо відкладено й чому — `product/decisions.md` → **D-009**, **D-010**.

`assets/` — SVG і PNG, завантажені з Figma. Пляма Extra actions переведена в PNG (у SVG 498 КБ),
аватарки зменшено до 60px, логотип береться з `design-system/assets/images/prodrec-logo.png`.
