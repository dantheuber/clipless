import { NAME } from './constants';
import baseSelector from '../utils/base-selector';

const select = baseSelector(NAME);

export const menuVisible = select('menuVisible');
