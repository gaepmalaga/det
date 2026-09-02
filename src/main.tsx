import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppRouter } from '@/app/Router'
import { registerAppUpdates } from '@/lib/appUpdate'
import './index.css'

registerAppUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>
)