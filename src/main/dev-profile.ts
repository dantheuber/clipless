import { app } from 'electron';
import { is } from '@electron-toolkit/utils';

// Dev builds otherwise share the installed app's userData directory, and with it
// the single-instance lock. When an installed Clipless is running in the tray,
// `npm run dev` loses that lock, quits immediately, and the installed copy
// handles 'second-instance' by focusing its own window — so a window appears,
// the freshly built code never runs, and nothing indicates which build you are
// looking at. A separate profile also keeps dev runs from mutating real clips.
//
// This has to happen before any module derives a path from userData, and the
// storage singleton does so in its constructor at import time. Hence a
// side-effect module imported first in src/main/index.ts rather than a call in
// that file's body: ES module imports are evaluated before the importing
// module's statements.
if (is.dev) {
  app.setPath('userData', `${app.getPath('userData')}-dev`);
}
