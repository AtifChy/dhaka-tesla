import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { Public } from "../common/auth/public.decorator";
import { AuthService } from "./auth.service";
import { AuthResponseDto, AuthUserResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDriverDto, RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  @ZodSerializerDto(AuthResponseDto)
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(input);
  }

  @Public()
  @Post("register/driver")
  @ZodSerializerDto(AuthResponseDto)
  registerDriver(@Body() input: RegisterDriverDto): Promise<AuthResponseDto> {
    return this.auth.registerDriver(input);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ZodSerializerDto(AuthResponseDto)
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input);
  }

  @ApiBearerAuth()
  @Get("me")
  @ZodSerializerDto(AuthUserResponseDto)
  me(@CurrentUser() user: AuthUser): AuthUserResponseDto {
    return user;
  }
}
