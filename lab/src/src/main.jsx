import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { getMood } from './lib/store.js';

document.documentElement.dataset.mood = getMood();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
