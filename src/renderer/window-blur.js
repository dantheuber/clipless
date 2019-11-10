import { ipcRenderer } from "electron";

ipcRenderer.on('window-blur', () => {
  // cause TriggerOverlay rootClose to close overlays
  // https://stackoverflow.com/a/47636953
  document.body.click();
});
