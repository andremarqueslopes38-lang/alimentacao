import React, { useState, useRef, useEffect } from 'react';

/* ══════════════════════════════════════════════════
   LOCAL ASSISTANT ENGINE
   Knows the meal plan and responds based on it.
   No API key, no external calls — 100% local.
══════════════════════════════════════════════════ */

/** Returns the current meal that should be eaten based on time of day */
function getCurrentMeal(meals) {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const time = h * 60 + m; // minutes since midnight

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

/** Generate a full plan summary string */
function getPlanSummary(meals) {
  return meals.map(m => `• **${m.title}** (${m.time}): ${m.desc}`).join('\n');
}

/** Analyze the plan for nutritional balance */
function analyzePlan(meals) {
  const issues = [];

  for (const meal of meals) {
    const d = meal.desc.toLowerCase();

    if (meal.id === 'jan' && (d.includes('arroz') || d.includes('massa') || d.includes('batata') || d.includes('pão'))) {
      issues.push({ meal: meal.title, text: 'O jantar contém hidratos pesados. Para défice calórico convém evitar arroz/massa/batata à noite.' });
    }

    if (meal.id === 'alm') {
      const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') || d.includes('ovo') || d.includes('atum') || d.includes('carne') || d.includes('proteína') || d.includes('proteina') || d.includes('salmão');
      if (!hasProtein) {
        issues.push({ meal: meal.title, text: 'O almoço parece não ter fonte clara de proteína. Lembra-te de incluir frango, peixe, ovos ou outro lean protein.' });
      }
    }

    if ((meal.id === 'alm' || meal.id === 'jan') && !d.includes('legum') && !d.includes('salada') && !d.includes('vegetal') && !d.includes('verd')) {
      issues.push({ meal: meal.title, text: `Sem legumes/salada visível em "${meal.title}". Legumes aumentam a saciedade sem comprometer o défice.` });
    }

    if (meal.desc.length < 15) {
      issues.push({ meal: meal.title, text: `A refeição "${meal.title}" parece incompleta. Podes detalhar mais os ingredientes.` });
    }
  }

  return issues;
}

/** Core intent matcher */
function generateResponse(question, meals) {
  const q = question.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const get = (id) => meals.find(m => m.id === id);

  // Greetings
  if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite|hey|ola)/.test(q)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const current = getCurrentMeal(meals);
    return `${greeting}! 👋 Estou a par do teu plano alimentar e posso ajudar-te com qualquer dúvida.\n\n${current ? `Neste momento a tua refeição correspondente é **${current.title}** (${current.time}).` : 'Parece que já concluíste as refeições programadas para hoje!'}\n\nPodes perguntar-me sobre horários, ingredientes, trocas ou pedir uma análise nutricional.`;
  }

  // Current or next meal
  if (/(proxima|agora|agora mesmo|comer agora|que hora|qual e a|refeicao atual|proximo)/.test(q)) {
    const current = getCurrentMeal(meals);
    const next    = getNextMeal(meals);
    if (!current) return 'Parece que não há mais refeições planeadas para hoje. Bom descanso! 🎉';
    let resp = `**Refeição atual:** ${current.icon || '🍽️'} ${current.title} (${current.time})\n${current.desc}`;
    if (next) resp += `\n\n**Próxima:** ${next.icon || '⏱️'} ${next.title} (${next.time})`;
    return resp;
  }

  // Full plan
  if (/(plano|resumo|todas as refeicoes|ver tudo|plano completo|hoje|dia todo|dia de hoje)/.test(q)) {
    return `📋 **O teu plano alimentar atual:**\n\n${getPlanSummary(meals)}\n\n💡 Lembra-te: o Pequeno-Almoço e o Lanche da Manhã são intermutáveis conforme o apetite ou rotina.`;
  }

  // Substitutions / Swaps
  if (/(trocar|posso trocar|substituir|alternativa|mudar|opcao|opcoes)/.test(q)) {
    return `🔄 **Regras de substituição do teu plano:**\n\n` +
      `• **Pequeno-Almoço ⇄ Lanche da Manhã:** Podem ser trocados diretamente sem afetar calorias nem macronutrientes.\n` +
      `• **Frutos Secos:** Devem ser sempre 10 unidades de manhã (4 avelãs, 2 cajus, 4 amêndoas).\n` +
      `• **Lanche da Tarde:** Podes alternar entre a versão com fruta/iogurte ou aveia triturada + pepitas.\n` +
      `• **Almoço/Jantar:** Mantém a proporção de 1 palma de proteína magra e vegetais abundantes.`;
  }

  // Calorie & Deficit questions
  if (/(caloria|calorias|defice|peso|emagrecer|perder peso|macros|kcal)/.test(q)) {
    return `⚖️ **Estratégia calórica do plano:**\n\n` +
      `• **Défice moderado e sustentável:** O plano foi desenhado para criar um défice suave mantendo alta saciedade através de proteína e fibras.\n` +
      `• **Manhã estruturada:** Ovos e frutos secos garantem energia estável durante o teu turno de teletrabalho (09:00 - 12:50).\n` +
      `• **Jantar leve:** Sem hidratos densos à noite para potenciar a oxidação de gordura durante o descanso.`;
  }

  // Specific meal queries
  if (/(pequeno almoço|pequeno-almoco|pequeno almoco|pequeno)/.test(q)) {
    const m = get('pa');
    return m ? `🥚 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 ${m.swapNote || 'Refeição rica em proteína e gorduras boas para começar o dia.'}` : 'Não encontrei o Pequeno-Almoço no plano.';
  }

  if (/(lanche da manha|lanche manha|pausa)/.test(q)) {
    const m = get('lm');
    return m ? `🥛 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 ${m.swapNote || 'Consumir na pausa das 10:30 (25 min).'}` : 'Não encontrei o Lanche da Manhã no plano.';
  }

  if (/(almoco|almoço|12:50)/.test(q)) {
    const m = get('alm');
    return m ? `🍽️ **${m.title}** (${m.time}):\n${m.desc}\n\n💡 Regra de ouro: 1 palma da mão de proteína lean, 1 punho de hidrato e vegetais livres.` : 'Não encontrei o Almoço no plano.';
  }

  if (/(lanche da tarde|lanche tarde)/.test(q)) {
    const m = get('lt');
    return m ? `🥤 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 Iogurte proteico fornece aminoácidos para a tarde, e a aveia previne picos de fome antes do jantar.` : 'Não encontrei o Lanche da Tarde no plano.';
  }

  if (/(jantar|noite|sopa)/.test(q)) {
    const m = get('jan');
    return m ? `🥗 **${m.title}** (${m.time}):\n${m.desc}\n\n💡 ${m.swapNote || 'Refeição leve para garantir ótima digestão e sono de qualidade.'}` : 'Não encontrei o Jantar no plano.';
  }

  // Water & hydration
  if (/(agua|beber|hidrat|liquido)/.test(q)) {
    return `💧 **Hidratação:**\n\nObjetivo diário recomendado: **2 a 2.5 litros de água**.\n• 1 copo ao acordar\n• 1 garrafa durante o turno de teletrabalho (09:00 - 12:50)\n• Café ou chá sem açúcar são bem-vindos.`;
  }

  // Plan Analysis
  if (/(analis|avaliar|esta bom|esta bem|opiniao|o que achas)/.test(q)) {
    const issues = analyzePlan(meals);
    if (issues.length === 0) {
      return `✅ **Excelente equilíbrio!** O teu plano atual cumpre todos os princípios:\n\n• Fontes completas de proteína ao longo do dia\n• Vegetais e fibras presentes\n• Frutos secos controlados\n• Jantar focado em défice e descanso`;
    }
    return `🔍 **Análise do teu plano:**\n\nEncontrei ${issues.length} sugestão(ões):\n\n` +
      issues.map(i => `• **${i.meal}:** ${i.text}`).join('\n') +
      `\n\nPodes ajustar clicando no ícone de lápis na aba **Plano**.`;
  }

  // Protein question
  if (/(proteina|protein)/.test(q)) {
    return `🍗 **Fontes de proteína no teu plano atual:**\n\n` +
      meals.map(m => `• **${m.title}:** ${m.desc}`).join('\n') +
      `\n\nA distribuição equilibrada de proteína em 4-5 refeições estimula a saciedade contínua e a preservação muscular.`;
  }

  // Fallback
  return `Não compreendi totalmente, mas podes perguntar-me sobre:\n\n` +
    `• "O que comer agora?"\n` +
    `• "Posso trocar o pequeno-almoço?"\n` +
    `• "Ver plano completo"\n` +
    `• "Analisar o meu plano"\n` +
    `• "Quantos litros de água beber?"`;
}

const QUICK_ACTIONS = [
  { label: 'O que comer agora?', prompt: 'O que devo comer agora?' },
  { label: 'Ver plano todo',     prompt: 'Mostra-me o plano de hoje completo' },
  { label: 'Posso trocar algo?', prompt: 'Posso trocar alguma refeição?' },
  { label: 'Analisar plano',     prompt: 'Analisa o meu plano alimentar' },
  { label: 'Proteína no plano',  prompt: 'Quanta proteína tenho no plano?' },
  { label: 'Jantar de hoje',     prompt: 'O que tenho para o jantar?' },
];

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export default function AiChat({ meals }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Olá! Sou o teu assistente nutricional local. Estou sincronizado com o teu plano alimentar e respondo a qualquer dúvida sem necessitar de internet ou chaves de API. O que gostarias de saber?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMealsRef = useRef(meals);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Alert in chat if meals were modified in the Plan tab
  useEffect(() => {
    if (prevMealsRef.current !== meals) {
      prevMealsRef.current = meals;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: '🔄 **Plano atualizado!** Reparei que editaste uma refeição. Já sincronizei as alterações e estou pronto para responder com base nos novos dados.',
        },
      ]);
    }
  }, [meals]);

  const sendMessage = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    setTimeout(() => {
      const reply = generateResponse(query, meals);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setLoading(false);
    }, 320);
  };

  const renderText = (txt) => {
    return txt.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <React.Fragment key={i}>
          {parts.map((p, j) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={j} style={{ color: 'var(--label)' }}>{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
          {i < txt.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100svh - 145px)' }}>
      {/* Header */}
      <div className="page-section">
        <div className="section-header">Assistente</div>
        <div className="section-sub">Conhece o teu plano · 100% Offline</div>
      </div>

      {/* Context pill banner */}
      <div className="chat-context-bar">
        <span>🌿</span>
        <span>Assistente sincronizado com as tuas {meals.length} refeições diárias.</span>
      </div>

      {/* Quick Action Chips */}
      <div className="quick-chips">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            className="chip"
            onClick={() => sendMessage(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Message List */}
      <div className="chat-messages" style={{ paddingBottom: 16 }}>
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-row${m.role === 'user' ? ' user' : ''}`}>
            {m.role === 'assistant' && (
              <div className="chat-avatar">🌿</div>
            )}
            <div className={`chat-bubble ${m.role}`}>
              {renderText(m.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-row">
            <div className="chat-avatar">🌿</div>
            <div className="chat-bubble assistant" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Pergunta sobre o teu plano..."
        />
        <button
          className="chat-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Enviar mensagem"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}