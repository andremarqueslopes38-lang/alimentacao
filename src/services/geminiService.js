/* ══════════════════════════════════════════════════
   REAL GOOGLE GEMINI NUTRITION ENGINE
   Full conversational LLM powered by Google Gemini API
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

/** Evaluates an edited meal using Google Gemini */
export async function evaluateMealWithAI({
  meal,
  newDesc,
  newTitle,
  newTime,
  apiKey,
}) {
  const key = (apiKey || GEMINI_API_KEY).trim();

  const prompt = `És um nutricionista desportivo experiente, humano, honesto e focado em défice calórico saudável para alguém em teletrabalho (09:00 - 12:50).
O utilizador alterou uma refeição do seu plano alimentar:
- Refeição: ${newTitle || meal?.title}
- Horário: ${newTime || meal?.time}
- O que o utilizador escreveu que vai comer: "${newDesc}"

A tua tarefa:
1. Analisa como um nutricionista real. Dá a tua opinião sincera.
2. Se houver excesso evidente de açúcar (ex: mel em quantidade, doces, bolos), quantidades absurdas (ex: 90 unidades de qualquer coisa), gorduras pesadas/fritos, ou hidratos densos à noite no jantar (arroz/massa/batata que prejudicam o sono e défice), deves marcar "hasIssue": true!
3. Se "hasIssue" for true:
   - "issueTitle": Nome curto e chamativo do problema (ex: Sobrecarga extrema de açúcar, Falta de proteína, etc.)
   - "issueExplanation": A tua opinião real e direta em 2 frases explicando por que é prejudicial para o défice calórico ou energia.
   - "aiSuggestion": A tua sugestão concreta, saborosa e equilibrada de alimentos alternativos (com medidas realistas).
4. Se a refeição for boa e saudável, marca "hasIssue": false com uma opinião encorajadora e realista.

Responde OBRIGATORIAMENTE em JSON puro (sem markdown \`\`\`):
{
  "hasIssue": true ou false,
  "issueTitle": "Título do problema ou vazio se estiver bem",
  "issueExplanation": "A tua opinião sincera como nutricionista",
  "aiSuggestion": "Receita ou sugestão equilibrada da IA",
  "prosAndCons": "Por que a tua sugestão funciona melhor",
  "summary": "Resumo rápido do que o utilizador colocou"
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

      return {
        source: 'gemini',
        modelUsed: model,
        mealId: meal.id,
        mealTitle: newTitle || meal.title,
        mealTime: newTime || meal.time,
        userDesc: newDesc,
        hasIssue: Boolean(parsed.hasIssue),
        issueTitle: parsed.issueTitle || 'Ajuste Nutricional',
        issueExplanation: parsed.issueExplanation || 'Opinião do nutricionista sobre a refeição.',
        aiSuggestion: parsed.aiSuggestion || 'Opção equilibrada com proteína e vegetais.',
        prosAndCons: parsed.prosAndCons || 'Melhora a saciedade e défice.',
        summary: parsed.summary || newDesc,
      };
    } catch (e) {
      console.warn(`Gemini model ${model} error:`, e);
    }
  }

  // Fallback to local analysis if network/API limits spike
  const localResult = analyzeMealEdit(meal, newDesc, newTitle, newTime);
  return {
    source: 'local_fallback',
    ...localResult,
  };
}

/** Full conversational response from Google Gemini */
export async function askAssistantAI({ prompt, meals, apiKey }) {
  const key = (apiKey || GEMINI_API_KEY).trim();

  const planContext = (meals || [])
    .map(m => `• ${m.title} (${m.time}): ${m.desc}`)
    .join('\n');

  const systemPrompt = `És o NutriBot, um nutricionista desportivo altamente conhecedor, inteligente, empático e prático. Falas em português europeu (de Portugal).
O utilizador trabalha em teletrabalho (turno das 09:00 às 12:50, com pausa às 10:30) e tem o seguinte plano alimentar:
${planContext}

Objetivo: Défice calórico moderado, manter energia alta durante o turno, saciedade e sono de qualidade.

Instruções para responderes:
1. Responde a QUALQUER pergunta do utilizador com inteligência, honestidade e utilidade real (como um nutricionista de topo ou um amigo especialista).
2. Se te fizerem perguntas óbvias (ex: "posso comer pizza?", "comer 90 mel faz mal?", "o que como se tiver fome às 11h?"), sê direto, responde com clareza, dá a tua opinião real, sem rodeios e sem respostas genéricas pré-feitas.
3. Dá conselhos práticos, quantidades em medidas do dia a dia (colheres, palmas da mão, punhos) e dicas gastronómicas saborosas.
4. Usa formatação limpa com marcadores e negrito (**assim**) para ser super fácil de ler no telemóvel.

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
