import { ipcMain } from "electron";
import {
  ALWAYS_ON_TOP_SETTING,
  OPACITY_SETTING,
  TRANSPARENT_SETTING,
  NUMBER_OF_CLIPS_SETTING,
  CLIPS
} from "./constants";

export default function handleMessages(app, window, store) {
  ipcMain.on('set-always-on-top', (e, { preference }) => {
    window.setAlwaysOnTop(preference);
    store.set(ALWAYS_ON_TOP_SETTING, preference);
  });
  
  ipcMain.on('set-transparent', (e, { preference }) => {
    window.setOpacity(preference ? store.get(OPACITY_SETTING) : 1);
    store.set(TRANSPARENT_SETTING, preference);
  });
  
  ipcMain.on('set-opacity', (e, { opacity }) => {
    window.setOpacity(opacity);
    store.set(OPACITY_SETTING, opacity);
  });
  
  ipcMain.on('set-number-of-clips', (e, { numberOfClips }) => {
    store.set(NUMBER_OF_CLIPS_SETTING, numberOfClips);
    const maxHeight = (numberOfClips * 31) + 40;
    const currentSize = window.getSize();
    if (currentSize[1] > maxHeight) window.setSize(currentSize[0], maxHeight);
    window.setMaximumSize(
      2048 * 4, // do not want to set a maximum width, but that is not possible so we just set a big one
      maxHeight,
    );
  });
  
  ipcMain.on('save-clips', (e, { clips }) => {
    store.set(CLIPS, clips);
  });
  
  ipcMain.on('load-clips', (event) => {
    event.returnValue = store.get(CLIPS);
  });

  ipcMain.on('quit-app', () => {
    app.quit();
  });
}