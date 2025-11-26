import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'

interface AuthContextType {
    user: string | null
    employeeId: string | null
    employeeName: string | null
    isManager: boolean
    isHrAdmin: boolean
    debugMessage?: string
    isValidating: boolean
    isLoading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface ProfileData {
    employee_id: string
    employee_name: string
    is_manager: boolean
    is_hr_admin: boolean
    debug_message?: string
}

export function AuthProvider({ children }: { children: ReactNode }) {

    const { call } = useFrappePostCall<ProfileData>('attendance_portal.api.get_current_profile')

    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Check for token in localStorage
    const token = localStorage.getItem('frappe_token')

    useEffect(() => {
        // If we have a token, we assume we are logged in (FrappeProvider handles the header)
        // We just need to fetch the profile
        if (token) {
            setIsLoading(true)
            call({})
                .then(res => {
                    if (res) {
                        const data = (res as any).message || res
                        setProfile(data)
                        if (data.employee_id) {
                            localStorage.setItem('employee_id', data.employee_id)
                        }
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch profile with token:', err)
                    // If 401/403, token might be invalid
                    if (err.httpStatus === 401 || err.httpStatus === 403) {
                        logout()
                    }
                })
                .finally(() => setIsLoading(false))
        } else {
            setProfile(null)
            setIsLoading(false)
        }
    }, [token])

    const login = async (username: string, password: string) => {
        try {
            // Call custom endpoint to get keys
            // We use a direct fetch here or a temporary frappe call without auth?
            // Since we are not logged in, we can't use 'call' easily if it expects auth.
            // But get_api_keys is allow_guest=True.

            const formData = new FormData();
            formData.append('usr', username);
            formData.append('pwd', password);

            const response = await fetch('http://localhost:8000/api/method/attendance_portal.api.get_api_keys', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.message) {
                const { api_key, api_secret } = data.message;
                const newToken = `${api_key}:${api_secret}`;
                localStorage.setItem('frappe_token', newToken);
                // Reload to apply token to FrappeProvider
                window.location.href = '/';
            } else {
                throw new Error(data.exception || 'Login failed');
            }
        } catch (error: any) {
            console.error("Login error:", error);
            throw error;
        }
    }

    const logout = async () => {
        localStorage.removeItem('frappe_token')
        localStorage.removeItem('employee_id')
        window.location.href = '/login'
    }

    return (
        <AuthContext.Provider value={{
            user: token ? 'Logged In' : null, // Mock user object since we use token
            employeeId: profile?.employee_id || null,
            employeeName: profile?.employee_name || null,
            isManager: profile?.is_manager || false,
            isHrAdmin: profile?.is_hr_admin || false,
            debugMessage: (profile as any)?.debug_message,
            isValidating: false,
            isLoading,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
