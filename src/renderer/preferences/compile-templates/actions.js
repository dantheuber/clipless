import * as types from './action-types';
import simpleAction from '../../utils/simple-action';

export const createNewTemplate = simpleAction(types.CREATE_NEW_TEMPLATE);
export const deleteTemplate = simpleAction(types.DELETE_TEMPLATE);

export const updateTemplateName = (e, template) => ({
  type: types.MODIFY_TEMPLATE,
  payload: {
    ...template,
    name: e.target.value,
  },
});
export const updateTemplateContent = (e, template) => ({
  type: types.MODIFY_TEMPLATE,
  payload: {
    ...template,
    content: e.target.value,
  },
});

export const handleDragAndDrop = e => ({
  type: types.DRAG_AND_DROP,
  payload: {
    sourceIndex: e.source.index,
    destinationIndex: e.destination.index,
  }
});