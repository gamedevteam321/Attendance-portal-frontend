import NotificationDropdown from './NotificationDropdown'
import { useSidebar } from '../contexts/SidebarContext'

export default function Header({ title }: { title: string }) {
    const { toggleSidebar, toggleMobileMenu, isCollapsed } = useSidebar()

    return (
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
            <div className="flex items-center gap-3 sm:gap-4">
                {/* Mobile Burger Menu */}
                <button
                    onClick={toggleMobileMenu}
                    className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    aria-label="Toggle menu"
                >
                    <span className="material-symbols-rounded text-2xl">menu</span>
                </button>

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

            <div className="flex items-center gap-4 sm:gap-6">
                <NotificationDropdown />
            </div>
        </header>
    )
}
