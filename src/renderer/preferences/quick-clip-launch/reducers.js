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

export const reducer = combineReducers({
  searchTerms,
  tools,
});
