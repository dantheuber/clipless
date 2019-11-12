export const NAME = 'clips';
export const NUMBER_OF_CLIPS = 10;

export const CLIP_RENDER_ARRAY = [...Array(NUMBER_OF_CLIPS)].map((x, i) => i);
export const DEFAULT_CLIPS_STATE = CLIP_RENDER_ARRAY.map(() => '');

export const TOOLTIP_DELAY = 500;

export const CLIPS_STATE_BLACKLIST = [
  `${NAME}.settingsVisible`,
  `${NAME}.viewingClipEditor`,
  `${NAME}.clipBeingViewed`,
  `${NAME}.clipKeyPressed`,
  `${NAME}.clipCopiedOverlay`,
];