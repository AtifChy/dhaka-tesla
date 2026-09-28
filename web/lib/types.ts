export type Role = "PASSENGER" | "DRIVER";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  expiresInSeconds: 900;
  user: User;
}

export type RideStatus =
  | "REQUESTED"
  | "MATCHED"
  | "DRIVER_ARRIVED"
  | "STARTED"
  | "COMPLETED"
  | "CANCELED";

export type PaymentMethod = "CASH" | "TESLAPAY";

export interface RouteOption {
  pickupZone: string;
  destinationZone: string;
  distanceMeters: number;
  corridor: string;
  estimatedFare: string;
  currency: "BDT";
}

export interface Ride {
  id: number;
  pickupZone: string;
  destinationZone: string;
  corridor: string;
  distanceMeters: number;
  seatsRequested: number;
  status: RideStatus;
  estimatedFare: string;
  quotedFare: string;
  currency: "BDT";
  paymentMethod: PaymentMethod;
  poolId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: number;
  name: string;
  capacity: number;
  isOnline: boolean;
}

export interface AvailableRequest {
  id: number;
  passengerName: string;
  pickupZone: string;
  destinationZone: string;
  corridor: string;
  seatsRequested: number;
  estimatedFare: string;
  currency: "BDT";
}

export interface PoolMember {
  requestId: number;
  passengerName: string;
  destinationZone: string;
  seats: number;
  fare: string;
  currency: "BDT";
}

export interface Pool {
  id: number;
  vehicleId: number;
  vehicleName: string;
  status: RideStatus;
  pickupZone: string;
  corridor: string;
  capacity: number;
  occupiedSeats: number;
  members: PoolMember[];
  createdAt: string;
  updatedAt: string;
}
