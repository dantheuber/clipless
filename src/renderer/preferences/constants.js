export const NAME = 'preferences';
export const DEFAULT_OPACITY = 0.5;
export const DFEAULT_NUMBER_CLIPS = 10;
export const MAX_CLIPS = 100;
export const GENERAL_PREFS = 'general';
export const TEMPLATE_PREFS = 'templates';
export const QUICK_CLIPS = 'quickClips';
export const PREFERENCES_STATE_BLACKLIST = [
  `${NAME}.viewingPreferences`,
  `${NAME}.viewingTemplateEditor`,
  `${NAME}.currentTemplate`,
  `${NAME}.activeView`,
  `${NAME}.showTemplateSelection`,
];