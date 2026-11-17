/** Preserve the original failure for diagnosis without exposing it in the UI. */
export function reportError(operation: string, cause: unknown): void {
  console.error(new Error(operation, { cause }));
}
