# prodrec

Day-rate tracker for freelance contractors. Track working days per project, calculate net profit after tax and fees, export invoices.

**Live:** https://illiatverdun.github.io/prodrec/

## Structure

```
prodrec/
  timetracker.jsx   ← source (edit this)
  build.js          ← compiles JSX → index.html
  package.json      ← dependencies
  index.html        ← compiled output (deploy this)

  CLAUDE.md         ← project context: main persona, job, scenario
  idea.md           ← the idea, the formula, what ships today
  research/         ← market research + screenshots
  people/           ← personas
  product/          ← jobs, screens, scenarios, decisions
```

## Продукт

Дизайн-документи проєкту. Усі твердження в них мають джерело; де даних немає — стоїть `[?]`
і формулювання гіпотези. Вигаданих цитат і чисел немає навмисно.

**`people/personas.md` — хто наш користувач.**
Чотири персони, розділені за поведінкою, а не за демографією. Одна позначена головною:
*та, що веде дні в таблиці* — соло з 1–3 клієнтами, продає дні, облік веде в Google Sheets.
Кожен блок посилається на конкретне місце в ресерчі. У кінці — таблиця self-critique, де кожне
твердження класифіковане як **confirmed / hypothesis / invented**, і список того, чого ми про
людей не знаємо. Поле «Цитата» порожнє в усіх чотирьох: з живими користувачами ще ніхто
не говорив, і вигадувати репліки ми не стали.

**`product/structure.md` — що вони роблять і з чого це складається.**
Чотири розділи:

- **Задачі** — одна головна і чотири суміжні у форматі «Коли… я хочу… щоб…», без назв функцій.
  Задачі без опори винесені в окремі гіпотези.
- **Матриця** — задачі × персони × функції: наскільки задача важлива кожній персоні (1–3),
  яка функція prodrec її закриває і чи закривають її конкуренти. Звідси читається **ядро
  продукту** — три задачі, важливі головній персоні й не закриті ринком.
- **Екрани** — карта, виведена з об'єктів застосунку. Біля кожного екрана задача, яку він
  закриває; де задачі немає — позначка **СИРОТА**. Таких сім.
- **Сценарії** — чотири схеми Mermaid: обидва фінали, і успішний, і той, де людина застрягає.

**`product/decisions.md` — журнал рішень.** Кожен запис: рішення, на чому стоїть, що відкинули
і **що змусить його переглянути**. Плюс відкриті питання з зазначенням, хто їх вирішує.

**`product/product.html`** — персони, задачі, екрани і сценарії однією сторінкою.
Схеми малює mermaid.js із CDN, тож ця сторінка потребує інтернету;
`research/research.html` працює й без нього.

## Local development

```bash
# 1. Clone
git clone https://github.com/illiatverdun/prodrec
cd prodrec

# 2. Install dependencies (one time only)
npm install

# 3. Edit source
# open timetracker.jsx, make changes

# 4. Build
node build.js

# 5. Preview — open index.html in browser
open index.html        # macOS
start index.html       # Windows

# 6. Deploy — commit and push
git add index.html
git commit -m "your message"
git push
# GitHub Pages auto-deploys in ~1 min
```

## Tech stack

- React 18 (inlined UMD, no bundler needed)
- JSX compiled by Babel at build time
- localStorage for data persistence (free tier)
- Supabase + Stripe planned for Pro tier
