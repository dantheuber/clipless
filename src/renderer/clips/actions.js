import { clipboard } from 'electron';
import * as types from './action-types';
import {
  clip,
  lockedClips,
  clipKeyPressed as selectClipKeyPressed,
} from './selectors';
import { TOOLTIP_DELAY } from './constants';

const simpleAction = type => payload => ({ type, payload });

export const clipboardUpdated = text => (dispatch, getState) => {
  const state = getState();
  dispatch({
    type: types.CLIPBOARD_UPDATED,
    payload: text,
    metadata: {
      hotkey: selectClipKeyPressed(state),
      lockedClips: lockedClips(state),
    },
  });
};

export const clipModified = (e, index) => ({
  type: types.CLIP_MODIFIED,
  payload: typeof e === 'string' ? e : e.target.value,
  metadata: { index },
});

export const hideCopiedTooltip = simpleAction(types.HIDE_COPIED_TOOLTIP);

export const clipSelected = index => (dispatch, getState) => {
  dispatch({
    type: types.CLIP_SELECTED,
    payload: index,
  });
  clipboard.writeText(clip(getState(), index));
  setTimeout(() => dispatch(hideCopiedTooltip(index)), TOOLTIP_DELAY);
};

export const toggleClipSettings = simpleAction(types.TOGGLE_CLIP_SETTINGS);
export const hideClipSettings = simpleAction(types.HIDE_CLIP_SETTINGS);
export const toggleLock = simpleAction(types.TOGGLE_LOCK);
export const emptyClip = simpleAction(types.EMPTY_CLIP);
export const viewMultiLineEditor = simpleAction(types.VIEW_CLIP_EDITOR);
export const selectEditorLanguage = simpleAction(types.SELECT_EDITOR_LANG);
export const returnToNormalView = simpleAction(types.RETURN_TO_NORMAL_VIEW);
export const emptyAllClips = simpleAction(types.EMPTY_ALL_CLIPS);
