import './assets/settings.css';
import './fontawesome';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './Settings';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Settings />
  </StrictMode>
);
