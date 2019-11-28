import * as types from './action-types';

export const compileTemplates = (state = [], action) => {
  switch (action.type) {
    case types.CREATE_NEW_TEMPLATE:
      return [
        action.payload,
        ...state,
      ];
    case types.DELETE_TEMPLATE: {
      const index = action.payload;
      const newState = [...state];
      newState.splice(index, 1);
      return newState;
    }
    case types.MODIFY_TEMPLATE: {
      const { template, index } = action.payload;
      const newState = [...state];
      newState.splice(index, 1, template);
      return newState;
    }
    default:
      return state;
  }
};