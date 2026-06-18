function workloadFactor(hours) {
  if (hours == null) return 0.7;
  if (hours < 10)    return 0.4;
  if (hours < 20)    return 0.6;
  if (hours < 40)    return 0.75;
  if (hours < 80)    return 0.90;
  if (hours < 160)   return 1.05;
  if (hours < 300)   return 1.25;
  return 1.50;
}

// score = (institutionWeightMid / 100) × (relevance / 100) × workloadFactor × 100
function calculateSkillScore(relevance, institutionWeightMid, hours) {
  const raw = (institutionWeightMid / 100) * (relevance / 100) * workloadFactor(hours) * 100;
  return Math.min(100, Math.max(0, Math.round(raw * 10) / 10));
}

module.exports = { calculateSkillScore, workloadFactor };
