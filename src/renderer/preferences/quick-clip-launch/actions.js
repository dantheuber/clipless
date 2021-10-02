import { ipcRenderer, shell } from 'electron';
import * as types from './action-types';
import {
  autoScan,
  availableTools,
  searchTerms,
  selectedTerms,
  selectedTools,
  tools
} from './selectors';

const saveToDisk = () => (dispatch, getState) => {
  const state = getState();
  const quickClips = {
    tools: tools(state),
    searchTerms: searchTerms(state),
    autoScan: autoScan(state),
  };
  ipcRenderer.send('set-quickClip-settings', quickClips);
}

export const createNewTool = (payload) => (dispatch) => {
  dispatch({
    type: types.CREATE_NEW_TOOL,
    payload: { ...payload, terms: {} },
  });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const createNewSearchTerm = payload => (dispatch) => {
  dispatch({
    type: types.CREATE_NEW_SEARCH_TERM,
    payload,
  });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const deleteTerm = payload => (dispatch) => {
  dispatch({
    type: types.DELETE_SEARCH_TERM,
    payload,
  });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const updateTool = payload => (dispatch) => {
  dispatch({
    type: types.UPDATE_TOOL,
    payload,
  });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const deleteTool = payload => (dispatch) => {
  dispatch({
    type: types.DELETE_TOOL,
    payload,
  });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const toggleAutoScan = () => (dispatch) => {
  dispatch({ type: types.TOGGLE_AUTO_SCAN });
  setTimeout(() => dispatch(saveToDisk()), 500);
};

export const toggleToolEncode = (tool) => (dispatch) => dispatch(
  updateTool({
    ...tool,
    encode: !tool.encode
  })
);

export const associateTerm = ({ tool, term }) => (dispatch) => {
  let terms = {
    ...term
  };
  if (tool.terms) {
    terms = {
      ...tool.terms,
      ...term,
    };
  }
  dispatch(updateTool({
    ...tool,
    terms,
  }));
};

export const startSelection = () => ({
  type: types.START_SELECTION,
});

export const scanForTerms = (payload) => (dispatch, getState) => {
  const state = getState();
  const terms = searchTerms(state);
  
  let matches = terms.map((term) => {
    const regex = new RegExp(term.regex, 'g');
    const matches = payload.match(regex) || [];
    return matches.map(match => ({
      term,
      match,
    }));
  }).reduce((acc, m) => [...m, ...acc], []);

  // trim duplicate matches
  matches = matches.filter((m, index, self) =>
    index === self.findIndex((t) => (t.match === m.match))
  );

  if (matches.length) {
    dispatch({
      type: types.SEARCH_TERMS_FOUND,
      payload: matches,
    });
    dispatch(startSelection());
  }
};

export const selectTerm = (payload) => ({
  type: types.SELECT_TERM,
  payload,
});

export const pruneToolSelection = () => (dispatch, getState) => {
  const state = getState();
  const aTools = availableTools(state);
  const sTools = selectedTools(state);
  
  const prunedSelection = sTools.filter(st => aTools.reduce(at => at.name === st.name ? true : acc, false));
  
  if (sTools.length > prunedSelection) {
    dispatch({
      type: types.UPDATE_TOOL_SELECTION,
      payload: prunedSelection,
    });
  }
};
export const unselectTerm = (payload) => (dispatch) => {
  dispatch({
    type: types.UN_SELECT_TERM,
    payload,
  });
  setTimeout(() => dispatch(pruneToolSelection()), 50);
};
export const selectTool = (payload) => ({
  type: types.SELECT_TOOL,
  payload,
});
export const unselectTool = (payload) => ({
  type: types.UN_SELECT_TOOL,
  payload,
});

export const cancelSelection = () => ({
  type: types.CANCEL_SELECTION,
});
export const launchSelected = () => (dispatch, getState) => {
  const state = getState();
  const sTerms = selectedTerms(state);
  const sTools = selectedTools(state);

  dispatch({
    type: types.LAUNCH_QUICK_TOOL,
    payload: {
      tools: sTools,
      matchedTerms: sTerms,
    },
  });

  sTools.map(tl => sTerms.map(tm => {
    if (tl.terms[tm.term.name]) {
      const rep = tl.encode ? encodeURIComponent(tm.match) : tm.match;
      shell.openExternalSync(tl.url.replace('{searchTerm}', rep));
    }
  }));
};
