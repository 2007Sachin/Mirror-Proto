import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './ui/system.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import App from './App.tsx'
import './styles/paper.css'
import './styles/paper-session.css'
import './styles/paper-practice.css' // last on purpose: the theme layer overrides page stylesheets
import './styles/site-theme.css' // after the paper layer: moves the app onto the marketing-site look
import './styles/app-revamp.css' // last: the app's shell, headings, cards and folder cards in the website's language

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
