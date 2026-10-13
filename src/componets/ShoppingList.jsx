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

const CheckmarkIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function ShoppingList() {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleItem = (item) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const clearAll = () => {
    setCheckedItems({});
  };

  const allItems = INITIAL_CATEGORIES.flatMap(c => c.items);
  const totalItems  = allItems.length;
  const checkedCount = allItems.filter(item => !!checkedItems[item]).length;
  const progress = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const isComplete = totalItems > 0 && checkedCount === totalItems;

  return (
    <div className="page-section">
      {/* Page Header */}
      <div className="section-header">Compras</div>
      <div className="section-sub">Abastecimento semanal para o teu plano</div>

      {/* Progress Card */}
      <div className="stat-card">
        <div className="stat-row">
          <div>
            <div className="stat-label">Itens no Carrinho</div>
            <div className={`stat-value${isComplete ? ' done' : ''}`}>
              {checkedCount}/{totalItems}
            </div>
            <div className="stat-caption">
              {isComplete ? 'Tudo pronto para a semana!' : 'Itens marcados no supermercado'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="stat-label">Progresso</div>
            <div className={`stat-value${isComplete ? ' done' : ''}`}>{progress}%</div>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {checkedCount > 0 && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={clearAll} style={{ fontSize: '0.78rem' }}>
              Limpar seleções
            </button>
          </div>
        )}
      </div>

      {/* Categories */}
      {INITIAL_CATEGORIES.map((cat, idx) => (
        <div key={idx} style={{ marginBottom: 14 }}>
          <div className="shop-section-label">
            {cat.icon} {cat.name}
          </div>
          <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--bg-1)' }}>
            {cat.items.map(item => {
              const isChecked = !!checkedItems[item];
              return (
                <div
                  key={item}
                  className={`shop-row${isChecked ? ' checked' : ''}`}
                  onClick={() => toggleItem(item)}
                >
                  <div className={`shop-check${isChecked ? ' checked' : ''}`}>
                    {isChecked && <CheckmarkIcon />}
                  </div>
                  <span className="shop-row-text">{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Celebration card if complete */}
      {isComplete && (
        <div className="stat-card" style={{ textAlign: 'center', padding: '24px 16px', marginTop: 10 }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🛒✨</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--label)', marginBottom: 4 }}>
            Carrinho Completo!
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--label-2)' }}>
            Tens todos os alimentos necessários para seguir o teu plano alimentar à risca.
          </p>
        </div>
      )}
    </div>
  );
}