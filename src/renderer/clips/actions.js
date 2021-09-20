import { clipboard } from 'electron';
import * as types from './action-types';
import {
  clip,
  lockedClips,
  clipKeyPressed as selectClipKeyPressed,
  clipIsLocked,
  clipSettingsVisible,
} from './selectors';
import { emptyLockedClips, numberOfClips } from '../preferences/selectors';
import { TOOLTIP_DELAY } from './constants';
import simpleAction from '../utils/simple-action';
import { scanForTerms } from '../preferences/quick-clip-launch/actions';

export const clipboardUpdated = text => (dispatch, getState) => {
  const state = getState();
  dispatch(scanForTerms(text));
  dispatch({
    type: types.CLIPBOARD_UPDATED,
    payload: text,
    metadata: {
      hotkey: selectClipKeyPressed(state),
      lockedClips: lockedClips(state),
      numberOfClips: numberOfClips(state),
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

export const emptyClip = (index) => (dispatch, getState) => {
  const state = getState();
  if (clipIsLocked(state, index)) return;
  dispatch({
    type: types.EMPTY_CLIP,
    payload: index,
  });
};

export const emptyAllClips = () => (dispatch, getState) => {
  const state = getState();
  dispatch({
    type: types.EMPTY_ALL_CLIPS,
    payload: {
      emptyLockedClips: emptyLockedClips(state),
      lockedClips: lockedClips(state),
    },
  });
};

export const hideClipSettings = (index) => (dispatch, getState) => {
  if (clipSettingsVisible(getState(), index)) {
    dispatch({
      type: types.HIDE_CLIP_SETTINGS,
      payload: index,
    });
  }
};

export const toggleClipSettings = simpleAction(types.TOGGLE_CLIP_SETTINGS);
export const toggleLock = simpleAction(types.TOGGLE_LOCK);
export const viewMultiLineEditor = simpleAction(types.VIEW_CLIP_EDITOR);
export const selectEditorLanguage = simpleAction(types.SELECT_EDITOR_LANG);
export const returnToNormalView = simpleAction(types.RETURN_TO_NORMAL_VIEW);
export const clipsSaved = simpleAction(types.CLIPS_SAVED);
