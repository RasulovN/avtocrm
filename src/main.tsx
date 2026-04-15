import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import App from './App.tsx'
import { CategoryProvider } from './context/CategoryContext.tsx'
import { ProductProvider } from './context/ProductContext.tsx'

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
