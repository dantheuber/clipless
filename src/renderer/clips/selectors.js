import { NAME } from './constants';
import baseSelector from '../utils/base-selector';

const select = baseSelector(NAME);

export const clips = select('clips');
export const lastKeyUsed = select('lastKeyUsed');
export const clipKeyPressed = select('clipKeyPressed');
export const lastClip = state => clips(state)[lastKeyUsed(state)];
export const clip = (state, index) => clips(state)[index];