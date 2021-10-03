import { ipcRenderer, shell } from 'electron';
import uniqBy from 'lodash.uniqby';
import * as types from './action-types';
import {
  autoScan,
  availableTools,
  matchedTerms,
  searchTerms,
  selectedTerms,
  selectedTools,
  tools
} from './selectors';
import exportFile from '../../utils/export-file';
import { SAVE_TO_DISK_DELAY } from '../compile-templates/constants';

let savingTimeout;
export const saveToDisk = () => (dispatch, getState) => {
  clearTimeout(savingTimeout);
  savingTimeout = setTimeout(() => {
    const state = getState();
    const quickClips = {
      tools: tools(state),
      searchTerms: searchTerms(state),
      autoScan: autoScan(state),
    };
    ipcRenderer.send('set-quickClip-settings', quickClips);
    savingTimeout = null;
    dispatch({ type: types.SAVED_TO_DISK });
  }, SAVE_TO_DISK_DELAY);
}

export const createNewTool = (payload) => (dispatch) => {
  dispatch({
    type: types.CREATE_NEW_TOOL,
    payload: { ...payload, terms: {} },
  });
  dispatch(saveToDisk());
};

export const createNewSearchTerm = payload => (dispatch) => {
  dispatch({
    type: types.CREATE_NEW_SEARCH_TERM,
    payload,
  });
  dispatch(saveToDisk());
};

export const deleteTerm = payload => (dispatch) => {
  dispatch({
    type: types.DELETE_SEARCH_TERM,
    payload,
  });
  dispatch(saveToDisk());
};

export const updateTool = payload => (dispatch) => {
  dispatch({
    type: types.UPDATE_TOOL,
    payload,
  });
  dispatch(saveToDisk());
};

export const updateToolUrl = (tool, newUrl) => (dispatch) => {
  dispatch(updateTool({
    ...tool,
    url: newUrl,
  }));
  dispatch(saveToDisk());
};

export const deleteTool = payload => (dispatch) => {
  dispatch({
    type: types.DELETE_TOOL,
    payload,
  });
  dispatch(saveToDisk());
};

export const handleDragAndDrop = ({ source, destination }) => (dispatch) => {
  dispatch({
    type: types.HANDLE_DRAG_AND_DROP,
    payload: {
      source,
      destination,
    },
  });
};

export const toggleAutoScan = () => (dispatch) => {
  dispatch({ type: types.TOGGLE_AUTO_SCAN });
  dispatch(saveToDisk());
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

export const exportQuickClips = () => (dispatch, getState) => {
  const state = getState();
  const toSave = {
    tools: tools(state),
    searchTerms: searchTerms(state),
  };
  exportFile(JSON.stringify(toSave), 'quick-clips.json');
};

export const importQuickClips = file => (dispatch, getState) => {
  const state = getState();
  const existing = {
    tools: tools(state),
    searchTerms: searchTerms(state),
  };
  const read = new FileReader();
  read.readAsBinaryString(file);
  read.onloadend = () => {
    try {
      const content = JSON.parse(read.result);
      const uniqueTools = uniqBy([
        ...content.tools,
        ...existing.tools,
      ], 'name');
      const uniqueTerms = uniqBy([
        ...content.searchTerms,
        ...existing.searchTerms,
      ], 'name');
      dispatch({
        type: types.IMPORT_QUICK_CLIPS,
        payload: {
          tools: uniqueTools,
          searchTerms: uniqueTerms,
        }
      });
      dispatch(saveToDisk());
    } catch (e) {
      alert('Could not parse this file, was it exported by Clipless?');
    }
  } 
};

export const startSelection = () => ({
  type: types.START_SELECTION,
});

export const scanForTerms = (payload) => (dispatch, getState) => {
  const state = getState();
  const terms = searchTerms(state);
  
  let matches = terms.map((term) => {
    const regex = new RegExp(term.regex, 'g');
    const matches = [...payload.matchAll(regex)] || [];
    return matches.map(match => ({
      term,
      match,
      groups: match.groups
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

export const launchSingleTool = (tool, term) => (dispatch) => {
  // dispatch({
  //   type: types.LAUNCH_QUICK_TOOL,
  //   payload: {
  //     tools: [tool],
  //     matchedTerms: [term]
  //   }
  // });

  const url = Object.keys(term.match.groups)
    .reduce((acc, group) => acc.replace(`{${group}}`, term.match.groups[group]), tool.url);
  
  shell.openExternalSync(url);
};

export const launch = (tls, tms) => {
  tls.map(tl => tms.map(tm => {
    let url = tl.url;
    if (tm.groups) {
      url = Object.keys(tm.groups).reduce((acc, group) => {
        const toReplace = tl.encode ? encodeURIComponent(tm.groups[group]) : tm.groups[group];
        return acc.replace(`{${group}}`, toReplace);
      }, url);
    } else {
      const rep = tl.encode ? encodeURIComponent(tm.match) : tm.match;
      url = tl.url.replace('{searchTerm}', rep);
    }
    shell.openExternalSync(url);
  }));
};

export const launchAll = () => (dispatch, getState) => {
  const state = getState();
  const _terms = matchedTerms(state);
  const _tools = tools(state);

  dispatch({
    type: types.LAUNCH_QUICK_TOOL,
    payload: {
      tools: _tools,
      matchedTerms: _terms
    },
  });

  launch(_tools, _terms);
};

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

  launch(sTools, sTerms);
};
