import uuidv1 from 'uuid/v1';
import * as types from './action-types';
import { NEW_TEMPLATE_BASE } from './constants';

export const compileTemplates = (state = [NEW_TEMPLATE_BASE], action) => {
  switch (action.type) {
    case types.CREATE_NEW_TEMPLATE:
      return [
        {
          ...NEW_TEMPLATE_BASE,
          id: uuidv1(),
        },
        ...state,
      ];
    case types.DELETE_TEMPLATE: {
      const index = action.payload;
      const newState = [...state];
      newState.splice(index, 1);
      return newState;
    }
    case types.MODIFY_TEMPLATE: {
      return state.map(template => (
        template.id === action.payload.id ? action.payload : template
      ));
    }
    case types.DRAG_AND_DROP: {
      const { sourceIndex, destinationIndex } = action.payload;
      const newState = [...state];
      const source = state[sourceIndex];
      newState.splice(sourceIndex, 1);
      newState.splice(destinationIndex, 0, source);
      return newState;
    }
    case types.IMPORTED_TEMPLATES:
      return action.payload;
    default:
      return state;
  }
};

export const showTemplateSelection = (state = false, action) => {
  switch (action.type) {
    case types.SHOW_TEMPLATE_SELECTION:
      return true;
    case types.SELECT_TEMPLATE:
      return false;
    default:
      return state;
  }
};