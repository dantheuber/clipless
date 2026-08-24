export const ROW_ONE_REASON = 'row 1 is the live clipboard';

const PREVIEW_LENGTH = 46;

export function templatePreview(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > PREVIEW_LENGTH ? `${oneLine.slice(0, PREVIEW_LENGTH)}…` : oneLine;
}
