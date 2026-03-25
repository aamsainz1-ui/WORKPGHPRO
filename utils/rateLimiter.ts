/**
 * PIN Rate Limiter — prevents brute force attacks
 * Locks for 30 seconds after 5 failed attempts
 */

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

interface LimitState {
  attempts: number;
  lockedUntil: number | null;
}

const store = new Map<string, LimitState>();

export function checkRateLimit(userId: string): { allowed: boolean; remainingMs: number; attemptsLeft: number } {
  const now = Date.now();
  const state = store.get(userId) || { attempts: 0, lockedUntil: null };

  if (state.lockedUntil && now < state.lockedUntil) {
    return { allowed: false, remainingMs: state.lockedUntil - now, attemptsLeft: 0 };
  }

  // Reset if lock expired
  if (state.lockedUntil && now >= state.lockedUntil) {
    store.set(userId, { attempts: 0, lockedUntil: null });
    return { allowed: true, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS };
  }

  return { allowed: true, remainingMs: 0, attemptsLeft: MAX_ATTEMPTS - state.attempts };
}

export function recordFailedAttempt(userId: string): { locked: boolean; remainingMs: number } {
  const now = Date.now();
  const state = store.get(userId) || { attempts: 0, lockedUntil: null };

  state.attempts += 1;

  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    store.set(userId, state);
    return { locked: true, remainingMs: LOCKOUT_MS };
  }

  store.set(userId, state);
  return { locked: false, remainingMs: 0 };
}

export function resetAttempts(userId: string): void {
  store.delete(userId);
}
