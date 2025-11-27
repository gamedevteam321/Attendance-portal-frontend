import { useState, useEffect } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths, parseISO, isBefore, isWithinInterval, startOfDay } from 'date-fns'
import { Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AttendanceLog {
    name: string
    employee: string
    attendance_date: string
    check_in: string | null
    check_out: string | null
    location_type?: string
    status: string
    working_hours: number
    punch_history?: {
        punch_type: string
        punch_time: string
        location_type: string
        office_location?: string
    }[]
}

interface RegularizationRequest {
    name: string
    attendance_date: string
    requested_in: string
    requested_out: string
    reason: string
    status: string
    approver: string | null
}

interface RemoteWorkRequest {
    name: string
    employee: string
    from_date: string
    to_date: string
    reason: string
    status: string
}

interface StatusIndicator {
    text: string
    color: string
    bgColor: string
}

interface AllEmployeesLog {
    employee: string
    employee_name: string
    employee_id: string
    attendance_date: string
    check_in: string | null
    check_out: string | null
    status: string
    working_hours: number
    location_type?: string
    punch_history?: {
        punch_type: string
        punch_time: string
        location_type: string
        office_location?: string
    }[]
}

export default function AttendanceLogsPage() {
    const { employeeId, isHrAdmin, isManager } = useAuth()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [joiningDate, setJoiningDate] = useState<Date | null>(null)
    const [allEmployeesLogs, setAllEmployeesLogs] = useState<AllEmployeesLog[]>([])
    const [loadingAllLogs, setLoadingAllLogs] = useState(false)

    // Form State
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [reason, setReason] = useState('')

    // Fetch attendance logs by month
    const { data: attendanceLogsData, mutate: refreshLogs } = useFrappeGetCall<AttendanceLog[] | { message: AttendanceLog[] }>(
        'attendance_portal.api.get_attendance_logs',
        {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        }
    )

    // Fetch holidays for the current month
    const { call: getHolidays } = useFrappePostCall('attendance_portal.api.get_holidays_for_month')
    const [holidays, setHolidays] = useState<string[]>([])

    // Fetch holidays when month changes
    useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const res = await getHolidays({
                    month: currentDate.getMonth() + 1,
                    year: currentDate.getFullYear()
                })
                const holidayList = (res as any)?.message || res || []
                //console.log('Holidays fetched:', holidayList)
                setHolidays(Array.isArray(holidayList) ? holidayList : [])
            } catch (error) {
                console.error('Failed to fetch holidays:', error)
                setHolidays([])
            }
        }
        fetchHolidays()
    }, [currentDate, getHolidays])

    // Extract the actual logs array from the response
    const attendanceLogs: AttendanceLog[] = Array.isArray(attendanceLogsData) 
        ? attendanceLogsData 
        : (attendanceLogsData as any)?.message || []

    // Fetch employee joining date - try to get from profile or use earliest attendance date as fallback
    const { call: getProfile } = useFrappePostCall('attendance_portal.api.get_current_profile')

    useEffect(() => {
        if (employeeId && !joiningDate) {
            // Try to get joining date from profile
            getProfile({})
                .then((res: any) => {
                    const data = res?.message || res
                    if (data?.date_of_joining) {
                        setJoiningDate(parseISO(data.date_of_joining))
                    }
                })
                .catch((err) => {
                    console.error('Failed to fetch profile:', err)
                })
        }
    }, [employeeId])

    // Set joining date from earliest attendance log if not set from profile
    useEffect(() => {
        if (!joiningDate && Array.isArray(attendanceLogs) && attendanceLogs.length > 0) {
            const dates = attendanceLogs
                .map(log => parseISO(log.attendance_date))
                .sort((a, b) => a.getTime() - b.getTime())
            if (dates.length > 0) {
                setJoiningDate(dates[0])
            }
        } else if (!joiningDate) {
            // Default: use 1 year ago if no data available
            const oneYearAgo = new Date()
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
            setJoiningDate(oneYearAgo)
        }
    }, [attendanceLogs, joiningDate])

    // Fetch regularization requests
    const { data: requests, mutate: refreshRequests } = useFrappeGetCall<RegularizationRequest[]>(
        'attendance_portal.api.get_regularization_requests',
        {}
    )

    // Fetch remote work requests
    const { call: getRemoteRequests } = useFrappePostCall('attendance_portal.api.get_employee_requests')
    const [remoteWorkRequests, setRemoteWorkRequests] = useState<RemoteWorkRequest[]>([])

    useEffect(() => {
        if (employeeId) {
            getRemoteRequests({ doctype: 'Remote Working Request' })
                .then((res: any) => {
                    const data = res?.message || res || []
                    setRemoteWorkRequests(Array.isArray(data) ? data : [])
                })
                .catch((err) => {
                    console.error('Failed to fetch remote work requests:', err)
                    setRemoteWorkRequests([])
                })
        }
    }, [employeeId])

    const { call: applyForRegularization, loading: isSubmitting } = useFrappePostCall('attendance_portal.api.apply_for_regularization')

    // Calendar Logic
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDayOfWeek = getDay(monthStart) // 0 = Sunday

    const handlePrevMonth = () => {
        setCurrentDate(subMonths(currentDate, 1))
        setSelectedDate(null)
    }

    const handleNextMonth = () => {
        setCurrentDate(addMonths(currentDate, 1))
        setSelectedDate(null)
    }

    // Helper function to normalize date for comparison
    const normalizeDate = (date: Date | string): Date => {
        if (!date) return new Date()
        try {
            let d: Date
            if (typeof date === 'string') {
                // Handle different date formats
                if (date.includes('T')) {
                    d = parseISO(date)
                } else {
                    // Assume YYYY-MM-DD format
                    d = parseISO(date + 'T00:00:00')
                }
            } else {
                d = date
            }
            return startOfDay(d)
        } catch (e) {
            console.error('Error normalizing date:', date, e)
            return new Date()
        }
    }

    // Helper function to find attendance log for a date
    const findLogForDate = (date: Date): AttendanceLog | undefined => {
        if (!Array.isArray(attendanceLogs) || attendanceLogs.length === 0) {
            // if (process.env.NODE_ENV === 'development') {
            //     console.log('No logs available or not an array:', attendanceLogs)
            // }
            return undefined
        }
        
        const normalizedDate = normalizeDate(date)
        const dateStr = format(normalizedDate, 'yyyy-MM-dd')
        
        // if (process.env.NODE_ENV === 'development') {
        //     console.log('Searching for date:', dateStr)
        //     console.log('Available log dates:', attendanceLogs.map(l => l.attendance_date))
        // }
        
        // Try multiple matching strategies
        const log = attendanceLogs.find(l => {
            if (!l.attendance_date) return false
            
            // Extract date part if it includes time
            const logDateStr = l.attendance_date.split('T')[0]
            
            // Try direct string comparison first
            if (logDateStr === dateStr) {
                // if (process.env.NODE_ENV === 'development') {
                //     console.log('Found match via string comparison:', l)
                // }
                return true
            }
            
            // Try parsing and comparing
            try {
                const logDate = normalizeDate(l.attendance_date)
                const match = isSameDay(logDate, normalizedDate)
                if (match && process.env.NODE_ENV === 'development') {
                    console.log('Found match via date comparison:', l)
                }
                return match
            } catch (e) {
                return false
            }
        })
        
        return log
    }

    // Helper function to check if date is within approved remote work request
    const isDateInApprovedRemoteWork = (date: Date): boolean => {
        const normalizedDate = normalizeDate(date)
        return remoteWorkRequests.some(req => {
            if (req.status !== 'Approved') return false
            const fromDate = normalizeDate(req.from_date)
            const toDate = normalizeDate(req.to_date)
            return isWithinInterval(normalizedDate, { start: fromDate, end: toDate }) || 
                   isSameDay(normalizedDate, fromDate) || 
                   isSameDay(normalizedDate, toDate)
        })
    }

    // Fetch all employees' logs for selected date (HR Admin/Manager only)
    const { call: getAllEmployeesLogs } = useFrappePostCall<AllEmployeesLog[]>('attendance_portal.api.get_all_employees_attendance_for_date')

    useEffect(() => {
        const fetchAllEmployeesLogs = async () => {
            if (selectedDate && (isHrAdmin || isManager)) {
                setLoadingAllLogs(true)
                try {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd')
                    const res = await getAllEmployeesLogs({ date: dateStr })
                    const data = (res as any)?.message || res || []
                    setAllEmployeesLogs(Array.isArray(data) ? data : [])
                } catch (error) {
                    console.error('Failed to fetch all employees logs:', error)
                    setAllEmployeesLogs([])
                } finally {
                    setLoadingAllLogs(false)
                }
            } else {
                setAllEmployeesLogs([])
            }
        }
        fetchAllEmployeesLogs()
    }, [selectedDate, isHrAdmin, isManager, getAllEmployeesLogs])

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
        const log = findLogForDate(date)
        
        // Debug logging
        // if (process.env.NODE_ENV === 'development') {
        //     console.log('Selected date:', format(date, 'yyyy-MM-dd'))
        //     console.log('Available logs (extracted):', attendanceLogs)
        //     console.log('Raw logs data:', attendanceLogsData)
        //     console.log('Found log:', log)
        // }
        
        if (log) {
            setCheckIn(log.check_in ? format(parseISO(log.check_in), 'HH:mm') : '')
            setCheckOut(log.check_out ? format(parseISO(log.check_out), 'HH:mm') : '')
        } else {
            setCheckIn('')
            setCheckOut('')
        }
        setReason('')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate) return

        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const checkInDateTime = checkIn ? `${dateStr} ${checkIn}:00` : null
            const checkOutDateTime = checkOut ? `${dateStr} ${checkOut}:00` : null

            await applyForRegularization({
                employee: employeeId,
                attendance_date: dateStr,
                check_in: checkInDateTime,
                check_out: checkOutDateTime,
                reason
            })

            toast.success('Regularization request submitted')
            setReason('')
            refreshRequests()
            refreshLogs()
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message || 'Failed to submit request')
            } else {
                toast.error('Failed to submit request')
            }
        }
    }

    // Helper function to check if date is a holiday
    const isHoliday = (date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return holidays.includes(dateStr)
    }

    // Determine status indicator based on attendance log
    const getStatusIndicator = (log: AttendanceLog | undefined, date: Date): StatusIndicator => {
        // If date is before joining date, return empty
        if (joiningDate && isBefore(normalizeDate(date), normalizeDate(joiningDate))) {
            return { text: '', color: '', bgColor: '' }
        }

        // Check if date is a holiday (prioritize this)
        if (isHoliday(date)) {
            return { text: 'O', color: 'text-purple-600', bgColor: 'bg-purple-50' }
        }

        // Check if date is within approved remote work request
        if (isDateInApprovedRemoteWork(date)) {
            return { text: 'WR', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
        }

        // If no log exists and date is on or after joining date, show as Absent
        if (!log) {
            return { text: 'A', color: 'text-red-600', bgColor: 'bg-red-50' }
        }

        const hasCheckIn = !!log.check_in
        const hasCheckOut = !!log.check_out
        const status = log.status

        // Check if working remotely based on location_type
        if (log.location_type && (log.location_type === 'Remote' || log.location_type === 'Work From Home')) {
            return { text: 'WR', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
        }

        // Check for partial attendance (P:A or A:P)
        if (status === 'Present') {
            if (hasCheckIn && !hasCheckOut) {
                return { text: 'P:A', color: 'text-orange-600', bgColor: 'bg-orange-50' }
            }
            if (!hasCheckIn && hasCheckOut) {
                return { text: 'A:P', color: 'text-orange-600', bgColor: 'bg-orange-50' }
            }
            if (hasCheckIn && hasCheckOut) {
                return { text: 'P', color: 'text-black', bgColor: 'bg-white' }
            }
        }

        // Handle other statuses
        switch (status) {
            case 'Absent':
                return { text: 'A', color: 'text-red-600', bgColor: 'bg-red-50' }
            case 'Half Day':
                return { text: 'HD', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
            case 'Pending Approval':
                return { text: 'PA', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
            case 'Holiday':
                return { text: 'O', color: 'text-purple-600', bgColor: 'bg-purple-50' }
            case 'On Leave':
                return { text: 'L', color: 'text-gray-600', bgColor: 'bg-gray-50' }
            case 'Work From Home':
                return { text: 'WR', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
            default:
                return { text: status.substring(0, 2).toUpperCase(), color: 'text-gray-600', bgColor: 'bg-gray-50' }
        }
    }

    // Check if date has been regularized
    const isRegularized = (dateStr: string): boolean => {
        if (!Array.isArray(requests)) return false
        const normalizedDate = normalizeDate(dateStr)
        return requests.some(r => {
            const reqDate = normalizeDate(r.attendance_date)
            return isSameDay(reqDate, normalizedDate) && (r.status === 'Approved' || r.status === 'Pending')
        })
    }

    const selectedLog = selectedDate ? findLogForDate(selectedDate) : undefined

    const hasRegularizationRequest = selectedDate && Array.isArray(requests) && requests.some(r => {
        const reqDate = normalizeDate(r.attendance_date)
        return isSameDay(reqDate, normalizeDate(selectedDate)) && (r.status === 'Approved' || r.status === 'Pending')
    })
    const regularizationRequest = selectedDate && Array.isArray(requests) ? requests.find(r => {
        const reqDate = normalizeDate(r.attendance_date)
        return isSameDay(reqDate, normalizeDate(selectedDate))
    }) : undefined

    // Helper function to determine if a date can be regularized
    const canRegularizeDate = (date: Date | null, log: AttendanceLog | undefined): boolean => {
        if (!date) return false
        
        // Check if date is a holiday (off day) - cannot regularize
        if (isHoliday(date)) {
            return false
        }
        
        // Get the status indicator for this date
        const statusIndicator = getStatusIndicator(log, date)
        const statusText = statusIndicator.text

        // Check if status is "On Leave" (L) - cannot regularize
        if (statusText === 'L' || log?.status === 'On Leave') {
            return false
        }

        // Can regularize if:
        // 1. No log exists (Absent)
        // 2. Status is A (Absent)
        // 3. Status is HD (Half Day)
        // 4. Status is P:A (Present first half - has check-in, no check-out)
        // 5. Status is A:P (Present second half - no check-in, has check-out)
        // 6. Status is WR (Working Remotely)
        const regularizableStatuses = ['A', 'HD', 'P:A', 'A:P', 'WR']
        
        if (!log) {
            // No log means Absent, can regularize (but not if it's a holiday)
            return true
        }

        // Check status indicator text
        if (statusText && regularizableStatuses.includes(statusText)) {
            return true
        }

        // Also check log status directly
        if (log.status === 'Absent' || log.status === 'Half Day') {
            return true
        }

        // Check for partial attendance (P:A or A:P)
        const hasCheckIn = !!log.check_in
        const hasCheckOut = !!log.check_out
        if (log.status === 'Present' && ((hasCheckIn && !hasCheckOut) || (!hasCheckIn && hasCheckOut))) {
            return true
        }

        // Check if working remotely
        if (log.location_type && (log.location_type === 'Remote' || log.location_type === 'Work From Home')) {
            return true
        }

        // Check if date is within approved remote work request
        if (isDateInApprovedRemoteWork(date)) {
            return true
        }

        return false
    }

    const canRegularize = canRegularizeDate(selectedDate, selectedLog)

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Info</h1>
                    <p className="text-gray-500">View your attendance and regularize if needed</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Calendar and Details Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Section - Left Side */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={handlePrevMonth} 
                                className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg transition"
                            >
                                &lt; Prev
                            </button>
                            <button 
                                onClick={handleNextMonth} 
                                className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg transition"
                            >
                                Next &gt;
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg opacity-50" />
                        ))}

                        {/* Days */}
                        {daysInMonth.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd')
                            const log = findLogForDate(date)
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                            const isCurrentDay = isToday(date)
                            const isSelected = selectedDate && isSameDay(normalizeDate(date), normalizeDate(selectedDate))
                            const isBeforeJoining = joiningDate && isBefore(normalizeDate(date), normalizeDate(joiningDate))
                            const statusIndicator = getStatusIndicator(log, date)
                            const regularized = isRegularized(dateStr)

                            return (
                                <div
                                    key={date.toString()}
                                    onClick={() => !isBeforeJoining && handleDateClick(date)}
                                    className={`
                                        h-20 p-2 border rounded-lg relative transition-colors
                                        ${isBeforeJoining ? 'bg-gray-100 opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        ${!isCurrentMonth ? 'bg-gray-50/50' : isBeforeJoining ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}
                                        ${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200'}
                                        ${isCurrentDay && !isSelected ? 'ring-1 ring-blue-300' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start h-full">
                                        <div className="flex-1">
                                            <span className={`text-sm font-medium ${!isCurrentMonth || isBeforeJoining ? 'text-gray-400' : 'text-gray-700'}`}>
                                                {format(date, 'd')}
                                            </span>
                                            {statusIndicator.text && (
                                                <div className={`mt-1 text-xs font-bold px-1 py-0.5 rounded ${statusIndicator.color} ${statusIndicator.bgColor}`}>
                                                    {statusIndicator.text}
                                                </div>
                                            )}
                                        </div>
                                        {regularized && (
                                            <div className="absolute bottom-1 left-1">
                                                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-orange-500" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Details Panel - Right Side */}
                <div className="space-y-6">
                    {selectedDate ? (
                        <>
                            {/* Attendance Details */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    {format(selectedDate, 'MMMM d, yyyy')}
                            </h3>

                                {selectedLog ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <p className="text-xs text-blue-600 font-medium uppercase">Total Hours</p>
                                                <p className="text-xl font-bold text-blue-900">
                                                    {selectedLog.working_hours ? `${selectedLog.working_hours.toFixed(2)} hrs` : '0 hrs'}
                                                </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <p className="text-xs text-green-600 font-medium uppercase">Status</p>
                                    <p className="text-xl font-bold text-green-900">{selectedLog.status}</p>
                                </div>
                            </div>

                                        {/* Punch In/Out Logs Section */}
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                                                <Clock className="w-4 h-4" />
                                                Punch In/Out Logs
                                            </h4>
                                            
                                            {selectedLog.punch_history && selectedLog.punch_history.length > 0 ? (
                                                <div className="space-y-2">
                                                    {selectedLog.punch_history.map((punch, index) => (
                                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                                                                    punch.punch_type === 'IN' 
                                                                        ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                                                                        : 'bg-red-100 text-red-700 border-2 border-red-300'
                                                                }`}>
                                                                    {punch.punch_type === 'IN' ? 'IN' : 'OUT'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-gray-900">
                                                                        {format(parseISO(punch.punch_time), 'hh:mm a')}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                                            punch.location_type === 'Office' 
                                                                                ? 'bg-blue-100 text-blue-700' 
                                                                                : 'bg-purple-100 text-purple-700'
                                                                        }`}>
                                                                            {punch.location_type}
                                                                        </span>
                                                                        {punch.office_location && (
                                                                            <span className="text-xs text-gray-500">
                                                                                {punch.office_location}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500">
                                                                    {format(parseISO(punch.punch_time), 'MMM dd, yyyy')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                                                    <p className="text-sm text-gray-500">No punch history available for this date</p>
                                                    {selectedLog.check_in && (
                                                        <div className="mt-4 space-y-2">
                                                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                                                <span className="text-sm text-gray-600">First Check In</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {format(parseISO(selectedLog.check_in), 'hh:mm a')}
                                                                </span>
                                                            </div>
                                                            {selectedLog.check_out && (
                                                                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                                                                    <span className="text-sm text-gray-600">Last Check Out</span>
                                                                    <span className="text-sm font-medium text-gray-900">
                                                                        {format(parseISO(selectedLog.check_out), 'hh:mm a')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p className="text-sm">No attendance record for this date</p>
                                    </div>
                                )}

                                {/* Regularization Request Status */}
                                {hasRegularizationRequest && regularizationRequest && (
                                    <div className="mt-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-900">Regularization Request</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                regularizationRequest.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                regularizationRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {regularizationRequest.status}
                                                    </span>
                                        </div>
                                        {regularizationRequest.reason && (
                                            <p className="text-xs text-gray-600 mt-1">"{regularizationRequest.reason}"</p>
                                        )}
                                    </div>
                                )}

                                {/* Regularization Form */}
                                {canRegularize && regularizationRequest?.status !== 'Approved' && (
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Regularize Attendance</h4>
                                        <form onSubmit={handleSubmit} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Check In</label>
                                                    <input
                                                        type="time"
                                                        value={checkIn}
                                                        onChange={e => setCheckIn(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Check Out</label>
                                                    <input
                                                        type="time"
                                                        value={checkOut}
                                                        onChange={e => setCheckOut(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                                                <textarea
                                                    required
                                                    value={reason}
                                                    onChange={e => setReason(e.target.value)}
                                                    placeholder="Why are you regularizing?"
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20 resize-none"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 text-sm"
                                            >
                                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                            </button>
                                        </form>
                                        </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Legends Panel */
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Legends</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-orange-500" />
                                    <span className="text-gray-700">Regularized</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-black font-bold">P</span>
                                    <span className="text-gray-700">Present</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-red-600 font-bold">A</span>
                                    <span className="text-gray-700">Absent</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-600 font-bold">L</span>
                                    <span className="text-gray-700">Leave</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-yellow-600 font-bold bg-yellow-50 px-1 rounded">HD</span>
                                    <span className="text-gray-700">Half Day</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-purple-600 font-bold bg-purple-50 px-1 rounded">O</span>
                                    <span className="text-gray-700">Off (Holiday)</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">WR</span>
                                    <span className="text-gray-700">Working Remotely</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-orange-600 font-bold">P:A</span>
                                    <span className="text-gray-700">Present first half</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-orange-600 font-bold">A:P</span>
                                    <span className="text-gray-700">Present second half</span>
                        </div>
                    </div>
                </div>
            )}
                </div>
                </div>
            </div>

            {/* All Employees Logs (HR Admin/Manager only) - Below Calendar */}
            {selectedDate && (isHrAdmin || isManager) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        All Employees - {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    
                    {loadingAllLogs ? (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">Loading attendance data...</p>
                        </div>
                    ) : allEmployeesLogs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee Name</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee ID</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Check In</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Check Out</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Hours</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allEmployeesLogs.map((log, index) => (
                                        <tr key={log.employee || index} className="hover:bg-gray-50 transition">
                                            <td className="py-3 px-4 text-gray-900 font-medium">
                                                {log.employee_name || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {log.employee_id || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {log.check_in ? format(parseISO(log.check_in), 'hh:mm a') : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {log.check_out ? format(parseISO(log.check_out), 'hh:mm a') : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {log.working_hours ? `${log.working_hours.toFixed(2)} hrs` : '-'}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    log.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                    log.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                    log.status === 'Half Day' ? 'bg-orange-100 text-orange-700' :
                                                    log.status === 'On Leave' ? 'bg-gray-100 text-gray-700' :
                                                    log.status === 'Working Remotely' ? 'bg-indigo-100 text-indigo-700' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.location_type ? (
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        log.location_type === 'Office' 
                                                            ? 'bg-blue-100 text-blue-700' 
                                                            : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                        {log.location_type}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No attendance records found for this date</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
