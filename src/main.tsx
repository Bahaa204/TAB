import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Display3DModelsProvider } from './context/Display3DModelsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Display3DModelsProvider>
      <App />
    </Display3DModelsProvider>
  </StrictMode>,
)
