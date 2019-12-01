import { ipcRenderer } from 'electron';
import * as types from './action-types';
import { SAVE_TO_DISK_DELAY } from './constants';
import { compileTemplates as compileTemplatesSelector } from './selectors';

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