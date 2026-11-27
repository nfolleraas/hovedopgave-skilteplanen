import type { AuthState } from '../types/auth.types.js';

export function useAuth(): AuthState {
  return { isAuthenticated: false };
}
