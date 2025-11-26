import { useState } from 'react'
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay, addMonths, subMonths, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, XCircle, History } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AttendanceLog {
    name: string
    attendance_date: string
    check_in: string
    check_out: string
    status: string
    working_hours: number
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

export default function RegularizationPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // Form State
    const [checkIn, setCheckIn] = useState('')
    const [checkOut, setCheckOut] = useState('')
    const [reason, setReason] = useState('')

    // Fetch attendance logs
    const { data: attendanceLogs, isLoading: logsLoading } = useFrappeGetCall<AttendanceLog[]>(
        'attendance_portal.api.get_attendance_logs',
        {
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear()
        }
    )

    // Fetch regularization requests
    const { data: requests, isLoading: requestsLoading, mutate: refreshRequests } = useFrappeGetCall<RegularizationRequest[]>(
        'attendance_portal.api.get_regularization_requests',
        {}
    )

    const { call: applyForRegularization, loading: isSubmitting } = useFrappePostCall('attendance_portal.api.apply_for_regularization')

    // Calendar Logic
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startDayOfWeek = getDay(monthStart) // 0 = Sunday

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
        // Pre-fill form if log exists?
        const log = Array.isArray(attendanceLogs) ? attendanceLogs.find(l => isSameDay(parseISO(l.attendance_date), date)) : undefined
        if (log) {
            setCheckIn(log.check_in ? format(parseISO(log.check_in), 'HH:mm') : '')
            setCheckOut(log.check_out ? format(parseISO(log.check_out), 'HH:mm') : '')
        } else {
            setCheckIn('')
            setCheckOut('')
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDate) return

        try {
            // Combine date and time
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const checkInDateTime = checkIn ? `${dateStr} ${checkIn}:00` : null
            const checkOutDateTime = checkOut ? `${dateStr} ${checkOut}:00` : null

            await applyForRegularization({
                employee: localStorage.getItem('employee_id'), // We need to ensure we have this
                attendance_date: dateStr,
                check_in: checkInDateTime,
                check_out: checkOutDateTime,
                reason
            })

            toast.success('Regularization request submitted')
            setIsModalOpen(false)
            setReason('')
            refreshRequests() // Refresh the list
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message || 'Failed to submit request')
            } else {
                toast.error('Failed to submit request')
            }
        }
    }



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Regularization</h1>
                    <p className="text-gray-500">View attendance and request corrections</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Section */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            {format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                                <ChevronRight className="w-5 h-5" />
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
                            <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg opacity-50" />
                        ))}

                        {/* Days */}
                        {daysInMonth.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd')
                            const log = Array.isArray(attendanceLogs) ? attendanceLogs.find(l => isSameDay(parseISO(l.attendance_date), date)) : undefined
                            const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                            const isCurrentDay = isToday(date)

                            // Check if there's a pending request for this date
                            const hasPendingRequest = Array.isArray(requests) && requests.some(r => r.attendance_date === dateStr && r.status === 'Pending')

                            let statusText = ''
                            let statusColor = ''

                            if (log) {
                                switch (log.status) {
                                    case 'Present':
                                        statusText = 'P'
                                        statusColor = 'text-green-600 bg-green-50'
                                        break
                                    case 'Absent':
                                        statusText = 'A'
                                        statusColor = 'text-red-600 bg-red-50'
                                        break
                                    case 'On Leave':
                                        statusText = 'L'
                                        statusColor = 'text-blue-600 bg-blue-50'
                                        break
                                    case 'Half Day':
                                        statusText = 'HD'
                                        statusColor = 'text-yellow-600 bg-yellow-50'
                                        break
                                    case 'Holiday':
                                        statusText = 'H'
                                        statusColor = 'text-purple-600 bg-purple-50'
                                        break
                                    case 'Work From Home':
                                        statusText = 'WFH'
                                        statusColor = 'text-indigo-600 bg-indigo-50'
                                        break
                                    default:
                                        statusText = log.status.substring(0, 2).toUpperCase()
                                        statusColor = 'text-gray-600 bg-gray-50'
                                }
                            }

                            return (
                                <div
                                    key={date.toString()}
                                    onClick={() => handleDateClick(date)}
                                    className={`
                                        min-h-[80px] p-2 border border-gray-100 relative cursor-pointer transition-colors
                                        ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'}
                                        ${isCurrentDay ? 'ring-2 ring-blue-500 ring-inset' : ''}
                                        ${selectedDate && isSameDay(date, selectedDate) ? 'bg-blue-50' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-medium ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {format(date, 'd')}
                                        </span>
                                        {hasPendingRequest && (
                                            <div className="w-2 h-2 rounded-full bg-orange-500" title="Pending Request" />
                                        )}
                                    </div>

                                    {log && (
                                        <div className={`mt-2 text-xs font-bold px-1.5 py-0.5 rounded text-center ${statusColor}`}>
                                            {statusText}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Sidebar: History & Legend */}
                <div className="space-y-6">
                    {/* Legend */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Legend</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full bg-green-500" /> Present
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full bg-red-500" /> Absent
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full bg-blue-500" /> On Leave
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-3 h-3 rounded-full bg-orange-500" /> Pending Request
                            </div>
                        </div>
                    </div>

                    {/* Request History */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Request History
                        </h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {requestsLoading ? (
                                <div className="text-center py-4 text-gray-500">Loading...</div>
                            ) : (!requests || requests.length === 0) ? (
                                <p className="text-sm text-gray-500 text-center py-4">No requests found</p>
                            ) : (
                                Array.isArray(requests) && requests.map(req => (
                                    <div key={req.name} className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm font-medium text-gray-900">
                                                {format(parseISO(req.attendance_date), 'MMM d, yyyy')}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500 space-y-1">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {req.requested_in ? format(parseISO(req.requested_in), 'HH:mm') : '--:--'} -
                                                {req.requested_out ? format(parseISO(req.requested_out), 'HH:mm') : '--:--'}
                                            </div>
                                            {req.reason && <p>"{req.reason}"</p>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Application Modal */}
            {isModalOpen && selectedDate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-semibold text-gray-900">
                                Regularize Attendance
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200 text-gray-900">
                                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
                                    <input
                                        type="time"
                                        value={checkIn}
                                        onChange={e => setCheckIn(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
                                    <input
                                        type="time"
                                        value={checkOut}
                                        onChange={e => setCheckOut(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <textarea
                                    required
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    placeholder="Why are you regularizing?"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
