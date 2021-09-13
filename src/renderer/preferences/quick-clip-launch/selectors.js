import { NAME } from '../constants';

const select = attribute => state => state[NAME][attribute];

export const tools = select('tools');
export const searchTerms = select('searchTerms');
