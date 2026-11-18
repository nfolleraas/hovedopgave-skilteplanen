import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

// OWASP's minimum Argon2id baseline: 19 MiB, two iterations, one lane.
const ARGON2_OPTIONS = {
  type: 2 as const,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  /**
   * Hashes a password with the API's Argon2id parameters and a random salt.
   * @param password - The plaintext password received over HTTPS.
   * @returns A self-describing Argon2id hash suitable for persistence.
   */
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  /**
   * Verifies a plaintext password against an existing Argon2id hash.
   * @param password - The plaintext password received over HTTPS.
   * @param passwordHash - The persisted Argon2id hash.
   * @returns False when the password or stored hash is invalid.
   */
  async verify(password: string, passwordHash: string): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
