import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import axios from 'axios'
import App from './pages/App.jsx'
import './styles/index.css'

// Set auth header synchronously before any component mounts to avoid race conditions
const _token = localStorage.getItem('access_token')
if (_token) axios.defaults.headers.common['Authorization'] = `Bearer ${_token}`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)