import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { GroundsService } from "./grounds.service";
import { CreateGroundDto } from "./dto/create-ground.dto";
import { UpdateGroundDto } from "./dto/update-ground.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";

@Controller("grounds")
export class GroundsController {
  constructor(private readonly groundsService: GroundsService) {}

  @Get()
  findAll() {
    return this.groundsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.groundsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Post()
  create(@Body() dto: CreateGroundDto) {
    return this.groundsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateGroundDto) {
    return this.groundsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.groundsService.remove(id);
  }
}