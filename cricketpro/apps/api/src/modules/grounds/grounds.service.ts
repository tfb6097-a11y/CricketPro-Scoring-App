import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateGroundDto } from "./dto/create-ground.dto";
import { UpdateGroundDto } from "./dto/update-ground.dto";

@Injectable()
export class GroundsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroundDto) {
    return this.prisma.ground.create({ data: dto });
  }

  async findAll() {
    return this.prisma.ground.findMany({ orderBy: { name: "asc" } });
  }

  async findOne(id: string) {
    const ground = await this.prisma.ground.findUnique({ where: { id } });
    if (!ground) {
      throw new NotFoundException("Ground not found");
    }
    return ground;
  }

  async update(id: string, dto: UpdateGroundDto) {
    await this.findOne(id);
    return this.prisma.ground.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Hard delete is fine here — Grounds is a simple lookup table (design doc §5.5),
    // not an entity with historical audit requirements like Users/Players.
    // Guard against deleting a ground that has matches scheduled against it.
    const matchCount = await this.prisma.match.count({ where: { groundId: id } });
    if (matchCount > 0) {
      throw new NotFoundException("Cannot delete a ground with matches scheduled against it");
    }
    return this.prisma.ground.delete({ where: { id } });
  }
}