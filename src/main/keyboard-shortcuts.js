import { globalShortcut } from 'electron';

export default function keyboardShortcuts(app, window) {
  [1,2,3,4,5,6,7,8,9,0].forEach((key) => {
    globalShortcut.register(`CommandOrControl+${key}`, () => {
      let index = key - 1;
      if (key === 0) index = 9;
      window.webContents.send('get-clip', { index });
    });
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}