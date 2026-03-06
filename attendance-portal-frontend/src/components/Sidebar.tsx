import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSidebar } from '../contexts/SidebarContext'
import { useFrappeGetDoc } from 'frappe-react-sdk'
import { getImageUrl } from '../utils/imageUtils'

export default function Sidebar() {
    const location = useLocation()
    const { isManager, isHrAdmin, employeeName, employeeId, logout } = useAuth()
    const { isCollapsed, isMobileMenuOpen, closeMobileMenu } = useSidebar()
    const { data: employee } = useFrappeGetDoc('Employee', employeeId || '', {
        enabled: !!employeeId
    })
    const [imageError, setImageError] = React.useState(false)

    // Debug: Log employee data to check image field
    React.useEffect(() => {
        // if (employee && process.env.NODE_ENV === 'development') {
        //     console.log('Employee data in Sidebar:', 
        //         {
        //         employeeId,
        //         hasImage: !!employee.image,
        //         imageValue: employee.image,
        //         imageType: typeof employee.image,
        //         imageUrl: getImageUrl(employee.image)
        //     })
        // }
        // Reset image error when employee data changes
        setImageError(false)
    }, [employee, employeeId])

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
        navItems.push({ path: '/office-locations', label: 'Work Locations', icon: 'location_on' })
        navItems.push({ path: '/employees', label: 'Employees', icon: 'group' })
    }

    const handleLinkClick = () => {
        // Close mobile menu when a link is clicked
        if (window.innerWidth < 1024) {
            closeMobileMenu()
        }
    }

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                bg-white border-r border-gray-100 h-screen fixed left-0 top-0 flex flex-col z-50
                transition-all duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                lg:translate-x-0
                ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
                w-64
                overflow-hidden
            `}>
                {/* Logo/Brand */}
                <div className={`p-4 lg:p-6 flex items-center gap-3 flex-shrink-0 ${isCollapsed ? 'lg:justify-center' : ''}`}>
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8 lg:w-10 lg:h-10 flex-shrink-0" />
                    <span className={`text-lg lg:text-xl font-bold text-gray-800 whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
                        Attendance Portal
                    </span>
                </div>

                {/* Navigation - Scrollable */}
                <nav className="flex-1 min-h-0 px-2 lg:px-4 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={handleLinkClick}
                            className={`
                                flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200 group
                                ${isCollapsed ? 'lg:justify-center' : ''}
                                ${isActive(item.path)
                                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }
                            `}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <span className="material-symbols-rounded text-xl flex-shrink-0">{item.icon}</span>
                            <span className={`whitespace-nowrap ${isCollapsed ? 'lg:hidden' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </nav>

                {/* Profile Section - Fixed at bottom (only show on desktop/laptop) */}
                <div className="hidden lg:block p-4 border-t border-gray-100 flex-shrink-0 bg-white">
                    <div className={`flex items-center gap-3 px-2 ${isCollapsed ? 'lg:justify-center' : ''}`}>
                        <Link 
                            to="/profile" 
                            onClick={handleLinkClick}
                            className="w-10 h-10 rounded-full overflow-hidden hover:opacity-80 transition cursor-pointer border border-gray-200 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm relative"
                        >
                            {(() => {
                                const imageUrl = getImageUrl(employee?.image)
                                if (imageUrl && !imageError) {
                                    return (
                                        <img
                                            src={imageUrl}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                            onError={() => {
                                                console.error('Failed to load profile image:', imageUrl)
                                                setImageError(true)
                                            }}
                                        />
                                    )
                                }
                                return <span>{employeeName?.charAt(0) || 'U'}</span>
                            })()}
                        </Link>
                        {/* Show username on desktop when not collapsed */}
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{employeeName}</p>
                                    <p className="text-xs text-gray-500 truncate">Employee</p>
                                </div>
                                {/* Show logout button only on desktop (lg and above) when not collapsed */}
                                <button
                                    onClick={logout}
                                    className="p-2 text-gray-400 hover:text-red-500 transition rounded-lg hover:bg-red-50"
                                    title="Logout"
                                >
                                    <span className="material-symbols-rounded text-xl">logout</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </aside>
        </>
    )
}
