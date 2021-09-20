import { NAME } from '../constants';

const select = attribute => state => state[NAME].quickClips[attribute];

export const tools = select('tools');
export const searchTerms = select('searchTerms');

export const tool = (state, name) => tools(state).find({ name });
export const toolTermAssociations = (state, name) => tool(state, name).terms || {};