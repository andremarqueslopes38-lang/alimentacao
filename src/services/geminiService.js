/* ══════════════════════════════════════════════════
   GEMINI & LOCAL HYBRID NUTRITION SERVICE
   Uses Google Gemini API if a key is provided.
   Otherwise seamlessly falls back to local engine.
══════════════════════════════════════════════════ */

import { analyzeMealEdit } from '../utils/nutritionReviewer';

export async function evaluateMealWithAI({
  meal,
  newDesc,
  newTitle,
  newTime,
  apiKey,
}) {
  const cleanKey = (apiKey || '').trim();

  // If NO API key is provided, use the fast local engine
  if (!cleanKey) {
    const localResult = analyzeMealEdit(meal, newDesc, newTitle, newTime);
    return {
      source: 'local',
      ...localResult,
    };
  }

  // If Gemini API Key IS provided, call Google Gemini
  try {
    const prompt = `És um nutricionista desportivo focado em teletrabalho e défice calórico saudável.
O utilizador alterou a seguinte refeição:
- Refeição: ${newTitle || meal.title} (${newTime || meal.time})
- Ingredientes inseridos: "${newDesc}"

Analisa criticamente esta refeição:
1. Tem excesso de açúcares rápidos (ex: mel, doces, açúcar, bolos)?
2. Tem quantidades absurdas ou exageradas (ex: 90 unidades, dezenas de colheres)?
3. Se for jantar, tem hidratos densos (arroz/massa/batata/pão) que prejudicam o descanso noturno?
4. Falta proteína magra ou vegetais/fibras?

Responde ESTRITAMENTE em formato JSON (sem blocos markdown adicionais):
{
  "hasIssue": true ou false,
  "issueTitle": "Título curto do problema (ex: Sobrecarga extrema de Mel)",
  "issueExplanation": "Explicação nutricional clara e direta de 2 frases sobre o impacto no défice e no corpo.",
  "aiSuggestion": "A versão alternativa ideal recomendada pela IA (ingredientes e porções equilibradas).",
  "prosAndCons": "Porque é que a versão da IA é melhor.",
  "summary": "Resumo de 1 frase dos alimentos inseridos."
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;

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

    if (!response.ok) {
      // If 2.5-flash fails, fallback to 1.5-flash
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
      const fallbackResp = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      });

      if (!fallbackResp.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const fbData = await fallbackResp.json();
      const text = fbData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        source: 'gemini',
        mealId: meal.id,
        mealTitle: newTitle || meal.title,
        mealTime: newTime || meal.time,
        userDesc: newDesc,
        hasIssue: !!parsed.hasIssue,
        issueTitle: parsed.issueTitle || 'Ajuste Nutricional',
        issueExplanation: parsed.issueExplanation || 'A refeição pode ser melhorada.',
        aiSuggestion: parsed.aiSuggestion || 'Opção equilibrada com proteína e vegetais',
        prosAndCons: parsed.prosAndCons || 'Otimiza o défice calórico.',
        summary: parsed.summary || newDesc,
      };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    return {
      source: 'gemini',
      mealId: meal.id,
      mealTitle: newTitle || meal.title,
      mealTime: newTime || meal.time,
      userDesc: newDesc,
      hasIssue: !!parsed.hasIssue,
      issueTitle: parsed.issueTitle || 'Ajuste Nutricional',
      issueExplanation: parsed.issueExplanation || 'A refeição pode ser melhorada.',
      aiSuggestion: parsed.aiSuggestion || 'Opção equilibrada com proteína e vegetais',
      prosAndCons: parsed.prosAndCons || 'Otimiza o défice calórico.',
      summary: parsed.summary || newDesc,
    };
  } catch (err) {
    console.warn('Gemini API call failed, falling back to local engine:', err);
    // Smooth fallback to local analysis if API key has issues or network is down
    const localResult = analyzeMealEdit(meal, newDesc, newTitle, newTime);
    return {
      source: 'local_fallback',
      ...localResult,
    };
  }
}

/** General chat response generator (Hybrid: Gemini if key, else Local) */
export async function askAssistantAI({ prompt, meals, apiKey }) {
  const cleanKey = (apiKey || '').trim();

  if (!cleanKey) {
    return null; // Signals caller to use local rule-based response
  }

  try {
    const context = meals.map(m => `- ${m.title} (${m.time}): ${m.desc}`).join('\n');
    const systemPrompt = `És o NutriBot, um assistente nutricional amigável para teletrabalho e défice calórico.
O plano atual do utilizador é:
${context}

Responde de forma concisa, prática e encorajadora em português europeu à seguinte pergunta do utilizador:
"${prompt}"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cleanKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    if (!response.ok) {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;
      const fbResp = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
        }),
      });
      if (!fbResp.ok) return null;
      const fbData = await fbResp.json();
      return fbData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.warn('Gemini chat failed, fallback to local:', err);
    return null;
  }
}
