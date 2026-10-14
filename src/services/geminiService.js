/* ══════════════════════════════════════════════════
   REAL GOOGLE GEMINI NUTRITION ENGINE
   Full conversational LLM powered by Google Gemini API
   Analyzes meals in context of the entire daily plan
   and respects the user's specific food cravings.
══════════════════════════════════════════════════ */

import { analyzeMealEdit } from '../utils/nutritionReviewer.js';

// Load key from environment variable (Vite) or localStorage
export const GEMINI_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemma-4-26b-a4b-it',
  'gemini-3.5-flash',
];

export function getActiveApiKey(customKey) {
  if (customKey && customKey.trim()) return customKey.trim();
  const stored = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  if (stored && stored.trim()) return stored.trim();
  return GEMINI_API_KEY;
}

/** Evaluates an edited meal using Google Gemini taking the entire daily plan into account */
export async function evaluateMealWithAI({
  meal,
  newDesc,
  newTitle,
  newTime,
  allMeals,
  apiKey,
}) {
  const key = getActiveApiKey(apiKey);

  const planSummary = (allMeals || [])
    .map(m => `- ${m.title} (${m.time}): ${m.desc}`)
    .join('\n');

  const prompt = `És um nutricionista desportivo inteligente, empático, prático e focado em défice calórico saudável para teletrabalho (turno das 09:00 às 12:50).

O utilizador tem este plano alimentar diário completo:
${planSummary}

O utilizador está a alterar especificamente a refeição: "${newTitle || meal?.title}" (${newTime || meal?.time})
- Composição original desta refeição: "${meal?.desc || ''}"
- O que o utilizador quer comer agora: "${newDesc}"

REGRAS OBRIGATÓRIAS DE ANÁLISE:
1. RESPEITA O DESEJO DO UTILIZADOR: Se o utilizador quer comer um alimento específico (por exemplo: mel, chocolate, queijo, pão, fruta, etc.), NUNCA substituas a refeição por algo completamente diferente sem esse alimento (ex: se ele pediu mel, não inventes que ele tem de comer aveia ou legumes em vez de mel).
   - Mantém o alimento que o utilizador escolheu!
   - Se a quantidade for exagerada (ex: 90 unidades de mel, 50 colheres, excesso evidente de calorias), AJUSTA A DOSE para uma quantidade saudável e realista (ex: 1 colher de chá ou 1 colher de sopa de mel) e combina com a base da refeição (ex: manter a proteína habitual como os ovos para dar saciedade).

2. VISÃO GLOBAL DO PLANO COMPLETO DO DIA:
   - Analisa como esta refeição se adequa ao dia todo (défice calórico de ~1800 kcal, energia para o turno de trabalho das 09:00 às 12:50, almoço e jantar leve).
   - Explica na "issueExplanation" ou "prosAndCons" como o ajuste se adequa ao resto do dia (ex: um pouco de mel de manhã fornece energia rápida para iniciar o turno de teletrabalho, e como o jantar é leve sem hidratos densos, o défice diário mantém-se perfeitamente protegido).

3. CRITÉRIOS DE "hasIssue":
   - Se houver doses absurdas/exageradas (ex: 90 unidades), excesso prejudicial de gorduras/frituras, ou hidratos pesados à noite no jantar: "hasIssue": true.
   - Na "aiSuggestion": Mantém o alimento desejado mas com a porção correta e equilibrada com a refeição.
   - Se o que ele escreveu já for equilibrado e realista: "hasIssue": false.

Responde ESTRITAMENTE em formato JSON puro (sem blocos markdown):
{
  "hasIssue": true ou false,
  "issueTitle": "Título curto do alerta",
  "issueExplanation": "A tua opinião sincera tendo em conta o plano diário completo",
  "aiSuggestion": "A versão mantendo o que o utilizador quer mas com a dose adequada (ex: 2 Ovos Mexidos + 1 c. chá de Mel)",
  "prosAndCons": "Por que esta opção respeita a vontade dele e se adequa ao dia todo",
  "summary": "Resumo dos alimentos inseridos"
}`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        source: 'gemini',
        modelUsed: model,
        mealId: meal.id,
        mealTitle: newTitle || meal.title,
        mealTime: newTime || meal.time,
        userDesc: newDesc,
        hasIssue: Boolean(parsed.hasIssue),
        issueTitle: parsed.issueTitle || 'Ajuste de Quantidade',
        issueExplanation: parsed.issueExplanation || 'Opinião do nutricionista tendo em conta o plano diário.',
        aiSuggestion: parsed.aiSuggestion || newDesc,
        prosAndCons: parsed.prosAndCons || 'Equilibra o teu desejo com o défice calórico diário.',
        summary: parsed.summary || newDesc,
      };
    } catch (e) {
      console.warn(`Gemini model ${model} error:`, e);
    }
  }

  // Fallback to local analysis if network/API limits spike
  const localResult = analyzeMealEdit(meal, newDesc, newTitle, newTime, allMeals);
  return {
    source: 'local_fallback',
    ...localResult,
  };
}

/** Full conversational response from Google Gemini */
export async function askAssistantAI({ prompt, meals, apiKey }) {
  const key = getActiveApiKey(apiKey);

  const planContext = (meals || [])
    .map(m => `• ${m.title} (${m.time}): ${m.desc}`)
    .join('\n');

  const systemPrompt = `És o NutriBot, um nutricionista desportivo altamente conhecedor, inteligente, empático e prático. Falas em português europeu (de Portugal).
O utilizador trabalha em teletrabalho (turno das 09:00 às 12:50, com pausa às 10:30) e tem o seguinte plano alimentar:
${planContext}

Objetivo: Défice calórico moderado, manter energia alta durante o turno, saciedade e sono de qualidade.

Instruções para responderes:
1. Responde a QUALQUER pergunta do utilizador com inteligência, honestidade e utilidade real (como um nutricionista de topo ou um amigo especialista).
2. Se te fizerem perguntas diretas (ex: "posso comer mel?", "90 mel faz mal?", "o que como se tiver fome às 11h?"), sê direto, responde com clareza, dá a tua opinião real sem rodeios.
3. Dá conselhos práticos, quantidades em medidas do dia a dia (colheres, palmas da mão, punhos) e dicas gastronómicas saborosas.
4. Tem sempre em conta o plano do dia todo para avaliar se o alimento encaixa ou não no défice.
5. Usa formatação limpa com marcadores e negrito (**assim**) para ser super fácil de ler no telemóvel.

Pergunta do utilizador:
"${prompt}"`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply && reply.trim()) {
        return reply.trim();
      }
    } catch (e) {
      console.warn(`Gemini chat model ${model} error:`, e);
    }
  }

  return null;
}

/**
 * Analyzes a meal photo using Google Gemini Vision (Multimodal).
 * Estimates food items, calories, and evaluates if it is a good choice for the day.
 */
export async function analyzeMealPhotoWithAI({
  imageBase64,
  mimeType = 'image/jpeg',
  meal,
  allMeals = [],
  targetCalories = 1800,
  apiKey,
}) {
  const key = getActiveApiKey(apiKey);

  const planSummary = (allMeals || [])
    .map(m => `- ${m.title} (${m.time}): ${m.desc}`)
    .join('\n');

  const prompt = `És um nutricionista desportivo de topo especialista em análise visual de pratos e refeições.
O utilizador trabalha em teletrabalho (turno das 09:00 às 12:50) e tirou uma fotografia real ao prato para a refeição: "${meal?.title || 'Almoço'}".
O alvo diário de calorias do utilizador é de ~${targetCalories} kcal.

Plano alimentar do utilizador hoje:
${planSummary}

Instruções para analisar esta foto de refeição:
1. IDENTIFICAÇÃO DE ALIMENTOS: Analisa detalhadamente os alimentos visíveis no prato (proteína, hidratos de carbono, vegetais/salada, molhos, gorduras).
2. ESTIMATIVA DE CALORIAS: Calcula com precisão realista as calorias estimadas (em kcal) para as porções visíveis no prato.
3. AVALIAÇÃO SE É BOA OPÇÃO:
   - Determina se é uma boa opção ("isGoodChoice": true/false) para a refeição "${meal?.title || 'Almoço'}" considerando a rotina de teletrabalho e o défice diário de ~${targetCalories} kcal.
   - Dá a tua opinião sincera e direta como nutricionista: se for equilibrado, elogia e explica o benefício; se houver excesso de calorias, molhos ou fritos, alerta com clareza.
4. DESCRIÇÃO FORMATADA: Constrói uma descrição limpa dos alimentos usando "+" (ex: "Peito de Frango Grelhado + Arroz Basmati + Salada de Tomate e Pepino").

Responde ESTRITAMENTE em formato JSON puro (sem blocos markdown):
{
  "recognizedFood": "Nome dos alimentos separados por +",
  "estimatedCalories": 550,
  "isGoodChoice": true ou false,
  "verdictTitle": "Título curto (ex: ✅ Excelente Escolha para o Almoço ou ⚠️ Atenção ao Excesso Calórico)",
  "verdictExplanation": "A tua opinião profissional e direta sobre este prato no plano diário.",
  "tip": "Dica prática para equilibrar (ex: reduz o molho ou adiciona uma salada fresca)."
}`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);

      const calories = typeof parsed.estimatedCalories === 'number'
        ? Math.round(parsed.estimatedCalories)
        : parseInt(parsed.estimatedCalories, 10) || 520;

      return {
        source: 'gemini_vision',
        modelUsed: model,
        recognizedFood: parsed.recognizedFood || 'Refeição Fotografada',
        estimatedCalories: calories,
        isGoodChoice: parsed.isGoodChoice !== undefined ? Boolean(parsed.isGoodChoice) : true,
        verdictTitle: parsed.verdictTitle || (parsed.isGoodChoice ? '✅ Boa Opção para o Plano' : '⚠️ Refeição com Alertas'),
        verdictExplanation: parsed.verdictExplanation || 'A IA analisou os alimentos visíveis no prato e calculou o impacto no défice diário.',
        tip: parsed.tip || 'Mantém a hidratação e porções moderadas.',
      };
    } catch (e) {
      console.warn(`Gemini Vision model ${model} error:`, e);
    }
  }

  // Fallback if API key is invalid or offline
  const fallbackCalories = (meal?.id === 'jan' || meal?.title?.toLowerCase().includes('jantar')) ? 420 : 580;
  return {
    source: 'local_fallback',
    recognizedFood: `${meal?.title || 'Refeição'} Fotografada (Modo Offline)`,
    estimatedCalories: fallbackCalories,
    isGoodChoice: true,
    verdictTitle: '📸 Foto Registada',
    verdictExplanation: 'A tua foto foi capturada com sucesso. No modo local, estimamos uma dose média equilibrada para esta refeição.',
    tip: 'Para análise visual completa dos ingredientes por IA, verifica a tua ligação à internet.',
  };
}
