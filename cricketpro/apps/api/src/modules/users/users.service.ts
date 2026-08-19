import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import * as argon2 from "argon2";
import { CreateUserDto } from "./dto/create-user.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { MailService } from "../mail/mail.service";
import { AppRole } from "../../common/constants/roles.enum";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        createdAt: true, avatarUrl: true, hasBeenScorer: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        createdAt: true, avatarUrl: true, hasBeenScorer: true,
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  // Admin-managed update — used by PATCH /users/:id. This is how a Super
  // Admin edits an Admin's full profile (name/email/password/avatar), and
  // how an Admin edits a Scorer's — NEVER how someone edits their own
  // account (that's updateSelf below, which is far more restricted).
  async update(id: string, dto: UpdateUserDto, requestingUserRole: string) {
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException("User not found");

    if (dto.role !== undefined) {
      this.assertRoleChangeAllowed(target, dto.role, requestingUserRole);
    }

    if (dto.email !== undefined && dto.email !== target.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException("Email already in use");
    }

    const passwordHash = dto.password ? await argon2.hash(dto.password) : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(passwordHash !== undefined && { passwordHash }),
        ...(dto.role !== undefined && {
          role: dto.role as any,
          ...(dto.role === AppRole.SCORER && { hasBeenScorer: true }),
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true },
    });
  }

  // Self-service profile update (/users/me). Per the business rule: ADMIN
  // and SCORER can NEVER edit their own name/avatar — only SUPER_ADMIN can
  // self-edit. Admin/Scorer profiles are edited by the role above them
  // (via the /users/:id endpoint) instead.
  async updateSelf(userId: string, requestingUserRole: string, dto: { name?: string; avatarUrl?: string }) {
    if (requestingUserRole !== AppRole.SUPER_ADMIN) {
      throw new ForbiddenException("Your profile can only be updated by an administrator, not by yourself");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true },
    });
  }

  private assertRoleChangeAllowed(
    target: { role: string; hasBeenScorer: boolean },
    requestedRole: string,
    requestingUserRole: string,
  ) {
    if (requestedRole === AppRole.SUPER_ADMIN) {
      throw new ForbiddenException("SUPER_ADMIN cannot be assigned through the API");
    }
    if (requestedRole === AppRole.ADMIN) {
      if (requestingUserRole !== AppRole.SUPER_ADMIN) {
        throw new ForbiddenException("Only a Super Admin can grant the Admin role");
      }
      if (target.role === AppRole.SCORER || target.hasBeenScorer) {
        throw new ForbiddenException("This account has held the Scorer role and can never be promoted to Admin");
      }
    }
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true, avatarUrl: true },
    });
  }

  async create(dto: CreateUserDto, requestingUserRole: string) {
    if (dto.role === AppRole.SUPER_ADMIN) {
      throw new ForbiddenException("SUPER_ADMIN cannot be assigned through the API");
    }
    if (dto.role === AppRole.ADMIN && requestingUserRole !== AppRole.SUPER_ADMIN) {
      throw new ForbiddenException("Only a Super Admin can create Admin accounts");
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already in use");

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email, name: dto.name, passwordHash, role: dto.role as any,
        avatarUrl: dto.avatarUrl, hasBeenScorer: dto.role === AppRole.SCORER,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true },
    });

    this.mailService.sendWelcomeEmail(user.email, user.name, dto.password);
    return user;
  }

  // Self-service password change — restricted to SUPER_ADMIN only, same
  // rule as updateSelf. Admin/Scorer accounts get their password reset by
  // the role above them via PATCH /users/:id (password field).
  async changePassword(userId: string, requestingUserRole: string, dto: ChangePasswordDto) {
    if (requestingUserRole !== AppRole.SUPER_ADMIN) {
      throw new ForbiddenException("Your password can only be changed by an administrator, not by yourself");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const currentValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!currentValid) throw new BadRequestException("Current password is incorrect");

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    return { success: true };
  }
}