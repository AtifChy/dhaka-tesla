export const ZONES = ["BANANI", "GULSHAN_1", "MOHAKHALI", "DHANMONDI", "MIRPUR", "UTTARA"] as const;

export type Zone = (typeof ZONES)[number];

export interface RouteDefinition {
  pickupZone: Zone;
  destinationZone: Zone;
  distanceMeters: number;
  corridor: string;
}

export const ROUTES: readonly RouteDefinition[] = [
  {
    pickupZone: "BANANI",
    destinationZone: "MOHAKHALI",
    distanceMeters: 3_000,
    corridor: "BANANI_NORTH",
  },
  {
    pickupZone: "BANANI",
    destinationZone: "GULSHAN_1",
    distanceMeters: 2_500,
    corridor: "BANANI_NORTH",
  },
  {
    pickupZone: "MIRPUR",
    destinationZone: "DHANMONDI",
    distanceMeters: 8_000,
    corridor: "MIRPUR_SOUTH",
  },
  {
    pickupZone: "UTTARA",
    destinationZone: "BANANI",
    distanceMeters: 12_000,
    corridor: "AIRPORT_ROAD",
  },
];

export function findRoute(pickupZone: Zone, destinationZone: Zone): RouteDefinition | undefined {
  return ROUTES.find(
    (route) => route.pickupZone === pickupZone && route.destinationZone === destinationZone,
  );
}
