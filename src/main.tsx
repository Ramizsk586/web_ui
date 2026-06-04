import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider } from './themes';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import App from './App.tsx';
import './index.css';

const convexUrl = localStorage.getItem('convex_vite_url') || '';
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      {convex ? (
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      ) : (
        <App />
      )}
    </ThemeProvider>
  </StrictMode>,
);
