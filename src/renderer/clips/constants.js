export const NAME = 'clips';
export const NUMBER_OF_CLIPS = 10;

export const CLIP_RENDER_ARRAY = [...Array(NUMBER_OF_CLIPS)].map((x, i) => i);
export const DEFAULT_CLIPS_STATE = CLIP_RENDER_ARRAY.map(() => '');

export const TOOLTIP_DELAY = 500;
export const CLIP_SAVE_INTERVAL = 1500;

export const DEFAULT_CLIP_EDITOR_LANG = 'plaintext';
export const LANGUAGES = [
  'csharp',
  'css',
  'html',
  'javascript',
  'json',
  'markdown',
  'mysql',
  'php',
  'plaintext',
  'powershell',
  'python',
  'shell',
  'sql',
];

export const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  automaticLayout: true,
  autoComplete: false,
  lineNumbersMinChars: 4,
  scrollBeyondLastLine: false,
  quickSuggestions: false,
  wordBasedSuggestions: false,
  contextmenu: false,
};

export const CLIPS_STATE_BLACKLIST = [
  `${NAME}.settingsVisible`,
  `${NAME}.viewingClipEditor`,
  `${NAME}.clipBeingViewed`,
  `${NAME}.clipKeyPressed`,
  `${NAME}.clipCopiedOverlay`,
];