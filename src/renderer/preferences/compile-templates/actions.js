import { ipcRenderer, clipboard } from 'electron';
import uniqBy from 'lodash.uniqby';
import * as types from './action-types';
import { SAVE_TO_DISK_DELAY, CLIP_TOKEN_REGEX } from './constants';
import { compileTemplates as compileTemplatesSelector } from './selectors';
import { clip } from '../../clips/selectors';
import simpleAction from '../../utils/simple-action';
import exportFile from '../../utils/export-file';

let savingTimeout;
export const saveTemplatesToDisk = () => (dispatch, getState) => {
  clearTimeout(savingTimeout);
  savingTimeout = setTimeout(() => {
    const compileTemplates = compileTemplatesSelector(getState());
    ipcRenderer.send('save-compile-templates', { compileTemplates });
    savingTimeout = null;
    dispatch({ type: types.SAVED_TO_DISK });
  }, SAVE_TO_DISK_DELAY);
};

export const createNewTemplate = () => (dispatch) => {
  dispatch({ type: types.CREATE_NEW_TEMPLATE });
  dispatch(saveTemplatesToDisk());
}
export const deleteTemplate = index => (dispatch) => {
  dispatch({
    type: types.DELETE_TEMPLATE,
    payload: index,
  });
  dispatch(saveTemplatesToDisk());
};

export const updateTemplateName = (e, template) => (dispatch) => {
  dispatch({
    type: types.MODIFY_TEMPLATE,
    payload: {
      ...template,
      name: e.target.value,
    },
  });
  dispatch(saveTemplatesToDisk());
}
export const updateTemplateContent = (e, template) => (dispatch) => {
  dispatch({
    type: types.MODIFY_TEMPLATE,
    payload: {
      ...template,
      content: e.target.value,
    },
  });
  dispatch(saveTemplatesToDisk());
}

export const handleDragAndDrop = e => (dispatch) => {
  dispatch({
    type: types.DRAG_AND_DROP,
    payload: {
      sourceIndex: e.source.index,
      destinationIndex: e.destination.index,
    }
  });
  dispatch(saveTemplatesToDisk());
};
export const toggleCompileTemplateSelector = simpleAction(types.TOGGLE_TEMPLATE_SELECTION);
export const showCompileTemplateSelector = simpleAction(types.SHOW_TEMPLATE_SELECTION);
export const selectTemplate = template => (dispatch, getState) => {
  const state = getState();
  let newText = template.content;
  template.content
    .match(CLIP_TOKEN_REGEX)
    .forEach(match => {
    const number = Number(match.match(/\d+/));
    const clipContent = clip(state, number && number - 1);
    newText = newText.replace(match, clipContent);
  });
  clipboard.writeText(newText);
  dispatch({ type: types.SELECT_TEMPLATE });
};

export const exportTemplates = () => (dispatch, getState) => {
  const state = getState();
  const templates = compileTemplatesSelector(state);
  exportFile(JSON.stringify(templates), 'compile-templates.json');
};

export const cancelSelection = simpleAction(types.HIDE_TEMPLATE_SELECTION);

const ensureTemplateKeys = template => ['content', 'id', 'name'].every(x => x in template);

export const importTemplates = file => (dispatch, getState) => {
  const state = getState();
  const templates = compileTemplatesSelector(state);
  const read = new FileReader();
  read.readAsBinaryString(file);
  read.onloadend = () => {
    try {
      const content = JSON.parse(read.result).filter(ensureTemplateKeys);
      const unique = uniqBy([
        ...content,
        ...templates,
      ], 'id');

      dispatch({
        type: types.IMPORTED_TEMPLATES,
        payload: unique,
      });
      dispatch(saveTemplatesToDisk());
    } catch (e) {
      alert('Could not parse this file, was it exported by Clipless?');
    }
  };
};