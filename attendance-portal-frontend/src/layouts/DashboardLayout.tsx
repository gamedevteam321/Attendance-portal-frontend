import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'

export default function DashboardLayout() {
    const location = useLocation()
    const { isLoading } = useAuth()
    const { isCollapsed } = useSidebar()

    // Map paths to titles
    const getTitle = (pathname: string) => {
        switch (pathname) {
            case '/': return 'Dashboard'
            case '/attendance/logs': return 'Attendance'
            case '/remote': return 'Remote Work'
            case '/leave': return 'Leave Management'
            case '/regularization': return 'Attendance'
            case '/profile': return 'Profile'
            case '/approvals': return 'Approvals'
            case '/office-locations': return 'Office Locations'
            case '/employees': return 'Employees'
            default: return 'Dashboard'
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Loading your profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Sidebar />
            <div className={`
                min-h-screen flex flex-col transition-all duration-300 ease-in-out
                lg:ml-20
                ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
            `}>
                <Header title={getTitle(location.pathname)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
