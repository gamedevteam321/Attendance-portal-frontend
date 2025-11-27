import { useState, useEffect } from 'react'
import { useFrappeGetDocList } from 'frappe-react-sdk'

interface ReportOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    onDownload: (options: {
        from_date: string
        to_date: string
        employees?: string[]
    }) => void
    isDownloading: boolean
}

export default function ReportOptionsModal({ isOpen, onClose, onDownload, isDownloading }: ReportOptionsModalProps) {
    const [dateType, setDateType] = useState<'month' | 'custom'>('month')
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [employeeSelection, setEmployeeSelection] = useState<'all' | 'multiple' | 'single'>('all')
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
    const [selectedSingleEmployee, setSelectedSingleEmployee] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    const { data: employees } = useFrappeGetDocList('Employee', {
        fields: ['name', 'employee_name', 'status'],
        limit: 1000
    })

    // Filter active employees client-side
    const activeEmployees = employees?.filter(emp => emp.status === 'Active') || []

    useEffect(() => {
        if (isOpen) {
            // Set default dates
            const now = new Date()
            const today = now.toISOString().split('T')[0]
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            setToDate(today)
            setFromDate(thirtyDaysAgo)
        }
    }, [isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        let finalFromDate = ''
        let finalToDate = ''

        if (dateType === 'month') {
            // Calculate first and last day of selected month
            const [year, month] = selectedMonth.split('-').map(Number)
            const firstDay = new Date(year, month - 1, 1)
            const lastDay = new Date(year, month, 0)
            finalFromDate = firstDay.toISOString().split('T')[0]
            finalToDate = lastDay.toISOString().split('T')[0]
        } else {
            finalFromDate = fromDate
            finalToDate = toDate
        }

        if (!finalFromDate || !finalToDate) {
            alert('Please select valid dates')
            return
        }

        let employeeList: string[] | undefined = undefined

        if (employeeSelection === 'all') {
            employeeList = undefined // All employees
        } else if (employeeSelection === 'single') {
            if (!selectedSingleEmployee) {
                alert('Please select an employee')
                return
            }
            employeeList = [selectedSingleEmployee]
        } else if (employeeSelection === 'multiple') {
            if (selectedEmployees.length === 0) {
                alert('Please select at least one employee')
                return
            }
            employeeList = selectedEmployees
        }

        onDownload({
            from_date: finalFromDate,
            to_date: finalToDate,
            employees: employeeList
        })
    }

    const toggleEmployee = (employeeId: string) => {
        setSelectedEmployees(prev =>
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        )
    }

    const filteredEmployees = activeEmployees.filter(emp =>
        emp.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Generate Attendance Report</h2>
                    <button
                        onClick={onClose}
                        disabled={isDownloading}
                        className="text-gray-400 hover:text-gray-600 transition p-1 disabled:opacity-50"
                    >
                        <span className="material-symbols-rounded text-xl sm:text-2xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Date Range</label>
                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dateType"
                                    value="month"
                                    checked={dateType === 'month'}
                                    onChange={(e) => setDateType(e.target.value as 'month' | 'custom')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Select Month</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="dateType"
                                    value="custom"
                                    checked={dateType === 'custom'}
                                    onChange={(e) => setDateType(e.target.value as 'month' | 'custom')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Custom Range</span>
                            </label>
                        </div>

                        {dateType === 'month' ? (
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Employee Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Employee Selection</label>
                        <div className="space-y-2 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="employeeSelection"
                                    value="all"
                                    checked={employeeSelection === 'all'}
                                    onChange={(e) => setEmployeeSelection(e.target.value as 'all' | 'multiple' | 'single')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">All Employees</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="employeeSelection"
                                    value="single"
                                    checked={employeeSelection === 'single'}
                                    onChange={(e) => setEmployeeSelection(e.target.value as 'all' | 'multiple' | 'single')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Single Employee</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="employeeSelection"
                                    value="multiple"
                                    checked={employeeSelection === 'multiple'}
                                    onChange={(e) => setEmployeeSelection(e.target.value as 'all' | 'multiple' | 'single')}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm text-gray-700">Multiple Employees</span>
                            </label>
                        </div>

                        {employeeSelection === 'single' && (
                            <select
                                value={selectedSingleEmployee}
                                onChange={(e) => setSelectedSingleEmployee(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            >
                                <option value="">Select Employee</option>
                                {activeEmployees.map(emp => (
                                    <option key={emp.name} value={emp.name}>
                                        {emp.employee_name} ({emp.name})
                                    </option>
                                ))}
                            </select>
                        )}

                        {employeeSelection === 'multiple' && (
                            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-3 py-2 mb-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                                <div className="space-y-2">
                                    {filteredEmployees.map(emp => (
                                        <label
                                            key={emp.name}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedEmployees.includes(emp.name)}
                                                onChange={() => toggleEmployee(emp.name)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {emp.employee_name} ({emp.name})
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {selectedEmployees.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-3">
                                        {selectedEmployees.length} employee(s) selected
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDownloading}
                            className="w-full sm:w-auto px-6 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isDownloading}
                            className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-green-200"
                        >
                            {isDownloading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-rounded animate-spin">hourglass_empty</span>
                                    Downloading...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="material-symbols-rounded">download</span>
                                    Download Report
                                </span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

