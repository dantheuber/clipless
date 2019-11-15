import {
  NAME as CLIPS_NAME,
  reducer as clipsReducer
} from './clips';
  import {
  NAME as HEADER_NAME,
  reducer as headerReducer
} from './header';
import {
  NAME as PREFERENCES_NAME,
  reducer as preferencesReducer,
} from './preferences';

const reducers = {
  [CLIPS_NAME]: clipsReducer,
  [HEADER_NAME]: headerReducer,
  [PREFERENCES_NAME]: preferencesReducer,
};

export default reducers;