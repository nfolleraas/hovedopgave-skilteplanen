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
