import { Module } from "@nestjs/common";
import { UsersController, UsersMeController } from "./users.controller";
import { UsersService } from "./users.service";
import { MailModule } from "../mail/mail.module";
@Module({
  imports: [MailModule],
  controllers: [UsersMeController, UsersController], // UsersMeController FIRST — /users/me must match before /users/:id
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}