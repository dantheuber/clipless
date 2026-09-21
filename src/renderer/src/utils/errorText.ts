/**
 * The text of whatever was thrown, for inline failures and toasts.
 *
 * A main-process handler that rejects reaches the renderer wrapped by Electron as
 * "Error invoking remote method 'channel': Error: reason". Only the reason is the user's
 * business, so the wrapper is stripped.
 */
export function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']*': (?:\w*Error: )?/, '');
}
