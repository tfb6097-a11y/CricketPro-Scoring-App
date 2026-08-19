import { PartialType } from "@nestjs/mapped-types";
import { CreateGroundDto } from "./create-ground.dto";

export class UpdateGroundDto extends PartialType(CreateGroundDto) {}