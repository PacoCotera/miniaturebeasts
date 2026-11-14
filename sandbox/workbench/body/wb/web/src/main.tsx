import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import { captureToken } from './lib/api'
import App from './App'

captureToken()
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
