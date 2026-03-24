import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { db } from '@/db/schema'
import { createDefaultAdmin } from '@/utils/auth'
import { seedDatabase } from '@/db/seed'

// Request persistent storage so IndexedDB data isn't evicted by the browser
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(persisted => {
    if (!persisted) {
      console.warn('[FieldLog] Persistent storage not granted. Data may be cleared under storage pressure.')
    }
  })
}

// Ensure a default admin user exists
createDefaultAdmin(db).catch(err =>
  console.error('[FieldLog] createDefaultAdmin error:', err)
)

// In development mode, seed the database with sample data
if (import.meta.env.DEV) {
  seedDatabase(db).catch(err =>
    console.error('[FieldLog] seedDatabase error:', err)
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
