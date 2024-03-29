export const DEFAULT_CONFIG_FILENAME = 'clipless-config';
export const MIN_WIDTH = 400;
export const MIN_HEIGHT = 347;
export const ALWAYS_ON_TOP_SETTING = 'alwaysOnTop';
export const TRANSPARENT_SETTING = 'transparent';
export const OPACITY_SETTING = 'opacity';
export const NUMBER_OF_CLIPS_SETTING = 'numberOfClips';
export const EMPTY_LOCKED_CLIPS_SETTING = 'emptyLockedClips';
export const COMPILE_TEMPLATES_SETTING = 'compileTemplates';
export const QUICKLIPS_SETTINGS = 'quickClips';
export const CLIPS = 'clips';
export const DEFAULT_STORE_VALUE = {
  [CLIPS]: [],
  windowBounds: {
    width: MIN_WIDTH,
    height: MIN_HEIGHT,
  },
  position: {
    x: 400,
    y: 400,
  },
  [EMPTY_LOCKED_CLIPS_SETTING]: false,
  [TRANSPARENT_SETTING]: true,
  [ALWAYS_ON_TOP_SETTING]: true,
  [OPACITY_SETTING]: 0.5,
  [NUMBER_OF_CLIPS_SETTING]: 100,
  [COMPILE_TEMPLATES_SETTING]: [],
  [QUICKLIPS_SETTINGS]: {
    searchTerms: [],
    tools: [],
    autoScan: true,
  },
};