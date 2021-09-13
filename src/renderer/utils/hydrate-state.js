import { DEFAULT_APP_STATE } from "../constants";
import { NAME as CLIPS_NAME } from '../clips/constants';
import { NAME as PREFERENCES_NAME } from '../preferences/constants';
import { ipcRenderer } from "electron";

export default function hydrateState(storedState = DEFAULT_APP_STATE) {
  const state = storedState;

  const {
    clips,
    alwaysOnTop,
    transparent,
    opacity,
    emptyLockedClips,
    numberOfClips,
    compileTemplates,
    quickClipLaunch
  } = ipcRenderer.sendSync('hydrate-state');

  state[CLIPS_NAME].clips = clips;
  state[PREFERENCES_NAME] = {
    alwaysOnTop,
    transparent,
    opacity,
    emptyLockedClips,
    numberOfClips,
    compileTemplates,
    quickClipLaunch,
  };

  return state;
}