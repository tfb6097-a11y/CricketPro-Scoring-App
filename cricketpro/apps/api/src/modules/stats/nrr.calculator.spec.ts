import { oversStringToDecimal, calculateNRR } from "./nrr.calculator";

describe("nrr.calculator", () => {
  describe("oversStringToDecimal", () => {
    it("converts 2.4 to 2.6667", () => {
      expect(oversStringToDecimal("2.4")).toBeCloseTo(2.6667, 3);
    });
    it("converts 5.0 to 5", () => {
      expect(oversStringToDecimal("5.0")).toBe(5);
    });
    it("converts 0.0 to 0", () => {
      expect(oversStringToDecimal("0.0")).toBe(0);
    });
  });

  describe("calculateNRR", () => {
    it("returns 0 if overs faced is 0", () => {
      expect(calculateNRR(100, 0, 90, 20)).toBe(0);
    });
    it("positive NRR when scoring rate beats conceding rate", () => {
      const nrr = calculateNRR(180, 20, 150, 20);
      expect(nrr).toBe(1.5);
    });
    it("negative NRR when conceding rate beats scoring rate", () => {
      const nrr = calculateNRR(140, 20, 180, 20);
      expect(nrr).toBe(-2);
    });
  });
});