import { useState, useEffect } from 'react'
import { useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface LeaveBalance {
    leave_type: string
    allocated: number
    used: number
    remaining: number
}

interface LeaveApplication {
    name: string
    leave_type: string
    from_date: string
    to_date: string
    description: string
    status: string
    total_leave_days: number
}

export default function LeavePage() {
    const { employeeId } = useAuth()
    const [leaveType, setLeaveType] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [balances, setBalances] = useState<LeaveBalance[]>([])

    // API Calls
    const { call: getBalances } = useFrappePostCall<LeaveBalance[]>('attendance_portal.api.get_leave_balances')
    const { call: applyLeave } = useFrappePostCall('attendance_portal.api.apply_for_leave')

    // Fetch all leave types for dropdown
    const { data: leaveTypes } = useFrappeGetDocList('Leave Type', {
        fields: ['name'],
        limit: 100
    })

    const { data: applications, mutate: mutateApplications } = useFrappeGetDocList<LeaveApplication>('Leave Application', {
        filters: [['employee', '=', employeeId]],
        fields: ['name', 'leave_type', 'from_date', 'to_date', 'description', 'status', 'total_leave_days'],
        orderBy: {
            field: 'creation',
            order: 'desc'
        }
    })

    // Fetch balances on mount
    useEffect(() => {
        if (employeeId) {
            fetchBalances()
        }
    }, [employeeId])

    // Set default leave type when leave types are loaded
    useEffect(() => {
        if (leaveTypes && leaveTypes.length > 0 && !leaveType) {
            setLeaveType(leaveTypes[0].name)
        }
    }, [leaveTypes])

    const fetchBalances = async () => {
        try {
            const result = await getBalances({ employee: employeeId })
            if (result) {
                const data = (result as any).message || result || []
                if (Array.isArray(data)) {
                    setBalances(data)
                } else {
                    console.error("Expected array for leave balances but got:", data)
                    setBalances([])
                }
            }
        } catch (error) {
            console.error('Failed to fetch leave balances', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await applyLeave({
                employee: employeeId,
                leave_type: leaveType,
                from_date: fromDate,
                to_date: toDate,
                reason
            })

            toast.success('Leave application submitted!')
            setFromDate('')
            setToDate('')
            setReason('')
            mutateApplications()
            fetchBalances() // Update balances (though they might not change until approved)
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit application')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Leave Balances */}
            <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Leave Balances</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4">
                    {balances.map((balance) => {
                        const isNegative = balance.remaining < 0
                        const isZero = balance.remaining === 0

                        let borderColor = 'border-blue-500'
                        if (balance.leave_type === 'Casual Leave') borderColor = 'border-green-500'
                        if (balance.leave_type === 'Sick Leave') borderColor = 'border-orange-500'
                        if (balance.leave_type === 'Compensatory Leave') borderColor = 'border-purple-500'

                        return (
                            <div key={balance.leave_type} className={`bg-white rounded-2xl shadow-md p-4 sm:p-6 border-l-4 ${borderColor}`}>
                                <h3 className="text-gray-500 font-medium text-xs sm:text-sm uppercase tracking-wider mb-2">{balance.leave_type}</h3>
                                <div className="flex justify-between items-end mb-3">
                                    <div>
                                        <span className={`text-2xl sm:text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                                            {balance.remaining}
                                        </span>
                                        <span className="text-gray-400 text-xs sm:text-sm ml-1">left</span>
                                    </div>
                                    <div className="text-right text-xs sm:text-sm text-gray-500">
                                        <div>{balance.used} used</div>
                                        <div>{balance.allocated} total</div>
                                    </div>
                                </div>
                                {balance.leave_type === 'Casual Leave' && isZero && (
                                    <p className="text-xs text-red-600 mt-2">⚠️ Cannot apply - balance is 0</p>
                                )}
                                {balance.leave_type === 'Sick Leave' && isNegative && (
                                    <p className="text-xs text-orange-600 mt-2">ℹ️ Balance is negative</p>
                                )}
                                {balance.leave_type === 'Compensatory Leave' && (
                                    <p className="text-xs text-purple-600 mt-2">ℹ️ No deduction on use</p>
                                )}
                            </div>
                        )
                    })}
                </div>
                
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Application Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">Apply for Leave</h2>

                        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                            <div>
                                <label htmlFor="leaveType" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    Leave Type
                                </label>
                                <select
                                    id="leaveType"
                                    value={leaveType}
                                    onChange={(e) => setLeaveType(e.target.value)}
                                    required
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
                                >
                                    <option value="">Select Leave Type</option>
                                    {leaveTypes?.map(lt => (
                                        <option key={lt.name} value={lt.name}>{lt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="fromDate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    From Date
                                </label>
                                <input
                                    id="fromDate"
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    required
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="toDate" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    To Date
                                </label>
                                <input
                                    id="toDate"
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    required
                                    min={fromDate}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    Reason
                                </label>
                                <textarea
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    rows={4}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                                    placeholder="Reason for leave..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                            >
                                {loading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* History List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                        <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">Leave History</h2>

                        {applications && applications.length > 0 ? (
                            <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
                                {applications.map((app) => (
                                    <div key={app.name} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm sm:text-base font-semibold text-gray-800">{app.leave_type}</span>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                        {app.total_leave_days} day{app.total_leave_days !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                                    {format(new Date(app.from_date), 'MMM dd, yyyy')} - {format(new Date(app.to_date), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${app.status === 'Approved'
                                                ? 'bg-green-100 text-green-700'
                                                : app.status === 'Rejected'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-2 break-words">{app.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 sm:py-12">
                                <div className="text-4xl sm:text-6xl mb-4">📅</div>
                                <p className="text-sm sm:text-base text-gray-600">No leave applications found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
