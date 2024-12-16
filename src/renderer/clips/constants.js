export const NAME = 'clips';

export const TOOLTIP_DELAY = 500;
export const CLIP_SAVE_INTERVAL = 1500;
export const OVERSCAN_ROWS = 200;

export const CLIPS_STATE_BLACKLIST = [
  `${NAME}.clips`,
  `${NAME}.settingsVisible`,
  `${NAME}.viewingClipEditor`,
  `${NAME}.clipBeingViewed`,
  `${NAME}.clipKeyPressed`,
  `${NAME}.clipCopiedOverlay`,
];