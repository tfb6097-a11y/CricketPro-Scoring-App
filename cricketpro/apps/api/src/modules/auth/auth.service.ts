import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Access denied");
    }

    const tokenValid = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!tokenValid) {
      throw new UnauthorizedException("Access denied");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
    return { success: true };
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>("jwt.accessSecret");
    const accessExpiresIn = this.configService.get<string>("jwt.accessExpiresIn");
    const refreshSecret = this.configService.get<string>("jwt.refreshSecret");
    const refreshExpiresIn = this.configService.get<string>("jwt.refreshExpiresIn");

    const accessTokenOptions: JwtSignOptions = {
      secret: accessSecret,
      expiresIn: accessExpiresIn as JwtSignOptions["expiresIn"],
    };

    const refreshTokenOptions: JwtSignOptions = {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as JwtSignOptions["expiresIn"],
    };

    const accessToken = this.jwtService.sign(payload, accessTokenOptions);
    const refreshToken = this.jwtService.sign(payload, refreshTokenOptions);

    const refreshTokenHash = await argon2.hash(refreshToken);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
      select: { name: true },
    });

    // Response body deliberately has NO id, NO role as plaintext fields —
    // role still lives inside the signed JWT payload (required for
    // RolesGuard), but the client derives it by decoding the token rather
    // than reading it straight off the response JSON.
    return {
      accessToken,
      refreshToken,
      name: updatedUser.name,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }
}