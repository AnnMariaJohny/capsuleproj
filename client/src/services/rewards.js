const pointsPerKg = {
  'Phones & tablets': 8,
  Computers: 6,
  Accessories: 3,
  'Home electronics': 5,
  Other: 2,
}
const creditPerKg = {
  'Phones & tablets': 80,
  Computers: 45,
  Accessories: 15,
  'Home electronics': 20,
  Other: 8,
}

export function estimateRewardPoints({ category, weightKg, ageYears }) {
  const categoryRate = pointsPerKg[category] || pointsPerKg.Other
  const ageMultiplier = 1 + Math.min(Math.max(Number(ageYears) || 0, 0), 10) * 0.04
  return Math.max(0, Math.floor((Number(weightKg) || 0) * categoryRate * ageMultiplier))
}

export function estimateEcoCredit(item) {
  const categoryRate = creditPerKg[item.category] || creditPerKg.Other
  const ageMultiplier = Math.max(0.5, 1 - Math.min(Math.max(Number(item.ageYears) || 0, 0), 12) * 0.04)
  return Math.max(0, Math.round((Number(item.weightKg) || 0) * categoryRate * ageMultiplier))
}
