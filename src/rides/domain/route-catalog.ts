export const ZONES = [
  "BANANI",
  "BASHUNDHARA",
  "BADDA",
  "DHANMONDI",
  "FARMGATE",
  "GULSHAN_1",
  "GULSHAN_2",
  "KARWAN_BAZAR",
  "MIRPUR_10",
  "MOHAKHALI",
  "MOTIJHEEL",
  "SHAHBAGH",
  "UTTARA",
] as const;

export type Zone = (typeof ZONES)[number];

export interface RouteDefinition {
  pickupZone: Zone;
  destinationZone: Zone;
  distanceMeters: number;
  corridor: string;
}

interface RoutePair {
  zones: readonly [Zone, Zone];
  distanceMeters: number;
  corridor: string;
}

const ROUTE_PAIRS = [
  { zones: ["BANANI", "MOHAKHALI"], distanceMeters: 3_000, corridor: "BANANI_NORTH" },
  { zones: ["BANANI", "GULSHAN_1"], distanceMeters: 2_500, corridor: "BANANI_NORTH" },
  { zones: ["BANANI", "GULSHAN_2"], distanceMeters: 1_800, corridor: "BANANI_NORTH" },
  { zones: ["UTTARA", "BANANI"], distanceMeters: 12_000, corridor: "AIRPORT_ROAD" },
  { zones: ["UTTARA", "MOHAKHALI"], distanceMeters: 15_000, corridor: "AIRPORT_ROAD" },
  { zones: ["BASHUNDHARA", "BADDA"], distanceMeters: 4_200, corridor: "EAST_DHAKA" },
  { zones: ["BASHUNDHARA", "GULSHAN_1"], distanceMeters: 6_000, corridor: "EAST_DHAKA" },
  { zones: ["BADDA", "GULSHAN_2"], distanceMeters: 3_500, corridor: "EAST_DHAKA" },
  { zones: ["MIRPUR_10", "DHANMONDI"], distanceMeters: 8_000, corridor: "MIRPUR_SOUTH" },
  { zones: ["MIRPUR_10", "FARMGATE"], distanceMeters: 7_000, corridor: "MIRPUR_SOUTH" },
  { zones: ["DHANMONDI", "FARMGATE"], distanceMeters: 5_000, corridor: "CENTRAL_DHAKA" },
  { zones: ["DHANMONDI", "SHAHBAGH"], distanceMeters: 5_500, corridor: "CENTRAL_DHAKA" },
  { zones: ["FARMGATE", "KARWAN_BAZAR"], distanceMeters: 2_000, corridor: "CENTRAL_DHAKA" },
  { zones: ["FARMGATE", "SHAHBAGH"], distanceMeters: 4_000, corridor: "CENTRAL_DHAKA" },
  { zones: ["KARWAN_BAZAR", "SHAHBAGH"], distanceMeters: 2_500, corridor: "SOUTH_DHAKA" },
  { zones: ["KARWAN_BAZAR", "MOTIJHEEL"], distanceMeters: 6_000, corridor: "SOUTH_DHAKA" },
  { zones: ["SHAHBAGH", "MOTIJHEEL"], distanceMeters: 4_000, corridor: "SOUTH_DHAKA" },
] as const satisfies readonly RoutePair[];

export const ROUTES: readonly RouteDefinition[] = ROUTE_PAIRS.flatMap(
  ({ zones: [firstZone, secondZone], distanceMeters, corridor }) => [
    {
      pickupZone: firstZone,
      destinationZone: secondZone,
      distanceMeters,
      corridor,
    },
    {
      pickupZone: secondZone,
      destinationZone: firstZone,
      distanceMeters,
      corridor,
    },
  ],
).sort(
  (left, right) =>
    left.pickupZone.localeCompare(right.pickupZone) ||
    left.destinationZone.localeCompare(right.destinationZone),
);

export function findRoute(pickupZone: Zone, destinationZone: Zone): RouteDefinition | undefined {
  return ROUTES.find(
    (route) => route.pickupZone === pickupZone && route.destinationZone === destinationZone,
  );
}
