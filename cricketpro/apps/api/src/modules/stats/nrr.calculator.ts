/**
 * NRR = (total runs scored / total overs faced) - (total runs conceded / total overs bowled)
 * Overs here are DECIMAL overs converted to a true fractional value (e.g. "2.4" overs = 2 + 4/6),
 * not literal decimal — cricket overs are base-6, not base-10.
 */
export function oversStringToDecimal(oversStr: string): number {
  const [wholeStr, ballsStr] = oversStr.split(".");
  const whole = parseInt(wholeStr, 10) || 0;
  const balls = parseInt(ballsStr ?? "0", 10) || 0;
  return whole + balls / 6;
}

export function calculateNRR(
  runsScored: number,
  oversFaced: number, // true decimal overs (use oversStringToDecimal first)
  runsConceded: number,
  oversBowled: number,
): number {
  if (oversFaced === 0 || oversBowled === 0) return 0;
  const scoringRate = runsScored / oversFaced;
  const concedingRate = runsConceded / oversBowled;
  return Math.round((scoringRate - concedingRate) * 1000) / 1000; // 3 decimal places, per schema
}