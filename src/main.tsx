import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
*/

import { AuthProvider } from './contexts/AuthContext';
import { RecipeProvider } from './contexts/RecipeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RecipeProvider>
        <App />
      </RecipeProvider>
    </AuthProvider>
  </StrictMode>,
);
