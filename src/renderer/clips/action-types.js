import { NAME } from './constants';
import actionTypeCreator from '../utils/action-type-creator';

const ca = actionTypeCreator(NAME);

export const CLIPBOARD_UPDATED = ca('CLIPBOARD_UPDATED');
