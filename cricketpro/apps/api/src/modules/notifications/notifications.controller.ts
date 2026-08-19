import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { NotificationType } from "@prisma/client";
import { NotificationsService } from "./notificatons.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { UpdateNotificationDto } from "./dto/update-notification.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { AppRole } from "../../common/constants/roles.enum";

@Controller("notifications/public")
export class NotificationsPublicController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findPublic() {
    const { items } = await this.notificationsService.findAll({
      page: 1,
      pageSize: 20,
    });
    return items.filter((n) => n.status === "SENT");
  }
}
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(AppRole.ADMIN)
  findAll(
    @Query("search") search?: string,
    @Query("type") type?: NotificationType,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.notificationsService.findAll({
      search,
      type,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":id")
  @Roles(AppRole.ADMIN)
  findOne(@Param("id") id: string) {
    return this.notificationsService.findOne(id);
  }

  @Post()
  @Roles(AppRole.ADMIN)
  create(@Body() dto: CreateNotificationDto, @CurrentUser("id") userId: string) {
    return this.notificationsService.create(dto, userId);
  }

  @Patch(":id")
  @Roles(AppRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateNotificationDto) {
    return this.notificationsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(AppRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.notificationsService.remove(id);
  }
}