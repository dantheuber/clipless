import { NAME } from './constants';
import baseSelect from '../utils/base-selector';

const select = baseSelect(NAME);

export const viewingPreferences = select('viewingPreferences');
export const alwaysOnTop = select('alwaysOnTop');
export const emptyLockedClips = select('emptyLockedClips');
export const transparent = select('transparent');
export const opacity = select('opacity');
export const numberOfClips = select('numberOfClips');
