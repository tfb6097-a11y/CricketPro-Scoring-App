export type ExtraType = "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE";

/**
 * A delivery counts toward the 6-ball over UNLESS it's a wide or no-ball.
 * Byes and leg-byes are still legal deliveries (the batter just didn't hit it).
 */
export function isLegalDelivery(extraType: ExtraType): boolean {
  return extraType !== "WIDE" && extraType !== "NO_BALL";
}

/**
 * Total runs added to the innings/over total for this single delivery.
 * Wide/No-ball: the extra itself always contributes at least 1 run (the "penalty"),
 * plus any additional byes/overthrows counted in extraRuns, plus bat runs if run on a no-ball.
 */
export function calculateBallRuns(runsOffBat: number, extraType: ExtraType, extraRuns: number): number {
  if (extraType === "WIDE" || extraType === "NO_BALL") {
    // extraRuns here already represents runs beyond the automatic 1, per record-ball.dto contract
    return 1 + extraRuns + (extraType === "NO_BALL" ? runsOffBat : 0);
  }
  // BYE / LEG_BYE / NONE
  return runsOffBat + extraRuns;
}

/**
 * Runs credited to the bowler's figures. Byes/leg-byes and wide-extras beyond bat-runs
 * on a no-ball are NOT charged to the bowler in the "runsOffBat" sense, but wides/no-balls
 * themselves ARE charged to the bowler (conceded runs), while byes/leg-byes are NOT.
 */
export function calculateBowlerConcededRuns(
  runsOffBat: number,
  extraType: ExtraType,
  extraRuns: number,
): number {
  if (extraType === "BYE" || extraType === "LEG_BYE") {
    return 0; // byes/leg-byes don't count against the bowler
  }
  return calculateBallRuns(runsOffBat, extraType, extraRuns);
}

/**
 * Strike rotates on odd runs taken (1, 3, 5...), regardless of legal/illegal delivery,
 * EXCEPT wides/no-balls where no shot was attempted don't rotate strike from extraRuns alone
 * — only bat-run component matters for byes/no-ball-bat-runs; odd total on legal ball rotates too.
 * Simplified rule used here (matches Rules.md §3.2): odd runs-off-bat OR odd bye/leg-bye runs
 * rotates strike. Wide/no-ball extra runs (the penalty itself) never rotate strike by themselves.
 */
export function shouldRotateStrikeForRuns(runsOffBat: number, extraType: ExtraType, extraRuns: number): boolean {
  if (extraType === "WIDE" || extraType === "NO_BALL") {
    // Only bat-run component (runs actually run) rotates strike on a no-ball; wides never involve bat runs.
    return runsOffBat % 2 === 1;
  }
  if (extraType === "BYE" || extraType === "LEG_BYE") {
    return extraRuns % 2 === 1;
  }
  return runsOffBat % 2 === 1;
}

/**
 * End-of-over strike swap: regardless of the last ball's run count, strike ALWAYS
 * flips at the end of an over (the non-striker becomes the new striker), per Rules.md §3.4.
 */
export function shouldRotateStrikeForOverEnd(ballsBowledInOver: number): boolean {
  return ballsBowledInOver === 6;
}

/**
 * A bowler cannot bowl two consecutive overs, per Rules.md §3.4.
 */
export function isBowlerEligibleForNextOver(lastOverBowlerId: string | null, candidateBowlerId: string): boolean {
  if (!lastOverBowlerId) return true;
  return lastOverBowlerId !== candidateBowlerId;
}

/**
 * Free-hit rule: after a no-ball, the next legal delivery is a free hit.
 * On a free hit, the batter cannot be dismissed EXCEPT by run-out.
 */
export function isDismissalAllowedOnFreeHit(dismissalType: string): boolean {
  return dismissalType === "RUN_OUT";
}

/**
 * Converts total legal balls bowled in an innings into cricket's X.Y overs notation
 * (e.g. 16 legal balls = "2.4", since 2 full overs + 4 balls).
 */
export function formatOversBowled(legalBallsBowled: number): string {
  const overs = Math.floor(legalBallsBowled / 6);
  const balls = legalBallsBowled % 6;
  return `${overs}.${balls}`;
}

/**
 * Determines if the over is complete (6 legal deliveries bowled).
 */
export function isOverComplete(legalBallsInOver: number): boolean {
  return legalBallsInOver >= 6;
}

/**
 * Maiden over: an over where zero runs were conceded to the bowler (byes/leg-byes don't
 * break a maiden since they're not charged to the bowler; wides/no-balls DO break it since
 * they concede runs to the bowler).
 */
export function isMaidenOver(totalBowlerConcededRunsInOver: number): boolean {
  return totalBowlerConcededRunsInOver === 0;
}