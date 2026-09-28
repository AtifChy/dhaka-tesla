import { Injectable } from "@nestjs/common";
import { argon2id, hash, verify } from "argon2";

@Injectable()
export class PasswordService {
  hash(plainText: string): Promise<string> {
    return hash(plainText, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verify(hashValue: string, plainText: string): Promise<boolean> {
    return verify(hashValue, plainText);
  }
}
