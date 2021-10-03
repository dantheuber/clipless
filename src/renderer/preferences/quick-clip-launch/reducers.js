import { combineReducers } from 'redux';
import * as types from './action-types';

export const autoScan = (state = true, action) => {
  const { type } = action;
  switch (type) {
    case types.TOGGLE_AUTO_SCAN:
      return !state;
    default:
      return state;
  }
};

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
      case types.HANDLE_DRAG_AND_DROP: {
        const { source, destination } = payload;
        if (source.droppableId !== 'terms') return state;
        const newState = [...state];
        const termBeingMoved = state[source.index];
        newState.splice(source.index, 1);
        newState.splice(destination.index, 0, termBeingMoved);
        return newState;
      }
    case types.IMPORT_QUICK_CLIPS:
      return payload.searchTerms;
    default:
      return state;
  }
};

export const tools = (state = [], { type, payload }) => {
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
    case types.DELETE_SEARCH_TERM: {
      return state.map((tool) => {
        let { terms } = tool;
        delete terms[payload.name];
        return { ...tool, terms };
      });
    }
    case types.HANDLE_DRAG_AND_DROP: {
      const { source, destination } = payload;
      if (source.droppableId !== 'tools') return state;
      const newState = [...state];
      const toolBeingMoved = state[source.index];
      newState.splice(source.index, 1);
      newState.splice(destination.index, 0, toolBeingMoved);
      return newState;
    }
    case types.IMPORT_QUICK_CLIPS:
      return payload.tools;
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
    case types.LAUNCH_QUICK_TOOL:
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
    case types.LAUNCH_QUICK_TOOL:
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
    case types.LAUNCH_QUICK_TOOL:
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
    case types.LAUNCH_QUICK_TOOL:
      return false;
    default:
      return state;
  }
};

export const reducer = combineReducers({
  autoScan,
  searchTerms,
  tools,
  matchedTerms,
  selectedTerms,
  selectedTools,
  selectingQuickClips,
});
