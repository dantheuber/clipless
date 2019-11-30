import { NAME } from './constants';
import actionTypeConstructor from '../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const VIEW_GENERAL_PREFS = ca('VIEW_GENERAL_PREFS');
export const VIEW_TEMPLATES = ca('VIEW_TEMPLATES');

export const VIEW_PREFERENCES = ca('VIEW_PREFERENCES');
export const CLOSE_PREFERENCES = ca('CLOSE_PREFERENCES');

export const TOGGLE_ALWAYS_ON_TOP = ca('TOGGLE_ALWAYS_ON_TOP');

export const TOGGLE_EMPTY_LOCKED_CLIPS = ca('TOGGLE_EMPTY_LOCKED_CLIPS');
export const TOGGLE_TRANSPARENT = ca('TOGGLE_TRANSPARENT');
export const SET_OPACITY = ca('SET_OPACITY');

export const SET_NUMBER_OF_CLIPS = ca('SET_NUMBER_OF_CLIPS');
