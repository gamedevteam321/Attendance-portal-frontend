import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface SidebarContextType {
    isCollapsed: boolean
    isMobileMenuOpen: boolean
    toggleSidebar: () => void
    toggleMobileMenu: () => void
    closeMobileMenu: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(true) // Default collapsed
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Close mobile menu on window resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileMenuOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed)
    }

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false)
    }

    return (
        <SidebarContext.Provider value={{
            isCollapsed,
            isMobileMenuOpen,
            toggleSidebar,
            toggleMobileMenu,
            closeMobileMenu
        }}>
            {children}
        </SidebarContext.Provider>
    )
}

export const useSidebar = () => {
    const context = useContext(SidebarContext)
    if (!context) throw new Error('useSidebar must be used within SidebarProvider')
    return context
}

