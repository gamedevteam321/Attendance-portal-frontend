import { useState, useEffect } from 'react'

import { useFrappePostCall } from 'frappe-react-sdk'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface LeaveApplication {
    name: string
    employee: string
    employee_name: string
    leave_type: string
    from_date: string
    to_date: string
    total_leave_days: number
    description: string
    status: string
    posting_date: string
}

interface RemoteRequest {
    name: string
    employee: string
    employee_name: string
    from_date: string
    to_date: string
    reason: string
    status: string
    creation: string
}

interface RegularizationRequest {
    name: string
    employee: string
    employee_name: string
    attendance_date: string
    reason: string
    status: string
    creation: string
}

export default function ApprovalsPage() {
    const [activeTab, setActiveTab] = useState<'leave' | 'remote' | 'regularization'>('leave')
    const [leaves, setLeaves] = useState<LeaveApplication[]>([])
    const [remoteRequests, setRemoteRequests] = useState<RemoteRequest[]>([])
    const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const { call: getPending } = useFrappePostCall('attendance_portal.api.get_pending_requests')
    const { call: processRequest } = useFrappePostCall('attendance_portal.api.approve_request')

    const fetchRequests = async () => {
        setIsLoading(true)
        try {
            const res = await getPending({})
            const data = (res as any).message || res
            setLeaves(data.leave_applications || [])
            setRemoteRequests(data.remote_requests || [])
            setRegularizationRequests(data.regularization_requests || [])
        } catch (error) {
            console.error("Failed to fetch requests", error)
            toast.error("Failed to load pending requests")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleAction = async (doctype: string, name: string, status: 'Approved' | 'Rejected') => {
        setProcessingId(name)
        try {
            await processRequest({
                doctype,
                name,
                status
            })
            toast.success(`Request ${status} successfully`)
            fetchRequests() // Refresh list
        } catch (error: any) {
            console.error("Action failed", error)
            toast.error(error.message || `Failed to ${status.toLowerCase()} request`)
        } finally {
            setProcessingId(null)
        }
    }

    const EmptyState = ({ message }: { message: string }) => (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">✨</div>
            <p className="text-gray-500">{message}</p>
        </div>
    )

    return (
        <div className="max-w-7xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveTab('leave')}
                    className={`px-6 py-2 rounded-full font-medium transition whitespace-nowrap ${activeTab === 'leave'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Leave Applications
                    {leaves.length > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {leaves.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('remote')}
                    className={`px-6 py-2 rounded-full font-medium transition whitespace-nowrap ${activeTab === 'remote'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Remote Work
                    {remoteRequests.length > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {remoteRequests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('regularization')}
                    className={`px-6 py-2 rounded-full font-medium transition whitespace-nowrap ${activeTab === 'regularization'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    Regularization
                    {regularizationRequests.length > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                            {regularizationRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading requests...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTab === 'leave' ? (
                        leaves.length > 0 ? (
                            leaves.map(leave => (
                                <div key={leave.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                {leave.employee_name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{leave.employee_name}</h3>
                                                <p className="text-sm text-gray-500">{leave.employee}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                                {leave.leave_type}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-1">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="material-symbols-rounded text-lg">calendar_month</span>
                                                <span className="font-medium">
                                                    {format(new Date(leave.from_date), 'MMM dd')} - {format(new Date(leave.to_date), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="text-gray-400">({leave.total_leave_days} days)</span>
                                            </div>
                                            {leave.description && (
                                                <p className="text-gray-500 text-sm ml-7">"{leave.description}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAction('Leave Application', leave.name, 'Rejected')}
                                            disabled={processingId === leave.name}
                                            className="px-6 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction('Leave Application', leave.name, 'Approved')}
                                            disabled={processingId === leave.name}
                                            className="px-6 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition"
                                        >
                                            {processingId === leave.name ? 'Processing...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : <EmptyState message="No pending leave applications" />
                    ) : activeTab === 'remote' ? (
                        remoteRequests.length > 0 ? (
                            remoteRequests.map(req => (
                                <div key={req.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                                {req.employee_name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.employee_name}</h3>
                                                <p className="text-sm text-gray-500">{req.employee}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                                                Remote Work
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-1">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="material-symbols-rounded text-lg">calendar_month</span>
                                                <span className="font-medium">
                                                    {format(new Date(req.from_date), 'MMM dd')} - {format(new Date(req.to_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                            {req.reason && (
                                                <p className="text-gray-500 text-sm ml-7">"{req.reason}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAction('Remote Working Request', req.name, 'Rejected')}
                                            disabled={processingId === req.name}
                                            className="px-6 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction('Remote Working Request', req.name, 'Approved')}
                                            disabled={processingId === req.name}
                                            className="px-6 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition"
                                        >
                                            {processingId === req.name ? 'Processing...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : <EmptyState message="No pending remote work requests" />
                    ) : (
                        regularizationRequests.length > 0 ? (
                            regularizationRequests.map(req => (
                                <div key={req.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                                {req.employee_name[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.employee_name}</h3>
                                                <p className="text-sm text-gray-500">{req.employee}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                                                Regularization
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-1">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="material-symbols-rounded text-lg">calendar_month</span>
                                                <span className="font-medium">
                                                    {format(new Date(req.attendance_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                            {req.reason && (
                                                <p className="text-gray-500 text-sm ml-7">"{req.reason}"</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAction('Attendance Regularization Request', req.name, 'Rejected')}
                                            disabled={processingId === req.name}
                                            className="px-6 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAction('Attendance Regularization Request', req.name, 'Approved')}
                                            disabled={processingId === req.name}
                                            className="px-6 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-200 transition"
                                        >
                                            {processingId === req.name ? 'Processing...' : 'Approve'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : <EmptyState message="No pending regularization requests" />
                    )}
                </div>
            )}
        </div>
    )
}
