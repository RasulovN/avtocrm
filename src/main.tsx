import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'

// Initialize theme
const initTheme = () => {
  const theme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
};
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
