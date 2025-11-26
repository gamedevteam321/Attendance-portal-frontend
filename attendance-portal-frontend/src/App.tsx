import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import type { ComponentType } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import AttendanceLogsPage from './pages/AttendanceLogsPage'
import RemoteWorkPage from './pages/RemoteWorkPage'
import LeavePage from './pages/LeavePage'
import RegularizationPage from './pages/RegularizationPage'
import ProfilePage from './pages/ProfilePage'
import OfficeLocationPage from './pages/OfficeLocationPage'
import ApprovalsPage from './pages/ApprovalsPage'

import EmployeeManagementPage from './pages/EmployeeManagementPage'
import EmployeeDetailsPage from './pages/EmployeeDetailsPage'

interface RouteConfig {
  path: string
  component: ComponentType
  protected?: boolean
}

const routes: RouteConfig[] = [
  { path: '/login', component: LoginPage, protected: false },
  { path: '/', component: HomePage, protected: true },
  { path: '/attendance/logs', component: AttendanceLogsPage, protected: true },
  { path: '/remote', component: RemoteWorkPage, protected: true },
  { path: '/leave', component: LeavePage, protected: true },
  { path: '/regularization', component: RegularizationPage, protected: true },
  { path: '/profile', component: ProfilePage, protected: true },
  { path: '/approvals', component: ApprovalsPage, protected: true },
]

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes with Dashboard Layout */}
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
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

