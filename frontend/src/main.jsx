import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// Minimal placeholder shell. A later step (S-0009) adds React Router routes
// and App.jsx/routes.jsx; this file intentionally renders inline JSX (no
// App.jsx import) so that step can introduce those files without conflict.
function Placeholder() {
  return (
    <div className="app-loading">
      <p>Loading...</p>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Placeholder />
  </React.StrictMode>
)
