import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom' // Ye line add ki

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* App ko Router ke andar daal diya */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)