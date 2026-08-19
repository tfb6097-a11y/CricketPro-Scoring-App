import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PlayersService } from "./players.service";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { UpdatePlayerDto } from "./dto/update-player.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { BulkImportDto } from "./dto/bulk-import.dto";

@Controller("players")
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  // Public read — matches Design System §3.6 Player Profile page (no login wall)
  @Get()
  findAll(
    @Query("country") country?: string,
    @Query("role") role?: string,
    @Query("isActive") isActive?: string,
  ) {
    return this.playersService.findAll({
      country,
      role,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.playersService.findOne(id);
  }

  // Writes are ADMIN-only per Design System §5.3
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePlayerDto) {
    return this.playersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.playersService.deactivate(id);
  }

   @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id/reactivate")
  reactivate(@Param("id") id: string) {
    return this.playersService.reactivate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post("bulk-import")
  bulkImport(@Body() dto: BulkImportDto & { replaceExistingSquad?: boolean }) {
    return this.playersService.bulkImport(dto.rows, dto.replaceExistingSquad ?? false);
  }
}