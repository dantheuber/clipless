import { NAME } from '../constants';
import baseSelect from '../../utils/base-selector';

const select = baseSelect(NAME);

export const viewingTemplateEditor = select('viewingTemplateEditor');
export const compileTemplates = select('compileTemplates');
export const currentTemplate = select('currentTemplate');
export const showTemplateSelection = select('showTemplateSelection');