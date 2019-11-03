import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './store';
import { Content } from './content'
import { startClipboard } from './clipboard';

ReactDOM.render(
  <Provider store={store}>
    <Content />
  </Provider>,
  document.getElementById('app'),
);

startClipboard(store);