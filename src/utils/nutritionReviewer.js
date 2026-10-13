/* ══════════════════════════════════════════════════
   NUTRITION REVIEW ENGINE (Offline & Context-Aware)
   Analyzes meal changes made by the user.
   Provides a summary and, if issues are found,
   offers 2 options: AI recommendation vs. User choice.
══════════════════════════════════════════════════ */

export function reviewMealChange(meal, newDesc, newTitle, newTime) {
  const d = (newDesc || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const id = meal.id;

  let hasIssue = false;
  let explanation = '';
  let aiSuggestion = '';
  let summary = '';

  // 1. JANTAR (Dinner) Rules
  if (id === 'jan') {
    const hasHeavyCarbs = d.includes('arroz') || d.includes('massa') || d.includes('batata') ||
      d.includes('pao') || d.includes('pizza') || d.includes('hamburguer') || d.includes('frita');
    const hasVegetables = d.includes('sopa') || d.includes('legum') || d.includes('salada') ||
      d.includes('vegeta') || d.includes('verde') || d.includes('brocol');
    const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') ||
      d.includes('ovo') || d.includes('carne') || d.includes('atum') || d.includes('salmao') || d.includes('tofu');

    if (hasHeavyCarbs) {
      hasIssue = true;
      explanation = 'O jantar contém hidratos densos (arroz/massa/batata/pão). Para otimizar o défice calórico e a queima de gordura durante o sono, o ideal é evitar hidratos pesados à noite.';
      aiSuggestion = 'Sopa de Legumes (sem batata) + 1 Palma de Peixe ou Frango Grelhado + Salada abundante com azeite moderado';
    } else if (!hasProtein) {
      hasIssue = true;
      explanation = 'O jantar não inclui uma fonte evidente de proteína magra. A proteína à noite é crucial para saciedade e recuperação muscular sem acumular gordura.';
      aiSuggestion = `${newDesc} + 1 Dourada / Salmão ou 1 Peito de Frango grelhado`;
    } else if (!hasVegetables) {
      hasIssue = true;
      explanation = 'Faltam legumes ou sopa de legumes no jantar para fornecer volume, fibras e micronutrientes com poucas calorias.';
      aiSuggestion = `1 Prato de Sopa de Legumes sem batata + ${newDesc}`;
    }
  }

  // 2. ALMOÇO (Lunch) Rules
  else if (id === 'alm') {
    const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') ||
      d.includes('ovo') || d.includes('carne') || d.includes('atum') || d.includes('salmao') ||
      d.includes('tofu') || d.includes('bife');
    const hasVeggies = d.includes('salada') || d.includes('legum') || d.includes('vegeta') ||
      d.includes('verde') || d.includes('brocol') || d.includes('cenoura');

    if (!hasProtein) {
      hasIssue = true;
      explanation = 'O almoço parece não ter proteína magra suficiente. No teu turno de trabalho precisas de 1 palma da mão de proteína para manter foco e massa muscular.';
      aiSuggestion = `1 Palma de Peito de Frango / Salmão / Ovos + ${newDesc}`;
    } else if (!hasVeggies) {
      hasIssue = true;
      explanation = 'Não incluíste legumes ou salada no almoço. Vegetais ajudam a atrasar a digestão e previnem quebras de energia durante a tarde.';
      aiSuggestion = `${newDesc} + Salada mista abundante temperada com 1 c. chá de azeite e vinagre`;
    }
  }

  // 3. PEQUENO-ALMOÇO (Breakfast) Rules
  else if (id === 'pa') {
    const hasJunk = d.includes('acucar') || d.includes('bolacha') || d.includes('croissant') ||
      d.includes('bolo') || d.includes('cereais') || d.includes('chocapic') || d.includes('refrigerante');

    if (hasJunk) {
      hasIssue = true;
      explanation = 'Alimentos com alto teor de açúcar de manhã causam picos de glicémia e quebras de energia acentuadas logo às 10:00.';
      aiSuggestion = '2 Ovos Mexidos (temperados com orégãos e spray de azeite) + 10 Frutos Secos (4 avelãs, 2 cajus, 4 amêndoas)';
    } else if (d.includes('frutos secos') && (d.includes('20') || d.includes('30') || d.includes('pacote'))) {
      hasIssue = true;
      explanation = 'Frutos secos em excesso são muito calóricos. A regra de ouro é exatamente 10 unidades para garantir gorduras boas sem excesso calórico.';
      aiSuggestion = `${newDesc.replace(/20|30|pacote/g, '10')} (exatamente 10 unidades)`;
    }
  }

  // 4. LANCHES (Snacks) Rules
  else if (id === 'lm' || id === 'lt') {
    const hasSugar = d.includes('bolo') || d.includes('chocolate de leite') || d.includes('bolacha');
    if (hasSugar) {
      hasIssue = true;
      explanation = 'Lanches açucarados provocam picos de insulina que travam a queima de gordura no teu plano.';
      aiSuggestion = '1 Iogurte Proteico (Skyr/Kvarg) + 1 c. sopa Granola sem açúcar + 1 c. chá Manteiga de Amendoim';
    }
  }

  // 5. Incomplete / Vague meal
  if (!hasIssue && newDesc.trim().length < 8) {
    hasIssue = true;
    explanation = 'A descrição da refeição parece muito curta ou incompleta para quantificar os nutrientes.';
    aiSuggestion = `${newDesc} + 1 peça de fruta fresca ou iogurte proteico`;
  }

  // Build summary
  if (hasIssue) {
    summary = `Detectei um ponto a melhorar em **${newTitle}**:\n${explanation}`;
  } else {
    summary = `Excelente escolha em **${newTitle}**! A refeição está equilibrada, nutritiva e alinhada com o défice calórico.`;
  }

  return {
    hasIssue,
    explanation,
    aiSuggestion,
    summary,
    userEditedDesc: newDesc,
    userEditedTitle: newTitle,
    userEditedTime: newTime,
    mealId: id,
  };
}
