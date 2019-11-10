import { NAME } from './constants';
import baseSelector from '../utils/base-selector';

const select = baseSelector(NAME);

export const clips = select('clips');
export const lockedClips = select('lockedClips');
export const lastKeyUsed = select('lastKeyUsed');
export const clipKeyPressed = select('clipKeyPressed');
export const settingsVisible = select('settingsVisible');
export const clipBeingViewed = select('clipBeingViewed');
export const viewingMultiLineEditor = select('viewingMultiLineEditor');
export const clipCopiedOverlay = select('clipCopiedOverlay');

export const showCopiedTooltip = (state, index) => clipCopiedOverlay(state)[index] || false;
export const clip = (state, index) => clips(state)[index] || '';
export const lastClip = state => clip(state, lastKeyUsed(state));
export const clipIsLocked = (state, index) => lockedClips(state)[index] || false;
export const clipSettingsVisible = (state, index) => settingsVisible(state)[index] || false;
