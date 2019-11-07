export const NAME = 'clips';
export const NUMBER_OF_CLIPS = 10;

export const CLIP_RENDER_ARRAY = [...Array(NUMBER_OF_CLIPS)].map((x, i) => i);
export const DEFAULT_CLIPS_STATE = CLIP_RENDER_ARRAY.map(() => '');
