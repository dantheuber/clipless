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