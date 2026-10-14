import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_MEALS } from '../data/meals';
import {
  calculateTotalCalories,
  calculateConsumedCalories,
  estimateMealCalories,
  getCalorieStatus,
  DAILY_CALORIE_TARGET,
} from '../utils/calorieCalculator.js';
import { analyzeMealPhotoWithAI } from '../services/geminiService.js';
import { compressImage } from '../utils/imageCompressor.js';

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

const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <circle cx="9" cy="6" r="1.5" fill="currentColor" />
    <circle cx="15" cy="6" r="1.5" fill="currentColor" />
    <circle cx="9" cy="12" r="1.5" fill="currentColor" />
    <circle cx="15" cy="12" r="1.5" fill="currentColor" />
    <circle cx="9" cy="18" r="1.5" fill="currentColor" />
    <circle cx="15" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const CameraIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
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
  const [filter, setFilter] = useState('all');

  // Photo scanner state
  const fileInputRef = useRef(null);
  const [photoTargetMeal, setPhotoTargetMeal] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);

  // Persisted checked meals (doneMeals)
  const [doneMeals, setDoneMeals] = useState(() => {
    try {
      const saved = localStorage.getItem('nutri_done_meals');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('nutri_done_meals', JSON.stringify(doneMeals));
    } catch (e) {}
  }, [doneMeals]);

  // Persisted Custom Calorie Target
  const [targetCalories, setTargetCalories] = useState(() => {
    const saved = localStorage.getItem('target_calories');
    return saved ? parseInt(saved, 10) : DAILY_CALORIE_TARGET;
  });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(targetCalories);

  // Drag-and-drop state
  const [draggedMealIndex, setDraggedMealIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const filteredMeals = meals.filter(m => filter === 'all' || m.period === filter);
  const total = meals.length;
  const doneCount = Object.values(doneMeals).filter(Boolean).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // Calorie calculations
  const totalCalories = calculateTotalCalories(meals);
  const consumedCalories = calculateConsumedCalories(meals, doneMeals);
  const calStatus = getCalorieStatus(totalCalories, targetCalories);

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

  const deleteMeal = (id) => {
    if (window.confirm('Tens a certeza que queres eliminar esta refeição? O plano e as calorias serão atualizados.')) {
      setMeals(prev => prev.filter(m => m.id !== id));
      setDoneMeals(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (editingId === id) setEditingId(null);
    }
  };

  const restoreDefaultMeals = () => {
    if (window.confirm('Queres restaurar todas as refeições para o plano padrão?')) {
      setMeals(DEFAULT_MEALS);
      setEditingId(null);
    }
  };

  const handleSaveTarget = () => {
    const num = parseInt(targetInput, 10);
    if (!isNaN(num) && num >= 500 && num <= 6000) {
      setTargetCalories(num);
      localStorage.setItem('target_calories', String(num));
    }
    setIsEditingTarget(false);
  };

  // ── Photo Scanner Flow (Almoço & Jantar) ──
  const isPhotoEligible = (meal) => {
    if (!meal) return false;
    const t = (meal.title || '').toLowerCase();
    const id = meal.id || '';
    return id === 'alm' || id === 'jan' || t.includes('almoço') || t.includes('almoco') || t.includes('jantar');
  };

  const triggerPhotoCapture = (meal) => {
    setPhotoTargetMeal(meal);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetMeal) return;

    try {
      const compressed = await compressImage(file, 1024, 0.85);

      setPhotoModal({
        status: 'loading',
        previewUrl: compressed.dataUrl,
      });

      const analysis = await analyzeMealPhotoWithAI({
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
        meal: photoTargetMeal,
        allMeals: meals,
        targetCalories,
      });

      setPhotoModal({
        status: 'done',
        previewUrl: compressed.dataUrl,
        result: analysis,
      });
    } catch (err) {
      console.error('Falha ao processar foto:', err);
      setPhotoModal({
        status: 'error',
        errorMsg: 'Não foi possível analisar a fotografia. Tenta novamente.',
      });
    }
  };

  const applyPhotoResult = () => {
    if (!photoModal?.result || !photoTargetMeal) return;
    const res = photoModal.result;

    setMeals(prev => prev.map(m => {
      if (m.id !== photoTargetMeal.id) return m;
      return {
        ...m,
        desc: res.recognizedFood,
        calories: res.estimatedCalories,
        _customCalories: res.estimatedCalories,
      };
    }));

    // Mark meal as completed for the day
    setDoneMeals(prev => ({ ...prev, [photoTargetMeal.id]: true }));

    setPhotoModal(null);
    setPhotoTargetMeal(null);
  };

  const cancelPhoto = () => {
    setPhotoModal(null);
    setPhotoTargetMeal(null);
  };

  // ── Reorder meals and dynamically assign slot names/times ──
  const reorderMeals = (sourceIndex, targetIndex) => {
    if (sourceIndex === targetIndex || sourceIndex < 0 || targetIndex < 0) return;

    setMeals(prev => {
      if (sourceIndex >= prev.length || targetIndex >= prev.length) return prev;

      // Extract slot metadata (chronological titles & times)
      const slotMetadata = prev.map(m => ({
        title: m.title,
        time: m.time,
        period: m.period,
        badge: m.badge,
        badgeType: m.badgeType,
        swapNote: m.swapNote,
      }));

      // Reorder items in the array (moving the dishes)
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);

      // Reassign slot titles and times so slot positions retain their schedule names!
      return next.map((item, idx) => ({
        ...item,
        title: slotMetadata[idx]?.title || item.title,
        time: slotMetadata[idx]?.time || item.time,
        period: slotMetadata[idx]?.period || item.period,
        badge: slotMetadata[idx]?.badge || item.badge,
        badgeType: slotMetadata[idx]?.badgeType || item.badgeType,
        swapNote: slotMetadata[idx]?.swapNote,
      }));
    });
  };

  // ── Universal Pointer Event Dragging (Smooth on Touch & Mouse) ──
  const handlePointerDown = (e, fullIdx) => {
    if (e.button !== undefined && e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    setDraggedMealIndex(fullIdx);
    setDragOverIndex(fullIdx);
  };

  const handlePointerMove = (e) => {
    if (draggedMealIndex === null) return;
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const card = elem?.closest('[data-full-index]');
    if (card) {
      const idx = parseInt(card.getAttribute('data-full-index'), 10);
      if (!isNaN(idx) && idx !== dragOverIndex) {
        setDragOverIndex(idx);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (draggedMealIndex !== null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (dragOverIndex !== null && dragOverIndex !== draggedMealIndex) {
        reorderMeals(draggedMealIndex, dragOverIndex);
      }
    }
    setDraggedMealIndex(null);
    setDragOverIndex(null);
  };

  // ── Desktop HTML5 Drag Handlers ──
  const handleDragStart = (e, fullIdx) => {
    setDraggedMealIndex(fullIdx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(fullIdx));
  };

  const handleDragOver = (e, fullIdx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== fullIdx) {
      setDragOverIndex(fullIdx);
    }
  };

  const handleDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedMealIndex !== null && draggedMealIndex !== targetIdx) {
      reorderMeals(draggedMealIndex, targetIdx);
    }
    setDraggedMealIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedMealIndex(null);
    setDragOverIndex(null);
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
      {/* Hidden File Input for Camera and Photo Capture */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handlePhotoSelected}
      />

      {/* Title */}
      <div className="page-title-row">
        <h1 className="page-title">Plano Alimentar</h1>
        <p className="page-subtitle">Turno de trabalho das 09:00 às 12:50</p>
      </div>

      {/* Calorie Counter Card with Customizable Target */}
      <div className="calorie-summary-card">
        <div className="calorie-card-header">
          <div>
            <div className="calorie-card-label">🔥 Contador Diário de Calorias</div>
            <div className="calorie-card-main">
              <span className="cal-current">{totalCalories.toLocaleString('pt-PT')}</span>

              {isEditingTarget ? (
                <div className="target-edit-row">
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ </span>
                  <input
                    type="number"
                    className="target-input-box"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTarget()}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>kcal</span>
                  <button className="target-btn-save" onClick={handleSaveTarget} title="Guardar alvo">✓</button>
                  <button className="target-btn-cancel" onClick={() => setIsEditingTarget(false)} title="Cancelar">✕</button>
                </div>
              ) : (
                <div
                  className="target-display-row"
                  onClick={() => { setTargetInput(targetCalories); setIsEditingTarget(true); }}
                  title="Clica para alterar o teu alvo de calorias"
                >
                  <span className="cal-target"> / {targetCalories.toLocaleString('pt-PT')} kcal</span>
                  <button className="target-edit-trigger" aria-label="Editar alvo de calorias">✏️</button>
                </div>
              )}
            </div>
          </div>
          <div className={`cal-status-pill ${calStatus.badgeClass}`}>
            {calStatus.label}
          </div>
        </div>

        <div className="calorie-bar-track">
          <div
            className={`calorie-bar-fill ${calStatus.badgeClass}`}
            style={{ width: `${Math.min(100, Math.round((totalCalories / targetCalories) * 100))}%` }}
          />
        </div>

        <div className="calorie-sub-stats">
          <div className="cal-sub-item">
            <span>Consumidas: </span>
            <strong>{consumedCalories} kcal</strong> {doneCount > 0 && `(${doneCount} ${doneCount === 1 ? 'refeição' : 'refeições'})`}
          </div>
          <div className="cal-sub-item">
            <span>Restantes: </span>
            <strong>{Math.max(0, totalCalories - consumedCalories)} kcal</strong>
          </div>
        </div>

        <div className="calorie-footer-msg">
          {calStatus.message}
        </div>
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

      {/* Reorder Hint */}
      <div className="reorder-hint-banner">
        💡 <strong>Dica:</strong> No <strong>Almoço</strong> e <strong>Jantar</strong> podes tirar foto ao prato com IA 📸. Usa ▲ ▼ para trocar a ordem.
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
          const fullIdx = meals.findIndex(m => m.id === meal.id);
          const isDragging = draggedMealIndex === fullIdx;
          const isDropTarget = dragOverIndex === fullIdx && draggedMealIndex !== fullIdx;
          const eligibleForPhoto = isPhotoEligible(meal);

          if (isEditing) {
            return (
              <div key={meal.id} className="edit-container">
                <div className="edit-header-row">
                  <div className="edit-title-text">✏️ Editar {meal.title}</div>
                  <button className="btn-cancel" onClick={() => setEditingId(null)}>
                    Fechar
                  </button>
                </div>

                {/* Photo shortcut for lunch & dinner */}
                {eligibleForPhoto && (
                  <button
                    type="button"
                    className="edit-photo-shortcut-btn"
                    onClick={() => triggerPhotoCapture(meal)}
                  >
                    📸 Em vez de escrever: Tirar Foto ao Prato com IA
                  </button>
                )}

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

                  {/* Live Calorie Estimator in Edit Form */}
                  <div className="edit-calorie-indicator">
                    <span>🔥 Calorias estimadas: <strong>~{estimateMealCalories(buildDesc(ings) || meal.desc)} kcal</strong></span>
                    {estimateMealCalories(buildDesc(ings) || meal.desc) > 850 && (
                      <span className="cal-warning-inline">⚠️ Quantidade ou calorias muito elevadas</span>
                    )}
                  </div>

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
                    style={{ color: 'var(--accent-red)', fontSize: '0.78rem' }}
                    onClick={() => deleteMeal(meal.id)}
                    title="Eliminar esta refeição"
                  >
                    🗑️ Eliminar
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

          const mealCalories = estimateMealCalories(meal, meal.calories);

          return (
            <div
              key={meal.id}
              data-full-index={fullIdx}
              className={`meal-card-item${isDone ? ' done' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
              onDragOver={(e) => handleDragOver(e, fullIdx)}
              onDrop={(e) => handleDrop(e, fullIdx)}
            >
              <div className="meal-card-layout">
                {/* Completed Checkbox */}
                <button
                  className={`check-btn${isDone ? ' checked' : ''}`}
                  onClick={() => toggleDone(meal.id)}
                  aria-label={isDone ? 'Desmarcar' : 'Marcar refeição'}
                >
                  {isDone && <CheckIcon />}
                </button>

                {/* Meal Details */}
                <div className="meal-info">
                  <div className="meal-top-meta">
                    <span className={`time-tag ${meal.period}`}>{meal.time}</span>
                    <span className="meal-calorie-pill" title="Calorias estimadas">
                      🔥 ~{mealCalories} kcal
                    </span>
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

                  {/* Photo shortcut for lunch and dinner on the card */}
                  {eligibleForPhoto && (
                    <div>
                      <button
                        type="button"
                        className="photo-meal-card-btn"
                        onClick={(e) => { e.stopPropagation(); triggerPhotoCapture(meal); }}
                        title="Tirar foto ao prato para calcular calorias com IA"
                      >
                        <CameraIcon />
                        <span>Fotografar Prato (IA)</span>
                      </button>
                    </div>
                  )}

                  {meal.swapNote && (
                    <div className="meal-note-box">
                      💡 {meal.swapNote}
                    </div>
                  )}
                </div>

                {/* Action buttons: Camera, Reorder Handle, Arrows, Edit, Delete */}
                <div className="meal-card-actions">
                  {/* Camera icon button for lunch & dinner */}
                  {eligibleForPhoto && (
                    <button
                      type="button"
                      className="card-action-btn camera-btn"
                      onClick={() => triggerPhotoCapture(meal)}
                      title="Fotografar prato com IA"
                      aria-label="Fotografar prato com IA"
                    >
                      <CameraIcon />
                    </button>
                  )}

                  {/* Drag Handle with Pointer Capture & HTML5 Drag */}
                  <div
                    className="card-action-btn drag-handle"
                    title="Segura e arrasta para reordenar esta refeição"
                    aria-label="Segurar para reordenar"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, fullIdx)}
                    onDragEnd={handleDragEnd}
                    onPointerDown={(e) => handlePointerDown(e, fullIdx)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <GripIcon />
                  </div>

                  {/* Quick Reorder Arrow Buttons */}
                  <div className="reorder-arrows-column">
                    {fullIdx > 0 && (
                      <button
                        type="button"
                        className="arrow-mini-btn"
                        onClick={(e) => { e.stopPropagation(); reorderMeals(fullIdx, fullIdx - 1); }}
                        title="Subir refeição (troca com a de cima)"
                      >
                        ▲
                      </button>
                    )}
                    {fullIdx < meals.length - 1 && (
                      <button
                        type="button"
                        className="arrow-mini-btn"
                        onClick={(e) => { e.stopPropagation(); reorderMeals(fullIdx, fullIdx + 1); }}
                        title="Descer refeição (troca com a de baixo)"
                      >
                        ▼
                      </button>
                    )}
                  </div>

                  {/* Edit Pencil Button */}
                  <button
                    className="card-action-btn"
                    onClick={() => openEdit(meal)}
                    title="Editar refeição"
                    aria-label="Editar refeição"
                  >
                    <PencilIcon />
                  </button>

                  {/* Delete Trash Button */}
                  <button
                    className="card-action-btn delete-btn"
                    onClick={() => deleteMeal(meal.id)}
                    title="Eliminar refeição"
                    aria-label="Eliminar refeição"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restore default meals if any were deleted */}
      {meals.length < DEFAULT_MEALS.length && (
        <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 8 }}>
          <button
            className="btn-cancel"
            onClick={restoreDefaultMeals}
            style={{ fontSize: '0.8rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            ↺ Restaurar todas as refeições padrão ({DEFAULT_MEALS.length})
          </button>
        </div>
      )}

      {/* Rules Card */}
      <div className="ui-card" style={{ marginTop: 8 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: 8, color: 'var(--primary)' }}>
          ⚡ Regras de Ouro
        </div>
        <ul style={{ paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-sub)', lineHeight: 1.6 }}>
          <li><strong>Frutos Secos Fixos:</strong> 10 unidades de manhã (4 avelãs, 2 cajus, 4 amêndoas).</li>
          <li><strong>Intermutabilidade:</strong> Podes trocar a ordem de qualquer refeição usando ▲ ▼ ou arrastando ⠿.</li>
          <li><strong>Zero Balança:</strong> Usa colheres e a palma da mão para medir porções.</li>
        </ul>
      </div>

      {doneCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
          <button
            className="btn-cancel"
            onClick={() => {
              setDoneMeals({});
              localStorage.removeItem('nutri_done_meals');
            }}
            style={{ fontSize: '0.8rem' }}
          >
            ↺ Reiniciar progresso do dia
          </button>
        </div>
      )}

      {/* ── PHOTO ANALYSIS MODAL (POP-UP) ── */}
      {photoModal && (
        <div className="review-modal-backdrop" onClick={cancelPhoto}>
          <div className="review-modal-box photo-modal-box" onClick={e => e.stopPropagation()}>
            <div className="review-modal-header">
              <div className="review-icon-avatar">📸</div>
              <div style={{ flex: 1 }}>
                <div className="review-title-sub">Reconhecimento Visual IA</div>
                <div className="review-title-main">{photoTargetMeal?.title || 'Refeição'}</div>
              </div>
              <button
                type="button"
                className="btn-cancel"
                onClick={cancelPhoto}
                style={{ padding: '2px 8px', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {photoModal.previewUrl && (
              <div className="photo-preview-container">
                <img src={photoModal.previewUrl} alt="Foto do prato" className="photo-preview-img" />
                {photoModal.status === 'done' && (
                  <div className="photo-calorie-floating-badge">
                    🔥 ~{photoModal.result?.estimatedCalories} kcal
                  </div>
                )}
              </div>
            )}

            {photoModal.status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🤖✨</div>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', marginBottom: 4, fontSize: '1rem' }}>
                  A IA está a analisar o teu prato...
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>
                  A identificar alimentos, a calcular as calorias e a verificar se é uma boa opção para o défice diário.
                </p>
              </div>
            )}

            {photoModal.status === 'done' && photoModal.result && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div className="review-block-label user">🍽️ Alimentos Detetados no Prato:</div>
                  <div className="review-block-text" style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                    {photoModal.result.recognizedFood}
                  </div>
                </div>

                <div className={`photo-verdict-card ${photoModal.result.isGoodChoice ? 'good' : 'warning'}`}>
                  <div className="verdict-header-row">
                    <span className="verdict-title">{photoModal.result.verdictTitle}</span>
                    <span className="verdict-badge-tag">
                      {photoModal.result.isGoodChoice ? 'Boa Opção' : 'Atenção'}
                    </span>
                  </div>
                  <p className="verdict-explanation">
                    {photoModal.result.verdictExplanation}
                  </p>
                  {photoModal.result.tip && (
                    <div className="verdict-tip-box">
                      💡 <strong>Dica do Nutricionista:</strong> {photoModal.result.tip}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button type="button" className="review-btn-ai" onClick={applyPhotoResult} style={{ flex: 1 }}>
                    🚀 Adicionar ao Dia e Guardar
                  </button>
                  <button type="button" className="btn-cancel" onClick={cancelPhoto}>
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {photoModal.status === 'error' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚠️</div>
                <p style={{ fontSize: '0.86rem', color: '#e11d48', marginBottom: 12 }}>
                  {photoModal.errorMsg}
                </p>
                <button type="button" className="btn-cancel" onClick={cancelPhoto}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}