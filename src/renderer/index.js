import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Content } from './content'
import { startClipboard } from './clipboard';
import store from './store';
import './app.css';

ReactDOM.render(
  <Provider store={store}>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700,900" rel="stylesheet"></link>
    <Content />
  </Provider>,
  document.getElementById('app'),
);

startClipboard(store);