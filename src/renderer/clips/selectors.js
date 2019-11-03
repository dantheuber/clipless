import { NAME } from './constants';
import baseSelector from '../utils/base-selector';

const select = baseSelector(NAME);

export const clips = select('clips');
export const lastClip = state => clips(state)[0];
