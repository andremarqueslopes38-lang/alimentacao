import React, { useState } from 'react';
import MealPlan from './componets/MealPlan';
import ShoppingList from './componets/ShoppingList';
import AiChat from './componets/AiChat';
import { DEFAULT_MEALS } from './data/meals';

/* ── Tab icons (SVG) ── */
const IconPlan = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="3"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
  </svg>
);

const IconShopping = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconChat = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const TABS = [
  { id: 'plan',     label: 'Plano',     Icon: IconPlan },
  { id: 'shopping', label: 'Compras',   Icon: IconShopping },
  { id: 'chat',     label: 'Assistente',Icon: IconChat },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('plan');
  const [meals, setMeals] = useState(DEFAULT_MEALS);

  return (
    <div className="app-shell">

      {/* ── Nav Bar ── */}
      <nav className="nav-bar">
        <div>
          <div className="nav-bar-title">NUTRI<span>WORK</span></div>
        </div>
        <div className="nav-bar-badge">09:00 – 12:50</div>
      </nav>

      {/* ── Main ── */}
      <main className="app-main">
        {activeTab === 'plan'     && <MealPlan meals={meals} setMeals={setMeals} />}
        {activeTab === 'shopping' && <ShoppingList />}
        {activeTab === 'chat'     && <AiChat meals={meals} />}
      </main>

      {/* ── Tab Bar ── */}
      <div className="tab-bar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            className={`tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon active={activeTab === id} />
            {label}
          </button>
        ))}
      </div>

    </div>
  );
}