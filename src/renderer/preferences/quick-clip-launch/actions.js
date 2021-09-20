import { ipcRenderer, shell } from 'electron';
import * as types from './action-types';
import { searchTerms, tools } from './selectors';

const saveToDisk = () => (dispatch, getState) => {
  const state = getState();
  const quickClips = {
    tools: tools(state),
    searchTerms: searchTerms(state),
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

export const scanForTerms = (payload) => (dispatch, getState) => {
  const state = getState();
  const terms = searchTerms(state);
  
  const matches = terms.map((term) => {
    const regex = new RegExp(term.regex, 'g');
    const matches = payload.match(regex) || [];
    return matches.map(match => ({
      term,
      match,
    }));
  }).reduce((acc, m) => [...m, ...acc], []);

  if (matches.length) {
    dispatch({
      type: types.SEARCH_TERMS_FOUND,
      payload: matches,
    });
    dispatch(getItemsTools(matches));
  }
};

export const getItemsTools = (payload) => (dispatch, getState) => {
  const state = getState();
  const _tools = tools(state);

  const m = _tools.map(tool => {
    return {
      ...tool,
      matches: payload.filter(m => tool.terms && tool.terms[m.term.name])
    };
  }).filter(tool => tool.matches.length > 0)
    .map(tool => {
      tool.matches.map(({ match }) => {
        shell.openExternalSync(tool.url.replace('{searchTerm}', encodeURIComponent(match)));
      });
    });

  console.log(m);
};

export const launchQuickTool = ({ payload }) => (dispatch, getState) => {
  
  dispatch({
    type: types.LAUNCH_QUICK_TOOL,
    payload,
  });
};
