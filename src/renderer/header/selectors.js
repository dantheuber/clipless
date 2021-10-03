import { NAME } from './constants';
import baseSelector from '../utils/base-selector';
import { selectingQuickClips } from '../preferences/quick-clip-launch/selectors';
import { showTemplateSelection } from '../preferences/compile-templates/selectors';
import { viewingPreferences } from '../preferences/selectors';

const select = baseSelector(NAME);

export const menuVisible = select('menuVisible');

export const showBackButton = state => selectingQuickClips(state) || showTemplateSelection(state) || viewingPreferences(state);