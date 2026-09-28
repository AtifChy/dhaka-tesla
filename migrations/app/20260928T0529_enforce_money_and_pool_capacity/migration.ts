#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2cff04a346370152eba83ff05e0272405893eebc4217cb7aebfc953df320a737/contract';
import startContract from '../../snapshots/2cff04a346370152eba83ff05e0272405893eebc4217cb7aebfc953df320a737/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7f2bec48f98e75de0632ab253abd2209a7beac48cfeea429276f50330f6a4284/contract';
import endContract from '../../snapshots/7f2bec48f98e75de0632ab253abd2209a7beac48cfeea429276f50330f6a4284/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'requests',
        constraint: 'request_estimated_fare_nonnegative_781981e5',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'pools',
        constraint: 'pool_capacity_not_exceeded_cf887d49',
        expression: '"occupiedSeats" <= capacity',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'requests',
        constraint: 'request_estimated_fare_valid_07cb93ae',
        expression: '"estimatedFare" >= 0 AND "estimatedFare" = round("estimatedFare", 2)',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'requests',
        constraint: 'request_quoted_fare_valid_55f10deb',
        expression: '"quotedFare" >= 0 AND "quotedFare" = round("quotedFare", 2)',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
