import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import { ZodSerializerDto } from "nestjs-zod";

import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/auth/current-user.decorator";
import { Roles } from "../common/auth/roles.decorator";
import { DriverService } from "./driver.service";
import {
  AvailableRequestsResponseDto,
  PoolListResponseDto,
  PoolResponseDto,
  VehicleResponseDto,
} from "./dto/driver-response.dto";

@Roles("DRIVER")
@Controller("driver")
export class DriverController {
  constructor(private readonly driver: DriverService) {}

  @Get("vehicle")
  @ZodSerializerDto(VehicleResponseDto)
  vehicle(@CurrentUser() user: AuthUser) {
    return this.driver.vehicle(user);
  }

  @Post("vehicle/online")
  @ZodSerializerDto(VehicleResponseDto)
  online(@CurrentUser() user: AuthUser) {
    return this.driver.setOnline(user, true);
  }

  @Post("vehicle/offline")
  @ZodSerializerDto(VehicleResponseDto)
  offline(@CurrentUser() user: AuthUser) {
    return this.driver.setOnline(user, false);
  }

  @Get("requests")
  @ZodSerializerDto(AvailableRequestsResponseDto)
  requests(@CurrentUser() user: AuthUser) {
    return this.driver.availableRequests(user);
  }

  @Post("requests/:requestId/accept")
  @ZodSerializerDto(PoolResponseDto)
  accept(@CurrentUser() user: AuthUser, @Param("requestId", ParseIntPipe) requestId: number) {
    return this.driver.accept(user, requestId);
  }

  @Post("pools/:poolId/arrive")
  @ZodSerializerDto(PoolResponseDto)
  arrive(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "DRIVER_ARRIVED");
  }

  @Post("pools/:poolId/start")
  @ZodSerializerDto(PoolResponseDto)
  start(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "STARTED");
  }

  @Post("pools/:poolId/complete")
  @ZodSerializerDto(PoolResponseDto)
  complete(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.transition(user, poolId, "COMPLETED");
  }

  @Get("pools")
  @ZodSerializerDto(PoolListResponseDto)
  pools(@CurrentUser() user: AuthUser) {
    return this.driver.pools(user);
  }

  @Get("pools/:poolId")
  @ZodSerializerDto(PoolResponseDto)
  pool(@CurrentUser() user: AuthUser, @Param("poolId", ParseIntPipe) poolId: number) {
    return this.driver.pool(user, poolId);
  }
}
