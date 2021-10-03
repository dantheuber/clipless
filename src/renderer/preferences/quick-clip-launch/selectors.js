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
export const toolNameList = state => tools(state).map(tool => tool.name);
export const searchTermNameList = state => searchTerms(state).map(term => term.name);
export const searchTermNameExists = (state, name) =>
  searchTermNameList(state)
    .map(n => n.toLowerCase())
    .reduce((acc, n) => acc.includes(n) ? acc : [...acc, n], [])
    .includes(name.toLowerCase());

export const toolAssociatedTermsCount = (state) => tool =>
  Object.keys(tool.terms)
    .filter(term => tool.terms[term] && searchTermNameExists(state, term))
    .length;

export const tool = (state, name) => tools(state).find({ name });
export const toolTermAssociations = (state, name) => tool(state, name).terms || {};