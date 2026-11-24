import { AdminLoginRateLimiter } from './admin-login-rate-limiter.service.js';

describe('AdminLoginRateLimiter', () => {
  let limiter: AdminLoginRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'));
    limiter = new AdminLoginRateLimiter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limits repeated failures by e-mail and IP address', () => {
    for (let count = 0; count < 5; count += 1) {
      limiter.recordFailure('admin@example.com', '127.0.0.1');
    }

    expect(limiter.isAllowed('admin@example.com', '127.0.0.1')).toBe(false);
    expect(limiter.isAllowed('other@example.com', '127.0.0.1')).toBe(false);
    expect(limiter.isAllowed('admin@example.com', '127.0.0.2')).toBe(false);
  });

  it('allows login attempts again after the rate-limit window', () => {
    for (let count = 0; count < 5; count += 1) {
      limiter.recordFailure('admin@example.com', '127.0.0.1');
    }

    vi.advanceTimersByTime(15 * 60 * 1_000);

    expect(limiter.isAllowed('admin@example.com', '127.0.0.1')).toBe(true);
  });

  it('clears counters after a successful login', () => {
    limiter.recordFailure('admin@example.com', '127.0.0.1');
    limiter.reset('admin@example.com', '127.0.0.1');

    expect(limiter.isAllowed('admin@example.com', '127.0.0.1')).toBe(true);
  });
});
