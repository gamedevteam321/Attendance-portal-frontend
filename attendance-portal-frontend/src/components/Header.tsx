import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import NotificationDropdown from './NotificationDropdown'
import { useSidebar } from '../contexts/SidebarContext'
import { useAuth } from '../contexts/AuthContext'
import { useFrappeGetDoc } from 'frappe-react-sdk'
import { getImageUrl } from '../utils/imageUtils'

export default function Header({ title }: { title: string }) {
    const { toggleSidebar, isCollapsed } = useSidebar()
    const { employeeName, employeeId } = useAuth()
    const { data: employee } = useFrappeGetDoc('Employee', employeeId || '', {
        enabled: !!employeeId
    })
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        // if (employee && process.env.NODE_ENV === 'development') {
        //     console.log('Employee data in Header:', {
        //         employeeId,
        //         hasImage: !!employee.image,
        //         imageValue: employee.image,
        //         imageUrl: getImageUrl(employee.image)
        //     })
        // }
        setImageError(false)
    }, [employee, employeeId])

    return (
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3 sm:gap-4">
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={toggleSidebar}
                    className="hidden lg:flex p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-rounded text-2xl">
                        {isCollapsed ? 'menu' : 'menu_open'}
                    </span>
                </button>

                <h1 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <NotificationDropdown />
                {/* Profile photo - only show on tablets and mobile (hide on desktop/laptop) */}
                <Link 
                    to="/profile" 
                    className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden hover:opacity-80 transition cursor-pointer border border-gray-200 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm relative"
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
            </div>
        </header>
    )
}
