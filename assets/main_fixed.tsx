import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
// Import the bundled CSS. The original stylesheet was saved as `index(1).css`
// so we need to adjust the import path to ensure styles load correctly.
import './index(1).css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
