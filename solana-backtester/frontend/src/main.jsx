import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#161b22',
          color: '#e6edf3',
          border: '1px solid #30363d',
          borderRadius: '12px',
          fontSize: '14px',
          padding: '12px 16px',
        },
        success: { iconTheme: { primary: '#3fb950', secondary: '#0a0b0e' } },
        error: { iconTheme: { primary: '#f85149', secondary: '#0a0b0e' } },
      }}
    />
  </React.StrictMode>,
)
