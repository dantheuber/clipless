import { app } from 'electron';
import { is } from '@electron-toolkit/utils';

if (is.dev) {
  app.setPath('userData', `${app.getPath('userData')}-dev`); // sharing the installed app's userData would share its single-instance lock; must run before any import-time userData read, hence a side-effect module imported first in src/main/index.ts
}
