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

interface PunchOutRequest {
    name: string
    employee: string
    employee_name: string
    attendance_date: string
    attendance_log: string
    check_out_time: string
    reason: string
    latitude?: number
    longitude?: number
    status: string
    creation: string
}

interface HistoryLeaveApplication extends LeaveApplication {
    approved_by?: string
    approved_by_id?: string
    approved_at?: string
}

interface HistoryRemoteRequest extends RemoteRequest {
    approved_by?: string
    approved_by_id?: string
    approved_at?: string
}

interface HistoryRegularizationRequest extends RegularizationRequest {
    approved_by?: string
    approved_by_id?: string
    approved_at?: string
}

interface HistoryPunchOutRequest extends PunchOutRequest {
    approved_by?: string
    approved_by_id?: string
    approved_at?: string
}

export default function ApprovalsPage() {
    const [viewMode, setViewMode] = useState<'pending' | 'history'>('pending')
    const [activeTab, setActiveTab] = useState<'leave' | 'remote' | 'regularization' | 'punchout'>('leave')
    const [leaves, setLeaves] = useState<LeaveApplication[]>([])
    const [remoteRequests, setRemoteRequests] = useState<RemoteRequest[]>([])
    const [regularizationRequests, setRegularizationRequests] = useState<RegularizationRequest[]>([])
    const [punchOutRequests, setPunchOutRequests] = useState<PunchOutRequest[]>([])
    const [historyLeaves, setHistoryLeaves] = useState<HistoryLeaveApplication[]>([])
    const [historyRemoteRequests, setHistoryRemoteRequests] = useState<HistoryRemoteRequest[]>([])
    const [historyRegularizationRequests, setHistoryRegularizationRequests] = useState<HistoryRegularizationRequest[]>([])
    const [historyPunchOutRequests, setHistoryPunchOutRequests] = useState<HistoryPunchOutRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const { call: getPending } = useFrappePostCall('attendance_portal.api.get_pending_requests')
    const { call: getHistory } = useFrappePostCall('attendance_portal.api.get_approval_history')
    const { call: processRequest } = useFrappePostCall('attendance_portal.api.approve_request')

    const fetchRequests = async () => {
        setIsLoading(true)
        try {
            if (viewMode === 'pending') {
                const res = await getPending({})
                const data = (res as any).message || res
                setLeaves(data.leave_applications || [])
                setRemoteRequests(data.remote_requests || [])
                setRegularizationRequests(data.regularization_requests || [])
                setPunchOutRequests(data.punch_out_requests || [])
            } else {
                const res = await getHistory({})
                const data = (res as any).message || res
                setHistoryLeaves(data.leave_applications || [])
                setHistoryRemoteRequests(data.remote_requests || [])
                setHistoryRegularizationRequests(data.regularization_requests || [])
                setHistoryPunchOutRequests(data.punch_out_requests || [])
            }
        } catch (error) {
            console.error("Failed to fetch requests", error)
            toast.error(`Failed to load ${viewMode} requests`)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [viewMode])

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

    const currentLeaves = viewMode === 'pending' ? leaves : historyLeaves
    const currentRemoteRequests = viewMode === 'pending' ? remoteRequests : historyRemoteRequests
    const currentRegularizationRequests = viewMode === 'pending' ? regularizationRequests : historyRegularizationRequests
    const currentPunchOutRequests = viewMode === 'pending' ? punchOutRequests : historyPunchOutRequests

    return (
        <div className="max-w-7xl mx-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Approvals</h1>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('pending')}
                        className={`px-4 py-2 rounded-md font-medium transition ${
                            viewMode === 'pending'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-md font-medium transition ${
                            viewMode === 'history'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Tabs - Mobile & Tablet Design */}
            <div className="mb-6 lg:mb-8">
                {/* Mobile & Tablet Tab Navigation */}
                <div className="lg:hidden bg-gray-100 rounded-2xl p-1.5 md:p-2 flex items-center gap-1.5 md:gap-2">
                    <button
                        onClick={() => setActiveTab('leave')}
                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-xl font-medium transition-all ${
                            activeTab === 'leave'
                                ? 'bg-blue-600 text-white shadow-md flex-1 min-w-0'
                                : 'bg-white text-gray-600 hover:bg-gray-50 w-10 h-10 md:w-12 md:h-12 justify-center flex-shrink-0'
                        }`}
                    >
                        <span className="material-symbols-rounded text-lg md:text-xl flex-shrink-0">event_note</span>
                        {activeTab === 'leave' && (
                            <>
                                <span className="text-xs md:text-sm font-semibold whitespace-nowrap truncate">Leave</span>
                                {currentLeaves.length > 0 && (
                                    <span className="ml-auto bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0">
                                        {currentLeaves.length}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('remote')}
                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-xl font-medium transition-all ${
                            activeTab === 'remote'
                                ? 'bg-blue-600 text-white shadow-md flex-1 min-w-0'
                                : 'bg-white text-gray-600 hover:bg-gray-50 w-10 h-10 md:w-12 md:h-12 justify-center flex-shrink-0'
                        }`}
                    >
                        <span className="material-symbols-rounded text-lg md:text-xl flex-shrink-0">home_work</span>
                        {activeTab === 'remote' && (
                            <>
                                <span className="text-xs md:text-sm font-semibold whitespace-nowrap truncate">Remote</span>
                                {currentRemoteRequests.length > 0 && (
                                    <span className="ml-auto bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0">
                                        {currentRemoteRequests.length}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('regularization')}
                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-xl font-medium transition-all ${
                            activeTab === 'regularization'
                                ? 'bg-blue-600 text-white shadow-md flex-1 min-w-0'
                                : 'bg-white text-gray-600 hover:bg-gray-50 w-10 h-10 md:w-12 md:h-12 justify-center flex-shrink-0'
                        }`}
                    >
                        <span className="material-symbols-rounded text-lg md:text-xl flex-shrink-0">schedule</span>
                        {activeTab === 'regularization' && (
                            <>
                                <span className="text-xs md:text-sm font-semibold whitespace-nowrap truncate">Regularization</span>
                                {currentRegularizationRequests.length > 0 && (
                                    <span className="ml-auto bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0">
                                        {currentRegularizationRequests.length}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('punchout')}
                        className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-2 md:py-2.5 rounded-xl font-medium transition-all ${
                            activeTab === 'punchout'
                                ? 'bg-blue-600 text-white shadow-md flex-1 min-w-0'
                                : 'bg-white text-gray-600 hover:bg-gray-50 w-10 h-10 md:w-12 md:h-12 justify-center flex-shrink-0'
                        }`}
                    >
                        <span className="material-symbols-rounded text-lg md:text-xl flex-shrink-0">logout</span>
                        {activeTab === 'punchout' && (
                            <>
                                <span className="text-xs md:text-sm font-semibold whitespace-nowrap truncate">Punch Out</span>
                                {currentPunchOutRequests.length > 0 && (
                                    <span className="ml-auto bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold flex-shrink-0">
                                        {currentPunchOutRequests.length}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>

                {/* Desktop Tab Navigation */}
                <div className="hidden lg:flex gap-4 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('leave')}
                        className={`px-6 py-2 rounded-full font-medium transition whitespace-nowrap ${activeTab === 'leave'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Leave Applications
                        {currentLeaves.length > 0 && (
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {currentLeaves.length}
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
                        {currentRemoteRequests.length > 0 && (
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {currentRemoteRequests.length}
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
                        {currentRegularizationRequests.length > 0 && (
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {currentRegularizationRequests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('punchout')}
                        className={`px-6 py-2 rounded-full font-medium transition whitespace-nowrap ${activeTab === 'punchout'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        Punch Out Requests
                        {currentPunchOutRequests.length > 0 && (
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {currentPunchOutRequests.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600">Loading requests...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeTab === 'leave' ? (
                        currentLeaves.length > 0 ? (
                            currentLeaves.map(leave => {
                                const historyLeave = leave as HistoryLeaveApplication
                                return (
                                <div key={leave.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                                {(leave.employee_name || leave.employee || '?')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{leave.employee_name || leave.employee || '—'}</h3>
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

                                    {viewMode === 'pending' ? (
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
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                historyLeave.status === 'Approved' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {historyLeave.status}
                                            </span>
                                            {historyLeave.approved_by && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Approved by</p>
                                                    <p className="text-sm font-medium text-gray-700">{historyLeave.approved_by}</p>
                                                    {historyLeave.approved_at && (
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(historyLeave.approved_at), 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })
                        ) : <EmptyState message={viewMode === 'pending' ? "No pending leave applications" : "No leave application history"} />
                    ) : activeTab === 'remote' ? (
                        currentRemoteRequests.length > 0 ? (
                            currentRemoteRequests.map(req => {
                                const historyReq = req as HistoryRemoteRequest
                                return (
                                <div key={req.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                                {(req.employee_name || req.employee || '?')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.employee_name || req.employee || '—'}</h3>
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

                                    {viewMode === 'pending' ? (
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
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                historyReq.status === 'Approved' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {historyReq.status}
                                            </span>
                                            {historyReq.approved_by && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Approved by</p>
                                                    <p className="text-sm font-medium text-gray-700">{historyReq.approved_by}</p>
                                                    {historyReq.approved_at && (
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(historyReq.approved_at), 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })
                        ) : <EmptyState message={viewMode === 'pending' ? "No pending remote work requests" : "No remote work request history"} />
                    ) : activeTab === 'regularization' ? (
                        currentRegularizationRequests.length > 0 ? (
                            currentRegularizationRequests.map(req => {
                                const historyReq = req as HistoryRegularizationRequest
                                return (
                                <div key={req.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                                                {(req.employee_name || req.employee || '?')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.employee_name || req.employee || '—'}</h3>
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

                                    {viewMode === 'pending' ? (
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
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                historyReq.status === 'Approved' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {historyReq.status}
                                            </span>
                                            {historyReq.approved_by && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Approved by</p>
                                                    <p className="text-sm font-medium text-gray-700">{historyReq.approved_by}</p>
                                                    {historyReq.approved_at && (
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(historyReq.approved_at), 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })
                        ) : <EmptyState message={viewMode === 'pending' ? "No pending regularization requests" : "No regularization request history"} />
                    ) : (
                        currentPunchOutRequests.length > 0 ? (
                            currentPunchOutRequests.map(req => {
                                const historyReq = req as HistoryPunchOutRequest
                                return (
                                <div key={req.name} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">
                                                {(req.employee_name || req.employee || '?')[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{req.employee_name || req.employee || '—'}</h3>
                                                <p className="text-sm text-gray-500">{req.employee}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                                                Punch Out
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-1">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="material-symbols-rounded text-lg">calendar_month</span>
                                                <span className="font-medium">
                                                    {format(new Date(req.attendance_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="material-symbols-rounded text-lg">schedule</span>
                                                <span className="font-medium">
                                                    {format(new Date(req.check_out_time), 'hh:mm a')}
                                                </span>
                                            </div>
                                            {req.latitude && req.longitude && (
                                                <div className="flex items-center gap-2 text-gray-600">
                                                    <span className="material-symbols-rounded text-lg">location_on</span>
                                                    <span className="text-xs">
                                                        {req.latitude.toFixed(6)}, {req.longitude.toFixed(6)}
                                                    </span>
                                                </div>
                                            )}
                                            {req.reason && (
                                                <p className="text-gray-500 text-sm ml-7 mt-2">"{req.reason}"</p>
                                            )}
                                        </div>
                                    </div>

                                    {viewMode === 'pending' ? (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleAction('Punch Out Request', req.name, 'Rejected')}
                                                disabled={processingId === req.name}
                                                className="px-6 py-2 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 transition"
                                            >
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction('Punch Out Request', req.name, 'Approved')}
                                                disabled={processingId === req.name}
                                                className="px-6 py-2 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 transition"
                                            >
                                                {processingId === req.name ? 'Processing...' : 'Approve'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                historyReq.status === 'Approved' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {historyReq.status}
                                            </span>
                                            {historyReq.approved_by && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Approved by</p>
                                                    <p className="text-sm font-medium text-gray-700">{historyReq.approved_by}</p>
                                                    {historyReq.approved_at && (
                                                        <p className="text-xs text-gray-400">
                                                            {format(new Date(historyReq.approved_at), 'MMM dd, yyyy HH:mm')}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })
                        ) : <EmptyState message={viewMode === 'pending' ? "No pending punch out requests" : "No punch out request history"} />
                    )}
                </div>
            )}
        </div>
    )
}
