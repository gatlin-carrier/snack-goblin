import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { PrefsProvider } from './lib/prefs.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <PrefsProvider>
        <App />
      </PrefsProvider>
    </AuthProvider>
  </React.StrictMode>
);
