import { NAME } from './constants';
import actionTypeCreator from '../utils/action-type-creator';

const ca = actionTypeCreator(NAME);

export const CLIPBOARD_UPDATED = ca('CLIPBOARD_UPDATED');
export const CLIP_SELECTED = ca('CLIP_SELECTED');

export const CLIP_MODIFIED = ca('CLIP_MODIFIED');
export const TOGGLE_LOCK = ca('TOGGLE_LOCK');

export const TOGGLE_CLIP_SETTINGS = ca('TOGGLE_CLIP_SETTINGS');
export const HIDE_CLIP_SETTINGS = ca('HIDE_CLIP_SETTINGS');

export const EMPTY_CLIP = ca('EMPTY_CLIP');
export const EMPTY_ALL_CLIPS = ca('EMPTY_ALL_CLIPS');

export const VIEW_MULTI_LINE_EDITOR = ca('VIEW_MULTI_LINE_EDITOR');
export const RETURN_TO_NORMAL_VIEW = ca('RETURN_TO_NORMAL_VIEW');
