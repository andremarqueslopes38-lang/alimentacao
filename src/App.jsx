import React, { useState, useEffect } from 'react';
import MealPlan from './componets/MealPlan';
import ShoppingList from './componets/ShoppingList';
import AiChat from './componets/AiChat';
import { DEFAULT_MEALS } from './data/meals';
import { analyzeMealEdit } from './utils/nutritionReviewer';

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

const TABS = [
  { id: 'plan',     label: 'Plano',     Icon: IconCalendar },
  { id: 'shopping', label: 'Compras',   Icon: IconCart },
  { id: 'chat',     label: 'Assistente',Icon: IconChat },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('plan');
  const [meals, setMeals] = useState(DEFAULT_MEALS);
  const [theme, setTheme] = useState('light');

  // Shared Chat History
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Olá! 👋 Sou o teu assistente nutricional local. Estou a par do teu plano alimentar. Sempre que editares uma refeição, eu dou uma vista de olhos, faço um resumo detalhado e, caso note algum desequilíbrio, dou-te 2 opções para decidires!',
    },
  ]);

  // Active Pending Review Modal
  const [pendingReview, setPendingReview] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Called when user clicks "Guardar" on any meal in MealPlan
  const handleMealEdit = (meal, newDesc, newTitle, newTime) => {
    const review = analyzeMealEdit(meal, newDesc, newTitle, newTime);
    const reviewId = `rev-${Date.now()}`;
    const reviewWithId = { ...review, id: reviewId };

    if (review.hasIssue) {
      // 1. Temporarily save user's version in the plan pending choice
      setMeals(prev => prev.map(m => m.id === meal.id ? {
        ...m,
        title: newTitle.trim() || m.title,
        desc: newDesc || m.desc,
        time: newTime || m.time,
      } : m));

      // 2. Add detailed review to Chat with the 2 choices
      setMessages(prev => [
        ...prev,
        {
          id: reviewId,
          role: 'assistant',
          type: 'meal_review',
          review: reviewWithId,
          status: 'pending',
          text: `👀 **Dei uma vista de olhos na tua alteração em "${review.mealTitle}"!**\n\n` +
            `📋 **Resumo da tua refeição:**\n${review.userDesc}\nHorário: ${review.mealTime}\n\n` +
            `⚠️ **Alerta Nutricional — ${review.issueTitle}:**\n${review.issueExplanation}\n\n` +
            `💡 **Sugestão Otimizada da IA:**\n${review.aiSuggestion}\n*(${review.prosAndCons})*\n\n` +
            `O que preferes fazer? Escolhe uma das 2 opções abaixo:`,
        },
      ]);

      // 3. Set pending modal AND jump straight to the Chat tab so user sees the review!
      setPendingReview(reviewWithId);
      setActiveTab('chat');
    } else {
      // Meal is healthy and balanced — Save directly!
      setMeals(prev => prev.map(m => m.id === meal.id ? {
        ...m,
        title: newTitle.trim() || m.title,
        desc: newDesc || m.desc,
        time: newTime || m.time,
      } : m));

      // Add positive summary to chat and jump to Chat
      setMessages(prev => [
        ...prev,
        {
          id: `ok-${Date.now()}`,
          role: 'assistant',
          text: `👀 **Dei uma vista de olhos na tua alteração em "${review.mealTitle}"!**\n\n` +
            `📋 **Resumo da refeição:**\n${review.userDesc}\nHorário: ${review.mealTime}\n\n` +
            `✅ **Está aprovado!** A tua refeição está equilibrada, nutritiva e alinhada com o plano de défice calórico.\n\nO teu plano alimentar foi atualizado com sucesso.`,
        },
      ]);

      setActiveTab('chat');
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

    // Update in-chat review state if present
    setMessages(prev => prev.map(msg => {
      if (msg.review?.id === review.id) {
        return { ...msg, status: 'ai_accepted' };
      }
      return msg;
    }));

    // Add confirmation to chat
    setMessages(prev => [
      ...prev,
      {
        id: `done-ai-${Date.now()}`,
        role: 'assistant',
        text: `💡 **Excelente escolha!** Atualizei a refeição **"${review.mealTitle}"** para a recomendação da IA:\n\n` +
          `• **Nova composição:** ${review.aiSuggestion}\n\n` +
          `O teu plano alimentar está agora 100% equilibrado e pronto a seguir.`,
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

    // Update in-chat review state if present
    setMessages(prev => prev.map(msg => {
      if (msg.review?.id === review.id) {
        return { ...msg, status: 'user_kept' };
      }
      return msg;
    }));

    // Add confirmation to chat
    setMessages(prev => [
      ...prev,
      {
        id: `done-user-${Date.now()}`,
        role: 'assistant',
        text: `✋ **Entendido!** Mantive a tua versão para **"${review.mealTitle}"**:\n\n` +
          `• **Composição:** ${review.userDesc}\n\n` +
          `O plano alimentar foi gravado exatamente como decidiste.`,
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
            onClick={toggleTheme}
            aria-label="Alternar modo claro/escuro"
            title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro'}
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

      {/* ── AI MEAL REVIEW MODAL (Popup option) ── */}
      {pendingReview && (
        <div className="review-modal-backdrop">
          <div className="review-modal-box">
            <div className="review-modal-header">
              <div className="review-icon-avatar">🤖</div>
              <div>
                <div className="review-title-sub">Avaliação Nutricional da IA</div>
                <div className="review-title-main">{pendingReview.mealTitle}</div>
              </div>
            </div>

            <p className="review-summary-text">
              Analisei a tua alteração e encontrei um ponto importante a considerar para o teu plano.
            </p>

            <div className="review-card-details">
              <div>
                <div className="review-block-label user">A tua versão:</div>
                <div className="review-block-text">{pendingReview.userDesc}</div>
              </div>

              <div>
                <div className="review-block-label warning">⚠️ {pendingReview.issueTitle}:</div>
                <div className="review-block-text">{pendingReview.issueExplanation}</div>
              </div>

              <div>
                <div className="review-block-label ai">💡 Sugestão da IA:</div>
                <div className="review-block-text" style={{ fontWeight: 600 }}>
                  {pendingReview.aiSuggestion}
                </div>
              </div>
            </div>

            {/* The 2 options requested by the user */}
            <div className="review-choices-container">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}