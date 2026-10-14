import { DEFAULT_MEALS } from '../data/meals.js';

export const DAILY_CALORIE_TARGET = 1800;

// Nutritional reference table per standard unit or portion
const FOOD_CALORIE_MAP = [
  // Açúcares e doces
  { pattern: /\bmel\b/i, perUnit: 60, perSpoon: 60, perTeaSpoon: 30, per100g: 304 },
  { pattern: /\ba[cç][uú]car\b/i, perUnit: 40, perSpoon: 50, perTeaSpoon: 20, per100g: 387 },
  { pattern: /\bchocolate\b/i, perUnit: 55, perSpoon: 60, perTeaSpoon: 35, per100g: 540 },
  { pattern: /\bpepitas\b/i, perUnit: 35, perSpoon: 45, perTeaSpoon: 35, per100g: 500 },
  { pattern: /\bcompota|doce\b/i, perUnit: 50, perSpoon: 55, perTeaSpoon: 25, per100g: 250 },
  { pattern: /\bnutella\b/i, perUnit: 100, perSpoon: 100, perTeaSpoon: 50, per100g: 540 },

  // Ovos e Proteínas
  { pattern: /\bovos?\b/i, perUnit: 78, perSpoon: 78, perTeaSpoon: 40, per100g: 145 },
  { pattern: /\bclaras?\b/i, perUnit: 17, perSpoon: 17, perTeaSpoon: 10, per100g: 52 },
  { pattern: /\bfrango|peru|peito\b/i, perUnit: 165, perSpoon: 40, perTeaSpoon: 20, per100g: 165, defaultPortion: 200 },
  { pattern: /\bpeixe|pescada|atum|bacalhau\b/i, perUnit: 150, perSpoon: 35, perTeaSpoon: 18, per100g: 120, defaultPortion: 180 },
  { pattern: /\bsalm[aã]o\b/i, perUnit: 250, perSpoon: 50, perTeaSpoon: 25, per100g: 208, defaultPortion: 260 },
  { pattern: /\bcarne|bife|vaca\b/i, perUnit: 240, perSpoon: 60, perTeaSpoon: 30, per100g: 220, defaultPortion: 240 },
  { pattern: /\bprote[ií]na|whey\b/i, perUnit: 120, perSpoon: 60, perTeaSpoon: 30, per100g: 380, defaultPortion: 120 },

  // Laticínios
  { pattern: /\biogurte natural\b/i, perUnit: 70, perSpoon: 25, perTeaSpoon: 12, per100g: 60, defaultPortion: 70 },
  { pattern: /\bskyr|kvarg|iogurte proteico\b/i, perUnit: 95, perSpoon: 30, perTeaSpoon: 15, per100g: 65, defaultPortion: 95 },
  { pattern: /\biogurte\b/i, perUnit: 80, perSpoon: 25, perTeaSpoon: 12, per100g: 70, defaultPortion: 80 },
  { pattern: /\bleite\b/i, perUnit: 90, perSpoon: 15, perTeaSpoon: 8, per100g: 50, defaultPortion: 110 },
  { pattern: /\bqueijo\b/i, perUnit: 75, perSpoon: 45, perTeaSpoon: 25, per100g: 300, defaultPortion: 75 },

  // Frutos Secos e Sementes
  { pattern: /\bfrutos secos|am[eê]ndoas?|avel[aã]s?|cajus?|nozes?\b/i, perUnit: 8, perSpoon: 60, perTeaSpoon: 30, per100g: 600, defaultPortion: 80 },
  { pattern: /\bmanteiga de amendoim\b/i, perUnit: 90, perSpoon: 90, perTeaSpoon: 45, per100g: 590 },
  { pattern: /\bsementes?\b/i, perUnit: 10, perSpoon: 55, perTeaSpoon: 25, per100g: 550 },

  // Cereais e Hidratos
  { pattern: /\bgranola\b/i, perUnit: 50, perSpoon: 50, perTeaSpoon: 25, per100g: 450 },
  { pattern: /\baveia\b/i, perUnit: 35, perSpoon: 35, perTeaSpoon: 18, per100g: 370 },
  { pattern: /\barroz\b/i, perUnit: 180, perSpoon: 45, perTeaSpoon: 20, per100g: 130, defaultPortion: 180 },
  { pattern: /\bmassa\b/i, perUnit: 190, perSpoon: 50, perTeaSpoon: 25, per100g: 140, defaultPortion: 190 },
  { pattern: /\bbatata\b/i, perUnit: 130, perSpoon: 40, perTeaSpoon: 20, per100g: 85, defaultPortion: 130 },
  { pattern: /\bp[aã]o|fatia\b/i, perUnit: 75, perSpoon: 40, perTeaSpoon: 20, per100g: 260, defaultPortion: 75 },

  // Gorduras
  { pattern: /\bazeite|spray azeite\b/i, perUnit: 40, perSpoon: 120, perTeaSpoon: 40, per100g: 884, defaultPortion: 40 },
  { pattern: /\bmanteiga\b/i, perUnit: 50, perSpoon: 100, perTeaSpoon: 40, per100g: 720 },

  // Legumes e Sopas
  { pattern: /\bsopa\b/i, perUnit: 80, perSpoon: 15, perTeaSpoon: 8, per100g: 35, defaultPortion: 80 },
  { pattern: /\blegumes|salada|vegetais\b/i, perUnit: 40, perSpoon: 15, perTeaSpoon: 8, per100g: 30, defaultPortion: 45 },

  // Frutas
  { pattern: /\bbanana\b/i, perUnit: 95, perSpoon: 30, perTeaSpoon: 15, per100g: 89, defaultPortion: 95 },
  { pattern: /\bma[cç][aã]|p[eê]ra|laranja\b/i, perUnit: 65, perSpoon: 20, perTeaSpoon: 10, per100g: 52, defaultPortion: 65 },
  { pattern: /\bfrutos vermelhos|morangos\b/i, perUnit: 40, perSpoon: 20, perTeaSpoon: 10, per100g: 40, defaultPortion: 40 },

  // Fast food / calóricos
  { pattern: /\bpizza\b/i, perUnit: 280, perSpoon: 100, perTeaSpoon: 50, per100g: 270, defaultPortion: 280 },
  { pattern: /\bhamb[uú]rguer|burger\b/i, perUnit: 500, perSpoon: 150, perTeaSpoon: 70, per100g: 280, defaultPortion: 500 },
  { pattern: /\bbatata frita\b/i, perUnit: 350, perSpoon: 80, perTeaSpoon: 40, per100g: 312, defaultPortion: 350 },
  { pattern: /\bcroissant|bolo|pastel\b/i, perUnit: 350, perSpoon: 90, perTeaSpoon: 45, per100g: 400, defaultPortion: 350 },
];

/**
 * Calculates estimated calories for a single meal.
 * If the description matches the default and default calories exist, returns calibrated default.
 * Otherwise parses quantities and ingredients.
 */
export function estimateMealCalories(mealOrDesc, fallbackDefault = null) {
  const desc = typeof mealOrDesc === 'string' ? mealOrDesc : (mealOrDesc?.desc || '');
  if (!desc.trim()) return fallbackDefault || 0;

  // Check if it exactly matches any DEFAULT_MEALS item
  const matchedDefault = DEFAULT_MEALS.find(d => d.desc === desc);
  if (matchedDefault && matchedDefault.calories) {
    return matchedDefault.calories;
  }

  // If this meal object has a predefined calibrated calorie number and wasn't changed
  if (typeof mealOrDesc === 'object' && mealOrDesc !== null) {
    if (mealOrDesc._customCalories) return mealOrDesc._customCalories;
    if (mealOrDesc.id) {
      const def = DEFAULT_MEALS.find(d => d.id === mealOrDesc.id);
      if (def && def.desc === mealOrDesc.desc) return def.calories;
    }
  }

  const parts = desc.split(/\s*\+\s*/);
  let totalKcal = 0;
  let itemsFound = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Detect numeric quantities and measure units
    const numMatch = trimmed.match(/^(\d+(?:[,.]?\d+)?)/);
    const quantity = numMatch ? parseFloat(numMatch[1].replace(',', '.')) : null;

    const isTea = /\bc\.\s*ch[aá]|colher(?:es)?\s+de\s+ch[aá]\b/i.test(trimmed);
    const isSoup = /\bc\.\s*sopa|colher(?:es)?\s+de\s+sopa\b/i.test(trimmed);
    const isGrams = /\b(\d+)\s*g\b/i.exec(trimmed);

    // Look for matching food
    let matchedFood = null;
    for (const food of FOOD_CALORIE_MAP) {
      if (food.pattern.test(trimmed)) {
        matchedFood = food;
        break;
      }
    }

    if (matchedFood) {
      itemsFound++;
      let itemKcal = 0;

      if (isGrams) {
        const grams = parseFloat(isGrams[1]);
        itemKcal = Math.round((grams / 100) * (matchedFood.per100g || 150));
      } else if (isTea) {
        const q = quantity !== null ? quantity : 1;
        itemKcal = Math.round(q * (matchedFood.perTeaSpoon || 25));
      } else if (isSoup) {
        const q = quantity !== null ? quantity : 1;
        itemKcal = Math.round(q * (matchedFood.perSpoon || 50));
      } else if (quantity !== null) {
        // e.g. "90 mel" or "2 ovos" or "10 frutos secos"
        itemKcal = Math.round(quantity * (matchedFood.perUnit || 50));
      } else {
        itemKcal = matchedFood.defaultPortion || matchedFood.perUnit || 80;
      }

      totalKcal += itemKcal;
    } else {
      // Unknown item: fallback estimate based on quantity
      if (quantity !== null && quantity > 0) {
        // If someone wrote e.g. "90 unidades"
        totalKcal += Math.round(quantity * 40);
        itemsFound++;
      } else {
        totalKcal += 70; // generic portion estimate
        itemsFound++;
      }
    }
  }

  // If nothing matched, use fallback or generic estimate
  if (itemsFound === 0) {
    return fallbackDefault || 250;
  }

  return Math.max(10, Math.round(totalKcal));
}

/**
 * Calculates total daily calories for all meals.
 */
export function calculateTotalCalories(meals = []) {
  return meals.reduce((sum, m) => {
    // If meal has a fixed calibrated calorie and desc hasn't changed from original:
    const kcal = estimateMealCalories(m, m.calories || 300);
    return sum + kcal;
  }, 0);
}

/**
 * Calculates consumed calories from completed meals.
 */
export function calculateConsumedCalories(meals = [], doneMealsMap = {}) {
  return meals.reduce((sum, m) => {
    if (!doneMealsMap[m.id]) return sum;
    const kcal = estimateMealCalories(m, m.calories || 300);
    return sum + kcal;
  }, 0);
}

/**
 * Returns status, color badge, and message for a calorie total relative to the 1800 target.
 */
export function getCalorieStatus(totalKcal, target = DAILY_CALORIE_TARGET) {
  const diff = totalKcal - target;
  const lowerBound = target - 150;
  const upperBound = target + 80;
  const mildBound = target + 250;

  if (totalKcal >= lowerBound && totalKcal <= upperBound) {
    return {
      status: 'optimal',
      label: 'Défice Perfeito',
      color: 'var(--primary)',
      badgeClass: 'cal-badge-optimal',
      message: `No alvo para perda de gordura (~${target} kcal)`,
      diff,
    };
  }

  if (totalKcal < lowerBound) {
    return {
      status: 'under',
      label: 'Défice Agressivo',
      color: '#0284c7', // sky-600
      badgeClass: 'cal-badge-under',
      message: `${Math.abs(diff)} kcal abaixo do teu alvo de ${target} kcal`,
      diff,
    };
  }

  if (totalKcal <= mildBound) {
    return {
      status: 'mild_surplus',
      label: 'Ligeiramente Alto',
      color: '#d97706', // amber-600
      badgeClass: 'cal-badge-mild',
      message: `+${diff} kcal acima do teu alvo de ${target} kcal`,
      diff,
    };
  }

  return {
    status: 'surplus',
    label: 'Excesso Calórico',
    color: '#e11d48', // rose-600
    badgeClass: 'cal-badge-high',
    message: `+${diff} kcal acima do teu alvo de ${target} kcal`,
    diff,
  };
}
