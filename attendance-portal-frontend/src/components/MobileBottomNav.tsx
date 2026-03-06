import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function MobileBottomNav() {
    const location = useLocation()
    const { isManager, isHrAdmin } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/'
        }
        return location.pathname.startsWith(path)
    }

    const handleToggleMenu = () => {
        setIsMenuOpen(prev => !prev)
    }

    // Core navigation items for mobile (always shown)
    const mainNavItems = [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/attendance/logs', label: 'Attendance', icon: 'work' },
        { path: '/leave', label: 'Leaves', icon: 'calendar_today' },
        { path: '/remote', label: 'Remote', icon: 'home_work' },
    ]

    // Additional items for HR Admin (shown in menu)
    const hrAdminMenuItems = [
        { path: '/approvals', label: 'Approvals', icon: 'shield' },
        { path: '/office-locations', label: 'Work Locations', icon: 'location_on' },
        { path: '/employees', label: 'Employees', icon: 'group' },
    ]

    // Items for non-HR Admin users
    const otherNavItems = []
    if (isManager) {
        otherNavItems.push({ path: '/approvals', label: 'Approvals', icon: 'shield' })
    }
    if (!isHrAdmin && !isManager) {
        otherNavItems.push({ path: '/profile', label: 'Profile', icon: 'person' })
    }

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node
            if (
                menuRef.current && 
                !menuRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
                setIsMenuOpen(false)
            }
        }

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isMenuOpen])

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false)
    }, [location.pathname])

    // For HR Admin: show first 4 + menu button
    // For others: show all items normally
    const displayItems = isHrAdmin ? mainNavItems : [...mainNavItems, ...otherNavItems]

    return (
        <>
            {/* Menu Overlay for HR Admin */}
            {isHrAdmin && isMenuOpen && (
                <div 
                    className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" 
                    onClick={() => setIsMenuOpen(false)}
                    style={{ top: 0, bottom: '80px' }}
                />
            )}

            {/* Menu Dropdown for HR Admin */}
            {isHrAdmin && isMenuOpen && (
                <div 
                    ref={menuRef}
                    className="lg:hidden fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                >
                    <div className="p-2">
                        {hrAdminMenuItems.map((item) => {
                            const active = isActive(item.path)
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                                        ${active 
                                            ? 'bg-blue-50 text-blue-600' 
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className={`material-symbols-rounded text-2xl ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {item.icon}
                                    </span>
                                    <span className={`font-medium ${active ? 'text-blue-600' : 'text-gray-600'}`}>
                                        {item.label}
                                    </span>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
                <div className="bg-white rounded-t-2xl shadow-lg border-t border-gray-200">
                    <div className="flex items-center justify-around px-2 py-3">
                        {displayItems.map((item) => {
                            const active = isActive(item.path)
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`
                                        relative flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-all flex-1
                                        ${active 
                                            ? 'text-blue-600' 
                                            : 'text-gray-600'
                                        }
                                    `}
                                >
                                    <span className={`
                                        material-symbols-rounded text-2xl
                                        ${active ? 'text-blue-600' : 'text-gray-600'}
                                    `}>
                                        {item.icon}
                                    </span>
                                    <span className={`
                                        text-xs font-medium
                                        ${active ? 'text-blue-600' : 'text-gray-600'}
                                    `}>
                                        {item.label}
                                    </span>
                                    {active && (
                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full"></div>
                                    )}
                                </Link>
                            )
                        })}
                        
                        {/* Menu Button for HR Admin */}
                        {isHrAdmin && (
                            <button
                                ref={buttonRef}
                                onClick={handleToggleMenu}
                                className={`
                                    relative flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-lg transition-all flex-1 z-50
                                    ${isMenuOpen 
                                        ? 'text-blue-600' 
                                        : 'text-gray-600'
                                    }
                                `}
                            >
                                <span className={`material-symbols-rounded text-2xl ${isMenuOpen ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {isMenuOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
                                </span>
                                <span className={`text-xs font-medium ${isMenuOpen ? 'text-blue-600' : 'text-gray-600'}`}>
                                    {isMenuOpen ? 'Close' : 'More'}
                                </span>
                                {isMenuOpen && (
                                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-0.5 bg-blue-600 rounded-full"></div>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </nav>
        </>
    )
}

