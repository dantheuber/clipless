import * as types from './action-types';
import simpleAction from '../../utils/simple-action';

export const addNewTool = simpleAction(types.CREATE_NEW_TOOL);
export const addNewSearchTerm = simpleAction(types.CREATE_NEW_SEARCH_TERM);