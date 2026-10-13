import React, { useState } from 'react';

const INITIAL_CATEGORIES = [
  {
    name: 'Frescos & Ovos',
    icon: '🥚',
    items: ['Ovos M/L (14-20 un)', 'Maçãs ou Pêras (7-10 un)']
  },
  {
    name: 'Laticínios & Proteínas',
    icon: '🥛',
    items: ['Iogurte Natural ou Skyr (7-10 un)', 'Whey Protein (Chocolate/Baunilha)']
  },
  {
    name: 'Frutos Secos',
    icon: '🌰',
    items: ['Avelãs ao natural', 'Cajus ao natural', 'Amêndoas ao natural']
  },
  {
    name: 'Mercearia Saudável',
    icon: '🧴',
    items: ['Manteiga de Amendoim 100%', 'Granola Crunchy / Aveia', 'Pepitas Chocolate Preto (>70%)']
  }
];

export default function ShoppingList() {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const allItems = INITIAL_CATEGORIES.flatMap(c => c.items);
  const totalItems  = allItems.length;
  const checkedCount = allItems.filter(item => !!checkedItems[item]).length;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Lista de Compras</h1>
        <p className="page-subtitle">Abastecimento semanal do teu plano alimentar</p>
      </div>

      {/* Progress Banner */}
      <div className="banner" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary)', marginBottom: 3 }}>
              Progresso Semanal
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-bright)', letterSpacing: '-0.02em' }}>
              {checkedCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>/ {totalItems} itens</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: '1.5rem', fontWeight: 800,
              color: checkedCount === totalItems ? 'var(--color-primary)' : 'var(--color-text-bright)'
            }}>
              {progress}%
            </span>
            {checkedCount > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                onClick={() => setCheckedItems({})}
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Category Sections */}
      <div className="space-y-4">
        {INITIAL_CATEGORIES.map((cat, idx) => {
          const catChecked = cat.items.filter(item => !!checkedItems[item]).length;
          return (
            <div key={idx} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                <h4 style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--color-primary)',
                }}>
                  {cat.name}
                </h4>
                <span className="badge badge-slate" style={{ marginLeft: 'auto' }}>
                  {catChecked}/{cat.items.length}
                </span>
              </div>

              <div className="space-y-2">
                {cat.items.map((item, i) => {
                  const isChecked = !!checkedItems[item];
                  return (
                    <div
                      key={i}
                      id={`shop-item-${idx}-${i}`}
                      className={`shop-item ${isChecked ? 'checked' : ''}`}
                      onClick={() => toggleItem(item)}
                      role="checkbox"
                      aria-checked={isChecked}
                      tabIndex={0}
                      onKeyDown={e => e.key === ' ' && toggleItem(item)}
                    >
                      <div className="shop-checkbox">
                        <span className="shop-checkbox-inner">✓</span>
                      </div>
                      <span className="shop-item-text">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {checkedCount === totalItems && (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          background: 'rgba(108,191,126,0.07)',
          border: '1px solid rgba(108,191,126,0.18)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>Lista completa!</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Estás preparado para a semana</div>
        </div>
      )}
    </div>
  );
}