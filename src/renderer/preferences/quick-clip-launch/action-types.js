import { NAME } from '../constants';
import actionTypeConstructor from '../../utils/action-type-creator';

const ca = actionTypeConstructor(NAME);

export const LAUNCH_QUICK_TOOL = ca('LAUNCH_QUICK_TOOL');

export const CREATE_NEW_SEARCH_TERM = ca('CREATE_NEW_SEARCH_TERM');
export const DELETE_SEARCH_TERM = ca('DELETE_SEARCH_TERM');
export const CREATE_NEW_TOOL = ca('CREATE_NEW_TOOL');
export const DELETE_TOOL = ca('DELETE_TOOL');
export const UPDATE_TOOL = ca('UPDATE_TOOL');

export const SEARCH_TERMS_FOUND = ca('SEARCH_TERMS_FOUND');
export const SELECT_TERM = ca('SELECT_TERM');
export const UN_SELECT_TERM = ca('UN_SELECT_TERM');
export const SELECT_TOOL = ca('SELECT_TOOL');
export const UN_SELECT_TOOL = ca('UN_SELECT_TOOL');
export const UPDATE_TOOL_SELECTION = ca('UPDATE_TOOL_SELECTION');
export const LAUNCH_SELECTED = ca('LAUNCH_SELECTED');
export const CANCEL_SELECTION = ca('CANCEL_SELECTION');
export const START_SELECTION = ca('START_SELECTION');
