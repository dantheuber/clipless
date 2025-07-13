import './assets/base.css';
import './assets/main.css';
import './fontawesome';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ToolsLauncher from './ToolsLauncher';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToolsLauncher />
  </StrictMode>
);
