import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { normalizeLegacyHash } from './legacyHash.js';
import './style.css';

normalizeLegacyHash(window);

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
