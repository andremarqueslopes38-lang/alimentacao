/* ══════════════════════════════════════════════════
   NUTRITION REVIEW ENGINE
   Analyzes meal changes against health, deficit,
   sugar, and portion size guidelines.
══════════════════════════════════════════════════ */

export function analyzeMealEdit(meal, newDesc, newTitle, newTime) {
  const rawDesc = newDesc || '';
  const d = rawDesc.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const id = meal?.id || 'meal';
  const title = newTitle || meal?.title || 'Refeição';
  const time = newTime || meal?.time || '';

  let hasIssue = false;
  let issueTitle = '';
  let issueExplanation = '';
  let aiSuggestion = '';
  let prosAndCons = '';

  // ── Extract numeric quantities from the text ──
  // Matches numbers like "90", "90 unid", "90 c. sopa", etc.
  const numbers = (rawDesc.match(/\b\d+(\.\d+)?\b/g) || []).map(Number);
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;

  // ── Check for Absurd / Exaggerated Quantities (e.g. 90 unidades, 50 colheres) ──
  const isHighQty = maxNumber >= 15;
  const isCrazyQty = maxNumber >= 50;

  // ── Sugars & High Glycemic Foods ──
  const sugarKeywords = [
    'mel', 'acucar', 'açucar', 'açúcar', 'doce', 'compota', 'xarope', 'rebuçado',
    'gomas', 'bolo', 'bolacha', 'croissant', 'pastel', 'chocolate', 'nutella',
    'gelado', 'sobremesa', 'refrigerante', 'coca cola', 'ice tea', 'sumo',
    'chocapic', 'cereais acucarados', 'leite condensado'
  ];
  const foundSugar = sugarKeywords.find(k => d.includes(k));

  // ── Fast Food & Fried Foods ──
  const junkKeywords = [
    'frit', 'batata frita', 'nugget', 'hamburguer', 'pizza', 'cachorro',
    'kebab', 'maionese', 'molho', 'croquete', 'rissol', 'panado', 'bacon', 'chourico'
  ];
  const foundJunk = junkKeywords.find(k => d.includes(k));

  // ── 1. Check Crazy/Extreme Quantities (e.g. 90 mel, 90 unidades) ──
  if (isCrazyQty) {
    hasIssue = true;
    issueTitle = `Quantidade extrema detectada (${maxNumber} unidades)`;
    if (d.includes('mel')) {
      issueExplanation = `Uma quantidade de ${maxNumber} unidades de mel representa centenas de gramas de puro açúcar! Isso vai causar uma sobrecarga calórica enorme, travar o défice e disparar os níveis de glicémia.`;
      aiSuggestion = '1 c. chá de Mel (dose moderada) + 1 Iogurte Natural / Skyr + Canela';
      prosAndCons = 'Troca uma sobrecarga de açúcar por uma dose pequena de mel combinada com proteína saciante.';
    } else {
      issueExplanation = `Uma quantidade de ${maxNumber} unidades/doses ultrapassa em larga escala as necessidades energéticas de uma refeição saudável e vai sabotar o défice calórico.`;
      aiSuggestion = rawDesc.replace(/\b\d+(\.\d+)?\b/g, '1') + ' (dose normal de 1 porção controlada)';
      prosAndCons = 'Reduz drasticamente o excesso calórico desnecessário.';
    }
  }

  // ── 2. Check Sugar / Mel / Doces in Any Meal ──
  else if (foundSugar) {
    hasIssue = true;
    const foodName = foundSugar === 'mel' ? 'Mel' : foundSugar;
    issueTitle = `Açúcar concentrado / Alimento glicémico (${foodName})`;

    if (foundSugar === 'mel') {
      issueExplanation = 'O mel é composto quase exclusivamente por frutose e glicose livres. Mesmo sendo natural, em quantidade elevada gera um pico violento de insulina que bloqueia a queima de gordura e abre o apetite pouco tempo depois.';
      aiSuggestion = '1 Iogurte Natural ou Skyr + Canela em pó + 1 c. chá de Mel (apenas se necessário)';
    } else {
      issueExplanation = `O alimento "${foodName}" tem densidade calórica e glicémica elevada sem fornecer saciedade duradoura, prejudicando o plano de emagrecimento.`;
      aiSuggestion = '1 Iogurte Proteico + 1 Fruta fresca (Maçã/Frutos Vermelhos) com canela';
    }
    prosAndCons = 'Controla os picos de insulina e mantém o metabolismo focado na oxidação lipídica.';
  }

  // ── 3. High Quantity (> 15) for Spoons/Units ──
  else if (isHighQty && !d.includes(' g') && !d.includes(' ml') && !d.includes('gramas')) {
    hasIssue = true;
    issueTitle = `Porção muito elevada (${maxNumber} unidades)`;
    issueExplanation = `Consumir ${maxNumber} porções deste alimento numa só refeição adiciona calorias desnecessárias ao plano.`;
    aiSuggestion = rawDesc.replace(/\b\d+(\.\d+)?\b/g, '2') + ' (porção moderada)';
    prosAndCons = 'Ajusta a porção para um nível adequado sem passar fome.';
  }

  // ── 4. Fast food / Fritos ──
  else if (foundJunk) {
    hasIssue = true;
    issueTitle = `Frituras ou Fast Food (${foundJunk})`;
    issueExplanation = 'Alimentos fritos e ultraprocessados contêm gorduras saturadas e inflamatórias que dificultam a digestão e provocam letargia durante o trabalho.';
    aiSuggestion = '1 Peito de Frango ou Salmão grelhado + Legumes cozidos ou Salada mista abundante';
    prosAndCons = 'Garante proteína magra e micronutrientes sem gordura oxidada.';
  }

  // ── 5. JANTAR (Dinner) - No heavy carbs ──
  else if (id === 'jan') {
    const hasHeavyCarbs = d.includes('arroz') || d.includes('massa') || d.includes('batata') ||
      d.includes('pao') || d.includes('tosta') || d.includes('lasanha') || d.includes('wrap');
    const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') ||
      d.includes('ovo') || d.includes('atum') || d.includes('salmao') || d.includes('tofu') ||
      d.includes('carne') || d.includes('bife');
    const hasVeggies = d.includes('sopa') || d.includes('legum') || d.includes('salada') ||
      d.includes('vegeta') || d.includes('brocol') || d.includes('couve');

    if (hasHeavyCarbs) {
      hasIssue = true;
      issueTitle = 'Hidratos densos à noite';
      issueExplanation = 'Para maximizar o défice calórico e a queima de gordura durante o sono, o jantar deve ser isento de hidratos densos (arroz, massa, batata ou pão).';
      aiSuggestion = 'Sopa de Legumes sem batata + 1 Palma de Peixe ou Frango Grelhado + Salada abundante';
      prosAndCons = 'Reduz ~250 kcal sem fome e melhora o descanso.';
    } else if (!hasProtein) {
      hasIssue = true;
      issueTitle = 'Jantar sem proteína';
      issueExplanation = 'A proteína à noite é essencial para manter o músculo e acordares sem fome compulsiva.';
      aiSuggestion = `${rawDesc} + 1 Palma de Peito de Frango ou Pescada Grelhada`;
      prosAndCons = 'Aminoácidos para recuperação muscular noturna.';
    } else if (!hasVeggies) {
      hasIssue = true;
      issueTitle = 'Jantar sem vegetais';
      issueExplanation = 'Sem legumes ou sopa, a refeição fica com pouco volume gástrico.';
      aiSuggestion = `1 Prato de Sopa de Legumes sem batata + ${rawDesc}`;
      prosAndCons = 'Fibras e saciedade com quase zero calorias.';
    }
  }

  // ── 6. ALMOÇO (Lunch) - Needs lean protein & salad ──
  else if (id === 'alm') {
    const hasProtein = d.includes('frango') || d.includes('peru') || d.includes('peixe') ||
      d.includes('ovo') || d.includes('atum') || d.includes('salmao') || d.includes('tofu') ||
      d.includes('carne') || d.includes('bife') || d.includes('pescada');
    const hasVeggies = d.includes('salada') || d.includes('legum') || d.includes('vegeta') ||
      d.includes('brocol') || d.includes('cenoura') || d.includes('couve');

    if (!hasProtein) {
      hasIssue = true;
      issueTitle = 'Almoço sem proteína suficiente';
      issueExplanation = 'Precisas de 1 palma da mão de proteína no almoço para garantir saciedade e energia estável à tarde.';
      aiSuggestion = `1 Palma de Peito de Frango / Salmão / Ovos + ${rawDesc}`;
      prosAndCons = 'Proteína lean de alto valor biológico.';
    } else if (!hasVeggies) {
      hasIssue = true;
      issueTitle = 'Almoço sem salada ou legumes';
      issueExplanation = 'Legumes atrasam a digestão dos hidratos e previnem a quebra de energia pós-almoço.';
      aiSuggestion = `${rawDesc} + Salada mista temperada com 1 c. chá de azeite e vinagre`;
      prosAndCons = 'Digestão mais leve e estável.';
    }
  }

  // ── 7. PEQUENO-ALMOÇO - Over 10 nuts ──
  else if (id === 'pa') {
    const hasNuts = d.includes('frutos secos') || d.includes('amendoa') || d.includes('avel') || d.includes('caju');
    if (hasNuts && maxNumber > 10) {
      hasIssue = true;
      issueTitle = 'Excesso de frutos secos (> 10)';
      issueExplanation = 'A regra de ouro do pequeno-almoço é de exatamente 10 frutos secos (4 avelãs, 2 cajus, 4 amêndoas). Acima disso são calorias a mais.';
      aiSuggestion = '2 Ovos Mexidos + 10 Frutos Secos (4 avelãs, 2 cajus, 4 amêndoas)';
      prosAndCons = 'A dose exata de gordura boa para o teu turno.';
    }
  }

  // ── 8. Descrição vazia ──
  if (!hasIssue && rawDesc.trim().length < 4) {
    hasIssue = true;
    issueTitle = 'Refeição muito curta ou incompleta';
    issueExplanation = 'A descrição está vazia ou curta demais para avaliar os macronutrientes.';
    aiSuggestion = `${rawDesc} + 1 Fonte de Proteína + 1 Porção de Vegetais`;
    prosAndCons = 'Detalha os alimentos para manter o plano fiável.';
  }

  return {
    mealId: id,
    mealTitle: title,
    mealTime: time,
    userDesc: rawDesc,
    hasIssue,
    issueTitle: issueTitle || 'Ajuste Nutricional Recomendado',
    issueExplanation: issueExplanation || 'Esta refeição tem potencial para ser otimizada para o teu plano.',
    aiSuggestion: aiSuggestion || '1 Fonte de Proteína Magra + Legumes ou Salada + Porção moderada de Hidratos',
    prosAndCons: prosAndCons || 'Melhora o défice calórico e a saciedade.',
  };
}
