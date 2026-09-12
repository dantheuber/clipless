/** Feature categories only. Never add user-defined names, IDs, queries or properties. */
export const ANALYTICS_FEATURES = [
  'quick_look',
  'history_search',
  'clip_copy',
  'quick_clip_hotkey',
  'template_copy',
  'tool_launch',
] as const;

export type AnalyticsFeature = (typeof ANALYTICS_FEATURES)[number];

export function isAnalyticsFeature(value: unknown): value is AnalyticsFeature {
  return typeof value === 'string' && ANALYTICS_FEATURES.some((feature) => feature === value);
}
