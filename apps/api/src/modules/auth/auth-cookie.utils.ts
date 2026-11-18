import type { CookieOptions, Response } from 'express';
import type { AuthConfig } from '../../config/auth.config.js';
import type { RefreshSessionTokens } from './refresh-token/refresh-token.types.js';

/**
 * Reads one decoded cookie value from an HTTP Cookie header.
 * @param cookieHeader - The raw Cookie header supplied by the client.
 * @param cookieName - The configured cookie name to find.
 * @returns The decoded cookie value, or undefined when unavailable or malformed.
 */
export function readCookie(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex < 0) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();

    if (!value) {
      return undefined;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Writes the access and refresh cookies for an authenticated session.
 * @param response - The response receiving the session cookies.
 * @param config - The validated authentication and cookie configuration.
 * @param tokens - The newly issued access and refresh tokens.
 */
export function setSessionCookies(
  response: Response,
  config: AuthConfig,
  tokens: RefreshSessionTokens,
): void {
  response.cookie(config.cookies.accessName, tokens.accessToken, {
    ...cookieOptions(config, config.cookies.accessPath),
    maxAge: config.jwt.accessTokenTtlSeconds * 1_000,
  });
  response.cookie(config.cookies.refreshName, tokens.refreshToken, {
    ...cookieOptions(config, config.cookies.refreshPath),
    maxAge: Math.max(0, tokens.refreshTokenExpiresAt.getTime() - Date.now()),
  });
}

/**
 * Creates the common security attributes for an authentication cookie.
 * @param config - The validated authentication and cookie configuration.
 * @param path - The route path to which the cookie is limited.
 * @returns The shared Express cookie attributes.
 */
function cookieOptions(config: AuthConfig, path: string): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookies.secure,
    sameSite: config.cookies.sameSite,
    path,
  };
}
