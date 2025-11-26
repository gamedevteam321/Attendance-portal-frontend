import { useState, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { format } from 'date-fns'


interface RemoteWorkRequest {
    name: string
    employee: string
    from_date: string
    to_date: string
    reason: string
    status: string
}

export default function RemoteWorkPage() {
    const { employeeId } = useAuth()
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)

    const { call: createRequest } = useFrappePostCall('attendance_portal.api.create_remote_request')
    const { call: getRequests } = useFrappePostCall('attendance_portal.api.get_employee_requests')

    const [requests, setRequests] = useState<RemoteWorkRequest[]>([])

    const fetchRequests = async () => {
        try {
            const res = await getRequests({ doctype: 'Remote Working Request' })
            if (res) {
                const data = (res as any).message || res
                setRequests(data)
            }
        } catch (error) {
            console.error("Failed to fetch requests", error)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await createRequest({
                employee: employeeId,
                from_date: fromDate,
                to_date: toDate,
                reason
            })

            toast.success('Remote work request submitted!')
            setFromDate('')
            setToDate('')
            setReason('')
            fetchRequests()
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit request')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Request Form */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">New Request</h2>

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
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
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
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
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
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
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"
                                placeholder="Explain why you need to work remotely..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>

                {/* Requests List */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 text-gray-800">Your Requests</h2>

                    {requests && requests.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4 max-h-[600px] overflow-y-auto">
                            {requests.map((request) => (
                                <div key={request.name} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 sm:gap-0 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm sm:text-base font-semibold text-gray-800">
                                                {format(new Date(request.from_date), 'MMM dd, yyyy')} - {format(new Date(request.to_date), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${request.status === 'Approved'
                                            ? 'bg-green-100 text-green-700'
                                            : request.status === 'Rejected'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {request.status}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-600 break-words">{request.reason}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 sm:py-12">
                            <div className="text-4xl sm:text-6xl mb-4">🏠</div>
                            <p className="text-sm sm:text-base text-gray-600">No remote work requests yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
