import {
  NAME as CLIPS_NAME,
  DEFAULT_CLIPS_STATE
} from './clips';

export const LOCAL_STORAGE_STATE_KEY = 'cliplessState';
export const CLIPBOARD_CHECK_INTERVAL = 100;
export const DEFAULT_APP_STATE = {
  [CLIPS_NAME]: {
    clips: DEFAULT_CLIPS_STATE
  }
};