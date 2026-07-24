import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const STORAGE_KEY = 'timetracker-v1';

const DEFAULT_PROJECTS = [
  { id: 'inview', name: 'Inview', color: '#5EEAD4', rate: 0, hoursPerDay: 8 },
  { id: 'emg-sa', name: 'EMG.SA', color: '#FCA5A5', rate: 0, hoursPerDay: 8 },
];

const COLOR_PALETTE = [
  '#5EEAD4', '#FCA5A5', '#FCD34D', '#A78BFA',
  '#86EFAC', '#93C5FD', '#F9A8D4', '#FDBA74',
];

const DEFAULT_TAX = 6;
const DEFAULT_FEE = 27;

const CURRENCY_SYMBOLS = { EUR: '€', PLN: 'zł', UAH: '₴' };
// Fallback rates used until live data loads (approximate, will be replaced on first fetch)
const FALLBACK_RATES = { EUR: 1, PLN: 4.3, UAH: 47.5 };
const RATES_CACHE_KEY = 'timetracker-rates-v1';
const RATES_TTL_MS = 6 * 60 * 60 * 1000; // 6h

const WEEKDAYS_SHORT = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'];
const WEEKDAY_FROM_DOW = ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTHS_UK = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getMonthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let firstDOW = firstDay.getDay() - 1;
  if (firstDOW < 0) firstDOW = 6;

  const dates = [];
  for (let i = firstDOW; i > 0; i--) {
    dates.push({ date: new Date(year, month, 1 - i), currentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push({ date: new Date(year, month, d), currentMonth: true });
  }
  let nextDay = 1;
  while (dates.length < 42) {
    dates.push({ date: new Date(year, month + 1, nextDay++), currentMonth: false });
  }
  return dates;
}

function getRangeKeys(keyA, keyB) {
  const a = parseDateKey(keyA);
  const b = parseDateKey(keyB);
  const [start, end] = a <= b ? [a, b] : [b, a];
  const keys = [];
  const cur = new Date(start);
  while (cur <= end) {
    keys.push(formatDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

function filterHiddenWeekends(keys, weekendsByMonth) {
  return keys.filter(key => {
    const [y, m, d] = key.split('-').map(Number);
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    if (weekendsByMonth[monthKey] !== true) return true;
    const dow = new Date(y, m - 1, d).getDay();
    return dow !== 0 && dow !== 6;
  });
}

// Find the most recent explicit value at or before monthKey (rolling default).
// Falls back to defaultValue when no earlier explicit entry exists.
function effectiveValue(byMonth, monthKey, defaultValue) {
  const sortedKeys = Object.keys(byMonth).sort();
  let result = defaultValue;
  for (const k of sortedKeys) {
    if (k <= monthKey) result = byMonth[k];
    else break;
  }
  return result;
}

function formatMoney(eur, currency, rates) {
  const cur = currency || 'EUR';
  const symbol = CURRENCY_SYMBOLS[cur] || '€';
  if (!eur || isNaN(eur)) return '0 ' + symbol;
  const rate = (rates && rates[cur]) || 1;
  const value = eur * rate;
  const fractionDigits = cur === 'UAH' ? 0 : 2;
  return new Intl.NumberFormat('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value) + ' ' + symbol;
}

function daysWord(n) {
  if (n === 1) return 'день';
  if (n >= 2 && n <= 4) return 'дні';
  return 'днів';
}

export default function TimeTracker() {
  const [view, setView] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [days, setDays] = useState({});
  const [weekendsByMonth, setWeekendsByMonth] = useState({});
  const [taxByMonth, setTaxByMonth] = useState({});
  const [commissionByMonth, setCommissionByMonth] = useState({});
  const [taxInput, setTaxInput] = useState('');
  const [commissionInput, setCommissionInput] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const [popover, setPopover] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragEnd, setDragEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const popoverRef = useRef(null);

  const [hoveredProject, setHoveredProject] = useState(null);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Fallback — if storage hangs, show UI with defaults after 2s
    const fallback = setTimeout(() => { if (!cancelled) setLoading(false); }, 2000);
    async function readStorage() {
      try {
        if (typeof window !== 'undefined' && window.storage) {
          const r = await window.storage.get(STORAGE_KEY);
          return r?.value || null;
        }
      } catch (e) {}
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        return null;
      }
    }
    async function load() {
      try {
        const raw = await readStorage();
        if (!cancelled && raw) {
          const data = JSON.parse(raw);
          if (Array.isArray(data.projects) && data.projects.length > 0) {
            setProjects(data.projects.map(p => ({
              rate: 0, hoursPerDay: 8, ...p,
            })));
          }
          if (data.days && typeof data.days === 'object') {
            setDays(data.days);
          }
          if (data.weekendsByMonth && typeof data.weekendsByMonth === 'object') {
            setWeekendsByMonth(data.weekendsByMonth);
          }
          if (data.taxByMonth && typeof data.taxByMonth === 'object') {
            setTaxByMonth(data.taxByMonth);
          }
          if (data.commissionByMonth && typeof data.commissionByMonth === 'object') {
            setCommissionByMonth(data.commissionByMonth);
          }
          if (typeof data.currency === 'string' && CURRENCY_SYMBOLS[data.currency]) {
            setCurrency(data.currency);
          }
        }
      } catch (e) { console.warn('Storage load failed:', e); }
      if (!cancelled) {
        clearTimeout(fallback);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (loading) return;
    const json = JSON.stringify({ projects, days, weekendsByMonth, taxByMonth, commissionByMonth, currency });
    (async () => {
      try {
        if (typeof window !== 'undefined' && window.storage) {
          await window.storage.set(STORAGE_KEY, json);
          return;
        }
      } catch (e) {}
      try {
        localStorage.setItem(STORAGE_KEY, json);
      } catch (e) { console.error('Save failed:', e); }
    })();
  }, [projects, days, weekendsByMonth, taxByMonth, commissionByMonth, currency, loading]);

  // Fetch live currency rates (cached for 6h in localStorage)
  useEffect(() => {
    let cancelled = false;
    async function loadRates() {
      // Try cache first
      try {
        const cachedRaw = localStorage.getItem(RATES_CACHE_KEY);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.rates && cached.fetchedAt && (Date.now() - cached.fetchedAt) < RATES_TTL_MS) {
            if (!cancelled) {
              setRates(cached.rates);
              setRatesUpdatedAt(cached.fetchedAt);
            }
            return;
          }
        }
      } catch (e) {}
      // Fetch fresh — CDN-served API (jsdelivr), no CORS issues
      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json');
        if (!res.ok) throw new Error('rates http ' + res.status);
        const data = await res.json();
        if (data && data.eur) {
          const fresh = {
            EUR: 1,
            PLN: data.eur.pln || FALLBACK_RATES.PLN,
            UAH: data.eur.uah || FALLBACK_RATES.UAH,
          };
          const now = Date.now();
          if (!cancelled) {
            setRates(fresh);
            setRatesUpdatedAt(now);
          }
          try {
            localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates: fresh, fetchedAt: now }));
          } catch (e) {}
        }
      } catch (e) {
        console.info('Live rates unavailable, using cache or fallback');
        try {
          const cachedRaw = localStorage.getItem(RATES_CACHE_KEY);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw);
            if (cached.rates && !cancelled) {
              setRates(cached.rates);
              setRatesUpdatedAt(cached.fetchedAt || null);
            }
          }
        } catch (err) {}
      }
    }
    loadRates();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    function up() {
      let keys = (dragStart && dragEnd) ? getRangeKeys(dragStart, dragEnd) : [];
      keys = filterHiddenWeekends(keys, weekendsByMonth);
      if (keys.length > 0) {
        // anchor on last visible cell from drag; if dragEnd itself got filtered, use last remaining key
        const anchor = keys.includes(dragEnd) ? dragEnd : keys[keys.length - 1];
        setPopover({ anchor, keys });
      }
      setIsDragging(false);
    }
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, [isDragging, dragStart, dragEnd, weekendsByMonth]);

  useEffect(() => {
    if (!popover) return;
    function handler(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        const cellEl = e.target.closest('[data-day-cell]');
        if (!cellEl) {
          setPopover(null);
          setDragStart(null);
          setDragEnd(null);
        }
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popover]);

  function startDrag(key) {
    setPopover(null);
    setDragStart(key);
    setDragEnd(key);
    setIsDragging(true);
  }

  function dragOver(key) {
    if (isDragging) setDragEnd(key);
  }

  function assignProjectToKeys(keys, projectId) {
    setDays(prev => {
      const next = { ...prev };
      for (const k of keys) {
        if (projectId === null) delete next[k];
        else next[k] = projectId;
      }
      return next;
    });
    setPopover(null);
    setDragStart(null);
    setDragEnd(null);
  }

  function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const usedColors = projects.map(p => p.color);
    const availableColor = COLOR_PALETTE.find(c => !usedColors.includes(c)) || COLOR_PALETTE[projects.length % COLOR_PALETTE.length];
    const id = `p-${Date.now()}`;
    setProjects(prev => [...prev, { id, name, color: availableColor, rate: 0, hoursPerDay: 8 }]);
    setNewProjectName('');
    setShowAddProject(false);
  }

  function removeProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
    setDays(prev => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v !== id) next[k] = v;
      }
      return next;
    });
    setConfirmingDelete(null);
  }

  function updateProject(id, patch) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function commitTax() {
    const k = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const trimmed = taxInput.replace(',', '.').trim();
    const eff = effectiveValue(taxByMonth, k, DEFAULT_TAX);
    // Empty input → revert to inheritance (clear explicit entry)
    if (trimmed === '') {
      setTaxByMonth(prev => {
        if (!(k in prev)) return prev;
        const { [k]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    const n = parseFloat(trimmed);
    if (isNaN(n)) {
      // Invalid — restore display
      setTaxInput(String(eff));
      return;
    }
    const value = Math.max(0, n);
    if (value === eff) {
      // Same as effective — normalize display, no state change
      setTaxInput(String(eff));
      return;
    }
    // Save explicit value (including 0)
    setTaxByMonth(prev => ({ ...prev, [k]: value }));
  }

  function commitCommission() {
    const k = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    const trimmed = commissionInput.replace(',', '.').trim();
    const eff = effectiveValue(commissionByMonth, k, DEFAULT_FEE);
    if (trimmed === '') {
      setCommissionByMonth(prev => {
        if (!(k in prev)) return prev;
        const { [k]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    const n = parseFloat(trimmed);
    if (isNaN(n)) {
      setCommissionInput(String(eff));
      return;
    }
    const value = Math.max(0, n);
    if (value === eff) {
      setCommissionInput(String(eff));
      return;
    }
    setCommissionByMonth(prev => ({ ...prev, [k]: value }));
  }

  // Sync input fields when navigating between months
  useEffect(() => {
    const k = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    setTaxInput(String(effectiveValue(taxByMonth, k, DEFAULT_TAX)));
    setCommissionInput(String(effectiveValue(commissionByMonth, k, DEFAULT_FEE)));
  }, [currentMonth, taxByMonth, commissionByMonth]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const hideWeekends = weekendsByMonth[monthKey] === true;
  const monthEntries = Object.entries(days).filter(([key]) => {
    const [y, m] = key.split('-').map(Number);
    return y === year && m - 1 === month;
  });
  const projectStats = projects.map(p => {
    const count = monthEntries.filter(([_, pid]) => pid === p.id).length;
    const total = count * (p.hoursPerDay || 0) * (p.rate || 0);
    return { ...p, count, total };
  });
  const totalDays = monthEntries.length;
  const grandTotal = projectStats.reduce((sum, p) => sum + p.total, 0);
  const currentTax = effectiveValue(taxByMonth, monthKey, DEFAULT_TAX);
  const currentCommission = effectiveValue(commissionByMonth, monthKey, DEFAULT_FEE);
  const taxAmount = grandTotal * (currentTax / 100);
  const monthlyDeductions = taxAmount + currentCommission;
  const netProfit = grandTotal - taxAmount - currentCommission;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workdays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) workdays++;
  }

  const projectsById = Object.fromEntries(projects.map(p => [p.id, p]));
  const monthLabel = `${MONTHS_UK[month]} ${year}`;

  const rangeSet = (dragStart && dragEnd)
    ? new Set(getRangeKeys(dragStart, dragEnd))
    : (popover && popover.keys.length > 1 ? new Set(popover.keys) : null);

  function goPrev() { setCurrentMonth(new Date(year, month - 1, 1)); }
  function goNext() { setCurrentMonth(new Date(year, month + 1, 1)); }
  function goToday() {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  // Currency-aware formatter, used everywhere computed money is rendered
  const format = (eur) => formatMoney(eur, currency, rates);

  if (loading) return <div style={loadingStyle}>LOADING…</div>;

  return (
    <div style={containerStyle}>
      <style>{globalCSS}</style>

      <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="caption" style={{ marginBottom: '12px' }}>─── TIMETRACKER ───</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
              <h1 style={titleStyle}>{monthLabel}</h1>
              <span className="mono dim-2" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
                {year}.{String(month + 1).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button className="icon-btn" onClick={goPrev} title="Попередній місяць"><ChevronLeft size={16} /></button>
            <button className="btn" onClick={goToday}>Today</button>
            <button className="icon-btn" onClick={goNext} title="Наступний місяць"><ChevronRight size={16} /></button>
            <div style={{ width: '12px' }} />
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button className={`btn-seg ${view === 'calendar' ? 'btn-seg-active' : ''}`} onClick={() => setView('calendar')}>Cal</button>
              <button className={`btn-seg ${view === 'list' ? 'btn-seg-active' : ''}`} onClick={() => setView('list')}>List</button>
            </div>
            <button
              className="btn"
              onClick={() => setWeekendsByMonth(prev => ({ ...prev, [monthKey]: !prev[monthKey] }))}
              title={hideWeekends ? `Показати вихідні (${monthKey})` : `Приховати вихідні (${monthKey})`}
              style={{
                textDecoration: hideWeekends ? 'line-through' : 'none',
                opacity: hideWeekends ? 0.55 : 1,
                marginLeft: '4px',
              }}
            >
              СБ·НД
            </button>
          </div>
        </header>

        <div className="mono" style={statsRowStyle}>
          <span>∑&nbsp;&nbsp;{String(totalDays).padStart(2, '0')}&nbsp;/&nbsp;{workdays}&nbsp;днів</span>
          {projectStats.map(p => (
            <span
              key={p.id}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'default', opacity: hoveredProject && hoveredProject !== p.id ? 0.3 : 1, transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHoveredProject(p.id)}
              onMouseLeave={() => setHoveredProject(null)}
            >
              <span style={{ width: '7px', height: '7px', background: p.color, display: 'inline-block' }} />
              <span>{p.name.toUpperCase()}&nbsp;&nbsp;{String(p.count).padStart(2, '0')}</span>
            </span>
          ))}
          {grandTotal > 0 && (
            <span style={{ marginLeft: 'auto', color: 'rgba(245,245,245,0.9)' }}>
              {format(grandTotal)}
            </span>
          )}
        </div>

        <div style={mainGridStyle}>
          <div style={{ minWidth: 0, userSelect: isDragging ? 'none' : 'auto' }}>
            {view === 'calendar' ? (
              <CalendarView
                grid={getMonthGrid(currentMonth)}
                days={days}
                projects={projects}
                projectsById={projectsById}
                popover={popover}
                rangeSet={rangeSet}
                onCellDown={startDrag}
                onCellEnter={dragOver}
                onAssign={(pid) => popover && assignProjectToKeys(popover.keys, pid)}
                hoveredProject={hoveredProject}
                hideWeekends={hideWeekends}
                popoverRef={popoverRef}
              />
            ) : (
              <ListView
                year={year}
                month={month}
                days={days}
                projects={projects}
                projectsById={projectsById}
                popover={popover}
                onDayClick={(key) => setPopover({ anchor: key, keys: [key] })}
                onAssign={(pid) => popover && assignProjectToKeys(popover.keys, pid)}
                popoverRef={popoverRef}
              />
            )}
          </div>

          <aside>
            <div className="caption" style={{ marginBottom: '14px' }}>PROJECTS</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {projects.map(p => {
                const stat = projectStats.find(s => s.id === p.id);
                const isConfirming = confirmingDelete === p.id;
                const isHovered = hoveredProject === p.id;
                return (
                  <div
                    key={p.id}
                    className="project-row"
                    onMouseEnter={() => setHoveredProject(p.id)}
                    onMouseLeave={() => { setHoveredProject(null); if (isConfirming) setConfirmingDelete(null); }}
                    style={{ background: isHovered ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                  >
                    <span style={{ width: '8px', height: '8px', background: p.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '13px', color: 'rgba(245,245,245,0.92)' }}>{p.name}</span>
                    <span className="mono dim-2" style={{ fontSize: '11px' }}>
                      {String(stat?.count || 0).padStart(2, '0')}
                    </span>
                    {projects.length > 1 && (
                      isConfirming ? (
                        <button className="confirm-btn" onClick={() => removeProject(p.id)}>DELETE?</button>
                      ) : (
                        <button className="icon-btn icon-btn-mini" onClick={() => setConfirmingDelete(p.id)} title="Видалити проєкт">
                          <X size={12} />
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {showAddProject ? (
              <div style={{ marginTop: '14px' }}>
                <input
                  className="input"
                  autoFocus
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addProject();
                    if (e.key === 'Escape') { setShowAddProject(false); setNewProjectName(''); }
                  }}
                  placeholder="Назва проєкту"
                />
                <div className="mono caption" style={{ marginTop: '8px', fontSize: '9px' }}>
                  ENTER додати · ESC скасувати
                </div>
              </div>
            ) : (
              <button className="btn" onClick={() => setShowAddProject(true)} style={{ marginTop: '14px', width: '100%' }}>
                + новий проєкт
              </button>
            )}

            <div style={{ height: '40px' }} />
            <div className="caption" style={{ marginBottom: '14px' }}>BILLING</div>

            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '6px' }}>
              {['EUR', 'PLN', 'UAH'].map(c => (
                <button
                  key={c}
                  className={`btn-seg ${currency === c ? 'btn-seg-active' : ''}`}
                  onClick={() => setCurrency(c)}
                  style={{ flex: 1 }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mono dim-3" style={{ fontSize: '9px', letterSpacing: '0.08em', marginBottom: '18px' }}>
              {currency === 'EUR' ? (
                <span>base currency</span>
              ) : (
                <span>
                  1 € = {rates[currency] ? rates[currency].toFixed(currency === 'UAH' ? 2 : 3) : '—'} {CURRENCY_SYMBOLS[currency]}
                  {ratesUpdatedAt && (
                    <> · {new Date(ratesUpdatedAt).toLocaleDateString('uk-UA')}</>
                  )}
                </span>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="dim-3" style={{ fontSize: '12px' }}>немає проєктів</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {projects.map(p => {
                  const stat = projectStats.find(s => s.id === p.id);
                  return (
                    <BillingBlock
                      key={p.id}
                      project={p}
                      count={stat?.count || 0}
                      total={stat?.total || 0}
                      onUpdate={(patch) => updateProject(p.id, patch)}
                      format={format}
                    />
                  );
                })}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="caption" style={{ fontSize: '10px' }}>GRAND TOTAL</span>
                    <span className="mono" style={{ fontSize: '17px', color: 'rgba(245,245,245,0.98)' }}>
                      {format(grandTotal)}
                    </span>
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="caption" style={{ fontSize: '9px', width: '36px' }}>− tax</span>
                      <div style={{ position: 'relative', width: '54px' }}>
                        <input
                          className="num-input mono"
                          type="text"
                          inputMode="decimal"
                          value={taxInput}
                          onChange={e => setTaxInput(e.target.value)}
                          onBlur={commitTax}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          placeholder="0"
                          style={{ fontSize: '11px', padding: '4px 16px 4px 6px' }}
                        />
                        <span className="mono dim-2" style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', pointerEvents: 'none' }}>%</span>
                      </div>
                      <span className="mono dim-2" style={{ flex: 1, textAlign: 'right', fontSize: '11px' }}>
                        −{format(taxAmount)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="caption" style={{ fontSize: '9px', width: '36px' }}>− fee</span>
                      <div style={{ position: 'relative', width: '54px' }}>
                        <input
                          className="num-input mono"
                          type="text"
                          inputMode="decimal"
                          value={commissionInput}
                          onChange={e => setCommissionInput(e.target.value)}
                          onBlur={commitCommission}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          placeholder="0"
                          style={{ fontSize: '11px', padding: '4px 16px 4px 6px' }}
                        />
                        <span className="mono dim-2" style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', pointerEvents: 'none' }}>€</span>
                      </div>
                      <span className="mono dim-2" style={{ flex: 1, textAlign: 'right', fontSize: '11px' }}>
                        −{format(currentCommission)}
                      </span>
                    </div>

                    {monthlyDeductions > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '-2px' }}>
                        <span className="caption dim-3" style={{ fontSize: '9px', paddingLeft: '44px' }}>total fees</span>
                        <span className="mono dim-3" style={{ fontSize: '10px' }}>
                          {format(monthlyDeductions)}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', marginTop: '2px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <span className="caption" style={{ fontSize: '10px' }}>NET PROFIT</span>
                      <span className="mono" style={{ fontSize: '15px', color: '#5EEAD4' }}>
                        {format(netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ height: '32px' }} />
            <div className="mono caption" style={{ lineHeight: 1.7, fontSize: '10px' }}>
              клік на день → вибрати проєкт<br />
              затисни і протягни → виділити декілька днів<br />
              данні зберігаються локально
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BillingBlock({ project, count, total, onUpdate, format }) {
  const [rateInput, setRateInput] = useState(String(project.rate || ''));

  useEffect(() => { setRateInput(String(project.rate || '')); }, [project.rate]);

  function commitRate() {
    const n = parseFloat(rateInput.replace(',', '.')) || 0;
    onUpdate({ rate: n });
    setRateInput(n ? String(n) : '');
  }

  function setHours(h) {
    const n = Math.max(0, Math.min(24, h));
    onUpdate({ hoursPerDay: n });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ width: '6px', height: '6px', background: project.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: '13px', color: 'rgba(245,245,245,0.92)' }}>{project.name}</span>
        <span className="mono dim-2" style={{ fontSize: '11px', letterSpacing: '0.1em' }}>
          {String(count).padStart(2, '0')}&nbsp;{daysWord(count).slice(0,1).toUpperCase() + daysWord(count).slice(1)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '14px', borderLeft: `1px solid ${project.color}25` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span className="caption" style={{ fontSize: '10px' }}>RATE</span>
          <div style={{ position: 'relative', width: '110px' }}>
            <input
              className="num-input mono"
              type="text"
              inputMode="decimal"
              value={rateInput}
              onChange={e => setRateInput(e.target.value)}
              onBlur={commitRate}
              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
              placeholder="0"
            />
            <span className="mono" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,245,245,0.4)', fontSize: '12px', pointerEvents: 'none' }}>€</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span className="caption" style={{ fontSize: '10px' }}>HOURS/DAY</span>
          <div style={{ display: 'flex', alignItems: 'stretch', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button className="stepper-btn" onClick={() => setHours((project.hoursPerDay || 0) - 1)} aria-label="−"><ChevronLeft size={12} /></button>
            <div className="mono" style={{ minWidth: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
              {project.hoursPerDay || 0}
            </div>
            <button className="stepper-btn" onClick={() => setHours((project.hoursPerDay || 0) + 1)} aria-label="+"><ChevronRight size={12} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: '6px', marginTop: '2px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
          <span className="mono dim-3" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>
            {String(count).padStart(2, '0')} × {project.hoursPerDay || 0} × {project.rate || 0}
          </span>
          <span className="mono" style={{ fontSize: '13px', color: project.color }}>
            {format(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ grid, days, projects, projectsById, popover, rangeSet, onCellDown, onCellEnter, onAssign, hoveredProject, hideWeekends, popoverRef }) {
  const today = formatDate(new Date());
  const weekdays = hideWeekends ? WEEKDAYS_SHORT.slice(0, 5) : WEEKDAYS_SHORT;
  const cells = hideWeekends
    ? grid.filter(cell => {
        const dow = cell.date.getDay();
        return dow !== 0 && dow !== 6;
      })
    : grid;
  const cols = hideWeekends ? 5 : 7;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, marginBottom: '10px' }}>
        {weekdays.map(d => (
          <div key={d} className="mono dim-2" style={{ fontSize: '10px', letterSpacing: '0.18em', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        {cells.map((cell, idx) => {
          const key = formatDate(cell.date);
          const projectId = days[key];
          const project = projectId ? projectsById[projectId] : null;
          const isToday = key === today;
          const isOther = !cell.currentMonth;
          const isAnchor = popover && popover.anchor === key;
          const isInRange = rangeSet && rangeSet.has(key);
          const isFaded = hoveredProject && projectId && projectId !== hoveredProject;
          const isHighlightedByHover = hoveredProject && projectId === hoveredProject;

          return (
            <div
              key={idx}
              data-day-cell={key}
              className={`day-cell ${isOther ? 'day-other' : ''} ${isToday ? 'day-today' : ''} ${isHighlightedByHover ? 'day-highlighted' : ''} ${isInRange ? 'day-in-range' : ''}`}
              onMouseDown={(e) => { if (!isOther) { e.preventDefault(); onCellDown(key); } }}
              onMouseEnter={() => onCellEnter(key)}
              style={{ opacity: isFaded ? 0.25 : 1 }}
            >
              <div
                className="mono"
                style={{
                  fontSize: '14px',
                  color: project ? project.color : (isOther ? 'rgba(245,245,245,0.18)' : 'rgba(245,245,245,0.85)'),
                  letterSpacing: '0.02em',
                  fontWeight: project ? 500 : 400,
                }}
              >
                {String(cell.date.getDate()).padStart(2, '0')}
              </div>
              {project && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: project.color }} />
              )}
              {isAnchor && (
                <Popover
                  popoverRef={popoverRef}
                  projects={projects}
                  currentProjectId={projectId}
                  keyCount={popover.keys.length}
                  onSelect={onAssign}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListView({ year, month, days, projects, projectsById, popover, onDayClick, onAssign, popoverRef }) {
  const byProject = {};
  for (const p of projects) byProject[p.id] = [];

  Object.entries(days).forEach(([key, projectId]) => {
    const [y, m, d] = key.split('-').map(Number);
    if (y === year && m - 1 === month && byProject[projectId]) {
      byProject[projectId].push({ key, date: new Date(y, m - 1, d) });
    }
  });

  Object.values(byProject).forEach(arr => arr.sort((a, b) => a.date - b.date));

  const totalEntries = Object.values(byProject).reduce((sum, arr) => sum + arr.length, 0);

  if (totalEntries === 0) {
    return (
      <div className="dim-3" style={{ fontSize: '13px', padding: '40px 0', lineHeight: 1.5 }}>
        Немає позначених днів у цьому місяці.<br />
        <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,245,245,0.25)' }}>перейди в CAL → затисни і протягни по днях</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      {projects.map(p => {
        const entries = byProject[p.id] || [];
        if (entries.length === 0) return null;
        return (
          <div key={p.id}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ width: '8px', height: '8px', background: p.color, display: 'inline-block' }} />
              <span style={{ fontSize: '15px', color: 'rgba(245,245,245,0.95)' }}>{p.name}</span>
              <span className="mono dim-2" style={{ fontSize: '11px', letterSpacing: '0.12em' }}>
                {String(entries.length).padStart(2, '0')} {daysWord(entries.length)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {entries.map(({ key, date }) => {
                const isAnchor = popover && popover.anchor === key;
                return (
                  <div key={key} data-day-cell={key} onClick={() => onDayClick(key)} className="list-row">
                    <span className="mono" style={{ fontSize: '14px', color: 'rgba(245,245,245,0.92)', width: '36px' }}>
                      {String(date.getDate()).padStart(2, '0')}
                    </span>
                    <span className="mono dim-2" style={{ fontSize: '11px', letterSpacing: '0.18em', width: '36px' }}>
                      {WEEKDAY_FROM_DOW[date.getDay()]}
                    </span>
                    <span className="mono" style={{ flex: 1, fontSize: '12px', color: 'rgba(245,245,245,0.45)', letterSpacing: '0.03em' }}>
                      {String(date.getDate()).padStart(2, '0')}.{String(month + 1).padStart(2, '0')}.{year}
                    </span>
                    <span className="mono dim-3 list-row-hint" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                      змінити
                    </span>
                    {isAnchor && (
                      <Popover
                        popoverRef={popoverRef}
                        projects={projects}
                        currentProjectId={p.id}
                        keyCount={popover.keys.length}
                        onSelect={onAssign}
                        alignRight
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Popover({ popoverRef, projects, currentProjectId, keyCount, onSelect, alignRight }) {
  const isBatch = keyCount > 1;
  return (
    <div
      ref={popoverRef}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        ...(alignRight ? { right: 0 } : { left: '50%', transform: 'translateX(-50%)' }),
        marginTop: '6px',
        background: '#17171a',
        border: '1px solid rgba(255,255,255,0.15)',
        padding: '6px',
        zIndex: 100,
        boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
        minWidth: '180px',
      }}
    >
      <div className="mono caption" style={{ padding: '4px 8px 8px', fontSize: '9px' }}>
        {isBatch ? `ВИБРАТИ ПРОЄКТ · ${keyCount} ${daysWord(keyCount).toUpperCase()}` : 'ВИБРАТИ ПРОЄКТ'}
      </div>
      {projects.map(p => (
        <div
          key={p.id}
          className="popover-item"
          onClick={() => onSelect(p.id)}
          style={{ background: p.id === currentProjectId && !isBatch ? 'rgba(255,255,255,0.05)' : 'transparent' }}
        >
          <span style={{ width: '8px', height: '8px', background: p.color, flexShrink: 0 }} />
          <span style={{ fontSize: '13px', flex: 1 }}>{p.name}</span>
          {p.id === currentProjectId && !isBatch && (
            <span className="mono dim-2" style={{ fontSize: '9px' }}>●</span>
          )}
        </div>
      ))}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
      <div className="popover-item popover-clear" onClick={() => onSelect(null)}>
        <span className="mono" style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          × очистити
        </span>
      </div>
    </div>
  );
}

const containerStyle = {
  background: '#0c0c0d',
  color: 'rgba(245,245,245,0.95)',
  minHeight: '100vh',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
  fontSize: '13px',
  letterSpacing: '0.005em',
  padding: '40px 28px 80px',
  position: 'relative',
};

const loadingStyle = {
  background: '#0c0c0d',
  color: 'rgba(245,245,245,0.4)',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'ui-monospace, "SF Mono", monospace',
  fontSize: '11px',
  letterSpacing: '0.2em',
};

const titleStyle = {
  fontSize: '28px',
  fontWeight: 400,
  letterSpacing: '-0.01em',
  color: 'rgba(245,245,245,0.98)',
  margin: 0,
};

const statsRowStyle = {
  display: 'flex',
  gap: '28px',
  alignItems: 'center',
  marginBottom: '40px',
  fontSize: '11px',
  letterSpacing: '0.12em',
  color: 'rgba(245,245,245,0.7)',
  textTransform: 'uppercase',
  flexWrap: 'wrap',
  paddingBottom: '20px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
};

const mainGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 280px',
  gap: '48px',
};

const globalCSS = `
  .mono { font-family: ui-monospace, "SF Mono", "JetBrains Mono", "Menlo", monospace; font-feature-settings: "tnum" 1, "zero" 1, "cv01" 1; }
  .caption { font-family: ui-monospace, "SF Mono", monospace; font-size: 10px; letter-spacing: 0.2em; color: rgba(245,245,245,0.4); text-transform: uppercase; }
  .dim-2 { color: rgba(245,245,245,0.5); }
  .dim-3 { color: rgba(245,245,245,0.3); }

  .btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(245,245,245,0.7);
    padding: 6px 12px;
    border-radius: 0;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(245,245,245,0.95); }

  .btn-seg {
    background: transparent;
    border: none;
    color: rgba(245,245,245,0.55);
    padding: 6px 14px;
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-seg:hover { color: rgba(245,245,245,0.9); }
  .btn-seg-active { background: rgba(255,255,255,0.06); color: rgba(245,245,245,1); }

  .icon-btn {
    background: transparent; border: none; color: rgba(245,245,245,0.5);
    cursor: pointer; padding: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    transition: color 0.15s;
  }
  .icon-btn:hover { color: rgba(245,245,245,0.95); }
  .icon-btn-mini { padding: 2px; opacity: 0; transition: opacity 0.15s, color 0.15s; }
  .project-row:hover .icon-btn-mini { opacity: 1; }

  .day-cell {
    aspect-ratio: 1;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    border-right: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: background 0.12s, opacity 0.15s, box-shadow 0.12s;
    position: relative;
    user-select: none;
  }
  .day-cell:hover { background: rgba(255,255,255,0.03); }
  .day-other { cursor: default; }
  .day-other:hover { background: transparent; }
  .day-today { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22); }
  .day-highlighted { background: rgba(255,255,255,0.04); }
  .day-in-range { background: rgba(255,255,255,0.08) !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2) !important; }

  .input {
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.2);
    color: rgba(245,245,245,0.95);
    padding: 6px 0;
    font-family: -apple-system, "Inter", system-ui, sans-serif;
    font-size: 13px;
    outline: none;
    width: 100%;
  }
  .input:focus { border-bottom-color: rgba(255,255,255,0.5); }

  .num-input {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(245,245,245,0.95);
    padding: 7px 26px 7px 10px;
    font-size: 13px;
    outline: none;
    width: 100%;
    border-radius: 0;
    box-sizing: border-box;
    letter-spacing: 0.02em;
  }
  .num-input:focus { border-color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.04); }
  .num-input::placeholder { color: rgba(245,245,245,0.25); }

  .stepper-btn {
    background: transparent;
    border: none;
    color: rgba(245,245,245,0.6);
    cursor: pointer;
    padding: 6px 8px;
    display: inline-flex; align-items: center; justify-content: center;
    transition: color 0.1s, background 0.1s;
  }
  .stepper-btn:hover { color: rgba(245,245,245,1); background: rgba(255,255,255,0.04); }

  .project-row {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 4px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.1s;
  }

  .confirm-btn {
    background: transparent;
    border: 1px solid rgba(252,165,165,0.4);
    color: #FCA5A5;
    padding: 2px 6px;
    font-family: ui-monospace, monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    cursor: pointer;
  }
  .confirm-btn:hover { background: rgba(252,165,165,0.08); border-color: rgba(252,165,165,0.7); }

  .popover-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 8px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .popover-item:hover { background: rgba(255,255,255,0.06); }
  .popover-clear { color: rgba(245,245,245,0.55); }
  .popover-clear:hover { color: rgba(245,245,245,0.95); }

  .list-row {
    display: flex; align-items: center; gap: 18px;
    padding: 11px 4px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    cursor: pointer;
    position: relative;
    transition: background 0.1s;
  }
  .list-row:hover { background: rgba(255,255,255,0.02); }
  .list-row-hint { opacity: 0; transition: opacity 0.15s; }
  .list-row:hover .list-row-hint { opacity: 1; }
`;
