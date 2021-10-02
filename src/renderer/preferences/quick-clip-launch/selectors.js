import { NAME } from '../constants';

const select = attribute => state => state[NAME].quickClips[attribute];

export const tools = select('tools');
export const searchTerms = select('searchTerms');
export const autoScan = select('autoScan');
export const matchedTerms = select('matchedTerms');
export const selectedTerms = select('selectedTerms');
export const selectedTools = select('selectedTools');
export const selectingQuickClips = select('selectingQuickClips');

export const toolCount = state => tools(state).length;
export const searchTermCount = state => searchTerms(state).length;
export const availableTools = state => {
  const _tools = tools(state);
  return _tools.map(tool => ({
    ...tool,
    matches: selectedTerms(state).filter(m => tool.terms && tool.terms[m.term.name])
  })).filter(tool => tool.matches.length > 0);
};

export const termIsSelected = state => term => selectedTerms(state).includes(term);
export const toolIsSelected = state => tool => selectedTools(state).includes(tool);

export const tool = (state, name) => tools(state).find({ name });
export const toolTermAssociations = (state, name) => tool(state, name).terms || {};