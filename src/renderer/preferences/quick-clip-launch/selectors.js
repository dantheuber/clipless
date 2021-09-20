import { NAME } from '../constants';

const select = attribute => state => state[NAME].quickClips[attribute];

export const tools = select('tools');
export const searchTerms = select('searchTerms');

export const toolNameExists = (state, name) => tools(state).reduce((i, acc) => {
  if (i.name === name) {
    return true;
  }
  return acc;
}, false);