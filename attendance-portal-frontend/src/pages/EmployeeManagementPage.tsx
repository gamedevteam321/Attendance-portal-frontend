import { useState } from 'react'
import { useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk'
import { Link } from 'react-router-dom'
import CreateEmployeeModal from '../components/CreateEmployeeModal'
import ReportOptionsModal from '../components/ReportOptionsModal'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { getImageUrl } from '../utils/imageUtils'

interface Employee {
    name: string
    employee_name: string
    designation: string
    status: string
    image: string | null
}

export default function EmployeeManagementPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDownloading, setIsDownloading] = useState(false)
    const { isHrAdmin } = useAuth()

    const { data: employees, mutate } = useFrappeGetDocList<Employee>('Employee', {
        fields: ['name', 'employee_name', 'designation', 'status', 'image'],
        orderBy: { field: 'creation', order: 'desc' }
    })

    const { call: getAttendanceReport } = useFrappePostCall('attendance_portal.api.get_attendance_report_for_csv')

    const downloadAttendanceReport = async (options: {
        from_date: string
        to_date: string
        employees?: string[]
    }) => {
        setIsDownloading(true)
        try {
            const res = await getAttendanceReport({
                from_date: options.from_date,
                to_date: options.to_date,
                employees: options.employees
            })

            const responseData = (res as any)?.message || res || {}
            
            // Handle both old format (array) and new format (object with summary and details)
            let summaryData: any[] = []
            let detailData: any[] = []
            
            if (Array.isArray(responseData)) {
                // Old format - no summary
                detailData = responseData
            } else {
                // New format - has summary and details
                summaryData = responseData.summary || []
                detailData = responseData.details || []
            }
            
            if (detailData.length === 0 && summaryData.length === 0) {
                toast.error('No attendance data found for the selected period')
                return
            }

            // Build CSV content
            const csvRows: string[] = []
            
            // Add Summary Table
            if (summaryData.length > 0) {
                csvRows.push('ATTENDANCE SUMMARY')
                csvRows.push('') // Empty row
                const summaryHeaders = ['Employee Name', 'Employee ID', 'Worked Days', 'Total Days', 'Working Hours', 'Total Working Hours (Expected)']
                csvRows.push(summaryHeaders.join(','))
                
                for (const row of summaryData) {
                    const values = [
                        `"${row.employee_name || ''}"`,
                        `"${row.employee_id || ''}"`,
                        row.worked_days || '0',
                        row.total_days || '0',
                        row.working_hours || '0',
                        row.total_working_hours || '0'
                    ]
                    csvRows.push(values.join(','))
                }
                
                csvRows.push('') // Empty row
                csvRows.push('') // Empty row
            }
            
            // Add Detail Table
            csvRows.push('ATTENDANCE DETAILS')
            csvRows.push('') // Empty row
            const detailHeaders = ['Employee Name', 'Employee ID', 'Date', 'First Check In', 'Last Check Out', 'Working Hours', 'Status']
            csvRows.push(detailHeaders.join(','))
            
            for (const row of detailData) {
                const values = [
                    `"${row.employee_name || ''}"`,
                    `"${row.employee_id || ''}"`,
                    `"${row.date || ''}"`,
                    `"${row.first_check_in || ''}"`,
                    `"${row.last_check_out || ''}"`,
                    row.working_hours || '0',
                    `"${row.status || ''}"`
                ]
                csvRows.push(values.join(','))
            }

            const csvContent = csvRows.join('\n')
            
            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            
            // Generate filename
            const employeeSuffix = options.employees && options.employees.length === 1 
                ? `_${options.employees[0]}` 
                : options.employees && options.employees.length > 1 
                    ? `_${options.employees.length}_employees`
                    : '_all_employees'
            
            link.setAttribute('href', url)
            link.setAttribute('download', `attendance_report_${options.from_date}_to_${options.to_date}${employeeSuffix}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            toast.success('Attendance report downloaded successfully!')
            setIsReportModalOpen(false)
        } catch (error: any) {
            console.error('Failed to download report:', error)
            toast.error(error.message || 'Failed to download attendance report')
        } finally {
            setIsDownloading(false)
        }
    }

    const filteredEmployees = employees?.filter(emp =>
        emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Employee Management</h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your workforce and view performance</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {isHrAdmin && (
                        <button
                            onClick={() => setIsReportModalOpen(true)}
                            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow-lg shadow-green-200 w-full sm:w-auto text-sm sm:text-base"
                        >
                            <span className="material-symbols-rounded text-lg sm:text-xl">download</span>
                            <span>Reports</span>
                        </button>
                    )}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 w-full sm:w-auto text-sm sm:text-base"
                    >
                        <span className="material-symbols-rounded text-lg sm:text-xl">add</span>
                        <span>Add Employee</span>
                    </button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg sm:text-xl">search</span>
                    <input
                        type="text"
                        placeholder="Search employees by name, department, or designation..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
            </div>

            {/* Employee Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredEmployees?.map(employee => (
                    <Link
                        to={`/employees/${employee.name}`}
                        key={employee.name}
                        className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group"
                    >
                        <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base sm:text-lg flex-shrink-0 overflow-hidden">
                                    {getImageUrl(employee.image) ? (
                                        <img src={getImageUrl(employee.image) || ''} alt={employee.employee_name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <span>{employee.employee_name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-800 group-hover:text-blue-600 transition truncate">{employee.employee_name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{employee.name}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ml-2 ${employee.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {employee.status}
                            </span>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                                <span className="material-symbols-rounded text-gray-400 text-base sm:text-lg">work</span>
                                <span className="truncate">{employee.designation || 'No Designation'}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <CreateEmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={mutate}
            />

            {isHrAdmin && (
                <ReportOptionsModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    onDownload={downloadAttendanceReport}
                    isDownloading={isDownloading}
                />
            )}
        </div>
    )
}
