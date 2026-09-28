import type { Models } from "../../prisma/contract";

export type Role = Models.public_User["role"];

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}
