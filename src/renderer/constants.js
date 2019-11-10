import {
  NAME as CLIPS_NAME,
  DEFAULT_CLIPS_STATE
} from './clips';
import { HEADER_STATE_BLACKLIST } from './header/constants';
import { CLIPS_STATE_BLACKLIST } from './clips/constants';

export const LOCAL_STORAGE_STATE_KEY = 'cliplessState';
export const CLIPBOARD_CHECK_INTERVAL = 100;
export const DEFAULT_APP_STATE = {
  [CLIPS_NAME]: {
    clips: DEFAULT_CLIPS_STATE,
  },
};
export const STATE_PERSIST_BLACKLIST = [
  ...HEADER_STATE_BLACKLIST,
  ...CLIPS_STATE_BLACKLIST,
];
