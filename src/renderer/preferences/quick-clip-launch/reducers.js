import { combineReducers } from 'redux';
import * as types from './action-types';

export const searchTerms = (state = [], action) => {
  switch (action.type) {
    case types.CREATE_NEW_SEARCH_TERM:
      return [
        { ...action.payload },
        ...state,
      ];
    default:
      return state;
  }
};

export const tools = (state = [], action) => {
  switch (action.type) {
    case types.CREATE_NEW_TOOL:
      return [
        { ...action.payload },
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
