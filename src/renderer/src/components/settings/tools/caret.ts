export function insertAtCaret(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string
): { value: string; caret: number } {
  const start = input?.selectionStart ?? value.length;
  const end = input?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + token + value.slice(end), caret: start + token.length };
}
