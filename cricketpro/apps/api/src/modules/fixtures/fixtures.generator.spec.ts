import { generateRoundRobinFixtures } from "./fixtures.generator";

describe("generateRoundRobinFixtures", () => {
  it("returns empty array for fewer than 2 teams", () => {
    expect(generateRoundRobinFixtures(["A"])).toEqual([]);
    expect(generateRoundRobinFixtures([])).toEqual([]);
  });

  it("generates 1 fixture for 2 teams", () => {
    const fixtures = generateRoundRobinFixtures(["A", "B"]);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].round).toBe(1);
  });

  it("generates every pair exactly once for 4 teams (6 fixtures for 3 rounds)", () => {
    const teams = ["A", "B", "C", "D"];
    const fixtures = generateRoundRobinFixtures(teams);

    // 4 teams, single round-robin = 4*3/2 = 6 fixtures
    expect(fixtures).toHaveLength(6);

    const seenPairs = new Set<string>();
    for (const f of fixtures) {
      const key = [f.teamAId, f.teamBId].sort().join("-");
      expect(seenPairs.has(key)).toBe(false); // no duplicate pairing
      seenPairs.add(key);
    }
    expect(seenPairs.size).toBe(6);
  });

  it("handles odd team count (5 teams) with byes skipped", () => {
    const teams = ["A", "B", "C", "D", "E"];
    const fixtures = generateRoundRobinFixtures(teams);

    // 5 teams, single round-robin = 5*4/2 = 10 fixtures
    expect(fixtures).toHaveLength(10);
    expect(fixtures.some((f) => f.teamAId === "__BYE__" || f.teamBId === "__BYE__")).toBe(false);
  });
});