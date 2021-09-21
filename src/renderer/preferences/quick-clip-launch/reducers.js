import { combineReducers } from 'redux';
import * as types from './action-types';

export const searchTerms = (state = [], action) => {
  const { type, payload } = action;
  switch (type) {
    case types.DELETE_SEARCH_TERM:
      return state.filter(term => term.name !== payload.name);
    case types.CREATE_NEW_SEARCH_TERM:
      return [
        { ...payload },
        ...state,
      ];
    default:
      return state;
  }
};

export const tools = (state = [], action) => {
  const { type, payload } = action;
  switch (type) {
    case types.UPDATE_TOOL: {
      return state.map(tool => {
        if (tool.name === payload.name) {
          return payload;
        }
        return tool;
      })
    }
    case types.DELETE_TOOL:
      return state.filter(tool => tool.name !== payload.name);
    case types.CREATE_NEW_TOOL:
      return [
        { ...payload },
        ...state,
      ];
    default:
      return state;
  }
};

export const matchedTerms = (state = [], action) => {
  const { type, payload } = action;
  switch (type) {
    case types.SEARCH_TERMS_FOUND:
      return payload;
    case types.CANCEL_SELECTION:
    case types.LAUNCH_SELECTED:
      return [];
    default:
      return state;
  }
};

export const selectedTerms = (state = [], action) => {
  const { type, payload } = action;
  switch (type) {
    case types.SELECT_TERM:
      return [payload, ...state];
    case types.UN_SELECT_TERM:
      return state.filter(term => term.match !== payload.match);
    case types.CANCEL_SELECTION:
    case types.LAUNCH_SELECTED:
      return [];
    default:
      return state;
  }
};

export const selectedTools = (state = [], action) => {
  const { type, payload } = action;
  switch (type) {
    case types.SELECT_TOOL:
      return [payload, ...state];
    case types.UN_SELECT_TOOL:
      return state.filter(tool => tool.name !== payload.name);
    case types.UPDATE_TOOL_SELECTION:
      return payload;
    case types.CANCEL_SELECTION:
    case types.LAUNCH_SELECTED:
      return [];
    default:
      return state;
  }
};
export const selectingQuickClips = (state = false, action) => {
  switch (action.type) {
    case types.START_SELECTION:
      return true;
    case types.CANCEL_SELECTION:
    case types.LAUNCH_SELECTED:
      return false;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  searchTerms,
  tools,
  matchedTerms,
  selectedTerms,
  selectedTools,
  selectingQuickClips,
});
