import { useState, useEffect } from 'react'
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk'
import toast from 'react-hot-toast'

interface CreateEmployeeModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function CreateEmployeeModal({ isOpen, onClose, onSuccess }: CreateEmployeeModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        designation: '',
        gender: '',
        date_of_birth: '',
        date_of_joining: '',
        reports_to: '',
        company: '',
        office: ''
    })
    const [loading, setLoading] = useState(false)

    const { call: createEmployee } = useFrappePostCall('attendance_portal.api.create_employee')

    // Fetch lists for dropdowns
    const { data: designations } = useFrappeGetDocList('Designation', { fields: ['name'], limit: 100 })
    const { data: employees } = useFrappeGetDocList('Employee', { fields: ['name', 'employee_name'], limit: 100 })
    const { data: companies } = useFrappeGetDocList('Company', { fields: ['name'] })
    const { data: offices } = useFrappeGetDocList('Office Location', { fields: ['name', 'office_name'] })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await createEmployee(formData)
            toast.success('Employee created successfully!')
            onSuccess()
            onClose()
            // Reset form
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                password: '',
                designation: '',
                gender: '',
                date_of_birth: '',
                date_of_joining: '',
                reports_to: '',
                company: '',
                office: ''
            })
        } catch (error: any) {
            toast.error(error.message || 'Failed to create employee')
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
                    <h2 className="text-xl font-bold text-gray-800">Add New Employee</h2>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Set initial password"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={formData.date_of_birth}
                                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Company</option>
                                {companies?.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Office Location <span className="text-red-500">*</span></label>
                            <select
                                required
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date of Joining <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={formData.date_of_joining}
                                onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Reports To <span className="text-red-500">*</span></label>
                            <select
                                required
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
                            {loading ? 'Creating...' : 'Create Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
