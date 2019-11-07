import { NAME } from './constants';
import actionTypeCreator from '../utils/action-type-creator';

const ca = actionTypeCreator(NAME);

export const CLIPBOARD_UPDATED = ca('CLIPBOARD_UPDATED');
export const CLIP_KEY_PRESSED = ca('CLIP_KEY_PRESSED');

export const TOGGLE_LOCK = ca('TOGGLE_LOCK');
