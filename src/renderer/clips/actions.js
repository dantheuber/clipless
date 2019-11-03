import * as types from './action-types';

export const clipboardUpdated = (text) => ({
  type: types.CLIPBOARD_UPDATED,
  payload: text,
});