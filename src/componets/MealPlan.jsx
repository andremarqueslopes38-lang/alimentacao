import React, { useState } from 'react';
import { DEFAULT_MEALS } from '../data/meals';

/* ── SVG Icons ── */
const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/* ── Units ── */
const UNITS = [
  { value: 'unid.',   label: 'Unidades'        },
  { value: 'c. sopa', label: 'Colher de sopa'  },
  { value: 'c. chá',  label: 'Colher de chá'   },
  { value: 'g',       label: 'Gramas'           },
  { value: 'ml',      label: 'Mililitros'       },
  { value: 'scoop',   label: 'Scoop'            },
  { value: 'copo',    label: 'Copo'             },
  { value: 'fatia',   label: 'Fatia'            },
  { value: 'punhado', label: 'Punhado'          },
  { value: 'porção',  label: 'Porção'           },
];

const BADGE_MAP = { 'badge-green': 'green', 'badge-amber': 'amber', 'badge-slate': 'slate' };

const GOLDEN_RULES = [
  { title: 'Frutos Secos Fixos', text: 'Exatamente 10 unidades de manhã (4 avelãs, 2 cajus, 4 amêndoas). Nunca do pacote.' },
  { title: 'Intermutabilidade',  text: 'Pequeno-Almoço e Lanche 1 são trocáveis sem alterar calorias.' },
  { title: 'Zero Balança',       text: 'Usa colheres de sopa/chá e medidas de mão.' },
];

const FILTERS = [
  { id: 'all',       label: '📋  Todas'  },
  { id: 'morning',   label: '🌅  Manhã'  },
  { id: 'afternoon', label: '🌆  Tarde'  },
];

/* ── Helpers ── */
let _n = 0;
const uid = () => `i${++_n}`;

function normalizeUnit(raw) {
  if (!raw) return 'unid.';
  const r = raw.toLowerCase().replace(/\s+/g, '');
  if (r.includes('sopa'))  return 'c. sopa';
  if (r.includes('ch'))    return 'c. chá';
  if (r === 'g')           return 'g';
  if (r === 'ml')          return 'ml';
  if (r === 'scoop')       return 'scoop';
  if (r.includes('copo'))  return 'copo';
  if (r.includes('fatia')) return 'fatia';
  if (r.includes('pun'))   return 'punhado';
  if (r.includes('por'))   return 'porção';
  return 'unid.';
}

function parseIngredients(desc) {
  if (!desc?.trim()) return [{ id: uid(), name: '', qty: '', unit: 'unid.' }];
  const unitPats = ['c\\.\\s*sopa','c\\.\\s*ch[aá]','scoop','copo','fatia','pun[hH]ado','por[cç][aã]o','ml','g'];
  const unitRe = new RegExp(`^(${unitPats.join('|')})`, 'i');
  return desc.split(/\s*\+\s*/).map(raw => {
    raw = raw.trim();
    const numMatch = raw.match(/^(\d+(?:[,.]?\d+)?)\s+/);
    if (numMatch) {
      const qty  = numMatch[1];
      const rest = raw.slice(numMatch[0].length);
      const unitMatch = rest.match(unitRe);
      if (unitMatch) return { id: uid(), name: rest.slice(unitMatch[0].length).trim(), qty, unit: normalizeUnit(unitMatch[0]) };
      return { id: uid(), name: rest.trim(), qty, unit: 'unid.' };
    }
    return { id: uid(), name: raw, qty: '', unit: 'unid.' };
  }).filter(i => i.name.trim() || i.qty);
}

function buildDesc(ings) {
  return ings.filter(i => i.name.trim()).map(i => {
    if (i.qty && i.unit && i.unit !== 'unid.') return `${i.qty} ${i.unit} ${i.name}`.trim();
    if (i.qty) return `${i.qty} ${i.name}`.trim();
    return i.name.trim();
  }).join(' + ');
}

function extractTimeVal(s) {
  const m = (s || '').match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : '09:00';
}
function extractTimeNote(s) {
  return (s || '').replace(/^[~]?\s*\d{1,2}:\d{2}[\s–\-·]*/, '').trim();
}
function buildTimeDisplay(val, note) {
  return note.trim() ? `${val} · ${note.trim()}` : val;
}

/* ════════════════════════════════════════ */
export default function MealPlan({ meals, setMeals }) {
  const [editingId,    setEditingId]    = useState(null);
  const [editTitle,    setEditTitle]    = useState('');
  const [editTimeVal,  setEditTimeVal]  = useState('09:00');
  const [editTimeNote, setEditTimeNote] = useState('');
  const [ings,         setIngs]         = useState([]);
  const [doneMeals,    setDoneMeals]    = useState({});
  const [animating,    setAnimating]    = useState({});
  const [filter,       setFilter]       = useState('all');

  const filtered   = meals.filter(m => filter === 'all' || m.period === filter);
  const doneCount  = Object.values(doneMeals).filter(Boolean).length;
  const total      = meals.length;
  const pct        = Math.round((doneCount / total) * 100);

  const toggleDone = id => {
    setAnimating(p => ({ ...p, [id]: true }));
    setTimeout(() => setAnimating(p => ({ ...p, [id]: false })), 280);
    setDoneMeals(p => ({ ...p, [id]: !p[id] }));
  };

  const openEdit = meal => {
    setEditingId(meal.id);
    setEditTitle(meal.title);
    setEditTimeVal(extractTimeVal(meal.time));
    setEditTimeNote(extractTimeNote(meal.time));
    setIngs(parseIngredients(meal.desc));
  };

  const saveEdit = id => {
    setMeals(p => p.map(m => m.id === id
      ? { ...m, title: editTitle.trim() || m.title, desc: buildDesc(ings) || m.desc, time: buildTimeDisplay(editTimeVal, editTimeNote) }
      : m));
    setEditingId(null);
  };

  const updateIng = (id, field, val) => setIngs(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));
  const removeIng = id => setIngs(p => p.filter(i => i.id !== id));
  const addIng    = () => setIngs(p => [...p, { id: uid(), name: '', qty: '', unit: 'unid.' }]);

  const resetMeal = id => {
    const def = DEFAULT_MEALS.find(m => m.id === id);
    if (def) { setMeals(p => p.map(m => m.id === id ? { ...m, ...def } : m)); setEditingId(null); }
  };

  const isDefault = meal => {
    const d = DEFAULT_MEALS.find(x => x.id === meal.id);
    return d && meal.desc === d.desc && meal.title === d.title;
  };

  return (
    <div className="page-section">

      {/* Header */}
      <div className="section-header">Plano de Hoje</div>
      <div className="section-sub">
        {doneCount === 0 ? 'Marca as refeições à medida que as fazes'
          : doneCount === total ? '🎉 Dia completo!'
          : `${doneCount} de ${total} refeições feitas`}
      </div>

      {/* Stat card */}
      <div className="stat-card">
        <div className="stat-row">
          <div>
            <div className="stat-label">Turno Teletrabalho</div>
            <div className={`stat-value${doneCount === total ? ' done' : ''}`}>{pct}%</div>
            <div className="stat-caption">09:00 – 12:50 · Pausa 10:30</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-label">Refeições</div>
            <div className={`stat-value${doneCount === total ? ' done' : ''}`}>{doneCount}/{total}</div>
          </div>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Segmented filter */}
      <div className="segmented">
        {FILTERS.map(f => (
          <button key={f.id} className={`segmented-btn${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Meal list */}
      {filtered.map(meal => {
        const isDone    = !!doneMeals[meal.id];
        const isAnim    = !!animating[meal.id];
        const isEditing = editingId === meal.id;

        return (
          <div key={meal.id} className="meal-group" style={{ marginBottom: 10 }}>
            {isEditing ? (
              /* ─── EDIT PANEL ─── */
              <div className="edit-panel">
                <div className="edit-panel-header">
                  <PencilIcon />
                  <span className="edit-panel-title">Editar — {meal.title}</span>
                  <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
                    onClick={() => setEditingId(null)}>Cancelar</button>
                </div>

                {/* Name */}
                <div className="field-group">
                  <div className="field-label">Nome</div>
                  <input className="app-input" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Nome da refeição" />
                </div>

                {/* Time */}
                <div className="field-group">
                  <div className="field-label">Horário</div>
                  <div className="time-row">
                    <input type="time" className="app-input time-picker" style={{ width: 128, flexShrink: 0 }}
                      value={editTimeVal} onChange={e => setEditTimeVal(e.target.value)} />
                    <input className="app-input" value={editTimeNote} onChange={e => setEditTimeNote(e.target.value)}
                      placeholder="Nota (ex: Fim do Turno)" style={{ flex: 1 }} />
                  </div>
                  <div className="time-preview">Exibido como: {buildTimeDisplay(editTimeVal, editTimeNote)}</div>
                </div>

                {/* Ingredients */}
                <div className="field-group">
                  <div className="field-label">Ingredientes</div>
                  <div className="ingredient-list">
                    {ings.map((ing, idx) => (
                      <div key={ing.id} className="ingredient-row">
                        <span className="ing-index">{idx + 1}</span>
                        <input className="app-input ing-name" value={ing.name}
                          onChange={e => updateIng(ing.id, 'name', e.target.value)} placeholder="Alimento" />
                        <input type="number" className="app-input ing-qty" value={ing.qty} min="0" step="0.5"
                          onChange={e => updateIng(ing.id, 'qty', e.target.value)} placeholder="Qtd" />
                        <select className="app-select ing-unit" value={ing.unit}
                          onChange={e => updateIng(ing.id, 'unit', e.target.value)}>
                          {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <button className="ing-remove" onClick={() => removeIng(ing.id)} disabled={ings.length === 1}>
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                  {ings.some(i => i.name.trim()) && (
                    <div className="ing-preview">{buildDesc(ings)}</div>
                  )}
                  <button className="add-ing-btn" onClick={addIng}>
                    <PlusIcon /> Adicionar ingrediente
                  </button>
                </div>

                {/* Actions */}
                <div className="edit-actions">
                  <button className="btn-primary" onClick={() => saveEdit(meal.id)}>
                    <CheckIcon /> Guardar
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                  {!isDefault(meal) && (
                    <button className="btn-ghost" style={{ marginLeft: 'auto', fontSize: '0.78rem' }}
                      onClick={() => resetMeal(meal.id)}>↺ Repor</button>
                  )}
                </div>
              </div>
            ) : (
              /* ─── MEAL ROW ─── */
              <div className={`meal-row${isDone ? ' is-done' : ''}`}>
                <button
                  className={`check-circle${isDone ? ' checked' : ''}${isAnim ? ' check-pop' : ''}`}
                  onClick={() => toggleDone(meal.id)}
                  aria-label={isDone ? 'Desmarcar' : 'Marcar como feito'}
                >
                  {isDone && <CheckIcon />}
                </button>

                <div className="meal-body">
                  <div className="meal-meta">
                    <span className={`meal-time ${meal.period}`}>{meal.time}</span>
                    {isDone && <span className="done-tag">Feito</span>}
                    <span className={`meal-badge ${BADGE_MAP[meal.badgeType] || 'slate'}`}>{meal.badge}</span>
                  </div>
                  <div className="meal-name">{meal.icon} {meal.title}</div>
                  <p className="meal-desc-text">{meal.desc}</p>
                  {meal.swapNote && <p className="meal-tip-text">💡 {meal.swapNote}</p>}
                </div>

                <button className="meal-edit-icon" onClick={() => openEdit(meal)} aria-label="Editar">
                  <PencilIcon />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Reset day */}
      {doneCount > 0 && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <button className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setDoneMeals({})}>
            ↺ Reiniciar dia
          </button>
        </div>
      )}

      {/* Rules */}
      <div className="rules-card">
        <div className="rules-title">⚡ Regras de Ouro</div>
        {GOLDEN_RULES.map((r, i) => (
          <div key={i} className="rule-row">
            <div className="rule-dot" />
            <div><strong style={{ color: 'var(--label)' }}>{r.title}:</strong> {r.text}</div>
          </div>
        ))}
      </div>

    </div>
  );
}