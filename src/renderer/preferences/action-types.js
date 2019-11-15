import { NAME } from './constants';
import actionTypeConstructor from '../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const TOGGLE_ALWAYS_ON_TOP = ca('TOGGLE_ALWAYS_ON_TOP');
