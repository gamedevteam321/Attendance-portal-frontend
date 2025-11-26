import { useState, useEffect } from 'react'
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetDoc } from 'frappe-react-sdk'
import toast from 'react-hot-toast'

interface EditEmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    employeeId: string
}

export default function EditEmployeeModal({ isOpen, onClose, onSuccess, employeeId }: EditEmployeeModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        designation: '',
        reports_to: '',
        status: '',
        office: '',
        holiday_list: ''
    })
    const [loading, setLoading] = useState(false)

    const { data: employee, mutate: mutateEmployee } = useFrappeGetDoc('Employee', employeeId, {
        enabled: isOpen && !!employeeId
    })

    const { call: updateEmployee } = useFrappePostCall('attendance_portal.api.update_employee')

    // Fetch lists for dropdowns
    const { data: designations } = useFrappeGetDocList('Designation', { fields: ['name'], limit: 100 })
    const { data: employees } = useFrappeGetDocList('Employee', { fields: ['name', 'employee_name'], limit: 100 })
    const { data: offices } = useFrappeGetDocList('Office Location', { fields: ['name', 'office_name'] })
    const { data: holidayLists } = useFrappeGetDocList('Holiday List', { fields: ['name', 'holiday_list_name'] })

    useEffect(() => {
        if (employee) {
            setFormData({
                first_name: employee.first_name || '',
                last_name: employee.last_name || '',
                email: employee.user_id || '',
                password: '', // Don't pre-fill password
                designation: employee.designation || '',
                reports_to: employee.reports_to || '',
                status: employee.status || 'Active',
                office: employee.allowed_locations?.[0]?.office || '',
                holiday_list: employee.holiday_list || ''
            })
        }
    }, [employee])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateEmployee({
                employee_id: employeeId,
                ...formData
            })
            toast.success('Employee updated successfully!')
            onSuccess()
            mutateEmployee()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Failed to update employee')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-800">Edit Employee</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password (Optional)</label>
                            <input
                                type="password"
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Leave blank to keep current"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                            <select
                                value={formData.designation}
                                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Designation</option>
                                {designations?.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Office Location</label>
                            <select
                                value={formData.office}
                                onChange={e => setFormData({ ...formData, office: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Office</option>
                                {offices?.map(o => (
                                    <option key={o.name} value={o.name}>{o.office_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reports To</label>
                            <select
                                value={formData.reports_to}
                                onChange={e => setFormData({ ...formData, reports_to: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Manager</option>
                                {employees?.map(e => (
                                    <option key={e.name} value={e.name}>{e.employee_name} ({e.name})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                required
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                                <option value="Left">Left</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Holiday List</label>
                            <select
                                value={formData.holiday_list}
                                onChange={e => setFormData({ ...formData, holiday_list: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Holiday List (Optional)</option>
                                {holidayLists?.map(hl => (
                                    <option key={hl.name} value={hl.name}>{hl.holiday_list_name || hl.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Select a holiday list for this employee (e.g., 5 Day Week or 6 Day Week)</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200"
                        >
                            {loading ? 'Updating...' : 'Update Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
