import { DEFAULT_APP_STATE } from "../constants";
import { NAME as CLIPS_NAME } from '../clips/constants';
import { ipcRenderer } from "electron";

export default function hydrateState(storedState = DEFAULT_APP_STATE) {
  const state = storedState;

  const clips = ipcRenderer.sendSync('load-clips');
  state[CLIPS_NAME].clips = clips;

  return state;
}