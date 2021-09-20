import { ipcRenderer } from 'electron';
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
    payload,
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

export const launchQuickTool = ({ payload }) => (dispatch, getState) => {
  
  dispatch({
    type: types.LAUNCH_QUICK_TOOL,
    payload,
  });
};
