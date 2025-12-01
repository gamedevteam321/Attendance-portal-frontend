import { useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PunchOutReasonModal from '../components/PunchOutReasonModal'

interface AttendanceLog {
    name: string
    attendance_date?: string
    check_in: string | null
    check_out: string | null
    location_type: string
    status: string
    working_hours: number
    punch_history?: {
        punch_type: string
        punch_time: string
        location_type: string
        office_location?: string
    }[]
}

export default function HomePage() {
    const { employeeId, employeeName } = useAuth()

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome back, {employeeName?.split(' ')[0]}! 👋</h2>
                <p className="text-sm sm:text-base text-gray-500 mt-1">Here's what's happening with your attendance today.</p>

                {!employeeId && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 sm:p-4 flex flex-col gap-2 text-yellow-800">
                        <div className="flex items-start gap-3">
                            <span className="material-symbols-rounded flex-shrink-0 mt-0.5">warning</span>
                            <p className="text-xs sm:text-sm font-medium">
                                No employee record found for your account. You won't be able to mark attendance or view logs.
                                Please contact your HR administrator.
                            </p>
                        </div>
                        {/* Debug Info */}
                        <div className="text-xs text-yellow-600 font-mono ml-9 space-y-1">
                            <p>User: {useAuth().user || 'None'}</p>
                            <p>Loading: {useAuth().isLoading ? 'Yes' : 'No'}</p>
                            <p>Validating: {(useAuth() as any).isValidating ? 'Yes' : 'No'}</p>
                            <p>Debug: {(useAuth() as any).debugMessage || 'No debug info (Profile is null)'}</p>
                        </div>
                    </div>
                )}
            </div>

            {employeeId && <DashboardWidgets employeeId={employeeId} />}
        </div>
    )
}

function DashboardWidgets({ employeeId }: { employeeId: string }) {
    const { call: markPunch } = useFrappePostCall('attendance_portal.api.mark_punch')
    const { call: requestPunchOutOutside } = useFrappePostCall('attendance_portal.api.request_punch_out_outside_office')
    const { getCurrentPosition, loading: geoLoading } = useGeolocation()

    // Get today's attendance log
    const { call: getLogs } = useFrappePostCall('attendance_portal.api.get_attendance_logs')
    const { call: checkRemote } = useFrappePostCall('attendance_portal.api.has_remote_for_date')
    const { call: checkOffice } = useFrappePostCall('attendance_portal.api.is_inside_office')

    const [todayLog, setTodayLog] = useState<AttendanceLog[]>([])
    const [locationStatus, setLocationStatus] = useState<'In Office' | 'Working Remote' | 'Working Remote (Pending)' | 'Out of Office' | 'Checking...'>('Checking...')
    const [canPunch, setCanPunch] = useState(false)
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [showPunchOutModal, setShowPunchOutModal] = useState(false)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

    const fetchLogs = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const res = await getLogs({
                employee: employeeId,
                date: today
            })
            const logs = (res as any).message || res || []
            // Filter to only show today's logs (in case API returns multiple days)
            const todayLogs = Array.isArray(logs) ? logs.filter((log: any) => {
                if (!log.attendance_date) return false
                const logDate = format(new Date(log.attendance_date), 'yyyy-MM-dd')
                return logDate === today
            }) : []
            setTodayLog(todayLogs)
            setCurrentDate(today) // Update current date
        } catch (error) {
            console.error("Failed to fetch logs", error)
        }
    }

    const checkLocationStatus = async () => {
        setLocationStatus('Checking...')
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const { lat, lng } = await getCurrentPosition()

            // Check Remote
            const remoteRes = await checkRemote({ employee: employeeId, date: today })
            const remoteData = (remoteRes as any).message || remoteRes

            if (remoteData.has_remote) {
                // Show different status based on approval status
                if (remoteData.request_status === 'Pending') {
                    setLocationStatus('Working Remote (Pending)')
                } else {
                    setLocationStatus('Working Remote')
                }
                setCanPunch(true)
                return
            }

            // Check Office
            const officeRes = await checkOffice({ employee: employeeId, lat, lng })
            const officeData = (officeRes as any).message || officeRes

            if (officeData.inside) {
                setLocationStatus('In Office')
                setCanPunch(true)
            } else {
                setLocationStatus('Out of Office')
                setCanPunch(false)
            }

        } catch (error) {
            console.error("Failed to check location status", error)
            setLocationStatus('Out of Office') // Default to safe state
            setCanPunch(false)
        }
    }

    useEffect(() => {
        if (employeeId) {
            fetchLogs()
            checkLocationStatus()
        }
    }, [employeeId])

    // Auto-refresh after midnight - check every minute if date has changed
    useEffect(() => {
        const checkDateChange = () => {
            const today = format(new Date(), 'yyyy-MM-dd')
            if (today !== currentDate) {
                // Date has changed (midnight passed)
                setCurrentDate(today)
                fetchLogs()
                checkLocationStatus()
            }
        }

        // Check immediately
        checkDateChange()

        // Set up interval to check every minute
        const interval = setInterval(checkDateChange, 60000) // Check every minute

        return () => clearInterval(interval)
    }, [currentDate, employeeId])

    // Also refresh when component becomes visible (user switches tabs/apps)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const today = format(new Date(), 'yyyy-MM-dd')
                if (today !== currentDate) {
                    fetchLogs()
                    checkLocationStatus()
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [currentDate, employeeId])

    const mutate = fetchLogs // Alias for compatibility

    const activeLog = todayLog?.[0]
    
    // Get first punch IN and last punch OUT from punch history
    const getFirstPunchIn = (log: AttendanceLog | undefined): string | null => {
        if (!log?.punch_history || log.punch_history.length === 0) {
            return log?.check_in || null
        }
        const sortedHistory = [...log.punch_history].sort((a, b) => 
            new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
        )
        const firstIn = sortedHistory.find(p => p.punch_type === 'IN')
        return firstIn ? firstIn.punch_time : (log.check_in || null)
    }

    const getLastPunchOut = (log: AttendanceLog | undefined): string | null => {
        if (!log?.punch_history || log.punch_history.length === 0) {
            return log?.check_out || null
        }
        const sortedHistory = [...log.punch_history].sort((a, b) => 
            new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
        )
        const outPunches = sortedHistory.filter(p => p.punch_type === 'OUT')
        const lastOut = outPunches.length > 0 ? outPunches[outPunches.length - 1] : null
        return lastOut ? lastOut.punch_time : (log.check_out || null)
    }

    const getLastPunchType = (log: AttendanceLog | undefined): 'IN' | 'OUT' | null => {
        if (!log?.punch_history || log.punch_history.length === 0) {
            // Fallback to check_in/check_out logic
            if (log?.check_in && !log?.check_out) return 'IN'
            if (log?.check_out) return 'OUT'
            return null
        }
        const sortedHistory = [...log.punch_history].sort((a, b) => 
            new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
        )
        const lastPunch = sortedHistory[sortedHistory.length - 1]
        return lastPunch ? (lastPunch.punch_type as 'IN' | 'OUT') : null
    }

    const firstPunchIn = getFirstPunchIn(activeLog)
    const lastPunchOut = getLastPunchOut(activeLog)
    const lastPunchType = getLastPunchType(activeLog)
    
    // Consider punched in if log is from today and the last punch is IN
    const isPunchedIn = activeLog && 
                        activeLog.attendance_date && 
                        format(new Date(activeLog.attendance_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') &&
                        lastPunchType === 'IN'

    const handlePunch = async (action: 'IN' | 'OUT') => {
        try {
            const { lat, lng } = await getCurrentPosition()

            // For OUT action, check if user is outside office
            if (action === 'OUT') {
                const today = format(new Date(), 'yyyy-MM-dd')
                
                // Check if user has remote work
                const remoteRes = await checkRemote({ employee: employeeId, date: today })
                const remoteData = (remoteRes as any).message || remoteRes
                
                if (!remoteData.has_remote) {
                    // Check if user is inside office
                    const officeRes = await checkOffice({ employee: employeeId, lat, lng })
                    const officeData = (officeRes as any).message || officeRes
                    
                    if (!officeData.inside) {
                        // User is outside office - show modal
                        setCurrentLocation({ lat, lng })
                        setShowPunchOutModal(true)
                        return
                    }
                }
            }

            // Normal punch flow (IN or OUT from office/with remote work)
            await markPunch({
                employee: employeeId,
                lat,
                lng,
                action
            })

            toast.success(`Punched ${action === 'IN' ? 'In' : 'Out'} successfully!`)
            // Small delay to ensure database commit is complete, then fetch updated logs
            await new Promise(resolve => setTimeout(resolve, 100))
            await mutate()
        } catch (error: any) {
            console.error("Punch failed:", error)

            let errorMessage = 'Failed to punch'
            if (error.messages && Array.isArray(error.messages)) {
                errorMessage = error.messages[0]
            } else if (error.message) {
                errorMessage = error.message
            } else if (error.exception && error.exception.includes('DuplicateEntryError')) {
                errorMessage = 'You have already punched in for today!'
            } else if (error._server_messages) {
                try {
                    const messages = JSON.parse(error._server_messages)
                    errorMessage = JSON.parse(messages[0]).message
                } catch (e) {
                    errorMessage = 'Server error occurred'
                }
            } else if (error.exception) {
                errorMessage = error.exception.split(':').pop()?.trim() || 'An error occurred'
            }

            toast.error(errorMessage)
        }
    }

    const handlePunchOutSubmit = async (reason: string, lat: number, lng: number) => {
        try {
            await requestPunchOutOutside({
                employee: employeeId,
                lat,
                lng,
                reason
            })

            toast.success('Punch out request submitted successfully. Waiting for manager approval.')
            setShowPunchOutModal(false)
            setCurrentLocation(null)
            
            // Refresh logs
            await new Promise(resolve => setTimeout(resolve, 100))
            await mutate()
            await checkLocationStatus()
        } catch (error: any) {
            console.error("Punch out request failed:", error)

            let errorMessage = 'Failed to submit punch out request'
            if (error.messages && Array.isArray(error.messages)) {
                errorMessage = error.messages[0]
            } else if (error.message) {
                errorMessage = error.message
            } else if (error._server_messages) {
                try {
                    const messages = JSON.parse(error._server_messages)
                    errorMessage = JSON.parse(messages[0]).message
                } catch (e) {
                    errorMessage = 'Server error occurred'
                }
            } else if (error.exception) {
                errorMessage = error.exception.split(':').pop()?.trim() || 'An error occurred'
            }

            toast.error(errorMessage)
        }
    }

    const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) => (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <span className="material-symbols-rounded text-xl sm:text-2xl text-white">{icon}</span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-lg sm:text-xl font-bold text-gray-800 truncate">{value}</p>
            </div>
        </div>
    )

    return (
        <>
            <PunchOutReasonModal
                isOpen={showPunchOutModal}
                onClose={() => {
                    setShowPunchOutModal(false)
                    setCurrentLocation(null)
                }}
                onSubmit={handlePunchOutSubmit}
                location={currentLocation}
                isSubmitting={false}
            />
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <StatCard
                    title="Check In"
                    value={firstPunchIn ? format(new Date(firstPunchIn), 'hh:mm a') : '--:--'}
                    icon="login"
                    color="bg-blue-500"
                />
                <StatCard
                    title="Check Out"
                    value={lastPunchOut ? format(new Date(lastPunchOut), 'hh:mm a') : '--:--'}
                    icon="logout"
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Working Hours"
                    value={activeLog?.working_hours ? `${activeLog.working_hours.toFixed(2)} hrs` : '0 hrs'}
                    icon="timer"
                    color="bg-purple-500"
                />
                <StatCard
                    title="Status"
                    value={activeLog?.status || 'Absent'}
                    icon="verified"
                    color={
                        activeLog?.status === 'Present' ? 'bg-green-500' : 
                        activeLog?.status === 'Pending Approval' ? 'bg-yellow-500' :
                        activeLog?.status === 'Half Day' ? 'bg-orange-500' :
                        'bg-gray-400'
                    }
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Punch Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-8 sm:-mr-12 md:-mr-16 -mt-8 sm:-mt-12 md:-mt-16 opacity-50"></div>

                        <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4 sm:mb-2">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Mark Attendance</h3>
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap ${locationStatus === 'In Office' ? 'bg-green-100 text-green-700' :
                                        locationStatus === 'Working Remote' ? 'bg-purple-100 text-purple-700' :
                                            locationStatus === 'Working Remote (Pending)' ? 'bg-yellow-100 text-yellow-700' :
                                                locationStatus === 'Out of Office' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-600'
                                    }`}>
                                    {locationStatus}
                                </span>
                            </div>
                            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-md">
                                {isPunchedIn
                                    ? "You are currently punched in. Don't forget to punch out when you leave!"
                                    : "Ready to start your day? Mark your attendance now."}
                            </p>

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 mb-6 sm:mb-0">
                                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
                                    {format(new Date(), 'hh:mm a')}
                                </div>
                                <div className="hidden sm:block h-12 w-px bg-gray-200"></div>
                                <div className="text-xs sm:text-sm text-gray-500">
                                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8">
                                {!isPunchedIn ? (
                                    <button
                                        onClick={() => handlePunch('IN')}
                                        disabled={geoLoading || !canPunch}
                                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-200"
                                    >
                                        <span className="material-symbols-rounded">fingerprint</span>
                                        {geoLoading ? 'Locating...' : (!canPunch ? 'Not Allowed' : 'Punch In')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handlePunch('OUT')}
                                        disabled={geoLoading}
                                        className="w-full sm:w-auto flex items-center justify-center gap-3 bg-red-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-red-200"
                                    >
                                        <span className="material-symbols-rounded">logout</span>
                                        {geoLoading ? 'Locating...' : 'Punch Out'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 h-full">
                        <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4 sm:mb-6">Quick Actions</h3>

                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <Link to="/leave" className="p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition flex flex-col items-center justify-center text-center gap-2 group">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition">
                                    <span className="material-symbols-rounded">event_note</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Apply Leave</span>
                            </Link>

                            <Link to="/remote" className="p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition flex flex-col items-center justify-center text-center gap-2 group">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-purple-600 shadow-sm group-hover:scale-110 transition">
                                    <span className="material-symbols-rounded">home_work</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Remote Work</span>
                            </Link>

                            <Link to="/attendance/logs" className="p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition flex flex-col items-center justify-center text-center gap-2 group">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition">
                                    <span className="material-symbols-rounded">history</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">History</span>
                            </Link>

                            <Link to="/attendance/logs" className="p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition flex flex-col items-center justify-center text-center gap-2 group">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition">
                                    <span className="material-symbols-rounded">fact_check</span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">Regularize</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
