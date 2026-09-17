# prod.rec · MVP

Нові екрани з фінального UI у Figma (`ZEFAWPi4a1vPyRZ0Mmh5Hi`, «[ProdREC] Sketches»).
Ванільний HTML/CSS/JS поверх `../design-system/` (токени, компоненти, `components.js`) і `../prototypes/calendar-icon/`.

| Екран / компонент | Figma | Де | Стан |
|---|---|---|---|
| Calendar page · порожня й заповнена | `93:1203`, `100:2437` | `index.html` | десктоп |
| Планшет: одна колонка 582, правий контейнер під календарем | `277:40352`, `288:80105` | `app.css` (≤1023px) | готово |
| Мобільний: підсумок, вкладки Calendar / Billing, Nav bar | `277:42013`, `288:39208`, `288:40202` | `app.css` (≤645px), `app.js` | готово |
| Мобільний дровер дня: проєкти, лінійка годин | `288:44918` | `app.js` | готово |
| Мобільні модалки як дровери, архів, вибір валюти | `288:46442`, `324:56601`, `288:39424` | `app.css`, `ui.js` | готово; валюта без макета `[?]` |
| Онбординг: проєкт → податки → перший день | прототип `292:110846` | `app.js` | готово |
| Calendar item · 12 варіантів | `113:8701` | `calendar-item.js`, `components.html` | готово |
| Поповер годин на день | `292:113465` | `app.js` | готово |
| Projects: згорнута, ховер, відкрита, архів, 1 проєкт | `145:5130`, item `35:1069` | `app.js` | готово |
| Billing заповнений: рядки проєктів, відрахування, копіювання | `100:2521` | `app.js` | готово |
| New project / Edit project | `292:99846`, `292:106995` | `modals.js` | готово |
| Deductions (крок 2 онбордингу, олівець у Billing) | `292:107589` | `modals.js` | готово |
| Підтвердження видалення з історією | `292:107376` | `modals.js` | готово |
| Тост з Reset | `292:107912` | `ui.js` | готово |
| Меню «⋯» | `199:11366` | `index.html` | Clear і Weekends працюють; Copy — ні |
| Календар на 7 днів | `292:91118` | `app.js` | готово |
| Дропдаун валюти | `269:35841` | `ui.js` | готово, курси з CDN |
| Extra actions + підказки | `18:5882`, `97:1985` | `index.html` | готово |
| Commission / Extra hours / Extra payments | `321:54140` | `modals.js` | готово, лише на відкритий місяць |
| Вхід через Google, синхронізація між пристроями | — | `sync.js` (Firebase Auth + Firestore) | готово, D-015 |
| Меню акаунта: аватарка Google, Leave feedback, Log out | `274:32393` | `sync.js`, `index.html` | готово; Account і Export JSON прибрані, D-016 |
| Leave feedback: модалка з текстовим полем | — | `sync.js` | готово, без входу теж, D-016 |
| Футер: «here» відкриває Leave feedback | `263:9949` | `index.html` | готово; Terms і Privacy прибрані |

## Файли

| Файл | Що робить |
|---|---|
| `store.js` | Дані, збереження в браузері, усі розрахунки (місяць, Billing, валюти) |
| `ui.js` | Переходи transitions.dev, модалка, тост, вибір валюти, аватарки |
| `modals.js` | Модалки: проєкт, відрахування, підтвердження, Commission, Extra hours, Extra payments |
| `app.js` | Сторінка: календар, поповер годин, Projects, Billing, Onboarding, меню |
| `calendar-item.js` | Розмітка картки дня, спільна з `components.html` |
| `sync.js` | Вхід через Google, синхронізація з акаунтом, меню акаунта, модалка Leave feedback (Firebase) |

## Як відкрити

`index.html` у браузері. Дані живуть у `localStorage` цього браузера.

- `?today=2026-09-24` — фіксує «сьогодні» для звірки з Figma
- `?fresh` — стирає збережене, щоб пройти онбординг з нуля
- `?demo` — п'ять проєктів із Figma для перевірки станів; нічого не зберігає

Рішення, припущення і все, що тут `[?]` — `product/decisions.md` → **D-009** … **D-015**.

`assets/` — SVG і PNG, завантажені з Figma. Пресети аватарок — `assets/avatars/`, експорт вузлів `292:107016…107094` у 3×.

## Публікація

Живе посилання: **https://illiatverdun.github.io/prodrec/mvp/** (GitHub Pages, оновлюється за 1–2 хв після пушу).
`https://illiatverdun.github.io/prodrec/` — старий застосунок із `timetracker.jsx`.

- **Після кожної зміни CSS/JS підняти `?v=` в `index.html`** (усі локальні посилання мають однакове значення).
  Pages кешує файли 10 хв: без цього браузер бере нову розмітку зі старим `app.css`.
- Телефон показує стару версію — дописати до адреси будь-який `?v=…`.

## Firebase (вхід, дані, відгуки)

Проєкт `prodrec-c9d54`, налаштування в `sync.js` (вони публічні за задумом, дані захищають правила).

- **Вхід** — Google Identity Services (токен-клієнт) → `signInWithCredential`. Попап Firebase на iOS Safari
  закривався без результату: Safari блокує сторонні cookies для `firebaseapp.com`.
  OAuth-клієнт `841980735190-3bfh7iqf…` у Google Cloud → Credentials має в **Authorized JavaScript origins**
  `https://illiatverdun.github.io` і `http://localhost:8765` (для тестів). Нова адреса сайту — додати туди ж.
- **Дані** — документ `users/{uid}`, весь стан одним JSON. Без входу все в `localStorage`, як раніше.
- **Відгуки** — колекція `feedback`: Firebase Console → Firestore Database → Data → `feedback`.
- **Правила Firestore** (Console → Firestore → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /feedback/{id} {
      allow create: if request.resource.data.text is string
        && request.resource.data.text.size() > 0
        && request.resource.data.text.size() <= 4000
        && (request.resource.data.uid == "" || (request.auth != null && request.resource.data.uid == request.auth.uid));
    }
  }
}
```

## Перевірка в браузері

`python -m http.server 8765 --bind 127.0.0.1` із кореня репозиторію, відкривати `http://localhost:8765/mvp/`
(саме `localhost`, не `127.0.0.1` — лише він дозволений для входу Google).
