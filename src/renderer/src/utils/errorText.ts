/**
 * The text of whatever was thrown, for inline failures and toasts.
 */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
