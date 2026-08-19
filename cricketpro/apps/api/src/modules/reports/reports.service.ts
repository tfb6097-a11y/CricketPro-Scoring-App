import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Generates a scorecard PDF for a completed (or in-progress) match.
  // Matches Design System §3.3 Scorecard Page layout: batting table, bowling table, fall of wickets.
  async generateScorecardPdf(matchId: string): Promise<Buffer> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: true,
        teamB: true,
        innings: {
          include: {
            overs: { include: { balls: { include: { wicket: true } } } },
          },
        },
      },
    });
    if (!match) {
      throw new NotFoundException("Match not found");
    }

    const playerIds = new Set<string>();
    for (const innings of match.innings) {
      for (const over of innings.overs) {
        for (const ball of over.balls) {
          playerIds.add(ball.strikerId);
          playerIds.add(ball.bowlerId);
        }
      }
    }
    const players = await this.prisma.player.findMany({ where: { id: { in: Array.from(playerIds) } } });
    const playerName = (id: string) => players.find((p) => p.id === id)?.name ?? "Unknown";

    const doc = new PDFDocument({ margin: 40 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    doc.pipe(stream);

    doc.fontSize(18).text(`${match.teamA.name} vs ${match.teamB.name}`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("gray").text(new Date(match.scheduledAt).toLocaleString(), { align: "center" });
    doc.moveDown();

    for (const innings of match.innings) {
      const battingTeam = innings.battingTeamId === match.teamAId ? match.teamA : match.teamB;
      doc.fillColor("black").fontSize(14).text(`${battingTeam.name} — Innings ${innings.inningsNumber}`);
      doc.fontSize(12).text(`${innings.totalRuns}/${innings.totalWickets} (${innings.oversBowled} overs)`);
      doc.moveDown(0.5);

      // Batting summary: aggregate per striker across all balls in this innings
      const battingStats = new Map<string, { runs: number; balls: number; fours: number; sixes: number }>();
      for (const over of innings.overs) {
        for (const ball of over.balls) {
          const stat = battingStats.get(ball.strikerId) ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
          stat.runs += ball.runsOffBat;
          if (ball.isLegalDelivery) stat.balls += 1;
          if (ball.runsOffBat === 4) stat.fours += 1;
          if (ball.runsOffBat === 6) stat.sixes += 1;
          battingStats.set(ball.strikerId, stat);
        }
      }

      doc.fontSize(10).fillColor("gray").text("Batting", { underline: true });
      for (const [playerId, stat] of battingStats) {
        const sr = stat.balls > 0 ? ((stat.runs / stat.balls) * 100).toFixed(1) : "0.0";
        doc
          .fillColor("black")
          .text(`${playerName(playerId)}  —  ${stat.runs} (${stat.balls}b, ${stat.fours}x4, ${stat.sixes}x6, SR ${sr})`);
      }
      doc.moveDown(0.5);

      // Bowling summary: aggregate per bowler across all overs in this innings
      const bowlingStats = new Map<string, { runs: number; balls: number; wickets: number }>();
      for (const over of innings.overs) {
        const stat = bowlingStats.get(over.bowlerId) ?? { runs: 0, balls: 0, wickets: 0 };
        stat.runs += over.runsConceded;
        stat.balls += over.ballsBowled;
        for (const ball of over.balls) {
          if (ball.wicket && ball.wicket.bowlerCredited) stat.wickets += 1;
        }
        bowlingStats.set(over.bowlerId, stat);
      }

      doc.fontSize(10).fillColor("gray").text("Bowling", { underline: true });
      for (const [playerId, stat] of bowlingStats) {
        const overs = `${Math.floor(stat.balls / 6)}.${stat.balls % 6}`;
        const econ = stat.balls > 0 ? ((stat.runs / stat.balls) * 6).toFixed(2) : "0.00";
        doc
          .fillColor("black")
          .text(`${playerName(playerId)}  —  ${overs} overs, ${stat.runs} runs, ${stat.wickets} wkts (econ ${econ})`);
      }
      doc.moveDown();
    }

    doc.end();

    return new Promise((resolve) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}