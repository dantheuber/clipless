import { ipcRenderer } from 'electron';
import { clipSelected } from './clips/actions';
import { showCompileTemplateSelector } from './preferences/compile-templates/actions';

export default function hotkeys(store) {
  ipcRenderer.on('get-clip', (event, { index }) => {
    store.dispatch(clipSelected(index));
  });

  ipcRenderer.on('compile-templates-pressed', () => {
    store.dispatch(showCompileTemplateSelector());
  });
}