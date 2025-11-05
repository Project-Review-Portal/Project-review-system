import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Global interceptor to surface unauthorized coordinator access
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || '';
    if (error?.response?.status === 403 && url.includes('/api/panels/coordinator/')) {
      const storedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
      const hasCoordinator = (Array.isArray(storedUser?.roles) && storedUser.roles.some(r => r.role === 'coordinator')) || storedUser?.role === 'coordinator';
      if (hasCoordinator) {
        console.warn('403 from coordinator endpoint but user has coordinator role. Possible stale/invalid token.', { url, storedUser });
        alert('Session does not have coordinator permissions. Please log out and log in as coordinator again.');
      } else {
        console.warn('Blocked coordinator endpoint for non-coordinator user:', url);
        alert('You are not a coordinator for any team.');
      }
    }
    return Promise.reject(error);
  }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
