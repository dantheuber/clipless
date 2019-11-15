import { combineReducers } from 'redux';
import * as types from './action-types';

const alwaysOnTop = (state = true, action) => {
  switch (action.type) {
    case types.TOGGLE_ALWAYS_ON_TOP:
      return !state;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  alwaysOnTop,
});
