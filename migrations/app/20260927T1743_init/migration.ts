#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2cff04a346370152eba83ff05e0272405893eebc4217cb7aebfc953df320a737/contract';
import endContract from '../../snapshots/2cff04a346370152eba83ff05e0272405893eebc4217cb7aebfc953df320a737/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'events',
        columns: [
          col('actorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('metadata', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('poolId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('requestId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('toStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'events_fromStatus_check_85acb04b',
            "\"fromStatus\" IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELED')",
          ),
          checkExpression(
            'events_toStatus_check_5a2c3e11',
            "\"toStatus\" IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'pool_members',
        columns: [
          col('fare', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('poolId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('requestId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seats', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('pool_member_fare_nonnegative_4800a89c', 'fare >= 0'),
          checkExpression('pool_member_seats_positive_de035958', 'seats > 0'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'pools',
        columns: [
          col('capacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('corridor', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('driverId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('occupiedSeats', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('pickupZone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('MATCHED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('vehicleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('pool_capacity_positive_2e07dccc', 'capacity > 0'),
          checkExpression('pool_occupied_seats_nonnegative_c3fcf762', '"occupiedSeats" >= 0'),
          checkExpression(
            'pools_status_check_0b631e14',
            "\"status\" IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'requests',
        columns: [
          col('corridor', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('destinationZone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('distanceMeters', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('estimatedFare', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('passengerId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentMethod', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('pickupZone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('quotedFare', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('seatsRequested', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('request_distance_positive_c1cb0d59', '"distanceMeters" > 0'),
          checkExpression('request_estimated_fare_nonnegative_781981e5', '"estimatedFare" >= 0'),
          checkExpression('request_seats_positive_f4eebcb7', '"seatsRequested" > 0'),
          checkExpression(
            'requests_paymentMethod_check_27e4f1ac',
            "\"paymentMethod\" IN ('CASH', 'TESLAPAY')",
          ),
          checkExpression(
            'requests_status_check_0b631e14',
            "\"status\" IN ('REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED', 'COMPLETED', 'CANCELED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'users',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('users_role_check_2c4ac87b', "\"role\" IN ('PASSENGER', 'DRIVER')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'vehicles',
        columns: [
          col('capacity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('driverId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isOnline', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('vehicle_capacity_positive_2e07dccc', 'capacity > 0'),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'pool_members',
        constraint: 'pool_members_requestId_key',
        columns: ['requestId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'users',
        constraint: 'users_email_key',
        columns: ['email'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'vehicles',
        constraint: 'vehicles_driverId_key',
        columns: ['driverId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'events',
        index: 'events_actorId_idx_a58f6b4b',
        columns: ['actorId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'events',
        index: 'events_poolId_createdAt_idx_416a0221',
        columns: ['poolId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'events',
        index: 'events_poolId_idx_d8a048f6',
        columns: ['poolId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'events',
        index: 'events_requestId_createdAt_idx_91651cde',
        columns: ['requestId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'events',
        index: 'events_requestId_idx_fd667f92',
        columns: ['requestId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pool_members',
        index: 'pool_members_poolId_idx_d8a048f6',
        columns: ['poolId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pools',
        index: 'pools_driverId_idx_8eed3317',
        columns: ['driverId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pools',
        index: 'pools_driverId_status_idx_f6ee19e1',
        columns: ['driverId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pools',
        index: 'pools_pickupZone_corridor_status_idx_60ef5a1d',
        columns: ['pickupZone', 'corridor', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pools',
        index: 'pools_vehicleId_idx_e2df58fc',
        columns: ['vehicleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'pools',
        index: 'pools_vehicleId_status_idx_a4d785a6',
        columns: ['vehicleId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requests',
        index: 'requests_passengerId_createdAt_idx_bb7810ca',
        columns: ['passengerId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requests',
        index: 'requests_passengerId_idx_21958ace',
        columns: ['passengerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'requests',
        index: 'requests_status_pickupZone_corridor_createdAt_idx_17be15f9',
        columns: ['status', 'pickupZone', 'corridor', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_role_idx_2c1ddf83',
        columns: ['role'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'events',
        foreignKey: {
          name: 'events_requestId_fkey',
          columns: ['requestId'],
          references: { schema: 'public', table: 'requests', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'events',
        foreignKey: {
          name: 'events_poolId_fkey',
          columns: ['poolId'],
          references: { schema: 'public', table: 'pools', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'events',
        foreignKey: {
          name: 'events_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pool_members',
        foreignKey: {
          name: 'pool_members_poolId_fkey',
          columns: ['poolId'],
          references: { schema: 'public', table: 'pools', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pool_members',
        foreignKey: {
          name: 'pool_members_requestId_fkey',
          columns: ['requestId'],
          references: { schema: 'public', table: 'requests', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pools',
        foreignKey: {
          name: 'pools_driverId_fkey',
          columns: ['driverId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'pools',
        foreignKey: {
          name: 'pools_vehicleId_fkey',
          columns: ['vehicleId'],
          references: { schema: 'public', table: 'vehicles', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'requests',
        foreignKey: {
          name: 'requests_passengerId_fkey',
          columns: ['passengerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'vehicles',
        foreignKey: {
          name: 'vehicles_driverId_fkey',
          columns: ['driverId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
