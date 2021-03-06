import { combineReducers } from 'redux';
import * as types from './action-types';

const menuVisible = (state = false, action) => {
  switch (action.type) {
    case types.TOGGLE_MENU:
      return !state;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  menuVisible,
});
