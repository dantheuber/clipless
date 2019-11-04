import {
  combineReducers,
  createStore,
  applyMiddleware,
} from 'redux';
import reduxThunk from 'redux-thunk';
import reduxLogger from 'redux-logger';
import reducers from './reducers';
import { LOCAL_STORAGE_STATE_KEY } from './constants';

const storedState = JSON.parse(localStorage.getItem(LOCAL_STORAGE_STATE_KEY)) || {};

const middleware = [
  reduxThunk,
];

// create-react-app build overrides NODE_ENV with "production"
// so we use our own env variable for development builds.
if (['development', 'dev', 'local'].includes(process.env.NODE_ENV)) {
  middleware.push(reduxLogger);
}

const store = createStore(
  combineReducers({ ...reducers }),
  storedState,
  applyMiddleware(...middleware),
);

// stores redux state in session storage
window.addEventListener('beforeunload', () => {
  const saveState = {
    ...store.getState(),
  };
  localStorage.setItem(LOCAL_STORAGE_STATE_KEY, JSON.stringify(saveState));
});


export default store;