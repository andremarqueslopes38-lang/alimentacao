import React, { useState, useRef, useEffect } from 'react';
import { askAssistantAI } from '../services/geminiService';

/* ══════════════════════════════════════════════════
   LOCAL ASSISTANT ENGINE
   Knows the meal plan and responds based on it.
   No API key, no external calls — 100% local.
══════════════════════════════════════════════════ */

function getCurrentMeal(meals) {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const time = h * 60 + m;

  if (time < 9 * 60)          return meals.find(x => x.id === 'pa');
  if (time < 10 * 60 + 30)    return meals.find(x => x.id === 'lm');
  if (time < 12 * 60 + 50)    return meals.find(x => x.id === 'alm');
  if (time < 18 * 60)         return meals.find(x => x.id === 'lt');
  return meals.find(x => x.id === 'jan');
}

function getNextMeal(meals) {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const time = h * 60 + m;

  if (time < 9 * 60)          return meals.find(x => x.id === 'lm');
  if (time < 10 * 60 + 30)    return meals.find(x => x.id === 'alm');
  if (time < 12 * 60 + 50)    return meals.find(x => x.id === 'lt');
  if (time < 18 * 60)         return meals.find(x => x.id === 'jan');
  return null;
}

function getPlanSummary(meals) {
  return meals.map(m => `• **${m.title}** (${m.time}): ${m.desc}`).join('\n');
}

function analyzePlan(meals) {
  const issues = [];

  for (const meal of meals) {
    const d = meal.desc.toLowerCase();

    if (meal.id === 'jan' && (d.includes('arroz') || d.includes('massa') || d.includes('batata') || d.includes('pão'))) {
      issues.push({ meal: meal.title, text: 'Contém hidratos pesados à noite. Para défice calórico, prioriza sopa sem batata e vegetais.' });
    }

    if (meal.id === 'alm') {
      const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') || d.includes('ovo') || d.includes('atum') || d.includes('carne') || d.includes('proteína') || d.includes('proteina') || d.includes('salmão');
      if (!hasProtein) {
        issues.push({ meal: meal.title, text: 'Sem fonte clara de proteína no almoço. Inclui frango, peixe, ovos ou carne magra.' });
      }
    }

    if ((meal.id === 'alm' || meal.id === 'jan') && !d.includes('legum') && !d.includes('salada') && !d.includes('vegetal') && !d.includes('verd')) {
      issues.push({ meal: meal.title, text: `Poucos vegetais em "${meal.title}". Vegetais aumentam a saciedade sem comprometer calorias.` });
    }
  }

  return issues;
}

function generateResponse(question, meals) {
  const q = question.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const get = (id) => meals.find(m => m.id === id);

  // Greetings
  if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite|hey|ola)/.test(q)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const current = getCurrentMeal(meals);
    return `${greeting}! 👋 Sou o teu assistente nutricional.\n\n${current ? `Neste momento a refeição programada é **${current.title}** (${current.time}).` : 'Já concluíste o horário das refeições de hoje!'}\n\nPodes perguntar-me sobre trocas, ingredientes ou pedir para avaliar o plano.`;
  }

  // Current or next meal
  if (/(proxima|agora|agora mesmo|comer agora|que hora|qual e a|refeicao atual|proximo)/.test(q)) {
    const current = getCurrentMeal(meals);
    const next    = getNextMeal(meals);
    if (!current) return 'Não há mais refeições programadas para hoje. Bom descanso! 🎉';
    let resp = `🍽️ **Refeição recomendada agora:**\n**${current.title}** (${current.time})\n${current.desc}`;
    if (next) resp += `\n\n⏱️ **Próxima:** ${next.title} (${next.time})`;
    return resp;
  }

  // Full plan
  if (/(plano|resumo|todas as refeicoes|ver tudo|plano completo|hoje|dia todo|dia de hoje)/.test(q)) {
    return `📋 **O teu plano alimentar:**\n\n${getPlanSummary(meals)}\n\n💡 Dica: O Pequeno-Almoço e o Lanche da Manhã são trocáveis.`;
  }

  // Substitutions / Swaps
  if (/(trocar|posso trocar|substituir|alternativa|mudar|opcao|opcoes)/.test(q)) {
    return `🔄 **Substituições permitidas:**\n\n` +
      `• **Pequeno-Almoço ⇄ Lanche da Manhã:** Totalmente intermutáveis sem mudar calorias.\n` +
      `• **Frutos Secos:** 10 unidades fixas pela manhã (4 avelãs, 2 cajus, 4 amêndoas).\n` +
      `• **Lanche da Tarde:** Podes usar skyr ou iogurte natural com aveia triturada.\n` +
      `• **Almoço/Jantar:** Ajusta proteína magra com a medida da palma da mão.`;
  }

  // Calorie & Deficit questions
  if (/(caloria|calorias|defice|peso|emagrecer|perder peso|macros|kcal)/.test(q)) {
    return `⚖️ **Foco no Défice Calórico:**\n\n` +
      `• O plano foi estruturado para manter saciedade elevada através de proteína e fibras nos legumes.\n` +
      `• No jantar, a restrição de hidratos densos (como arroz/massa/batata) facilita a redução calórica diária sem passar fome.`;
  }

  // Specific meal queries
  if (/(pequeno almoço|pequeno-almoco|pequeno almoco|pequeno)/.test(q)) {
    const m = get('pa');
    return m ? `🥚 **${m.title}** (${m.time}):\n${m.desc}` : 'Não encontrei o Pequeno-Almoço no plano.';
  }

  if (/(lanche da manha|lanche manha|pausa)/.test(q)) {
    const m = get('lm');
    return m ? `🥛 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 Consome na pausa das 10:30 (25 min).` : 'Não encontrei o Lanche da Manhã no plano.';
  }

  if (/(almoco|almoço|12:50)/.test(q)) {
    const m = get('alm');
    return m ? `🍽️ **${m.title}** (${m.time}):\n${m.desc}\n\n💡 Lembra-te: 1 palma de proteína, 1 punho de hidrato e vegetais abundantes.` : 'Não encontrei o Almoço no plano.';
  }

  if (/(lanche da tarde|lanche tarde)/.test(q)) {
    const m = get('lt');
    return m ? `🥤 **${m.title}** (${m.time}):\n${m.desc}` : 'Não encontrei o Lanche da Tarde no plano.';
  }

  if (/(jantar|noite|sopa)/.test(q)) {
    const m = get('jan');
    return m ? `🥗 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 Sopa sem batata + proteína magra = sono leve e queima de gordura.` : 'Não encontrei o Jantar no plano.';
  }

  // Water & hydration
  if (/(agua|beber|hidrat|liquido)/.test(q)) {
    return `💧 **Água:** Bebe pelo menos 2 a 2.5 litros ao longo do dia, com foco durante o turno de trabalho das 09:00 às 12:50.`;
  }

  // Plan Analysis
  if (/(analis|avaliar|esta bom|esta bem|opiniao|o que achas)/.test(q)) {
    const issues = analyzePlan(meals);
    if (issues.length === 0) {
      return `✅ **O teu plano está excelente!**\n\nDistribuição equilibrada de proteína, vegetais e gorduras saudáveis, otimizado para o teu horário de trabalho.`;
    }
    return `🔍 **Análise do teu plano:**\n\n` +
      issues.map(i => `• **${i.meal}:** ${i.text}`).join('\n') +
      `\n\nPodes ajustar os ingredientes na aba **Plano**.`;
  }

  // Fallback
  return `Podes perguntar-me:\n\n` +
    `• "O que comer agora?"\n` +
    `• "Posso trocar o lanche?"\n` +
    `• "Ver plano completo"\n` +
    `• "Analisar o plano"\n` +
    `• "O que comer no jantar?"`;
}

const QUICK_ACTIONS = [
  { label: 'O que comer agora?', prompt: 'O que devo comer agora?' },
  { label: 'Ver plano de hoje',  prompt: 'Mostra-me o plano de hoje completo' },
  { label: 'Posso trocar algo?', prompt: 'Posso trocar alguma refeição?' },
  { label: 'Analisar plano',     prompt: 'Analisa o meu plano alimentar' },
  { label: 'Jantar leve',        prompt: 'O que devo comer no jantar?' },
];

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function AiChat({
  meals,
  messages: externalMessages,
  setMessages: externalSetMessages,
  onApplyAiSuggestion,
  onKeepUserChoice,
  apiKey,
}) {
  const [internalMessages, setInternalMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Olá! 👋 Sou o teu assistente nutricional local. Estou a par do teu plano alimentar. Quando editares uma refeição, eu dou uma vista de olhos, faço um resumo e, se notar algo errado, dou-te 2 opções para decidires!',
    },
  ]);

  const messages = externalMessages || internalMessages;
  const setMessages = externalSetMessages || setInternalMessages;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      let reply = null;
      if (apiKey) {
        reply = await askAssistantAI({ prompt: query, meals, apiKey });
      }
      if (!reply) {
        reply = generateResponse(query, meals);
      }
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: reply }]);
    } catch {
      const fallback = generateResponse(query, meals);
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const renderText = (txt) => {
    return txt.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <React.Fragment key={i}>
          {parts.map((p, j) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={j}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
          {i < txt.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="chat-page">
      {/* Top Status Bar */}
      <div className="chat-status-bar">
        <div className="chat-bot-avatar">🤖</div>
        <div className="chat-bot-details">
          <div className="chat-bot-name">NutriBot</div>
          <div className="chat-bot-status">Sincronizado com as tuas {meals.length} refeições</div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="chat-messages-container">
        {messages.map((m, idx) => (
          <div key={m.id || idx} className={`chat-msg-row ${m.role}`}>
            <div className="chat-bubble-box">
              {renderText(m.text)}

              {/* Interactive Meal Review Decision in Chat */}
              {m.type === 'meal_review' && m.review && (
                <div className="chat-review-card">
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      A TUA VERSÃO:
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: 2 }}>
                      {m.review.userEditedDesc}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)' }}>
                      💡 SUGESTÃO DA IA:
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600, marginTop: 2 }}>
                      {m.review.aiSuggestion}
                    </div>
                  </div>

                  {m.status === 'pending' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <button
                        className="review-btn-ai"
                        style={{ padding: '9px 12px', fontSize: '0.82rem' }}
                        onClick={() => onApplyAiSuggestion && onApplyAiSuggestion(m.review)}
                      >
                        💡 Fazer o que a IA acha melhor
                      </button>
                      <button
                        className="review-btn-user"
                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        onClick={() => onKeepUserChoice && onKeepUserChoice(m.review)}
                      >
                        ✋ Deixar como eu quero
                      </button>
                    </div>
                  ) : m.status === 'ai_accepted' ? (
                    <div className="chat-review-decision ai-picked">
                      ✅ Aceitaste a sugestão da IA
                    </div>
                  ) : (
                    <div className="chat-review-decision user-picked">
                      ✋ Optaste por manter a tua versão
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg-row assistant">
            <div className="chat-bubble-box">
              <div className="typing-dots">
                <span className="t-dot" />
                <span className="t-dot" />
                <span className="t-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips Bar */}
      <div className="chat-chips-scroll">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            className="chat-chip-btn"
            onClick={() => sendMessage(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Pinned Bottom Input Bar */}
      <div className="chat-bottom-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-text-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Escreve uma pergunta sobre o teu plano..."
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Enviar"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}