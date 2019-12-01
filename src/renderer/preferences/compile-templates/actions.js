import { ipcRenderer, clipboard } from 'electron';
import * as types from './action-types';
import { SAVE_TO_DISK_DELAY, CLIP_TOKEN_REGEX } from './constants';
import { compileTemplates as compileTemplatesSelector } from './selectors';
import { clip } from '../../clips/selectors';
import simpleAction from '../../utils/simple-action';

let savingTimeout;
export const saveTemplatesToDisk = () => (dispatch, getState) => {
  clearTimeout(savingTimeout);
  savingTimeout = setTimeout(() => {
    const compileTemplates = compileTemplatesSelector(getState());
    console.log(compileTemplates);
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