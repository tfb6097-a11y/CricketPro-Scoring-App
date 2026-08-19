import {
  isLegalDelivery,
  calculateBallRuns,
  calculateBowlerConcededRuns,
  shouldRotateStrikeForRuns,
  shouldRotateStrikeForOverEnd,
  isBowlerEligibleForNextOver,
  isDismissalAllowedOnFreeHit,
  formatOversBowled,
  isOverComplete,
  isMaidenOver,
} from "./scoring.rules";

describe("scoring.rules", () => {
  describe("isLegalDelivery", () => {
    it("wide is not legal", () => expect(isLegalDelivery("WIDE")).toBe(false));
    it("no-ball is not legal", () => expect(isLegalDelivery("NO_BALL")).toBe(false));
    it("bye is legal", () => expect(isLegalDelivery("BYE")).toBe(true));
    it("leg-bye is legal", () => expect(isLegalDelivery("LEG_BYE")).toBe(true));
    it("normal ball is legal", () => expect(isLegalDelivery("NONE")).toBe(true));
  });

  describe("calculateBallRuns", () => {
    it("normal 4 runs off bat", () => expect(calculateBallRuns(4, "NONE", 0)).toBe(4));
    it("wide with no extra runs = 1", () => expect(calculateBallRuns(0, "WIDE", 0)).toBe(1));
    it("wide + 2 overthrow extras = 3", () => expect(calculateBallRuns(0, "WIDE", 2)).toBe(3));
    it("no-ball + 2 runs off bat = 3 (1 penalty + 2 bat)", () =>
      expect(calculateBallRuns(2, "NO_BALL", 0)).toBe(3));
    it("2 byes = 2", () => expect(calculateBallRuns(0, "BYE", 2)).toBe(2));
  });

  describe("calculateBowlerConcededRuns", () => {
    it("byes are not charged to bowler", () => expect(calculateBowlerConcededRuns(0, "BYE", 4)).toBe(0));
    it("leg-byes are not charged to bowler", () => expect(calculateBowlerConcededRuns(0, "LEG_BYE", 1)).toBe(0));
    it("wide IS charged to bowler", () => expect(calculateBowlerConcededRuns(0, "WIDE", 0)).toBe(1));
    it("normal runs are charged to bowler", () => expect(calculateBowlerConcededRuns(6, "NONE", 0)).toBe(6));
  });

  describe("shouldRotateStrikeForRuns", () => {
    it("1 run off bat rotates", () => expect(shouldRotateStrikeForRuns(1, "NONE", 0)).toBe(true));
    it("2 runs off bat does not rotate", () => expect(shouldRotateStrikeForRuns(2, "NONE", 0)).toBe(false));
    it("3 byes rotates", () => expect(shouldRotateStrikeForRuns(0, "BYE", 3)).toBe(true));
    it("wide penalty alone does not rotate", () => expect(shouldRotateStrikeForRuns(0, "WIDE", 0)).toBe(false));
  });

  describe("shouldRotateStrikeForOverEnd", () => {
    it("rotates at exactly 6 balls", () => expect(shouldRotateStrikeForOverEnd(6)).toBe(true));
    it("does not rotate before 6 balls", () => expect(shouldRotateStrikeForOverEnd(4)).toBe(false));
  });

  describe("isBowlerEligibleForNextOver", () => {
    it("allows any bowler if no previous over", () =>
      expect(isBowlerEligibleForNextOver(null, "bowler-1")).toBe(true));
    it("blocks the same bowler as last over", () =>
      expect(isBowlerEligibleForNextOver("bowler-1", "bowler-1")).toBe(false));
    it("allows a different bowler", () =>
      expect(isBowlerEligibleForNextOver("bowler-1", "bowler-2")).toBe(true));
  });

  describe("isDismissalAllowedOnFreeHit", () => {
    it("run-out is allowed on free hit", () => expect(isDismissalAllowedOnFreeHit("RUN_OUT")).toBe(true));
    it("bowled is not allowed on free hit", () => expect(isDismissalAllowedOnFreeHit("BOWLED")).toBe(false));
    it("caught is not allowed on free hit", () => expect(isDismissalAllowedOnFreeHit("CAUGHT")).toBe(false));
  });

  describe("formatOversBowled", () => {
    it("0 balls = 0.0", () => expect(formatOversBowled(0)).toBe("0.0"));
    it("16 balls = 2.4", () => expect(formatOversBowled(16)).toBe("2.4"));
    it("6 balls = 1.0", () => expect(formatOversBowled(6)).toBe("1.0"));
  });

  describe("isOverComplete", () => {
    it("6 balls is complete", () => expect(isOverComplete(6)).toBe(true));
    it("5 balls is not complete", () => expect(isOverComplete(5)).toBe(false));
  });

  describe("isMaidenOver", () => {
    it("0 conceded runs is a maiden", () => expect(isMaidenOver(0)).toBe(true));
    it("any conceded runs breaks maiden", () => expect(isMaidenOver(1)).toBe(false));
  });

  // Rules.md §3.3 — every dismissal type explicitly covered
  describe("isDismissalAllowedOnFreeHit — full dismissal matrix", () => {
    it("BOWLED not allowed", () => expect(isDismissalAllowedOnFreeHit("BOWLED")).toBe(false));
    it("CAUGHT not allowed", () => expect(isDismissalAllowedOnFreeHit("CAUGHT")).toBe(false));
    it("LBW not allowed", () => expect(isDismissalAllowedOnFreeHit("LBW")).toBe(false));
    it("STUMPED not allowed", () => expect(isDismissalAllowedOnFreeHit("STUMPED")).toBe(false));
    it("HIT_WICKET not allowed", () => expect(isDismissalAllowedOnFreeHit("HIT_WICKET")).toBe(false));
    it("RETIRED_HURT not allowed", () => expect(isDismissalAllowedOnFreeHit("RETIRED_HURT")).toBe(false));
    it("OTHER not allowed", () => expect(isDismissalAllowedOnFreeHit("OTHER")).toBe(false));
    it("RUN_OUT is the only one allowed", () => expect(isDismissalAllowedOnFreeHit("RUN_OUT")).toBe(true));
  });
});