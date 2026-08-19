export interface FixturePairing {
  teamAId: string;
  teamBId: string;
  round: number;
}

/**
 * Classic round-robin (circle method): fixes team[0], rotates the rest.
 * Every team plays every other team exactly once.
 * If odd number of teams, a "bye" (null) is inserted — that pairing is skipped.
 */
export function generateRoundRobinFixtures(teamIds: string[]): FixturePairing[] {
  if (teamIds.length < 2) {
    return [];
  }

  const teams = [...teamIds];
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) {
    teams.push("__BYE__");
  }

  const numRounds = teams.length - 1;
  const half = teams.length / 2;
  const fixtures: FixturePairing[] = [];

  let rotating = teams.slice(1); // team[0] stays fixed

  for (let round = 0; round < numRounds; round++) {
    const roundTeams = [teams[0], ...rotating];

    for (let i = 0; i < half; i++) {
      const teamA = roundTeams[i];
      const teamB = roundTeams[teams.length - 1 - i];
      if (teamA !== "__BYE__" && teamB !== "__BYE__") {
        fixtures.push({ teamAId: teamA, teamBId: teamB, round: round + 1 });
      }
    }

    // rotate: last element moves to front of the rotating part
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return fixtures;
}