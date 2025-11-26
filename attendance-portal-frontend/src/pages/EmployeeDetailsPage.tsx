import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import EditEmployeeModal from '../components/EditEmployeeModal'
import { useAuth } from '../contexts/AuthContext'

export default function EmployeeDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { isHrAdmin } = useAuth()
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [leaveBalances, setLeaveBalances] = useState<any[]>([])

    const { data: employee, mutate: mutateEmployee } = useFrappeGetDoc('Employee', id!)
    const { call: getStats } = useFrappePostCall('attendance_portal.api.get_employee_stats')
    const { call: getBalances } = useFrappePostCall('attendance_portal.api.get_leave_balances')

    const fetchStats = async () => {
        if (!id) return
        setLoading(true)

        const now = new Date()
        let fromDate, toDate

        switch (timeRange) {
            case 'week':
                fromDate = startOfWeek(now, { weekStartsOn: 1 })
                toDate = endOfWeek(now, { weekStartsOn: 1 })
                break
            case 'month':
                fromDate = startOfMonth(now)
                toDate = endOfMonth(now)
                break
            case 'quarter':
                fromDate = startOfQuarter(now)
                toDate = endOfQuarter(now)
                break
            case 'year':
                fromDate = startOfYear(now)
                toDate = endOfYear(now)
                break
        }

        try {
            const res = await getStats({
                employee: id,
                from_date: format(fromDate, 'yyyy-MM-dd'),
                to_date: format(toDate, 'yyyy-MM-dd')
            })
            setStats((res as any).message || res)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
        fetchLeaveData()
    }, [id, timeRange])

    const fetchLeaveData = async () => {
        if (!id) return
        try {
            console.log('Fetching leave data for employee:', id)
            const balRes = await getBalances({ employee: id })
            const balances = (balRes as any)?.message || balRes || []
            console.log('Leave balances:', balances)
            setLeaveBalances(balances)
        } catch (error) {
            console.error('Failed to fetch leave data:', error)
        }
    }

    if (!employee) return <div>Loading...</div>

    return (
        <div className="max-w-7xl mx-auto">
            <button onClick={() => navigate('/employees')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition">
                <span className="material-symbols-rounded">arrow_back</span>
                Back to Employees
            </button>

            {/* Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8 flex flex-col md:flex-row items-center gap-8 relative">
                {isHrAdmin && (
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="absolute top-8 right-8 flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition font-medium"
                    >
                        <span className="material-symbols-rounded">edit</span>
                        Edit Profile
                    </button>
                )}

                <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl">
                    {employee.image ? (
                        <img src={employee.image} alt={employee.employee_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        employee.employee_name.charAt(0)
                    )}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold text-gray-800">{employee.employee_name}</h1>
                    <p className="text-gray-500">{employee.designation} • {employee.department}</p>
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="material-symbols-rounded text-gray-400">mail</span>
                            {employee.user_id || 'No Email'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="material-symbols-rounded text-gray-400">calendar_month</span>
                            Joined: {employee.date_of_joining ? format(new Date(employee.date_of_joining), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="material-symbols-rounded text-gray-400">location_on</span>
                            {employee.allowed_locations?.[0]?.office || 'No Office Assigned'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leave Balance Cards */}
            {leaveBalances.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Leave Balances</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {leaveBalances.map((balance: any) => {
                            const isNegative = balance.remaining < 0

                            let borderColor = 'border-blue-500'
                            if (balance.leave_type === 'Casual Leave') borderColor = 'border-green-500'
                            if (balance.leave_type === 'Sick Leave') borderColor = 'border-orange-500'
                            if (balance.leave_type === 'Compensatory Leave') borderColor = 'border-purple-500'

                            return (
                                <div key={balance.leave_type} className={`bg-white rounded-xl shadow-sm p-5 border-l-4 ${borderColor}`}>
                                    <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-2">{balance.leave_type}</h3>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className={`text-3xl font-bold ${isNegative ? 'text-red-600' : 'text-gray-800'}`}>
                                                {balance.remaining}
                                            </span>
                                            <span className="text-gray-400 text-sm ml-1">left</span>
                                        </div>
                                        <div className="text-right text-xs text-gray-500">
                                            <div>{balance.used} used</div>
                                            <div>{balance.allocated} total</div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg">
                        <p className="text-xs text-blue-800">
                            <strong>Note:</strong> Leaves are automatically allocated monthly (1 Casual + 1 Sick per month)
                        </p>
                    </div>
                </div>
            )}

            {/* Analytics Controls */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Attendance Analytics</h2>
                <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 flex">
                    {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${timeRange === range ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-800'
                                }`}
                        >
                            {range.charAt(0).toUpperCase() + range.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <StatCard title="Present Days" value={stats?.total_present || 0} icon="check_circle" color="bg-green-500" />
                <StatCard title="Absent Days" value={stats?.total_absent || 0} icon="cancel" color="bg-red-500" />
                <StatCard title="Late Entries" value={stats?.total_late || 0} icon="schedule" color="bg-yellow-500" />
                <StatCard title="Total Hours" value={`${stats?.total_hours || 0} hrs`} icon="timer" color="bg-blue-500" />
                <StatCard title="Avg Hours/Day" value={`${stats?.avg_hours || 0} hrs`} icon="avg_time" color="bg-purple-500" />
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Attendance Logs</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Check In</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Check Out</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Hours</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats?.logs?.map((log: any) => (
                                <tr key={log.attendance_date} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                                        {format(new Date(log.attendance_date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.check_in ? format(new Date(log.check_in), 'hh:mm a') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {log.working_hours ? log.working_hours.toFixed(2) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'Present' ? 'bg-green-100 text-green-700' :
                                            log.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(!stats?.logs || stats.logs.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No attendance records found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {id && (
                <EditEmployeeModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    employeeId={id}
                    onSuccess={() => {
                        mutateEmployee()
                        fetchStats()
                        fetchLeaveData()
                    }}
                />
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <span className="material-symbols-rounded text-2xl text-white">{icon}</span>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="text-xl font-bold text-gray-800">{value}</p>
            </div>
        </div>
    )
}
