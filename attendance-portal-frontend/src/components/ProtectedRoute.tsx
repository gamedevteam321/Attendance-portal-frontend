import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth()

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}
