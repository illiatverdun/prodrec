/* prod.rec MVP · data layer. One state object, saved to localStorage on every commit.
   Everything shown on screen (month totals, billing, project summaries) is derived here
   and never stored, so nothing can drift out of sync.
   ?fresh clears saved data, ?demo loads the five projects from Figma 145:5130 for QA. */
(function () {
  "use strict";

  const KEY = "prodrec.mvp.v1";
  const RATES_KEY = "prodrec.mvp.rates";
  const RATES_TTL = 6 * 60 * 60 * 1000;

  // Figma 269:35841 lists the first five. UAH comes from timetracker.jsx (CURRENCY_SYMBOLS).
  const CURRENCIES = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "PLN", symbol: "zł", name: "Polish Zloty" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia" },
  ];
  // Avatar presets · Figma 292:99853, in the order they appear.
  const AVATARS = ["pink", "blue", "teal", "orange", "yellow", "black", "violet"];
  const DEFAULT_HOURS = 8; // Figma 292:113896: "All the time that's 8 hour."

  const params = new URLSearchParams(location.search);
  const pad = (n) => String(n).padStart(2, "0");
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const prefixOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const uid = () => Math.random().toString(36).slice(2, 10);

  function blank() {
    return {
      projects: [],        // { id, name, rate, currency, avatar, archived, createdAt }
      entries: {},         // { "YYYY-MM-DD": [{ projectId, hours }] }
      deductions: [],      // { id, name, value, type: "percent" | "fixed" }
      monthly: {},         // { "YYYY-MM": { commission, commissionCurrency, payments, paymentsCurrency, extraHours: { projectId: hours } } }
      deductionsCurrency: "USD",
      currency: "USD",     // billing currency
      taxesDone: false,    // onboarding step 2
      onboardingDone: false,
      weekends: false,
      updatedAt: 0,        // last data change, for "Updated … ago" in the mobile summary (277:42039)
    };
  }

  function demo() {
    const s = blank();
    const names = [["prod.rec", "pink", 22], ["lik.app", "blue", 22], ["Stellar Solutions", "orange", 22], ["Apex", "teal", 22], ["Quantum Dynamics", "violet", 22]];
    s.projects = names.map(([name, avatar, rate]) => ({ id: uid(), name, rate, currency: "USD", avatar, archived: false, createdAt: "2026-02-12" }));
    const now = new Date();
    const plan = [[0, 12], [1, 4], [2, 3], [3, 1], [4, 1]];
    plan.forEach(([pi, days]) => {
      for (let d = 1, left = days; left > 0 && d <= 28; d += 2) {
        const date = new Date(now.getFullYear(), now.getMonth(), d + pi);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const k = keyOf(date);
        (s.entries[k] = s.entries[k] || []).push({ projectId: s.projects[pi].id, hours: pi === 4 ? 4 : 8 });
        left--;
      }
    });
    s.deductions = [{ id: uid(), name: "Taxes", value: 12, type: "percent" }, { id: uid(), name: "Fee", value: 200, type: "fixed" }];
    s.taxesDone = true;
    s.onboardingDone = true;
    s.updatedAt = Date.now() - 2 * 60 * 60 * 1000; // "Updated 2 h ago", as in Figma 288:39238
    return s;
  }

  function load() {
    if (params.has("fresh")) { try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }
    if (params.has("demo")) return demo();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && Array.isArray(raw.projects)) return Object.assign(blank(), raw);
    } catch (e) { /* corrupt or blocked storage: start clean */ }
    return blank();
  }

  const state = load();
  const listeners = new Set();

  function save() {
    if (params.has("demo")) return; // demo data never overwrites real data
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  // Changes to the numbers themselves; view settings (weekends, currency) don't count as an update.
  const DATA_REASONS = new Set(["projects", "entries", "monthly", "deductions"]);

  /* Every mutation goes through commit(): save, then let the page re-render what changed. */
  function commit(reason, detail) {
    if (DATA_REASONS.has(reason)) state.updatedAt = Date.now();
    save();
    listeners.forEach((fn) => fn(reason, detail));
  }
  const subscribe = (fn) => listeners.add(fn);

  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function restore(snap) {
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, snap);
    commit("restore");
  }

  /* ───── Currency ───── */

  const currency = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
  let rates = null; // units per 1 USD, lower-case codes

  try {
    const cached = JSON.parse(localStorage.getItem(RATES_KEY));
    if (cached && cached.rates) rates = cached.rates;
    if (!cached || Date.now() - cached.at > RATES_TTL) fetchRates();
  } catch (e) { fetchRates(); }

  function fetchRates() {
    fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json")
      .then((r) => r.json())
      .then((data) => {
        if (!data || !data.usd) return;
        rates = data.usd;
        try { localStorage.setItem(RATES_KEY, JSON.stringify({ at: Date.now(), rates })); } catch (e) { /* ignore */ }
        commit("rates");
      })
      .catch(() => { /* offline: amounts in other currencies stay unconverted, see ratesMissing */ });
  }

  function convert(amount, from, to) {
    if (!amount || from === to) return amount;
    const a = rates && rates[from.toLowerCase()];
    const b = rates && rates[to.toLowerCase()];
    return a && b ? (amount / a) * b : amount;
  }
  const ratesMissing = (from, to) => from !== to && !(rates && rates[from.toLowerCase()] && rates[to.toLowerCase()]);

  /* ───── Formatting · Figma 100:2521: $ 3’696, $ 3’052,48, -$443,52 ───── */

  function number(n) {
    const abs = Math.abs(n);
    const whole = Math.floor(abs + 1e-9);
    const cents = Math.round((abs - whole) * 100);
    const grouped = String(cents === 100 ? whole + 1 : whole).replace(/\B(?=(\d{3})+(?!\d))/g, "’");
    return cents && cents !== 100 ? `${grouped},${pad(cents)}` : grouped;
  }
  const hours = (h) => `${Math.round(h * 100) / 100}`;

  /* ───── Queries ───── */

  const project = (id) => state.projects.find((p) => p.id === id);
  const active = () => state.projects.filter((p) => !p.archived);
  const archived = () => state.projects.filter((p) => p.archived);

  function dayEntries(key) { return state.entries[key] || []; }

  function month(view) {
    const prefix = prefixOf(view);
    const per = new Map();
    let totalHours = 0;
    let days = 0;
    Object.entries(state.entries).forEach(([key, list]) => {
      if (!key.startsWith(prefix) || !list.length) return;
      days++;
      list.forEach((e) => {
        const p = project(e.projectId);
        if (!p) return;
        const row = per.get(p.id) || { project: p, hours: 0, days: 0, amount: 0 };
        row.hours += e.hours;
        row.days += 1;
        row.amount += convert(e.hours * p.rate, p.currency, state.currency);
        per.set(p.id, row);
        totalHours += e.hours;
      });
    });
    // Extra hours (Figma 321:54172): added to the project's hours, paid at its rate, no extra days.
    const md = state.monthly[prefix] || {};
    Object.entries(md.extraHours || {}).forEach(([id, h]) => {
      const p = project(id);
      if (!p || !(h > 0)) return;
      const row = per.get(p.id) || { project: p, hours: 0, days: 0, amount: 0 };
      row.hours += h;
      row.extraHours = (row.extraHours || 0) + h;
      row.amount += convert(h * p.rate, p.currency, state.currency);
      per.set(p.id, row);
      totalHours += h;
    });
    const rows = [...per.values()].sort((a, b) => b.amount - a.amount || b.hours - a.hours);
    // Extra payments (321:54200): part of the month's total amount, so percentage deductions apply to them too.
    const payments = (md.payments || []).map((pm) => ({ payment: pm, amount: convert(pm.value, md.paymentsCurrency || state.currency, state.currency) }));
    const gross = rows.reduce((s, r) => s + r.amount, 0) + payments.reduce((s, pm) => s + pm.amount, 0);
    const deduct = (d, cur, kind) => {
      const amount = d.type === "percent" ? (gross * d.value) / 100 : convert(d.value, cur, state.currency);
      const pct = d.type === "percent" ? d.value : gross ? (amount / gross) * 100 : 0;
      return { deduction: d, amount, pct, kind };
    };
    // Deductions apply every month; commission (321:54144) only to this one.
    const deductions = [
      ...state.deductions.map((d) => deduct(d, state.deductionsCurrency, "global")),
      ...(md.commission || []).map((d) => deduct(d, md.commissionCurrency || state.currency, "month")),
    ];
    const net = gross - deductions.reduce((s, d) => s + d.amount, 0);
    return { rows, per, payments, gross, hours: totalHours, days, deductions, net };
  }

  function projectMonth(p, view) {
    return month(view).per.get(p.id) || { hours: 0, days: 0, amount: 0 };
  }

  function projectAllTime(p) {
    let h = 0;
    Object.values(state.entries).forEach((list) => list.forEach((e) => { if (e.projectId === p.id) h += e.hours; }));
    Object.values(state.monthly).forEach((m) => { h += (m.extraHours && m.extraHours[p.id]) || 0; });
    return { hours: h, amount: h * p.rate };
  }

  /* ───── Mutations ───── */

  function addProject(data) {
    const p = Object.assign({ id: uid(), archived: false, createdAt: keyOf(new Date()) }, data);
    state.projects.push(p);
    commit("projects", { added: p.id });
    return p;
  }
  function updateProject(id, data) {
    Object.assign(project(id), data);
    commit("projects", { updated: id });
  }
  function archiveProject(id, value = true) {
    project(id).archived = value;
    commit("projects", { archived: id });
  }
  function deleteProject(id) {
    state.projects = state.projects.filter((p) => p.id !== id);
    Object.values(state.monthly).forEach((m) => { if (m.extraHours) delete m.extraHours[id]; });
    Object.keys(state.entries).forEach((k) => {
      state.entries[k] = state.entries[k].filter((e) => e.projectId !== id);
      if (!state.entries[k].length) delete state.entries[k];
    });
    commit("projects", { deleted: id });
  }

  function setHours(keys, projectId, h) {
    keys.forEach((k) => {
      const list = (state.entries[k] = state.entries[k] || []);
      const e = list.find((x) => x.projectId === projectId);
      if (e) e.hours = h; else list.push({ projectId, hours: h });
    });
    if (keys.length) state.onboardingDone = true;
    commit("entries", { keys });
  }
  function removeFromDays(keys, projectId) {
    keys.forEach((k) => {
      if (!state.entries[k]) return;
      state.entries[k] = state.entries[k].filter((e) => e.projectId !== projectId);
      if (!state.entries[k].length) delete state.entries[k];
    });
    commit("entries", { keys });
  }
  function clearMonth(view) {
    const prefix = prefixOf(view);
    const keys = Object.keys(state.entries).filter((k) => k.startsWith(prefix));
    keys.forEach((k) => delete state.entries[k]);
    const hadExtras = !!state.monthly[prefix];
    delete state.monthly[prefix]; // extra hours, payments and commission of that month go too
    commit("entries", { keys });
    return keys.length + (hadExtras ? 1 : 0);
  }

  const monthData = (view) => state.monthly[prefixOf(view)] || {};
  function setMonthly(view, patch) {
    const k = prefixOf(view);
    state.monthly[k] = Object.assign({}, state.monthly[k], patch);
    commit("monthly");
  }

  function setDeductions(list, cur) {
    state.deductions = list;
    state.deductionsCurrency = cur;
    state.taxesDone = true;
    commit("deductions");
  }
  function set(key, value) {
    state[key] = value;
    commit(key);
  }

  /* Onboarding · prototype 292:110846: project → taxes → first working day. */
  function onboardingStep() {
    if (state.onboardingDone) return 0;
    if (!state.projects.length) return 1;
    if (!state.taxesDone) return 2;
    return 3;
  }

  window.PR = Object.assign(window.PR || {}, {
    store: {
      state, subscribe, commit, snapshot, restore,
      CURRENCIES, AVATARS, DEFAULT_HOURS, currency, convert, ratesMissing,
      fmt: { number, hours }, keyOf, prefixOf, uid,
      project, active, archived, dayEntries, month, projectMonth, projectAllTime, onboardingStep,
      addProject, updateProject, archiveProject, deleteProject, setHours, removeFromDays, clearMonth, setDeductions, set,
      monthData, setMonthly,
    },
  });
})();
