import { combineReducers } from 'redux';
import * as types from './action-types';

const clips = (state = [], action) => {
  switch (action.type) {
    case types.CLIPBOARD_UPDATED: {
      return [action.payload, ...state];
    }
    default:
      return state;
  }
};

export const reducer = combineReducers({
  clips,
});