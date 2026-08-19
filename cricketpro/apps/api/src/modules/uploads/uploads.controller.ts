import { Controller, Post, UploadedFile, UseInterceptors, UseGuards, Query, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadsService } from "./uploads.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { AppRole } from "../../common/constants/roles.enum";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AppRole.ADMIN)
@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("image")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } })) // 5MB cap
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Query("type") type: string) {
   if (type !== "players" && type !== "teams" && type !== "users" && type !== "grounds" && type !== "tournaments" ) {
      throw new BadRequestException("type query param must be 'players', 'teams', 'users', or 'grounds'");
    }
    const url = await this.uploadsService.uploadImage(file, type);
    return { url };
  }
}