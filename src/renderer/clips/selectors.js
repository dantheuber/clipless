import { NAME } from './constants';
import baseSelector from '../utils/base-selector';

const select = baseSelector(NAME);

export const clips = select('clips');
export const lastClip = state => clips(state)[0];
export const clip = (state, num) => {
  if (num === 0) return clips(state)[9];
  return clips(state)[num - 1];
};
