import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Content } from './content'
import { startClipboard } from './clipboard';
import store from './store';

ReactDOM.render(
  <Provider store={store}>
    <Content />
  </Provider>,
  document.getElementById('app'),
);

startClipboard(store);