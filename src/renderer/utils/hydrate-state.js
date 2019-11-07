import { DEFAULT_APP_STATE } from "../constants";
import {
  NAME as CLIPS_NAME,
  NUMBER_OF_CLIPS,
  DEFAULT_CLIPS_STATE,
} from '../clips/constants';

export default function hydrateState(storedState = DEFAULT_APP_STATE) {
  const state = storedState;
  
  if (state[CLIPS_NAME].clips.length < NUMBER_OF_CLIPS) {
    state[CLIPS_NAME].clips = DEFAULT_CLIPS_STATE;
  }

  return state;
}