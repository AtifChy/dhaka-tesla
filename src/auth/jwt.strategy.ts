import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import type { AuthUser } from "../common/auth/auth-user";
import type { Env } from "../config/env";
import { PrismaService } from "../prisma.service";
import { verifiedAccessTokenSchema } from "./jwt-payload";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get("JWT_ACCESS_SECRET", { infer: true }),
      issuer: "dhaka-tesla-pool",
      audience: "web",
    });
  }

  async validate(untrustedPayload: unknown): Promise<AuthUser> {
    const parsed = verifiedAccessTokenSchema.safeParse(untrustedPayload);
    if (!parsed.success) throw new UnauthorizedException("Invalid access token payload");

    const payload = parsed.data;
    const user = await this.prisma.db.orm.public.User.select("id", "email", "role")
      .where({ id: payload.sub })
      .first();

    if (!user || user.email !== payload.email || user.role !== payload.role) {
      throw new UnauthorizedException("Access token no longer valid");
    }

    return { id: user.id, email: user.email, role: user.role };
  }
}
