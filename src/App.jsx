import React, { useState, useEffect } from 'react';
import MealPlan from './componets/MealPlan';
import ShoppingList from './componets/ShoppingList';
import AiChat from './componets/AiChat';
import { DEFAULT_MEALS } from './data/meals';
import { evaluateMealWithAI, GEMINI_API_KEY } from './services/geminiService';

/* ── SVG Tab Icons ── */
const IconCalendar = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="4" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
    <circle cx="8" cy="15" r="1" fill={active ? 'currentColor' : 'none'} />
    <circle cx="12" cy="15" r="1" fill={active ? 'currentColor' : 'none'} />
    <circle cx="16" cy="15" r="1" fill={active ? 'currentColor' : 'none'} />
  </svg>
);

const IconCart = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="20" r="1.5" fill={active ? 'currentColor' : 'none'} />
    <circle cx="18" cy="20" r="1.5" fill={active ? 'currentColor' : 'none'} />
    <path d="M2.5 3h3l2.2 11.2a2 2 0 0 0 2 1.8h8.6a2 2 0 0 0 2-1.6l1.7-8.4H6.5" />
  </svg>
);

const IconChat = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={active ? 2.3 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const KeyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9" />
    <circle cx="7.5" cy="16.5" r="4.5" />
    <path d="M10.5 13.5L19 5l2 2-8.5 8.5" />
  </svg>
);

const TABS = [
  { id: 'plan',     label: 'Plano',     Icon: IconCalendar },
  { id: 'shopping', label: 'Compras',   Icon: IconCart },
  { id: 'chat',     label: 'Assistente',Icon: IconChat },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('plan');
  const [meals, setMeals] = useState(DEFAULT_MEALS);
  const [theme, setTheme] = useState('light');

  // Gemini API Key directly embedded from code / .env
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || GEMINI_API_KEY);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  // Evaluating / Loading state
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Active Pending Review Modal
  const [pendingReview, setPendingReview] = useState(null);

  // Shared Chat History
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Olá! 👋 Sou o teu assistente nutricional local. Estou a par do teu plano alimentar. Sempre que editares uma refeição, dou uma vista de olhos, faço um resumo detalhado e, caso note algum desequilíbrio, dou-te 2 opções para decidires!',
    },
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleOpenSettings = () => {
    setKeyInput(apiKey);
    setIsSettingsOpen(true);
  };

  const handleSaveApiKey = () => {
    const trimmed = keyInput.trim();
    setApiKey(trimmed);
    localStorage.setItem('gemini_api_key', trimmed);
    setIsSettingsOpen(false);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setKeyInput('');
    localStorage.removeItem('gemini_api_key');
    setIsSettingsOpen(false);
  };

  // Called when user clicks "Guardar" on any meal in MealPlan
  const handleMealEdit = async (meal, newDesc, newTitle, newTime) => {
    setIsEvaluating(true);

    try {
      const review = await evaluateMealWithAI({
        meal,
        newDesc,
        newTitle,
        newTime,
        apiKey,
      });

      const reviewId = `rev-${Date.now()}`;
      const reviewWithId = { ...review, id: reviewId };

      // POP UP THE MODAL RIGHT ON THE CURRENT PAGE!
      setPendingReview(reviewWithId);

      // Also record event into Chat messages
      if (review.hasIssue) {
        setMessages(prev => [
          ...prev,
          {
            id: reviewId,
            role: 'assistant',
            type: 'meal_review',
            review: reviewWithId,
            status: 'pending',
            text: `👀 **Revisão da alteração em "${review.mealTitle}":**\n\n` +
              `📋 **Resumo da tua refeição:**\n${review.userDesc}\nHorário: ${review.mealTime}\n\n` +
              `⚠️ **Alerta Nutricional — ${review.issueTitle}:**\n${review.issueExplanation}\n\n` +
              `💡 **Sugestão Otimizada da IA:**\n${review.aiSuggestion}\n\n` +
              `Podes escolher fazer o que a IA recomenda ou manter como queres.`,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `ok-${Date.now()}`,
            role: 'assistant',
            text: `👀 **Revisão da alteração em "${review.mealTitle}":**\n\n` +
              `📋 **Resumo da refeição:**\n${review.userDesc}\nHorário: ${review.mealTime}\n\n` +
              `✅ **Aprovado!** A tua refeição está equilibrada e alinhada com o défice calórico.`,
          },
        ]);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  // Option 1: Apply what the AI thinks is best
  const handleApplyAiSuggestion = (review) => {
    setMeals(prev => prev.map(m => m.id === review.mealId ? {
      ...m,
      title: review.mealTitle.trim() || m.title,
      desc: review.aiSuggestion,
      time: review.mealTime || m.time,
    } : m));

    setMessages(prev => prev.map(msg => {
      if (msg.review?.id === review.id) {
        return { ...msg, status: 'ai_accepted' };
      }
      return msg;
    }));

    setMessages(prev => [
      ...prev,
      {
        id: `done-ai-${Date.now()}`,
        role: 'assistant',
        text: `💡 **Sugestão da IA aplicada a "${review.mealTitle}":**\n${review.aiSuggestion}`,
      },
    ]);

    setPendingReview(null);
  };

  // Option 2: Keep it the way the user wants
  const handleKeepUserChoice = (review) => {
    setMeals(prev => prev.map(m => m.id === review.mealId ? {
      ...m,
      title: review.mealTitle.trim() || m.title,
      desc: review.userDesc,
      time: review.mealTime || m.time,
    } : m));

    setMessages(prev => prev.map(msg => {
      if (msg.review?.id === review.id) {
        return { ...msg, status: 'user_kept' };
      }
      return msg;
    }));

    setMessages(prev => [
      ...prev,
      {
        id: `done-user-${Date.now()}`,
        role: 'assistant',
        text: `✋ **Mantiveste a tua escolha para "${review.mealTitle}":**\n${review.userDesc}`,
      },
    ]);

    setPendingReview(null);
  };

  return (
    <div className="app-container">
      {/* ── Top Bar ── */}
      <header className="app-navbar">
        <div className="brand-wrapper">
          <div className="brand-icon">🌱</div>
          <div className="brand-text">Nutri<span>Work</span></div>
        </div>

        <div className="nav-actions">
          <div className="schedule-pill">
            09:00 – 12:50
          </div>

          <button
            className="theme-toggle-btn"
            onClick={handleOpenSettings}
            aria-label="Definições da IA"
            title={apiKey ? 'Modo Gemini Ativo' : 'Definir Chave Gemini (Opcional)'}
            style={{ color: apiKey ? 'var(--primary)' : 'var(--text-sub)' }}
          >
            <KeyIcon />
          </button>

          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Alternar modo claro/escuro"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      {/* ── Main Viewport ── */}
      <main className="app-content">
        {activeTab === 'plan' && (
          <div className="scroll-page">
            <MealPlan
              meals={meals}
              setMeals={setMeals}
              onSaveMeal={handleMealEdit}
              isEvaluating={isEvaluating}
            />
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="scroll-page">
            <ShoppingList meals={meals} />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="chat-page">
            <AiChat
              meals={meals}
              messages={messages}
              setMessages={setMessages}
              onApplyAiSuggestion={handleApplyAiSuggestion}
              onKeepUserChoice={handleKeepUserChoice}
              apiKey={apiKey}
            />
          </div>
        )}
      </main>

      {/* ── Bottom Tab Bar ── */}
      <nav className="app-tabbar">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              className={`tab-item${isActive ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
              aria-label={label}
            >
              <Icon active={isActive} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── AI EVALUATING OVERLAY ── */}
      {isEvaluating && (
        <div className="review-modal-backdrop">
          <div className="review-modal-box" style={{ textAlign: 'center', padding: '30px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🤖✨</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              A IA está a analisar a tua refeição...
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-sub)' }}>
              {apiKey ? 'A consultar Google Gemini 2.5 Flash' : 'A avaliar calorias, açúcares e equilíbrio'}
            </p>
          </div>
        </div>
      )}

      {/* ── AI MEAL REVIEW MODAL (POP-UP NA PÁGINA ONDE ESTÁS) ── */}
      {pendingReview && !isEvaluating && (
        <div className="review-modal-backdrop">
          <div className="review-modal-box">
            <div className="review-modal-header">
              <div className="review-icon-avatar">🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="review-title-sub">Avaliação Nutricional</span>
                  <span className={`api-badge ${pendingReview.source === 'gemini' ? 'gemini' : 'local'}`}>
                    {pendingReview.source === 'gemini' ? 'Google Gemini' : 'IA Local'}
                  </span>
                </div>
                <div className="review-title-main">{pendingReview.mealTitle}</div>
              </div>
            </div>

            <div className="review-card-details">
              <div>
                <div className="review-block-label user">A tua versão:</div>
                <div className="review-block-text">{pendingReview.userDesc}</div>
              </div>

              {pendingReview.hasIssue ? (
                <>
                  <div>
                    <div className="review-block-label warning">⚠️ {pendingReview.issueTitle}:</div>
                    <div className="review-block-text">{pendingReview.issueExplanation}</div>
                  </div>

                  <div>
                    <div className="review-block-label ai">💡 Sugestão Otimizada da IA:</div>
                    <div className="review-block-text" style={{ fontWeight: 600 }}>
                      {pendingReview.aiSuggestion}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="review-block-label ai">✅ Refeição Aprovada:</div>
                  <div className="review-block-text">{pendingReview.issueExplanation}</div>
                </div>
              )}
            </div>

            {/* The 2 options requested by the user */}
            <div className="review-choices-container">
              {pendingReview.hasIssue ? (
                <>
                  <button
                    className="review-btn-ai"
                    onClick={() => handleApplyAiSuggestion(pendingReview)}
                  >
                    💡 Fazer o que a IA acha melhor
                  </button>

                  <button
                    className="review-btn-user"
                    onClick={() => handleKeepUserChoice(pendingReview)}
                  >
                    ✋ Deixar como eu quero
                  </button>
                </>
              ) : (
                <button
                  className="review-btn-ai"
                  onClick={() => handleKeepUserChoice(pendingReview)}
                >
                  Confirmar e Guardar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS MODAL (GEMINI API KEY) ── */}
      {isSettingsOpen && (
        <div className="review-modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div className="review-modal-box" onClick={e => e.stopPropagation()}>
            <div className="review-modal-header">
              <div className="review-icon-avatar">🔑</div>
              <div>
                <div className="review-title-sub">Configuração de IA</div>
                <div className="review-title-main">Chave Gemini (Opcional)</div>
              </div>
            </div>

            <p className="review-summary-text" style={{ marginBottom: 12 }}>
              Insere a tua chave do <strong>Google AI Studio</strong> para ativar a IA do Gemini.
              Se deixares vazio, a app funciona 100% gratuita no <strong>modo local</strong> (ideal para os teus amigos usarem sem chave).
            </p>

            <div style={{ marginBottom: 14 }}>
              <input
                type="password"
                className="input-box"
                placeholder="Cola aqui a tua chave da Gemini (AIzaSy...)"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button className="review-btn-ai" onClick={handleSaveApiKey}>
                Guardar Chave
              </button>
              {apiKey && (
                <button className="review-btn-user" onClick={handleClearApiKey} style={{ color: 'var(--accent-red)' }}>
                  Remover Chave (Voltar ao Modo Gratuito)
                </button>
              )}
              <button className="btn-cancel" onClick={() => setIsSettingsOpen(false)} style={{ textAlign: 'center' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}