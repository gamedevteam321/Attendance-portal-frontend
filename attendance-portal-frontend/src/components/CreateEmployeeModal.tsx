import { useState } from 'react'
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
        offices: [] as string[],
        holiday_list: '',
        roles: ['Employee'] // Default role - Employee is always required
    })
    const [loading, setLoading] = useState(false)

    const { call: createEmployee } = useFrappePostCall('attendance_portal.api.create_employee')

    // Fetch lists for dropdowns
    const { data: designations } = useFrappeGetDocList('Designation', { fields: ['name'], limit: 100 })
    const { data: employees } = useFrappeGetDocList('Employee', { fields: ['name', 'employee_name'], limit: 100 })
    const { data: companies } = useFrappeGetDocList('Company', { fields: ['name'] })
    const { data: offices } = useFrappeGetDocList('Office Location', { fields: ['name', 'office_name'] })
    const { data: holidayLists } = useFrappeGetDocList('Holiday List', { fields: ['name', 'holiday_list_name'] })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validate at least one office is selected
            if (formData.offices.length === 0) {
                toast.error('Please select at least one office location')
                return
            }
            
            await createEmployee({
                ...formData,
                offices: formData.offices
            })
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
                offices: [],
                holiday_list: '',
                roles: ['Employee']
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800">Add New Employee</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
                        <span className="material-symbols-rounded text-xl sm:text-2xl">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Set initial password"
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Gender <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={formData.date_of_birth}
                                onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Company</option>
                                {companies?.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                Office Locations <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-500 font-normal ml-2">(Select one or more)</span>
                            </label>
                            <div className="space-y-2 p-3 sm:p-4 border border-gray-300 rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
                                {offices?.map(o => (
                                    <label key={o.name} className="flex items-start gap-3 cursor-pointer group hover:bg-white/50 p-2 rounded transition">
                                        <input
                                            type="checkbox"
                                            checked={formData.offices.includes(o.name)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, offices: [...formData.offices, o.name] })
                                                } else {
                                                    setFormData({ ...formData, offices: formData.offices.filter(office => office !== o.name) })
                                                }
                                            }}
                                            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm sm:text-base font-medium text-gray-800">{o.office_name}</span>
                                            {o.company && (
                                                <p className="text-xs text-gray-500 mt-0.5">Company: {o.company}</p>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            {formData.offices.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Please select at least one office location</p>
                            )}
                            {formData.offices.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Selected: {formData.offices.map(officeId => {
                                        const office = offices?.find(o => o.name === officeId)
                                        return office?.office_name || officeId
                                    }).join(', ')}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Designation</label>
                            <select
                                value={formData.designation}
                                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Designation</option>
                                {designations?.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date of Joining <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                required
                                value={formData.date_of_joining}
                                onChange={e => setFormData({ ...formData, date_of_joining: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Reports To <span className="text-red-500">*</span></label>
                            <select
                                required
                                value={formData.reports_to}
                                onChange={e => setFormData({ ...formData, reports_to: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Manager</option>
                                {employees?.map(e => (
                                    <option key={e.name} value={e.name}>{e.employee_name} ({e.name})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Holiday List</label>
                            <select
                                value={formData.holiday_list}
                                onChange={e => setFormData({ ...formData, holiday_list: e.target.value })}
                                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Holiday List (Optional)</option>
                                {holidayLists?.map(hl => (
                                    <option key={hl.name} value={hl.name}>{hl.holiday_list_name || hl.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Select a holiday list for this employee (e.g., 5 Day Week or 6 Day Week)</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                User Roles <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-500 font-normal ml-2">(Employee is required)</span>
                            </label>
                            <div className="space-y-2 p-3 sm:p-4 border border-gray-300 rounded-lg bg-gray-50">
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={formData.roles.includes('Employee')}
                                        disabled
                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-not-allowed"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm sm:text-base font-medium text-gray-800">Employee</span>
                                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Required</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">Standard employee with basic access</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-3 cursor-pointer group hover:bg-white/50 p-2 rounded transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.roles.includes('Manager')}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData({ ...formData, roles: [...formData.roles, 'Manager'] })
                                            } else {
                                                setFormData({ ...formData, roles: formData.roles.filter(r => r !== 'Manager') })
                                            }
                                        }}
                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm sm:text-base font-medium text-gray-800">Manager</span>
                                        <p className="text-xs text-gray-500 mt-0.5">Can approve leave and remote work requests</p>
                                    </div>
                                </label>
                                
                                <label className="flex items-start gap-3 cursor-pointer group hover:bg-white/50 p-2 rounded transition">
                                    <input
                                        type="checkbox"
                                        checked={formData.roles.includes('HR Admin')}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setFormData({ ...formData, roles: [...formData.roles, 'HR Admin'] })
                                            } else {
                                                setFormData({ ...formData, roles: formData.roles.filter(r => r !== 'HR Admin') })
                                            }
                                        }}
                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex-1">
                                        <span className="text-sm sm:text-base font-medium text-gray-800">HR Admin</span>
                                        <p className="text-xs text-gray-500 mt-0.5">Full administrative access to all features</p>
                                    </div>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Selected roles: {formData.roles.join(', ')}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base text-gray-600 hover:bg-gray-50 rounded-lg font-medium transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition shadow-lg shadow-blue-200"
                        >
                            {loading ? 'Creating...' : 'Create Employee'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
