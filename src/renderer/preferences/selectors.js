import { NAME, GENERAL_PREFS, TEMPLATE_PREFS } from './constants';
import baseSelect from '../utils/base-selector';

const select = baseSelect(NAME);

export const activeView = select('activeView');
export const alwaysOnTop = select('alwaysOnTop');
export const emptyLockedClips = select('emptyLockedClips');
export const transparent = select('transparent');
export const opacity = select('opacity');
export const numberOfClips = select('numberOfClips');
export const viewingPreferences = select('viewingPreferences');

export const viewingGeneralPrefs = state => activeView(state) === GENERAL_PREFS;
export const viewingTemplates = state => activeView(state) === TEMPLATE_PREFS;
