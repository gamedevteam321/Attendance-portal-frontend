import React, { useState, useEffect } from 'react'
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
    const { data: requestsData, mutate: refreshRequests } = useFrappeGetCall<RegularizationRequest[] | { message: RegularizationRequest[] }>(
        'attendance_portal.api.get_regularization_requests',
        {}
    )
    
    // Extract requests from response (handle both direct array and wrapped in message)
    const requests = React.useMemo(() => {
        if (!requestsData) return []
        const extracted = Array.isArray(requestsData) 
            ? requestsData 
            : (requestsData as any)?.message || []
        return Array.isArray(extracted) ? extracted : []
    }, [requestsData])

    // Debug: Log requests to console
    useEffect(() => {
        console.log('Regularization requests updated:', requests)
        if (requests && requests.length > 0) {
            console.log('Regularization requests loaded:', requests)
            // Log pending requests specifically
            const pending = requests.filter(r => r.status === 'Pending')
            if (pending.length > 0) {
                console.log('Pending regularization requests:', pending)
            }
        }
    }, [requests])

    // Fetch remote work requests
    const { call: getRemoteRequests } = useFrappePostCall('attendance_portal.api.get_employee_requests')
    const [remoteWorkRequests, setRemoteWorkRequests] = useState<RemoteWorkRequest[]>([])

    // Fetch remote work requests
    const fetchRemoteWorkRequests = React.useCallback(async () => {
        if (employeeId) {
            try {
                const res = await getRemoteRequests({ doctype: 'Remote Working Request' })
                    const data = res?.message || res || []
                    setRemoteWorkRequests(Array.isArray(data) ? data : [])
            } catch (err) {
                    console.error('Failed to fetch remote work requests:', err)
                    setRemoteWorkRequests([])
            }
        }
    }, [employeeId, getRemoteRequests])

    useEffect(() => {
        fetchRemoteWorkRequests()
    }, [fetchRemoteWorkRequests])

    // Refresh remote work requests when month changes
    useEffect(() => {
        fetchRemoteWorkRequests()
    }, [currentDate, fetchRemoteWorkRequests])

    // Refresh remote work requests when page becomes visible (user returns from another page)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchRemoteWorkRequests()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [fetchRemoteWorkRequests])

    const { call: applyForRegularization, loading: isSubmitting } = useFrappePostCall('attendance_portal.api.apply_for_regularization')
    const { call: getRegularizationRequests } = useFrappePostCall('attendance_portal.api.get_regularization_requests')

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
        if (!remoteWorkRequests || !Array.isArray(remoteWorkRequests)) return false
        const normalizedDate = normalizeDate(date)
        return remoteWorkRequests.some(req => {
            if (!req || req.status !== 'Approved') return false
            try {
            const fromDate = normalizeDate(req.from_date)
            const toDate = normalizeDate(req.to_date)
            return isWithinInterval(normalizedDate, { start: fromDate, end: toDate }) || 
                   isSameDay(normalizedDate, fromDate) || 
                   isSameDay(normalizedDate, toDate)
            } catch (e) {
                return false
            }
        })
    }

    // Helper function to check if date is within pending remote work request
    const isDateInPendingRemoteWork = (date: Date): boolean => {
        if (!remoteWorkRequests || !Array.isArray(remoteWorkRequests)) return false
        const normalizedDate = normalizeDate(date)
        return remoteWorkRequests.some(req => {
            if (!req || req.status !== 'Pending') return false
            try {
                const fromDate = normalizeDate(req.from_date)
                const toDate = normalizeDate(req.to_date)
                return isWithinInterval(normalizedDate, { start: fromDate, end: toDate }) || 
                       isSameDay(normalizedDate, fromDate) || 
                       isSameDay(normalizedDate, toDate)
            } catch (e) {
                return false
            }
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

        // Validate that check-out time is >= check-in time
        if (checkIn && checkOut) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const checkInDateTime = `${dateStr} ${checkIn}:00`
            const checkOutDateTime = `${dateStr} ${checkOut}:00`
            
            try {
                const checkInTime = parseISO(checkInDateTime)
                const checkOutTime = parseISO(checkOutDateTime)
                
                if (checkOutTime < checkInTime) {
                    toast.error('Check-out time must be equal to or greater than check-in time')
                    return
                }
            } catch (error) {
                console.error('Error validating times:', error)
                toast.error('Invalid time format')
                return
            }
        }

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
            
            // Manually refetch requests to ensure immediate update
            try {
                const requestsRes = await getRegularizationRequests({})
                const requestsData = (requestsRes as any)?.message || requestsRes || []
                // Update the cache by calling mutate with new data
                refreshRequests(Array.isArray(requestsData) ? requestsData : [])
            } catch (error) {
                console.error('Failed to refresh requests:', error)
                // Fallback to just calling mutate
            refreshRequests()
            }
            
            // Refresh logs
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

        const hasCheckIn = !!log?.check_in
        const hasCheckOut = !!log?.check_out
        const status = log?.status

        // Check for On Leave status - never override with regularization
        if (status === 'On Leave') {
            return { text: 'L', color: 'text-gray-600', bgColor: 'bg-gray-50' }
        }

        // Check if working remotely based on location_type or remote work request
        const isRemoteWork = log?.location_type && (log.location_type === 'Remote' || log.location_type === 'Work From Home')
        const isInApprovedRemoteRequest = isDateInApprovedRemoteWork(date)
        const isInPendingRemoteRequest = isDateInPendingRemoteWork(date)

        // Check for regularization requests
        const approvedReg = hasApprovedRegularization(date)
        const pendingReg = hasPendingRegularization(date)

        // Handle remote work requests (pending or approved)
        if (isRemoteWork || isInApprovedRemoteRequest || isInPendingRemoteRequest) {
            // Check for pending remote work request first (highest priority for pending status)
            if (isInPendingRemoteRequest) {
                // Pending remote work request - show WR:PA in red
                if (pendingReg) {
                    // If also has pending regularization, still show WR:PA
                    return { text: 'WR:PA', color: 'text-red-600', bgColor: 'bg-red-50' }
                }
                return { text: 'WR:PA', color: 'text-red-600', bgColor: 'bg-red-50' }
            }
            
            // Approved remote work with regularization
            if (approvedReg) {
                // Approved regularization on remote work - show WR:R
                return { text: 'WR:R', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
            } else if (pendingReg) {
                // Pending regularization on approved remote work - show WR:PA in red
                return { text: 'WR:PA', color: 'text-red-600', bgColor: 'bg-red-50' }
            } else if (isInApprovedRemoteRequest || isRemoteWork) {
                // Approved remote work (no regularization)
            return { text: 'WR', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
            }
        }

        // Handle approved regularization (overrides other statuses except On Leave)
        if (approvedReg) {
            // Show Present status for approved regularization
            if (hasCheckIn && hasCheckOut) {
                return { text: 'P', color: 'text-black', bgColor: 'bg-white' }
            } else if (hasCheckIn || hasCheckOut) {
                // Partial attendance after regularization
                if (hasCheckIn && !hasCheckOut) {
                    return { text: 'P:A', color: 'text-orange-600', bgColor: 'bg-orange-50' }
                } else {
                    return { text: 'A:P', color: 'text-orange-600', bgColor: 'bg-orange-50' }
                }
            } else {
                return { text: 'P', color: 'text-black', bgColor: 'bg-white' }
            }
        }

        // Handle pending regularization (only if not already handled by remote work)
        if (pendingReg && !isInPendingRemoteRequest && !isInApprovedRemoteRequest && !isRemoteWork) {
            // Show pending indicator but keep original status context
            if (!log) {
                return { text: 'PA', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
            }
            // For other statuses with pending reg, show PA indicator
            return { text: 'PA', color: 'text-yellow-600', bgColor: 'bg-yellow-100' }
        }

        // If no log exists and date is on or after joining date, show as Absent
        if (!log) {
            return { text: 'A', color: 'text-red-600', bgColor: 'bg-red-50' }
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
            case 'Work From Home':
                return { text: 'WR', color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
            default:
                return { text: status ? status.substring(0, 2).toUpperCase() : 'A', color: 'text-gray-600', bgColor: 'bg-gray-50' }
        }
    }

    // Check if date has approved regularization
    const hasApprovedRegularization = (date: Date): boolean => {
        if (!requests || !Array.isArray(requests) || requests.length === 0) return false
        try {
            const normalizedDate = normalizeDate(date)
        return requests.some(r => {
                if (!r || !r.attendance_date) return false
                try {
            const reqDate = normalizeDate(r.attendance_date)
                    return isSameDay(reqDate, normalizedDate) && r.status === 'Approved'
                } catch (e) {
                    return false
                }
            })
        } catch (e) {
            return false
        }
    }

    // Check if date has pending regularization
    const hasPendingRegularization = (date: Date): boolean => {
        if (!requests || !Array.isArray(requests) || requests.length === 0) return false
        try {
            const normalizedDate = normalizeDate(date)
            return requests.some(r => {
                if (!r || !r.attendance_date) return false
                try {
                    const reqDate = normalizeDate(r.attendance_date)
                    return isSameDay(reqDate, normalizedDate) && r.status === 'Pending'
                } catch (e) {
                    return false
                }
            })
        } catch (e) {
            return false
        }
    }

    const selectedLog = selectedDate ? findLogForDate(selectedDate) : undefined

    const hasRegularizationRequest = selectedDate && requests && Array.isArray(requests) && requests.some(r => {
        if (!r || !r.attendance_date) return false
        const reqDate = normalizeDate(r.attendance_date)
        return isSameDay(reqDate, normalizeDate(selectedDate)) && (r.status === 'Approved' || r.status === 'Pending')
    })
    
    // Get approved regularization request for selected date (for hours calculation)
    // Also check for pending regularization to show in UI
    const regularizationRequest = selectedDate && requests && Array.isArray(requests) ? requests.find(r => {
        if (!r || !r.attendance_date) return false
        try {
        const reqDate = normalizeDate(r.attendance_date)
            const selDate = normalizeDate(selectedDate)
            return isSameDay(reqDate, selDate) && r.status === 'Approved'
        } catch (e) {
            console.error('Error finding regularization request:', e, r)
            return false
        }
    }) : undefined
    
    // Debug: Log regularization request when selected date changes
    useEffect(() => {
        if (selectedDate) {
            const foundRequest = requests && Array.isArray(requests) ? requests.find(r => {
                if (!r || !r.attendance_date) return false
                try {
                    const reqDate = normalizeDate(r.attendance_date)
                    const selDate = normalizeDate(selectedDate)
                    return isSameDay(reqDate, selDate) && r.status === 'Approved'
                } catch (e) {
                    return false
                }
            }) : undefined
            
            if (foundRequest) {
                console.log('Regularization request found for selected date:', {
                    selectedDate: format(selectedDate, 'yyyy-MM-dd'),
                    foundRequest,
                    requested_in: foundRequest.requested_in,
                    requested_out: foundRequest.requested_out,
                    status: foundRequest.status,
                    hasApprovedRegularization: hasApprovedRegularization(selectedDate)
                })
            } else if (hasApprovedRegularization(selectedDate)) {
                console.warn('hasApprovedRegularization returned true but regularizationRequest not found', {
                    selectedDate: format(selectedDate, 'yyyy-MM-dd'),
                    allRequests: requests,
                    matchingRequests: requests && Array.isArray(requests) ? requests.filter(r => {
                        if (!r || !r.attendance_date) return false
                        try {
                            const reqDate = normalizeDate(r.attendance_date)
                            const selDate = normalizeDate(selectedDate)
                            return isSameDay(reqDate, selDate)
                        } catch (e) {
                            return false
                        }
                    }) : []
                })
            }
        }
    }, [selectedDate, requests])

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
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-500 py-1 sm:py-2">
                                {day.substring(0, 3)}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-16 sm:h-20 md:h-20 bg-gray-50 rounded-lg opacity-50" />
                        ))}

                        {/* Days */}
                        {daysInMonth.map(date => {
                            const log = findLogForDate(date)
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                            const isCurrentDay = isToday(date)
                            const isSelected = selectedDate && isSameDay(normalizeDate(date), normalizeDate(selectedDate))
                            const isBeforeJoining = joiningDate && isBefore(normalizeDate(date), normalizeDate(joiningDate))
                            const statusIndicator = getStatusIndicator(log, date)
                            const hasApprovedReg = hasApprovedRegularization(date)
                            const hasPendingReg = hasPendingRegularization(date)

                            return (
                                <div
                                    key={date.toString()}
                                    onClick={() => !isBeforeJoining && handleDateClick(date)}
                                    className={`
                                        h-16 sm:h-20 md:h-20 p-1.5 sm:p-2 border rounded-lg relative transition-colors
                                        ${isBeforeJoining ? 'bg-gray-100 opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        ${!isCurrentMonth ? 'bg-gray-50/50' : isBeforeJoining ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'}
                                        ${isSelected ? 'ring-2 ring-blue-400 border-blue-400' : 'border-gray-200'}
                                        ${isCurrentDay && !isSelected ? 'ring-1 ring-blue-300' : ''}
                                    `}
                                >
                                    <div className="flex flex-col justify-between items-start h-full overflow-hidden">
                                        <div className="flex-1 w-full min-w-0">
                                            <span className={`text-xs sm:text-sm font-medium ${!isCurrentMonth || isBeforeJoining ? 'text-gray-400' : 'text-gray-700'}`}>
                                                {format(date, 'd')}
                                            </span>
                                            {statusIndicator.text && (
                                                <div className={`mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-bold px-0.5 sm:px-1 py-0.5 rounded truncate max-w-full ${statusIndicator.color} ${statusIndicator.bgColor}`}>
                                                    {statusIndicator.text}
                                                </div>
                                            )}
                                        </div>
                                        {(hasApprovedReg || hasPendingReg) && (
                                            <div className="absolute bottom-1 right-1 z-10 pointer-events-none">
                                                <div className="w-0 h-0 border-l-[7px] sm:border-l-[8px] border-l-transparent border-b-[7px] sm:border-b-[8px] border-b-orange-500" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }} />
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
                                                    {(() => {
                                                        // If there's an approved regularization, calculate hours from regularization times
                                                        if (selectedDate && hasApprovedRegularization(selectedDate) && regularizationRequest) {
                                                            try {
                                                                if (regularizationRequest.requested_in && regularizationRequest.requested_out) {
                                                                    const regCheckIn = parseISO(regularizationRequest.requested_in)
                                                                    const regCheckOut = parseISO(regularizationRequest.requested_out)
                                                                    
                                                                    if (!isNaN(regCheckIn.getTime()) && !isNaN(regCheckOut.getTime())) {
                                                                        let durationHours = (regCheckOut.getTime() - regCheckIn.getTime()) / (1000 * 60 * 60)
                                                                        
                                                                        // Handle overnight shifts (if OUT is before IN, assume OUT is next day)
                                                                        if (durationHours < 0) {
                                                                            // Add 24 hours to handle overnight shift
                                                                            durationHours = durationHours + 24
                                                                        }
                                                                        
                                                                        if (durationHours > 0) {
                                                                            console.log('Regularized hours calculated:', {
                                                                                requested_in: regularizationRequest.requested_in,
                                                                                requested_out: regularizationRequest.requested_out,
                                                                                durationHours
                                                                            })
                                                                            return `${durationHours.toFixed(2)} hrs`
                                                                        }
                                                                    }
                                                                }
                                                            } catch (error) {
                                                                console.error('Error calculating regularization hours:', error, {
                                                                    regularizationRequest,
                                                                    requested_in: regularizationRequest?.requested_in,
                                                                    requested_out: regularizationRequest?.requested_out
                                                                })
                                                            }
                                                        }
                                                        // Otherwise use the log's working hours
                                                        return selectedLog?.working_hours ? `${selectedLog.working_hours.toFixed(2)} hrs` : '0 hrs'
                                                    })()}
                                                </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <p className="text-xs text-green-600 font-medium uppercase">Status</p>
                                    <p className="text-xl font-bold text-green-900">
                                        {(() => {
                                            // If there's an approved regularization, calculate status from regularization times
                                            if (selectedDate && hasApprovedRegularization(selectedDate) && regularizationRequest) {
                                                try {
                                                    if (regularizationRequest.requested_in && regularizationRequest.requested_out) {
                                                        const regCheckIn = parseISO(regularizationRequest.requested_in)
                                                        const regCheckOut = parseISO(regularizationRequest.requested_out)
                                                        
                                                        if (!isNaN(regCheckIn.getTime()) && !isNaN(regCheckOut.getTime())) {
                                                            let durationHours = (regCheckOut.getTime() - regCheckIn.getTime()) / (1000 * 60 * 60)
                                                            
                                                            // Handle overnight shifts (if OUT is before IN, assume OUT is next day)
                                                            if (durationHours < 0) {
                                                                // Add 24 hours to handle overnight shift
                                                                durationHours = durationHours + 24
                                                            }
                                                            
                                                            // Calculate status based on hours: < 4 hours = Half Day, >= 4 hours = Present
                                                            if (durationHours > 0) {
                                                                console.log('Regularized status calculated:', {
                                                                    requested_in: regularizationRequest.requested_in,
                                                                    requested_out: regularizationRequest.requested_out,
                                                                    durationHours,
                                                                    status: durationHours < 4 ? 'Half Day' : 'Present'
                                                                })
                                                                return durationHours < 4 ? 'Half Day' : 'Present'
                                                            }
                                                        }
                                                    }
                                                } catch (error) {
                                                    console.error('Error calculating regularization status:', error, {
                                                        regularizationRequest,
                                                        requested_in: regularizationRequest?.requested_in,
                                                        requested_out: regularizationRequest?.requested_out
                                                    })
                                                }
                                            }
                                            // Otherwise use the log's status
                                            return selectedLog?.status || 'Absent'
                                        })()}
                                    </p>
                                </div>
                            </div>

                                        {/* Punch In/Out Logs Section */}
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm">
                                                <Clock className="w-4 h-4" />
                                                {hasApprovedRegularization(selectedDate) && regularizationRequest ? 'Regularized Attendance' : 'Punch In/Out Logs'}
                                            </h4>
                                            
                                            {/* Show regularized data if approved regularization exists */}
                                            {hasApprovedRegularization(selectedDate) && regularizationRequest && regularizationRequest.requested_in && regularizationRequest.requested_out ? (
                                                <div className="space-y-2">
                                                    {/* Regularized Check In */}
                                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200 hover:bg-green-100 transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-green-100 text-green-700 border-2 border-green-300">
                                                                IN
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {format(parseISO(regularizationRequest.requested_in), 'hh:mm a')}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                                        Regularized
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500">
                                                                {format(parseISO(regularizationRequest.requested_in), 'MMM dd, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Regularized Check Out */}
                                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200 hover:bg-green-100 transition">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 text-red-700 border-2 border-red-300">
                                                                OUT
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900">
                                                                    {format(parseISO(regularizationRequest.requested_out), 'hh:mm a')}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                                                                        Regularized
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-500">
                                                                {format(parseISO(regularizationRequest.requested_out), 'MMM dd, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Show actual punch history below regularized data (collapsed or in a separate section) */}
                                                    {selectedLog.punch_history && selectedLog.punch_history.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                                            <p className="text-xs text-gray-500 mb-2 font-medium">Actual Punch History (for reference)</p>
                                                            <div className="space-y-2">
                                                                {selectedLog.punch_history.map((punch, index) => (
                                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200 opacity-75">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                                                punch.punch_type === 'IN' 
                                                                                    ? 'bg-green-100 text-green-700 border border-green-300' 
                                                                                    : 'bg-red-100 text-red-700 border border-red-300'
                                                                            }`}>
                                                                                {punch.punch_type === 'IN' ? 'IN' : 'OUT'}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-medium text-gray-700">
                                                                                    {format(parseISO(punch.punch_time), 'hh:mm a')}
                                                                                </p>
                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                                                    punch.location_type === 'Office' 
                                                                                        ? 'bg-blue-100 text-blue-700' 
                                                                                        : 'bg-purple-100 text-purple-700'
                                                                                }`}>
                                                                                    {punch.location_type}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : selectedLog.punch_history && selectedLog.punch_history.length > 0 ? (
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
                                                        onChange={e => {
                                                            setCheckIn(e.target.value)
                                                            // Reset check-out if it becomes invalid (earlier than new check-in)
                                                            if (checkOut && e.target.value && checkOut < e.target.value) {
                                                                setCheckOut('')
                                                            }
                                                        }}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Check Out</label>
                                                    <input
                                                        type="time"
                                                        value={checkOut}
                                                        min={checkIn || undefined}
                                                        onChange={e => {
                                                            const newCheckOut = e.target.value
                                                            // Prevent selecting checkout time before check-in time
                                                            if (checkIn && newCheckOut && newCheckOut < checkIn) {
                                                                toast.error('Check-out time must be equal to or greater than check-in time')
                                                                return // Don't update the value
                                                            }
                                                            setCheckOut(newCheckOut)
                                                        }}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                        disabled={!checkIn}
                                                    />
                                                    {checkIn && checkOut && checkOut < checkIn && (
                                                        <p className="text-xs text-red-600 mt-1">Check-out must be after check-in time</p>
                                                    )}
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

            {/* Regularization History Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Regularization History</h2>
                
                {requests && Array.isArray(requests) && requests.length > 0 ? (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {[...requests]
                            .filter(request => request && request.attendance_date) // Filter out invalid requests
                            .sort((a, b) => {
                                const dateA = new Date(a.attendance_date).getTime()
                                const dateB = new Date(b.attendance_date).getTime()
                                return dateB - dateA // Newest first
                            })
                            .map((request) => {
                            if (!request || !request.attendance_date) return null
                            
                            const requestDate = new Date(request.attendance_date)
                            if (isNaN(requestDate.getTime())) return null
                            
                            const checkInTime = request.requested_in ? format(new Date(request.requested_in), 'hh:mm a') : 'N/A'
                            const checkOutTime = request.requested_out ? format(new Date(request.requested_out), 'hh:mm a') : 'N/A'
                            
                            // Calculate hours if both times are available
                            let calculatedHours = null
                            if (request.requested_in && request.requested_out) {
                                try {
                                    const checkIn = new Date(request.requested_in)
                                    const checkOut = new Date(request.requested_out)
                                    if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
                                        const durationHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                                        if (durationHours > 0) {
                                            calculatedHours = durationHours.toFixed(2)
                                        }
                                    }
                                } catch (error) {
                                    console.error('Error calculating hours:', error)
                                }
                            }
                            
                            return (
                                <div 
                                    key={request.name || request.attendance_date} 
                                    className={`border rounded-lg p-4 hover:shadow-md transition ${
                                        request.status === 'Approved'
                                            ? 'border-green-200 bg-green-50/30'
                                            : request.status === 'Rejected'
                                                ? 'border-red-200 bg-red-50/30'
                                                : request.status === 'Pending'
                                                    ? 'border-yellow-200 bg-yellow-50/30'
                                                    : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-base font-semibold text-gray-800">
                                                    {format(requestDate, 'MMMM dd, yyyy')}
                                                </p>
                                                {(request.status === 'Approved' || request.status === 'Pending') && (
                                                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-orange-500" />
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-rounded text-lg">login</span>
                                                    <span>{checkInTime}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="material-symbols-rounded text-lg">logout</span>
                                                    <span>{checkOutTime}</span>
                                                </div>
                                                {calculatedHours && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="material-symbols-rounded text-lg">schedule</span>
                                                        <span className="font-medium">{calculatedHours} hrs</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                                            request.status === 'Approved'
                                                ? 'bg-green-100 text-green-700 border border-green-300'
                                                : request.status === 'Rejected'
                                                    ? 'bg-red-100 text-red-700 border border-red-300'
                                                    : request.status === 'Pending'
                                                        ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                                                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                                        }`}>
                                            {request.status || 'Unknown'}
                                        </span>
                                    </div>
                                    {request.reason && (
                                        <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                                            <span className="font-medium">Reason: </span>
                                            {request.reason}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-gray-600">No regularization requests yet</p>
                        <p className="text-sm text-gray-500 mt-2">Select a date on the calendar to apply for regularization</p>
                    </div>
                )}
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
