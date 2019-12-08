import { NAME } from '../constants';
import actionTypeConstructor from '../../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const SHOW_TEMPLATE_SELECTION = ca('SHOW_TEMPLATE_SELECTION');
export const SELECT_TEMPLATE = ca('SELECT_TEMPLATE');
export const DELETE_TEMPLATE = ca('DELETE_TEMPLATE');
export const MODIFY_TEMPLATE = ca('MODIFY_TEMPLATE');
export const SAVE_TEMPLATE = ca('SAVE_TEMPLATE');
export const CREATE_NEW_TEMPLATE = ca('CREATE_NEW_TEMPLATE');
export const RE_ORDER_TEMPLATES = ca('RE_ORDER_TEMPLATES');
export const DRAG_AND_DROP = ca('DRAG_AND_DROP');
export const SAVED_TO_DISK = ca('SAVED_TO_DISK');
export const IMPORTED_TEMPLATES = ca('IMPORTED_TEMPLATES');