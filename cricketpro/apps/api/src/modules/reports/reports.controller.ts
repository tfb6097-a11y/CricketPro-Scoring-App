import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { ReportsService } from "./reports.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ADMIN/SCORER only, per Design System §5.11 Reports page — generation is an admin action,
  // though the resulting scorecard itself is public info once published.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.SCORER)
  @Get("scorecard/:matchId")
  async getScorecardPdf(@Param("matchId") matchId: string, @Res() res: Response) {
    const pdfBuffer = await this.reportsService.generateScorecardPdf(matchId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="scorecard-${matchId}.pdf"`,
    });
    res.send(pdfBuffer);
  }
}