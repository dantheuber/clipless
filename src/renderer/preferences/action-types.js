import { NAME } from './constants';
import actionTypeConstructor from '../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const VIEW_PREFERENCES = ca('VIEW_PREFERENCES');
export const CLOSE_PREFERENCES = ca('CLOSE_PREFERENCES');

export const TOGGLE_ALWAYS_ON_TOP = ca('TOGGLE_ALWAYS_ON_TOP');

export const TOGGLE_EMPTY_LOCKED_CLIPS = ca('TOGGLE_EMPTY_LOCKED_CLIPS');
export const TOGGLE_TRANSPARENT = ca('TOGGLE_TRANSPARENT');
