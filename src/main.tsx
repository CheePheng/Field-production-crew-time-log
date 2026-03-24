import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { db } from '@/db/schema'
import { createDefaultAdmin } from '@/utils/auth'

// Request persistent storage so IndexedDB data isn't evicted by the browser
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(persisted => {
    if (!persisted) {
      console.warn('[FieldLog] Persistent storage not granted. Data may be cleared under storage pressure.')
    }
  })
}

// Initialise the database sequentially to avoid race conditions.
// In DEV, seedDatabase creates the admin user itself; in production we only
// call createDefaultAdmin so no sample data is ever written.
async function init() {
  if (import.meta.env.DEV) {
    const { seedDatabase } = await import('./db/seed');
    await seedDatabase(db);
  } else {
    await createDefaultAdmin(db);
  }
}
init().catch(err => console.error('[FieldLog] init error:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
