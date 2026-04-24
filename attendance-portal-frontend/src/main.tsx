import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FrappeProvider } from 'frappe-react-sdk'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FrappeProvider
      //url="https://admin.orgatek.net"
      url="http://localhost:8000"
      socketPort="9000"
      tokenParams={{
        useToken: true,
        token: () => localStorage.getItem('frappe_token') || '',
        type: 'token'
      }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </FrappeProvider>
  </StrictMode>,
)

