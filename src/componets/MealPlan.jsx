import React, { useState } from 'react';
import { DEFAULT_MEALS } from '../data/meals';

/* ── SVG Icons ── */
const PencilIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const UNITS = [
  { value: 'unid.',   label: 'Unidades'       },
  { value: 'c. sopa', label: 'Colher de sopa' },
  { value: 'c. chá',  label: 'Colher de chá'  },
  { value: 'g',       label: 'Gramas'          },
  { value: 'ml',      label: 'Mililitros'      },
  { value: 'scoop',   label: 'Scoop'           },
  { value: 'copo',    label: 'Copo'            },
  { value: 'fatia',   label: 'Fatia'           },
  { value: 'punhado', label: 'Punhado'         },
  { value: 'porção',  label: 'Porção'          },
];

const BADGE_MAP = {
  'badge-green': 'green',
  'badge-amber': 'amber',
  'badge-slate': 'slate',
};

const FILTERS = [
  { id: 'all',       label: 'Todas' },
  { id: 'morning',   label: '🌅 Manhã' },
  { id: 'afternoon', label: '🌆 Tarde' },
];

let _idCounter = 0;
const uid = () => `ing-${++_idCounter}`;

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
  const unitPats = ['c\\.\\s*sopa', 'c\\.\\s*ch[aá]', 'scoop', 'copo', 'fatia', 'pun[hH]ado', 'por[cç][aã]o', 'ml', 'g'];
  const unitRe = new RegExp(`^(${unitPats.join('|')})`, 'i');

  return desc.split(/\s*\+\s*/).map(raw => {
    raw = raw.trim();
    const numMatch = raw.match(/^(\d+(?:[,.]?\d+)?)\s+/);
    if (numMatch) {
      const qty = numMatch[1];
      const rest = raw.slice(numMatch[0].length);
      const unitMatch = rest.match(unitRe);
      if (unitMatch) {
        return {
          id: uid(),
          name: rest.slice(unitMatch[0].length).trim(),
          qty,
          unit: normalizeUnit(unitMatch[0]),
        };
      }
      return { id: uid(), name: rest.trim(), qty, unit: 'unid.' };
    }
    return { id: uid(), name: raw, qty: '', unit: 'unid.' };
  }).filter(i => i.name.trim() || i.qty);
}

function buildDesc(ings) {
  return ings
    .filter(i => i.name.trim())
    .map(i => {
      if (i.qty && i.unit && i.unit !== 'unid.') return `${i.qty} ${i.unit} ${i.name}`.trim();
      if (i.qty) return `${i.qty} ${i.name}`.trim();
      return i.name.trim();
    })
    .join(' + ');
}

function extractTimeVal(s) {
  const m = (s || '').match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '09:00';
}

function extractTimeNote(s) {
  return (s || '').replace(/^[~]?\s*\d{1,2}:\d{2}[\s–\-·]*/, '').trim();
}

function buildTimeDisplay(val, note) {
  return note.trim() ? `${val} · ${note.trim()}` : val;
}

export default function MealPlan({ meals, setMeals, onSaveMeal, isEvaluating }) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTimeVal, setEditTimeVal] = useState('09:00');
  const [editTimeNote, setEditTimeNote] = useState('');
  const [ings, setIngs] = useState([]);
  const [doneMeals, setDoneMeals] = useState({});
  const [filter, setFilter] = useState('all');

  const filteredMeals = meals.filter(m => filter === 'all' || m.period === filter);
  const total = meals.length;
  const doneCount = Object.values(doneMeals).filter(Boolean).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const toggleDone = (id) => {
    setDoneMeals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openEdit = (meal) => {
    setEditingId(meal.id);
    setEditTitle(meal.title);
    setEditTimeVal(extractTimeVal(meal.time));
    setEditTimeNote(extractTimeNote(meal.time));
    setIngs(parseIngredients(meal.desc));
  };

  const saveEdit = (meal) => {
    const newDesc = buildDesc(ings) || meal.desc;
    const newTitle = editTitle.trim() || meal.title;
    const newTime = buildTimeDisplay(editTimeVal, editTimeNote);

    if (onSaveMeal) {
      onSaveMeal(meal, newDesc, newTitle, newTime);
    } else {
      setMeals(prev => prev.map(m => {
        if (m.id !== meal.id) return m;
        return {
          ...m,
          title: newTitle,
          desc: newDesc,
          time: newTime,
        };
      }));
    }
    setEditingId(null);
  };

  const updateIng = (id, field, val) => {
    setIngs(prev => prev.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  const removeIng = (id) => {
    setIngs(prev => prev.filter(i => i.id !== id));
  };

  const addIng = () => {
    setIngs(prev => [...prev, { id: uid(), name: '', qty: '', unit: 'unid.' }]);
  };

  const resetMeal = (id) => {
    const original = DEFAULT_MEALS.find(m => m.id === id);
    if (original) {
      setMeals(prev => prev.map(m => m.id === id ? { ...m, ...original } : m));
      setEditingId(null);
    }
  };

  return (
    <div>
      {/* Title */}
      <div className="page-title-row">
        <h1 className="page-title">Plano Alimentar</h1>
        <p className="page-subtitle">Turno de trabalho das 09:00 às 12:50</p>
      </div>

      {/* Progress Card */}
      <div className="progress-card">
        <div className="progress-header">
          <div>
            <div className="progress-label">Meta Diária</div>
            <div className="progress-number">{doneCount} de {total} refeições</div>
            <div className="progress-sub">
              {doneCount === total && total > 0
                ? '🎉 Todas as refeições concluídas!'
                : `${total - doneCount} refeições por fazer hoje`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
              {pct}%
            </div>
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Segmented Filter */}
      <div className="segmented-bar">
        {FILTERS.map(f => (
          <button
            key={f.id}
            className={`segmented-option${filter === f.id ? ' active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Meals List */}
      <div>
        {filteredMeals.map(meal => {
          const isDone = !!doneMeals[meal.id];
          const isEditing = editingId === meal.id;

          if (isEditing) {
            return (
              <div key={meal.id} className="edit-container">
                <div className="edit-header-row">
                  <div className="edit-title-text">✏️ Editar {meal.title}</div>
                  <button className="btn-cancel" onClick={() => setEditingId(null)}>
                    Fechar
                  </button>
                </div>

                {/* Meal Title */}
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Nome da Refeição</label>
                  <input
                    type="text"
                    className="input-box"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                </div>

                {/* Time picker & Note */}
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Horário & Observação</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="time"
                      className="input-box"
                      style={{ width: 130 }}
                      value={editTimeVal}
                      onChange={e => setEditTimeVal(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input-box"
                      style={{ flex: 1 }}
                      placeholder="Nota (ex: Pausa 25 min)"
                      value={editTimeNote}
                      onChange={e => setEditTimeNote(e.target.value)}
                    />
                  </div>
                </div>

                {/* Ingredient Builder */}
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Ingredientes Estruturados</label>
                  <div className="ingredient-table">
                    {ings.map((ing, idx) => (
                      <div key={ing.id} className="ingredient-grid-row">
                        <span className="ing-num">{idx + 1}</span>
                        <input
                          type="text"
                          className="input-box"
                          placeholder="Alimento"
                          value={ing.name}
                          onChange={e => updateIng(ing.id, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          className="input-box"
                          placeholder="Qtd"
                          value={ing.qty}
                          onChange={e => updateIng(ing.id, 'qty', e.target.value)}
                        />
                        <select
                          className="input-box"
                          value={ing.unit}
                          onChange={e => updateIng(ing.id, 'unit', e.target.value)}
                        >
                          {UNITS.map(u => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                          ))}
                        </select>
                        <button
                          className="edit-trigger-btn"
                          onClick={() => removeIng(ing.id)}
                          disabled={ings.length === 1}
                          title="Remover"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>

                  {ings.some(i => i.name.trim()) && (
                    <div className="preview-pill">
                      Pré-visualização: {buildDesc(ings)}
                    </div>
                  )}

                  <button className="add-row-btn" onClick={addIng}>
                    <PlusIcon /> Adicionar Ingrediente
                  </button>
                </div>

                {/* Edit Actions */}
                <div className="edit-actions-row">
                  <button className="btn-save" onClick={() => saveEdit(meal)} disabled={isEvaluating}>
                    {isEvaluating ? '⏳ A analisar com IA...' : '🤖 Guardar & Rever com a IA'}
                  </button>
                  <button className="btn-cancel" onClick={() => setEditingId(null)} disabled={isEvaluating}>
                    Cancelar
                  </button>
                  <button
                    className="btn-cancel"
                    style={{ marginLeft: 'auto', fontSize: '0.78rem' }}
                    onClick={() => resetMeal(meal.id)}
                  >
                    ↺ Repor Padrão
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={meal.id} className={`meal-card-item${isDone ? ' done' : ''}`}>
              <div className="meal-card-layout">
                <button
                  className={`check-btn${isDone ? ' checked' : ''}`}
                  onClick={() => toggleDone(meal.id)}
                  aria-label={isDone ? 'Desmarcar' : 'Marcar refeição'}
                >
                  {isDone && <CheckIcon />}
                </button>

                <div className="meal-info">
                  <div className="meal-top-meta">
                    <span className={`time-tag ${meal.period}`}>{meal.time}</span>
                    {isDone && <span className="done-badge">Feito</span>}
                    <span className={`badge-pill ${BADGE_MAP[meal.badgeType] || 'slate'}`}>
                      {meal.badge}
                    </span>
                  </div>

                  <div className="meal-title-text">
                    <span>{meal.icon}</span>
                    <span>{meal.title}</span>
                  </div>

                  <p className="meal-desc-content">{meal.desc}</p>

                  {meal.swapNote && (
                    <div className="meal-note-box">
                      💡 {meal.swapNote}
                    </div>
                  )}
                </div>

                <button
                  className="edit-trigger-btn"
                  onClick={() => openEdit(meal)}
                  title="Editar refeição"
                  aria-label="Editar refeição"
                >
                  <PencilIcon />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rules Card */}
      <div className="ui-card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>
          ⚡ Regras de Ouro
        </div>
        <ul style={{ paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-sub)', lineHeight: 1.6 }}>
          <li><strong>Frutos Secos Fixos:</strong> 10 unidades de manhã (4 avelãs, 2 cajus, 4 amêndoas).</li>
          <li><strong>Intermutabilidade:</strong> Pequeno-Almoço e Lanche 1 podem ser trocados sem alterar o plano.</li>
          <li><strong>Zero Balança:</strong> Usa colheres e a palma da mão para medir porções.</li>
        </ul>
      </div>

      {doneCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
          <button className="btn-cancel" onClick={() => setDoneMeals({})} style={{ fontSize: '0.8rem' }}>
            ↺ Reiniciar progresso do dia
          </button>
        </div>
      )}
    </div>
  );
}