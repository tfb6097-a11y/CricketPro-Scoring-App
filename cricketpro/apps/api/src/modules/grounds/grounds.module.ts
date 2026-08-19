import { Module } from "@nestjs/common";
import { GroundsController } from "./grounds.controller";
import { GroundsService } from "./grounds.service";

@Module({
  controllers: [GroundsController],
  providers: [GroundsService],
  exports: [GroundsService],
})
export class GroundsModule {}