import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { CategoryProvider } from './context/CategoryContext.tsx'
import { ProductProvider } from './context/ProductContext.tsx'

// Suppress console logging in development for network requests
if (import.meta.env.DEV) {
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;
  const originalConsoleInfo = console.info;
  
  console.log = function(...args: unknown[]) {
    if (typeof args[0] === 'string' && args[0].includes('XHR finished loading')) {
      return;
    }
    return originalConsoleLog.apply(console, args);
  };
  
  console.debug = function(...args: unknown[]) {
    if (typeof args[0] === 'string' && (
        args[0].includes('XHR') || 
        args[0].includes('request') ||
        args[0].includes('response')
      )) {
      return;
    }
    return originalConsoleDebug.apply(console, args);
  };

  console.info = function(...args: unknown[]) {
    if (typeof args[0] === 'string' && args[0].includes('XHR')) {
      return;
    }
    return originalConsoleInfo.apply(console, args);
  };
}

// Suppress console logging in production before any other code runs
if (import.meta.env.MODE !== 'development') {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = () => {};
}

// Initialize theme
const initTheme = () => {
  const theme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
  document.documentElement.classList.toggle('dark', theme === 'dark');
};
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CategoryProvider>
      <ProductProvider>
        <App />
      </ProductProvider>
    </CategoryProvider>
  </StrictMode>,
)
