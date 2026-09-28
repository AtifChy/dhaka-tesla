import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../prisma.service";
import type { AuthResponseDto } from "./dto/auth-response.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDriverDto, RegisterDto } from "./dto/register.dto";
import type { AccessTokenPayload } from "./jwt-payload";
import { PasswordService } from "./password.service";

interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: "PASSENGER" | "DRIVER";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly passwords: PasswordService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.db.orm.public.User.where({ email: input.email }).first();
    if (existing) throw new ConflictException("An account already uses this email");

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.prisma.db.orm.public.User.select("id", "name", "email", "role").create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "PASSENGER",
    });

    return this.issueToken(user);
  }

  async registerDriver(input: RegisterDriverDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.db.orm.public.User.where({ email: input.email }).first();
    if (existing) throw new ConflictException("An account already uses this email");

    const passwordHash = await this.passwords.hash(input.password);
    const user = await this.prisma.db.transaction(async (transaction) => {
      const created = await transaction.orm.public.User.select(
        "id",
        "name",
        "email",
        "role",
      ).create({
        name: input.name,
        email: input.email,
        passwordHash,
        role: "DRIVER",
      });

      await transaction.orm.public.Vehicle.create({
        driverId: created.id,
        name: input.vehicleName,
        capacity: input.vehicleCapacity,
        isOnline: false,
      });

      return created;
    });

    return this.issueToken(user);
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.db.orm.public.User.where({ email: input.email }).first();
    if (!user || !(await this.passwords.verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.issueToken(user);
  }

  private async issueToken(user: SafeUser): Promise<AuthResponseDto> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: "Bearer",
      expiresInSeconds: 900,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
