import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import { SidebarProvider } from './contexts/SidebarContext'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AttendanceLogsPage from './pages/AttendanceLogsPage'
import RemoteWorkPage from './pages/RemoteWorkPage'
import LeavePage from './pages/LeavePage'
import ProfilePage from './pages/ProfilePage'
import OfficeLocationPage from './pages/OfficeLocationPage'
import ApprovalsPage from './pages/ApprovalsPage'

import EmployeeManagementPage from './pages/EmployeeManagementPage'
import EmployeeDetailsPage from './pages/EmployeeDetailsPage'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes with Dashboard Layout */}
        <Route element={
          <ProtectedRoute>
            <SidebarProvider>
              <DashboardLayout />
            </SidebarProvider>
          </ProtectedRoute>
        }>
          <Route path="/" element={<HomePage />} />
          <Route path="/attendance/logs" element={<AttendanceLogsPage />} />
          <Route path="/remote" element={<RemoteWorkPage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/regularization" element={<Navigate to="/attendance/logs" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/office-locations" element={<OfficeLocationPage />} />
          <Route path="/employees" element={<EmployeeManagementPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

