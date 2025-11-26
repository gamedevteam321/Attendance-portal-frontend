import { useState, useEffect } from 'react'
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'

export default function ProfilePage() {
    const { employeeId, employeeName, isManager, isHrAdmin, user, logout } = useAuth()
    const [leaveBalances, setLeaveBalances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const { data: employee } = useFrappeGetDoc('Employee', employeeId || '', {
        enabled: !!employeeId
    })

    const { call: getBalances } = useFrappePostCall('attendance_portal.api.get_leave_balances')

    useEffect(() => {
        const fetchLeaveData = async () => {
            if (!employeeId) {
                setLoading(false)
                return
            }
            try {
                const balRes = await getBalances({ employee: employeeId })
                const balances = (balRes as any)?.message || balRes || []
                setLeaveBalances(balances)
            } catch (error) {
                console.error('Failed to fetch leave data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchLeaveData()
    }, [employeeId, getBalances])

    if (loading && employeeId) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
                    <div className="animate-pulse">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                        <div className="h-5 sm:h-6 bg-gray-200 rounded w-40 sm:w-48 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-28 sm:w-32 mx-auto"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!employeeId) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-4">👤</div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">No Employee Record</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-4">No employee record found for your account. Please contact your HR administrator.</p>
                </div>
            </div>
        )
    }

    const getInitials = (name: string) => {
        if (!name) return 'U'
        const parts = name.split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    const InfoCard = ({ title, value, icon }: { title: string, value: string | null | undefined, icon: string }) => (
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-blue-600 text-lg sm:text-xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1">{title}</p>
                <p className="text-sm sm:text-base text-gray-800 font-semibold break-words">{value || 'Not set'}</p>
            </div>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-8 sm:-mr-12 md:-mr-16 -mt-8 sm:-mt-12 md:-mt-16 opacity-50"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8">
                    {/* Avatar */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl md:text-4xl shadow-lg flex-shrink-0">
                        {employee?.image ? (
                            <img src={employee.image} alt={employeeName || 'User'} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <span>{getInitials(employeeName || user || 'U')}</span>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left w-full">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 break-words">{employeeName || user}</h1>
                        <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Employee ID: {employeeId}</p>
                        
                        {/* Role Badges */}
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                                Employee
                            </span>
                            {isManager && (
                                <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                                    Manager
                                </span>
                            )}
                            {isHrAdmin && (
                                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                                    HR Admin
                                </span>
                            )}
                            {employee?.status && (
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                    employee.status === 'Active' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {employee.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Company Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-600 text-xl sm:text-2xl">business</span>
                        <span>Company Details</span>
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                        <InfoCard 
                            title="Designation" 
                            value={employee?.designation} 
                            icon="work"
                        />
                        <InfoCard 
                            title="Department" 
                            value={employee?.department} 
                            icon="groups"
                        />
                        <InfoCard 
                            title="Company" 
                            value={employee?.company} 
                            icon="apartment"
                        />
                        <InfoCard 
                            title="Branch" 
                            value={employee?.branch} 
                            icon="location_on"
                        />
                        {employee?.reports_to && (
                            <InfoCard 
                                title="Reports To" 
                                value={employee?.reports_to_name || employee?.reports_to} 
                                icon="supervisor_account"
                            />
                        )}
                    </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                        <span className="material-symbols-rounded text-indigo-600 text-xl sm:text-2xl">person</span>
                        <span>Personal Information</span>
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                        <InfoCard 
                            title="Email" 
                            value={employee?.user_id || employee?.company_email || employee?.personal_email} 
                            icon="email"
                        />
                        <InfoCard 
                            title="Phone" 
                            value={employee?.cell_number} 
                            icon="phone"
                        />
                        <InfoCard 
                            title="Gender" 
                            value={employee?.gender} 
                            icon="wc"
                        />
                        {employee?.date_of_birth && (
                            <InfoCard 
                                title="Date of Birth" 
                                value={format(new Date(employee.date_of_birth), 'MMMM d, yyyy')} 
                                icon="cake"
                            />
                        )}
                        {employee?.date_of_joining && (
                            <InfoCard 
                                title="Date of Joining" 
                                value={format(new Date(employee.date_of_joining), 'MMMM d, yyyy')} 
                                icon="event"
                            />
                        )}
                    </div>
                </div>

                {/* Leave Balances */}
                {leaveBalances.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 lg:col-span-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <span className="material-symbols-rounded text-green-600 text-xl sm:text-2xl">event_available</span>
                            <span>Leave Balances</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {leaveBalances.map((balance) => (
                                <div key={balance.leave_type} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 md:p-6 border border-blue-100">
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <h3 className="text-sm sm:text-base font-semibold text-gray-800 break-words">{balance.leave_type}</h3>
                                        <span className="material-symbols-rounded text-blue-600 text-xl sm:text-2xl flex-shrink-0 ml-2">
                                            {balance.leave_type === 'Casual Leave' ? 'beach_access' : 
                                             balance.leave_type === 'Sick Leave' ? 'local_hospital' : 
                                             'event_repeat'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-gray-600">Allocated:</span>
                                            <span className="font-semibold text-gray-800">{balance.allocated}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-gray-600">Used:</span>
                                            <span className="font-semibold text-gray-800">{balance.used}</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                                            <span className="text-gray-700 font-medium text-xs sm:text-sm">Remaining:</span>
                                            <span className={`font-bold text-base sm:text-lg ${
                                                balance.remaining > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {balance.remaining}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Emergency Contact */}
                {(employee?.person_to_be_contacted || employee?.emergency_phone_number) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 lg:col-span-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <span className="material-symbols-rounded text-red-600 text-xl sm:text-2xl">emergency</span>
                            <span>Emergency Contact</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {employee?.person_to_be_contacted && (
                                <InfoCard 
                                    title="Contact Name" 
                                    value={employee.person_to_be_contacted} 
                                    icon="person"
                                />
                            )}
                            {employee?.emergency_phone_number && (
                                <InfoCard 
                                    title="Phone Number" 
                                    value={employee.emergency_phone_number} 
                                    icon="phone"
                                />
                            )}
                            {employee?.relation && (
                                <InfoCard 
                                    title="Relation" 
                                    value={employee.relation} 
                                    icon="family_restroom"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile/Tablet Logout Button - Bottom */}
            <div className="xl:hidden mt-6 flex justify-start">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                    <span className="material-symbols-rounded text-xl">logout</span>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    )
}
