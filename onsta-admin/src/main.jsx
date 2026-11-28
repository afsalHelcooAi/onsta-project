import React from 'react';
import ReactDOM from 'react-dom/client';
import { applyTheme } from './theme/themeTokens';
import './i18n';
import App from './App';
import './index.css';

applyTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
