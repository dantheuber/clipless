import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Content } from './content'
import { startClipboard } from './clipboard';
import store from './store';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import './fontawesome';

ReactDOM.render(
  <Provider store={store}>
    <Content />
  </Provider>,
  document.getElementById('app'),
);

startClipboard(store);