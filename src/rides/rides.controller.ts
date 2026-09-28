import { Body, Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ZodSerializerDto } from "nestjs-zod";

import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { Roles } from "../common/auth/roles.decorator";
import { CreateRideDto } from "./dto/create-ride.dto";
import { RideListResponseDto, RideResponseDto } from "./dto/ride-response.dto";
import { RouteOptionsResponseDto } from "./dto/route-option.dto";
import { RidesService } from "./rides.service";

@Roles("PASSENGER")
@Controller("rides")
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Get("options")
  @ZodSerializerDto(RouteOptionsResponseDto)
  options() {
    return this.rides.options();
  }

  @Post()
  @ZodSerializerDto(RideResponseDto)
  create(@CurrentUser() user: AuthUser, @Body() input: CreateRideDto) {
    return this.rides.create(user, input);
  }

  @Get("me")
  @ZodSerializerDto(RideListResponseDto)
  mine(@CurrentUser() user: AuthUser) {
    return this.rides.mine(user);
  }

  @Get(":id")
  @ZodSerializerDto(RideResponseDto)
  one(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.rides.one(user, id);
  }

  @Post(":id/cancel")
  @ZodSerializerDto(RideResponseDto)
  cancel(@CurrentUser() user: AuthUser, @Param("id", ParseIntPipe) id: number) {
    return this.rides.cancel(user, id);
  }
}
