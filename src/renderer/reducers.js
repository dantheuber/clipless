import { NAME as CLIPS_NAME, reducer as clipsReducer } from './clips';
import { NAME as HEADER_NAME, reducer as headerReducer } from './header';

const reducers = {
  [CLIPS_NAME]: clipsReducer,
  [HEADER_NAME]: headerReducer,
};

export default reducers;