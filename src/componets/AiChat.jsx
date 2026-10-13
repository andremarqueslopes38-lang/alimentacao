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

  // Schedule in minutes
  if (time < 9 * 60)          return meals.find(x => x.id === 'pa');  // before 09:00
  if (time < 10 * 60 + 30)    return meals.find(x => x.id === 'lm');  // 09:00–10:30
  if (time < 12 * 60 + 50)    return meals.find(x => x.id === 'alm'); // 10:30–12:50
  if (time < 18 * 60)         return meals.find(x => x.id === 'lt');  // 12:50–18:00
  return meals.find(x => x.id === 'jan');                               // after 18:00
}

function getNextMeal(meals) {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const time = h * 60 + m;

  if (time < 9 * 60)          return meals.find(x => x.id === 'lm');
  if (time < 10 * 60 + 30)    return meals.find(x => x.id === 'alm');
  if (time < 12 * 60 + 50)    return meals.find(x => x.id === 'lt');
  if (time < 18 * 60)         return meals.find(x => x.id === 'jan');
  return null; // no more meals today
}

/** Generate a full plan summary string */
function getPlanSummary(meals) {
  return meals.map(m => `• **${m.title}** (${m.time}): ${m.desc}`).join('\n');
}

/** Analyze the plan for nutritional issues */
function analyzePlan(meals) {
  const issues = [];

  for (const meal of meals) {
    const d = meal.desc.toLowerCase();

    // Check for high-carb heavy meals
    if (meal.id === 'jan' && (d.includes('arroz') || d.includes('massa') || d.includes('batata') || d.includes('pão'))) {
      issues.push({ meal: meal.title, text: 'O jantar contém hidratos pesados. Para défice calórico convém evitar arroz/massa/batata à noite.' });
    }

    // Check for missing protein at lunch
    if (meal.id === 'alm') {
      const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') || d.includes('ovo') || d.includes('atum') || d.includes('carne') || d.includes('proteína') || d.includes('proteina') || d.includes('salmão');
      if (!hasProtein) {
        issues.push({ meal: meal.title, text: 'O almoço parece não ter fonte clara de proteína. Lembra-te de incluir frango, peixe, ovos ou outro lean protein.' });
      }
    }

    // Check for missing vegetables
    if ((meal.id === 'alm' || meal.id === 'jan') && !d.includes('legum') && !d.includes('salada') && !d.includes('vegetal') && !d.includes('verd')) {
      issues.push({ meal: meal.title, text: `Sem legumes/salada visível em "${meal.title}". Legumes aumentam a saciedade sem comprometer o défice.` });
    }

    // Very short descriptions may signal incomplete meals
    if (meal.desc.length < 20) {
      issues.push({ meal: meal.title, text: `A refeição "${meal.title}" parece incompleta. Tenta detalhar mais o que vais comer.` });
    }
  }

  return issues;
}

/** Core intent matcher — returns a response string based on the question */
function generateResponse(question, meals) {
  const q = question.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove accents for matching

  const get = (id) => meals.find(m => m.id === id);

  // ── Greetings ──
  if (/^(ol[aá]|oi|bom dia|boa tarde|boa noite|hey|ola)/.test(q)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    const current = getCurrentMeal(meals);
    return `${greeting}! 👋 Estou a par do teu plano alimentar e posso ajudar-te com qualquer dúvida.\n\n${current ? `Neste momento devias estar na refeição **${current.title}** (${current.time}).` : 'Parece que já terminaste as refeições de hoje!'}\n\nPodes perguntar-me sobre qualquer refeição, trocas, ou pedir uma análise do teu plano.`;
  }

  // ── What is my current meal ──
  if (/(proxima|agora|agora mesmo|comer agora|que hora|qual e a|refeicao atual|proximo)/.test(q)) {
    const current = getCurrentMeal(meals);
    const next    = getNextMeal(meals);
    if (!current) return 'Parece que não há mais refeições planeadas para hoje. Bom trabalho! 🎉';
    let resp = `**Refeição atual:** ${current.icon} ${current.title} (${current.time})\n${current.desc}`;
    if (next) resp += `\n\n**Próxima:** ${next.icon} ${next.title} (${next.time})`;
    return resp;
  }

  // ── Full plan overview ──
  if (/(plano|resumo|todas as refeicoes|ver tudo|plano completo|hoje|dia todo|dia de hoje)/.test(q)) {
    return `Aqui está o teu plano completo de hoje:\n\n${getPlanSummary(meals)}\n\n📏 Lembra-te: sem balança — usa as medidas de mão e colheres.`;
  }

  // ── Breakfast ──
  if (/(pequeno.almoco|peq.almoco|manha|ovos|cafe da manha|breakfast)/.test(q) && !/lanche/.test(q)) {
    const meal = get('pa');
    return `🥚 **${meal.title}** (${meal.time})\n${meal.desc}\n\n💡 ${meal.swapNote}`;
  }

  // ── Morning snack ──
  if (/(lanche da manha|lanche 1|iogurte.*manha|granola|manteiga de amendoim)/.test(q)) {
    const meal = get('lm');
    return `🥛 **${meal.title}** (${meal.time})\n${meal.desc}\n\n💡 ${meal.swapNote}`;
  }

  // ── Swap PA ↔ LM ──
  if (/(trocar|troca|substituir|intermutav).*(pequeno.almoco|lanche da manha|lanche 1)/.test(q) ||
      /(pequeno.almoco|lanche da manha).*(trocar|troca)/.test(q)) {
    const pa = get('pa');
    const lm = get('lm');
    return `✅ Sim, podes trocar! O Pequeno-Almoço e o Lanche da Manhã são **intermutáveis**:\n\n🥚 **Opção A – Pequeno-Almoço:** ${pa.desc}\n\n🥛 **Opção B – Lanche da Manhã:** ${lm.desc}\n\nA troca não altera o total calórico do dia.`;
  }

  // ── Lunch ──
  if (/(almoco|almocar|almocei|proteina lean|frango|peixe|arroz)/.test(q) && !/lanche/.test(q)) {
    const meal = get('alm');
    return `🍽️ **${meal.title}** (${meal.time})\n${meal.desc}\n\n📏 Medidas: 1 palma de proteína + 1 punho de hidratos + meio prato de vegetais. Sem balança!`;
  }

  // ── Afternoon snack ──
  if (/(lanche da tarde|lanche.*tarde|skyr|kvarg|whey|proteico|aveia|pepitas)/.test(q)) {
    const meal = get('lt');
    return `🥤 **${meal.title}** (${meal.time})\n${meal.desc}\n\n🔁 Tens duas opções:\n• **Opção A** (mais saciante): Iogurte Proteico + Aveia + Pepitas Chocolate\n• **Opção B** (mais prático): Shake Whey + Maçã/Pêra`;
  }

  // ── Dinner ──
  if (/(jantar|jantar|cear|noite|20h|20:00)/.test(q)) {
    const meal = get('jan');
    return `🥗 **${meal.title}** (${meal.time})\n${meal.desc}\n\n💡 ${meal.swapNote}\n\n⚠️ Evita hidratos pesados (arroz/massa/batata) ao jantar — mantém o défice calórico e melhora o sono.`;
  }

  // ── Nuts / fruits secos ──
  if (/(frutos secos|avelhas|avelas|cajus|amendoas|nuts|10 unidades)/.test(q)) {
    return `🌰 **Regra dos Frutos Secos:**\n\nSempre **exatamente 10 unidades** de manhã:\n• 4 avelãs\n• 2 cajus\n• 4 amêndoas\n\n⚠️ Nunca comer do pacote — conta e coloca numa tacinha antes. Isto evita sobrecomer sem perceber.`;
  }

  // ── Protein ──
  if (/(proteina|proteína|protein|musculo|massa muscular)/.test(q)) {
    const alm = get('alm');
    const lt  = get('lt');
    return `💪 **Proteína no teu plano:**\n\n• **Pequeno-Almoço:** 2 Ovos (aprox. 12g)\n• **Almoço:** ${alm.desc} (aprox. 25-35g dependendo da fonte)\n• **Lanche Tarde:** ${lt.desc.includes('Whey') || lt.desc.includes('whey') ? 'Whey Protein (aprox. 25g)' : 'Skyr/Kvarg (aprox. 15-20g)'}\n• **Jantar:** Proteína grelhada (aprox. 20-30g)\n\n🎯 Total estimado: 75-100g de proteína/dia — adequado para manutenção muscular em défice.`;
  }

  // ── Calories ──
  if (/(calorias|caloria|kcal|deficit|défice|emagrecer|perder peso)/.test(q)) {
    return `📊 **Estimativa calórica do teu plano:**\n\n• Pequeno-Almoço: ~250 kcal\n• Lanche Manhã: ~180 kcal\n• Almoço: ~450-550 kcal\n• Lanche Tarde: ~200-250 kcal\n• Jantar: ~300-350 kcal\n\n**Total estimado: 1380-1580 kcal/dia**\n\n💡 Para um adulto sedentário/teletrabalho, isto representa um défice moderado (~300-500 kcal), ideal para perda de gordura sem comprometer a energia no trabalho.`;
  }

  // ── Can I eat X? ──
  if (/(posso comer|posso beber|e permitido|permitido)/.test(q)) {
    const food = q.replace(/(posso comer|posso beber|e permitido|permitido)/g, '').trim();
    if (!food) return 'Claro! Diz-me o alimento específico e digo-te se encaixa no teu plano. 🍽️';
    // Generic advice
    if (/(chocolate|doce|açúcar|acucar|bolo|pastel|snack|chips|batata frita)/.test(food)) {
      return `⚠️ **${food}** não está no teu plano e pode comprometer o défice calórico.\n\nSe tens vontade de algo doce, as **Pepitas de Chocolate Preto (>70%)** estão incluídas no Lanche da Tarde — são uma alternativa controlada.`;
    }
    if (/(cafe|café|cha|chá|agua|água)/.test(food)) {
      return `✅ **${food}** é totalmente permitido! Cafeína e chá podem até ajudar na concentração durante o turno. Mantém a hidratação com pelo menos 1.5L de água por dia.`;
    }
    return `Para "${food}" — se não comprometer o défice calórico do dia e for uma fonte de proteína ou vegetais, geralmente encaixa bem. Tenta substituir por algo equivalente no plano em vez de adicionar. 🎯`;
  }

  // ── Meal swap generically ──
  if (/(trocar|troca|substituir|alternativa)/.test(q)) {
    return `🔄 **Trocas possíveis no teu plano:**\n\n• **Pequeno-Almoço ↔ Lanche Manhã:** Totalmente intermutáveis, sem alterar calorias.\n• **Fonte de proteína no almoço:** Frango → Peru → Peixe → Ovos — todos equivalentes.\n• **Hidrato no almoço:** Arroz → Massa → Batata cozida (mesma porção de 1 punho).\n• **Lanche Tarde Opção A ↔ B:** Iogurte+Aveia ou Whey+Fruta.\n• **Vegetais:** Qualquer legume de folha verde é intercambiável.\n\n⚠️ Não alteres o jantar para algo pesado — a leveza noturna é importante para o défice.`;
  }

  // ── Weight / fat loss tips ──
  if (/(dica|truque|conselho|ajuda|melhorar|otimizar)/.test(q)) {
    return `💡 **3 dicas para maximizar o teu plano:**\n\n1. **Come devagar** — o teu plano tem porções controladas, mas comer devagar aumenta a saciedade natural.\n2. **Hidratação** — bebe um copo de água antes de cada refeição, especialmente antes do almoço.\n3. **Consistência** — respeitar os horários do plano (especialmente o jantar antes das 21h) ajuda o metabolismo e o descanso.\n\n🎯 O teu plano já está bem estruturado — o mais importante é a consistência diária!`;
  }

  // ── Plan analysis request ──
  if (/(analis|avaliar|avaliacão|verificar|ver.*plano|rever.*plano|plano.*bem|correto|certo)/.test(q)) {
    const issues = analyzePlan(meals);
    if (issues.length === 0) {
      return `✅ **Análise do teu plano:**\n\nO teu plano está bem equilibrado! Tem:\n• Proteína em todas as refeições principais\n• Hidratos moderados (almoço)\n• Jantar leve para o défice calórico\n• Lanches saudáveis para manter a energia no teletrabalho\n\n🎯 Continua assim! Consistência é a chave.`;
    }
    const list = issues.map(i => `⚠️ **${i.meal}:** ${i.text}`).join('\n\n');
    return `🔍 **Análise do teu plano atual:**\n\nEncontrei ${issues.length} ponto${issues.length > 1 ? 's' : ''} a melhorar:\n\n${list}\n\nSe editaste alguma refeição no separador "Plano", é com base nessas versões editadas que faço a análise. Podes voltar lá e ajustar! ✏️`;
  }

  // ── What did I eat today / plan summary ──
  if (/(o que comi|o que ja comi|refeicoes feitas|ja fiz)/.test(q)) {
    return `Para saberes quais já fizeste, vai ao separador **📋 Plano** e marca o círculo ✓ em cada refeição que concluíste. Aqui no assistente não tenho acesso a isso em tempo real, mas podes perguntar-me qualquer coisa sobre o conteúdo do plano!`;
  }

  // ── How many meals ──
  if (/(quantas refeicoes|quantas|numero de refeicoes)/.test(q)) {
    return `O teu plano tem **${meals.length} refeições diárias:**\n\n${meals.map(m => `${m.icon} ${m.title} (${m.time})`).join('\n')}\n\nEsta frequência mantém o metabolismo ativo e evita picos de fome durante o teletrabalho.`;
  }

  // ── Default fallback — context-aware ──
  const current = getCurrentMeal(meals);
  return `Não tenho a certeza do que pretendes, mas estou a par do teu plano! 🌿\n\nPodes perguntar-me sobre:\n• **Uma refeição específica** (ex: "o que é o jantar?")\n• **Trocas** (ex: "posso trocar o lanche?")\n• **Análise do plano** (ex: "o meu plano está correto?")\n• **Calorias e proteína**\n• **O que devo comer agora** ${current ? `(sugestão: ${current.icon} ${current.title})` : ''}\n\nO que queres saber?`;
}

/* ══════════════════════════════════════════════════
   QUICK ACTIONS
══════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  { label: '📋 Ver plano hoje',        prompt: 'Mostra-me o meu plano completo de hoje' },
  { label: '🍽️ O que comer agora?',    prompt: 'O que devo comer agora?' },
  { label: '🔄 Posso trocar algo?',    prompt: 'Que trocas posso fazer no meu plano?' },
  { label: '🔍 Analisar plano',        prompt: 'Analisa o meu plano atual e diz se está correto' },
  { label: '💪 Proteína no plano',     prompt: 'Quanta proteína tenho no meu plano?' },
  { label: '🍲 Jantar de hoje',        prompt: 'O que está planeado para o jantar?' },
];

/* ══════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════ */
export default function AiChat({ meals }) {
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Olá! 👋 Já conheço o teu plano alimentar — **${meals.length} refeições** organizadas para o teu horário de teletrabalho.\n\nPodes perguntar-me qualquer coisa sobre o plano, trocas de refeições, ou pedir uma análise completa. Estou aqui para ajudar!`,
    }
  ]);
  const [loading, setLoading]   = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Re-introduce a context message when meals change externally
  const prevMealsRef = useRef(meals);
  useEffect(() => {
    const prev = prevMealsRef.current;
    const changed = meals.filter((m, i) => m.desc !== prev[i]?.desc || m.title !== prev[i]?.title);
    if (changed.length > 0) {
      const names = changed.map(m => m.title).join(', ');
      setMessages(msgs => [
        ...msgs,
        { role: 'assistant', text: `🔄 Reparei que editaste: **${names}**. Já actualizei o meu contexto — qualquer pergunta que faças reflecte o plano atual.` }
      ]);
    }
    prevMealsRef.current = meals;
  }, [meals]);

  const sendMessage = (customText) => {
    const text = customText || input;
    if (!text.trim()) return;

    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setLoading(true);

    // Simulate slight delay for a natural feel
    setTimeout(() => {
      const reply = generateResponse(text, meals);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setLoading(false);
    }, 420);
  };

  /* ── Render message text with basic **bold** markdown ── */
  const renderText = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--color-text-bright)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part === '\n') return <br key={i} />;
      return part;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Assistente</h1>
        <p className="page-subtitle">Já conhece o teu plano · Sem API necessária</p>
      </div>

      {/* Context info card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        background: 'var(--color-primary-dim)',
        border: '1px solid rgba(108,191,126,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '10px var(--space-md)',
        fontSize: '0.78rem',
        color: 'var(--color-primary)',
        fontWeight: 500,
      }}>
        <span>🌿</span>
        <span>
          Assistente local — conhece as tuas <strong>{meals.length} refeições</strong>.
          Edita o plano e as respostas actualizam-se automaticamente.
        </span>
      </div>

      {/* Quick Actions */}
      <div className="chip-row">
        {QUICK_ACTIONS.map((action, i) => (
          <button
            key={i}
            id={`quick-action-${i}`}
            className="chip"
            onClick={() => sendMessage(action.prompt)}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((m, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-end',
              gap: 8,
            }}>
              {m.role === 'assistant' && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--color-primary-dim)',
                  border: '1px solid rgba(108,191,126,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.78rem', flexShrink: 0,
                }}>
                  🌿
                </div>
              )}
              <div className={`chat-bubble ${m.role}`}>
                {renderText(m.text)}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--color-primary-dim)',
                border: '1px solid rgba(108,191,126,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.78rem', flexShrink: 0,
              }}>🌿</div>
              <div className="chat-bubble assistant" style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 14px' }}>
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="chat-input"
            type="text"
            className="input-field"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Pergunta sobre o teu plano..."
          />
          <button
            id="chat-send-btn"
            className="btn btn-primary"
            onClick={() => sendMessage()}
            disabled={loading}
            style={{ flexShrink: 0, padding: '10px 18px', whiteSpace: 'nowrap' }}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}