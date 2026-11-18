import { Injectable } from '@nestjs/common';

const MAX_FAILURES = 5;
const WINDOW_MILLISECONDS = 15 * 60 * 1_000;

type AttemptWindow = { failures: number; startedAt: number };

@Injectable()
export class AdminLoginRateLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();

  /**
   * Checks the e-mail and source-IP counters before processing a login attempt.
   * @param email - The normalized e-mail address supplied by the caller.
   * @param ipAddress - The source IP address when available.
   * @returns False when either limit has reached the maximum failures.
   */
  isAllowed(email: string, ipAddress?: string): boolean {
    return this.keys(email, ipAddress).every((key) => {
      const attempt = this.currentAttempt(key);
      return attempt === undefined || attempt.failures < MAX_FAILURES;
    });
  }

  /**
   * Increments the e-mail and source-IP counters after a failed login.
   * @param email - The normalized e-mail address supplied by the caller.
   * @param ipAddress - The source IP address when available.
   */
  recordFailure(email: string, ipAddress?: string): void {
    for (const key of this.keys(email, ipAddress)) {
      const current = this.currentAttempt(key);

      this.attempts.set(key, {
        failures: (current?.failures ?? 0) + 1,
        startedAt: current?.startedAt ?? Date.now(),
      });
    }
  }

  /**
   * Clears the e-mail and source-IP counters after a successful login.
   * @param email - The normalized e-mail address supplied by the caller.
   * @param ipAddress - The source IP address when available.
   */
  reset(email: string, ipAddress?: string): void {
    for (const key of this.keys(email, ipAddress)) {
      this.attempts.delete(key);
    }
  }

  /**
   * Builds independent counters for account-based and endpoint-based limiting.
   * @param email - The normalized e-mail address supplied by the caller.
   * @param ipAddress - The source IP address when available.
   * @returns The counter keys that apply to the attempt.
   */
  private keys(email: string, ipAddress?: string): string[] {
    return [
      `email:${email}`,
      ...(ipAddress === undefined ? [] : [`ip:${ipAddress}`]),
    ];
  }

  /**
   * Returns the current counter after expiring an elapsed limiter window.
   * @param key - The rate-limit counter key to inspect.
   * @returns The active counter, or undefined when none remains.
   */
  private currentAttempt(key: string): AttemptWindow | undefined {
    const attempt = this.attempts.get(key);

    if (!attempt) {
      return undefined;
    }

    if (attempt.startedAt + WINDOW_MILLISECONDS <= Date.now()) {
      this.attempts.delete(key);
      return undefined;
    }

    return attempt;
  }
}
