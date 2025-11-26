import { useState } from 'react'
import { useFrappeGetDocList } from 'frappe-react-sdk'
import { Link } from 'react-router-dom'
import CreateEmployeeModal from '../components/CreateEmployeeModal'

interface Employee {
    name: string
    employee_name: string
    designation: string
    status: string
    image: string | null
}

export default function EmployeeManagementPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const { data: employees, mutate } = useFrappeGetDocList<Employee>('Employee', {
        fields: ['name', 'employee_name', 'designation', 'status', 'image'],
        orderBy: { field: 'creation', order: 'desc' }
    })

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
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 w-full sm:w-auto text-sm sm:text-base"
                >
                    <span className="material-symbols-rounded text-lg sm:text-xl">add</span>
                    <span>Add Employee</span>
                </button>
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
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-base sm:text-lg flex-shrink-0">
                                    {employee.image ? (
                                        <img src={employee.image} alt={employee.employee_name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        employee.employee_name.charAt(0)
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
        </div>
    )
}
