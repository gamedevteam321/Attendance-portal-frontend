import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar() {
    const location = useLocation()
    const { isManager, isHrAdmin, employeeName, logout } = useAuth()

    const isActive = (path: string) => location.pathname === path

    const navItems = [
        { path: '/', label: 'Dashboard', icon: 'dashboard' },
        { path: '/attendance/logs', label: 'Attendance', icon: 'schedule' },
        { path: '/leave', label: 'Leaves', icon: 'event_note' },
        { path: '/remote', label: 'Remote Work', icon: 'home_work' },
    ]

    if (isManager || isHrAdmin) {
        navItems.push({ path: '/approvals', label: 'Approvals', icon: 'check_circle' })
    }

    if (isHrAdmin) {
        navItems.push({ path: '/office-locations', label: 'Office Locations', icon: 'location_on' })
        navItems.push({ path: '/employees', label: 'Employees', icon: 'group' })
    }

    return (
        <aside className="w-64 bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex flex-col z-20">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                    A
                </div>
                <span className="text-xl font-bold text-gray-800">Portal</span>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive(item.path)
                            ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span className="material-symbols-rounded text-xl">
                            {item.icon}
                        </span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="flex items-center gap-3 px-2">
                    <Link to="/profile" className="w-10 h-10 rounded-full overflow-hidden hover:opacity-80 transition cursor-pointer border border-gray-200 flex-shrink-0">
                        <img
                            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(employeeName || 'User')}`}
                            alt="Profile"
                            className="w-full h-full object-cover"
                        />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{employeeName}</p>
                        <p className="text-xs text-gray-500 truncate">Employee</p>
                    </div>
                    <button
                        onClick={logout}
                        className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                        title="Logout"
                    >
                        <span className="material-symbols-rounded text-xl">logout</span>
                    </button>
                </div>
            </div>
        </aside>
    )
}
