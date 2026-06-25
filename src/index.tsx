import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';
import { appRoutes } from '../router';
import './styles/index.css';

function RouterApp() {
  return useRoutes(appRoutes);
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
      <RouterApp />
    </BrowserRouter>
  </React.StrictMode>
);
