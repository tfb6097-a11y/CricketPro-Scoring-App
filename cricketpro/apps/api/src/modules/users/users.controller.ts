import { Controller, Get, Patch, Param, Body, UseGuards, Post } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";
import { CreateUserDto } from "./dto/create-user.dto";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";

@UseGuards(JwtAuthGuard)
@Controller("users/me")
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@CurrentUser("userId") userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch()
  updateMe(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @Body() dto: { name?: string; avatarUrl?: string },
  ) {
    return this.usersService.updateSelf(userId, role, dto);
  }

  @Patch("password")
  changePassword(
    @CurrentUser("userId") userId: string,
    @CurrentUser("role") role: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, role, dto);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN, AppRole.SUPER_ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser("role") requestingUserRole: string) {
    return this.usersService.update(id, dto, requestingUserRole);
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string) {
    return this.usersService.deactivate(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser("role") requestingUserRole: string) {
    return this.usersService.create(dto, requestingUserRole);
  }
}