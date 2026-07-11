import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios';

// Global custom window.alert override to display center-aligned premium modal
window.alert = function (message) {
    const existing = document.getElementById('custom-global-alert');
    if (existing) {
        existing.remove();
    }

    const isWarning = message.toLowerCase().includes('warning') || message.toLowerCase().includes('attention');
    const isSuccess = message.toLowerCase().includes('success') || message.toLowerCase().includes('successfully');

    const overlay = document.createElement('div');
    overlay.id = 'custom-global-alert';
    
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: '999999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transition: 'opacity 0.2s ease-out',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '28px',
        maxWidth: '440px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        textAlign: 'center',
        transform: 'scale(0.95)',
        transition: 'transform 0.2s ease-out'
    });

    const iconContainer = document.createElement('div');
    Object.assign(iconContainer.style, {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        margin: '0 auto 16px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    });

    let iconSvg = '';
    if (isSuccess) {
        iconContainer.style.backgroundColor = '#ecfdf5';
        iconSvg = `
            <svg style="width: 32px; height: 32px; color: #059669;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        `;
    } else if (isWarning) {
        iconContainer.style.backgroundColor = '#fffbeb';
        iconSvg = `
            <svg style="width: 32px; height: 32px; color: #d97706;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        `;
    } else {
        iconContainer.style.backgroundColor = '#fef2f2';
        iconSvg = `
            <svg style="width: 32px; height: 32px; color: #dc2626;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        `;
    }
    iconContainer.innerHTML = iconSvg;
    dialog.appendChild(iconContainer);

    const title = document.createElement('h3');
    title.innerText = isSuccess ? 'Success' : isWarning ? 'Warning' : 'Alert';
    Object.assign(title.style, {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1e293b',
        margin: '0 0 8px 0'
    });
    dialog.appendChild(title);

    const msgEl = document.createElement('p');
    msgEl.innerText = message;
    Object.assign(msgEl.style, {
        fontSize: '14px',
        color: '#64748b',
        margin: '0 0 24px 0',
        lineHeight: '1.5',
        wordBreak: 'break-word'
    });
    dialog.appendChild(msgEl);

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
        display: 'flex',
        justifyContent: 'center'
    });

    const okBtn = document.createElement('button');
    okBtn.innerText = 'OK';
    Object.assign(okBtn.style, {
        backgroundColor: isSuccess ? '#059669' : isWarning ? '#d97706' : '#dc2626',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '10px 28px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        transition: 'background-color 0.15s ease'
    });

    okBtn.onmouseover = () => {
        okBtn.style.backgroundColor = isSuccess ? '#047857' : isWarning ? '#b45309' : '#b91c1c';
    };
    okBtn.onmouseout = () => {
        okBtn.style.backgroundColor = isSuccess ? '#059669' : isWarning ? '#d97706' : '#dc2626';
    };

    const closeAlert = () => {
        overlay.style.opacity = '0';
        dialog.style.transform = 'scale(0.95)';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 200);
    };

    okBtn.onclick = closeAlert;
    btnContainer.appendChild(okBtn);
    dialog.appendChild(btnContainer);
    dialog.onclick = (e) => e.stopPropagation();

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '1';
        dialog.style.transform = 'scale(1)';
    }, 10);
};

// Add selected role and programme to every outgoing HTTP request header
axios.interceptors.request.use(
  (config) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      if (storedUser) {
        if (storedUser.role) {
          config.headers['X-Selected-Role'] = storedUser.role;
        }
        if (storedUser.programme) {
          config.headers['X-Selected-Programme'] = storedUser.programme;
        }
      }
    } catch (e) {
      console.warn('Failed to parse user from localStorage for axios interceptor', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
