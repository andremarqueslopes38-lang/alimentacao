import React, { useState } from 'react';

const DEFAULT_CATEGORIES = [
  {
    name: 'Frescos & Ovos',
    icon: '🥚',
    items: ['Ovos M/L (14-20 un)', 'Maçãs ou Pêras (7-10 un)', 'Legumes para Salada']
  },
  {
    name: 'Laticínios & Proteínas',
    icon: '🥛',
    items: ['Iogurte Natural ou Skyr (7-10 un)', 'Whey Protein', 'Frango / Peru / Salmão']
  },
  {
    name: 'Frutos Secos',
    icon: '🌰',
    items: ['Avelãs ao natural', 'Cajus ao natural', 'Amêndoas ao natural']
  },
  {
    name: 'Mercearia Saudável',
    icon: '🧴',
    items: ['Manteiga de Amendoim 100%', 'Granola Crunchy ou Aveia', 'Pepitas Chocolate Preto (>70%)']
  }
];

const CheckmarkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function ShoppingList({ meals = [] }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [checkedItems, setCheckedItems] = useState({});
  const [newItemText, setNewItemText] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, completed

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const deleteItem = (categoryIndex, itemToDelete, e) => {
    e.stopPropagation();
    setCategories(prev => prev.map((cat, idx) => {
      if (idx !== categoryIndex) return cat;
      return { ...cat, items: cat.items.filter(item => item !== itemToDelete) };
    }));
  };

  const addItem = (e) => {
    e?.preventDefault();
    const text = newItemText.trim();
    if (!text) return;

    setCategories(prev => {
      const copy = [...prev];
      // Add to last category ("Mercearia Saudável") or create "Outros"
      const target = copy[copy.length - 1];
      if (target) {
        if (!target.items.includes(text)) {
          target.items = [...target.items, text];
        }
      }
      return copy;
    });

    setNewItemText('');
  };

  const syncFromMeals = () => {
    if (!meals || meals.length === 0) return;

    const extracted = [];
    meals.forEach(m => {
      if (!m.desc) return;
      const parts = m.desc.split(/\s*\+\s*/);
      parts.forEach(p => {
        const cleaned = p.trim().replace(/^\d+(\.\d+)?\s*(c\.\s*sopa|c\.\s*chá|g|ml|scoop|copo|fatia|punhado|porção)?\s*/i, '');
        if (cleaned && cleaned.length > 2 && !extracted.includes(cleaned)) {
          extracted.push(cleaned);
        }
      });
    });

    if (extracted.length > 0) {
      setCategories(prev => {
        const othersIndex = prev.findIndex(c => c.name === 'Do Plano Alimentar');
        if (othersIndex >= 0) {
          const updated = [...prev];
          updated[othersIndex].items = Array.from(new Set([...updated[othersIndex].items, ...extracted]));
          return updated;
        }
        return [
          { name: 'Do Plano Alimentar', icon: '🥗', items: extracted },
          ...prev
        ];
      });
    }
  };

  const clearChecked = () => {
    setCheckedItems({});
  };

  // Calculations
  const allItems = categories.flatMap(c => c.items);
  const totalItems = allItems.length;
  const completedCount = allItems.filter(item => !!checkedItems[item]).length;
  const pendingCount = totalItems - completedCount;
  const progressPct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  return (
    <div>
      {/* Title */}
      <div className="page-title-row">
        <h1 className="page-title">Lista de Compras</h1>
        <p className="page-subtitle">Organiza o abastecimento semanal com facilidade</p>
      </div>

      {/* Progress Card */}
      <div className="progress-card">
        <div className="progress-header">
          <div>
            <div className="progress-label">Carrinho de Compras</div>
            <div className="progress-number">{completedCount} de {totalItems}</div>
            <div className="progress-sub">
              {completedCount === totalItems && totalItems > 0
                ? '🎉 Todos os itens comprados!'
                : `${pendingCount} itens por comprar`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
              {progressPct}%
            </div>
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Quick Add Bar */}
      <form className="shop-add-bar" onSubmit={addItem}>
        <input
          type="text"
          className="shop-add-input"
          placeholder="Adicionar alimento (ex: Bananas, Azeite...)"
          value={newItemText}
          onChange={e => setNewItemText(e.target.value)}
        />
        <button type="submit" className="shop-add-btn">
          <PlusIcon /> Adicionar
        </button>
      </form>

      {/* Sync from plan button */}
      <button className="shop-quick-sync-btn" onClick={syncFromMeals}>
        ⚡ Sincronizar ingredientes do meu plano alimentar
      </button>

      {/* Filter tabs */}
      <div className="segmented-bar">
        <button
          className={`segmented-option${filter === 'all' ? ' active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todos ({totalItems})
        </button>
        <button
          className={`segmented-option${filter === 'pending' ? ' active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Por comprar ({pendingCount})
        </button>
        <button
          className={`segmented-option${filter === 'completed' ? ' active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Comprados ({completedCount})
        </button>
      </div>

      {/* Category Groups */}
      {categories.map((cat, catIdx) => {
        const filteredItems = cat.items.filter(item => {
          const isDone = !!checkedItems[item];
          if (filter === 'pending') return !isDone;
          if (filter === 'completed') return isDone;
          return true;
        });

        if (filteredItems.length === 0) return null;

        return (
          <div key={catIdx} style={{ marginBottom: 16 }}>
            <div className="shop-group-header">
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </div>

            <div>
              {filteredItems.map(item => {
                const isChecked = !!checkedItems[item];
                return (
                  <div
                    key={item}
                    className={`shop-item-row${isChecked ? ' checked' : ''}`}
                    onClick={() => toggleItem(item)}
                  >
                    <div className={`check-btn${isChecked ? ' checked' : ''}`}>
                      {isChecked && <CheckmarkIcon />}
                    </div>
                    <span className="shop-text">{item}</span>
                    <button
                      className="shop-del-btn"
                      onClick={(e) => deleteItem(catIdx, item, e)}
                      title="Remover item"
                      aria-label="Remover item"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Action Footer */}
      {completedCount > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
          <button className="btn-cancel" onClick={clearChecked} style={{ fontSize: '0.8rem' }}>
            Desmarcar todos os comprados
          </button>
        </div>
      )}
    </div>
  );
}