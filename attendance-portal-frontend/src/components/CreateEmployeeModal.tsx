import { useState } from 'react'
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetCall } from 'frappe-react-sdk'
import toast from 'react-hot-toast'
import Dropdown from './Dropdown'

type Farm = { name: string; area_name: string; clusters: { name: string; area_name: string; fields: { name: string; area_name: string }[] }[] }
type Cluster = Farm['clusters'][number]
type FieldItem = { name: string; area_name: string }

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
        allowed_farm_fields: [] as string[],
        holiday_list: '',
        roles: ['Employee'] // Default role - Employee is always required
    })
    const [loading, setLoading] = useState(false)
    const [selectedFarm, setSelectedFarm] = useState<string>('')
    const [selectedCluster, setSelectedCluster] = useState<string>('')

    const { call: createEmployee } = useFrappePostCall('attendance_portal.api.create_employee')
    const { data: hierarchyData } = useFrappeGetCall<{ farms: Farm[] } | { message: { farms: Farm[] } }>('attendance_portal.api.get_geo_fencing_hierarchy', undefined, { revalidateOnFocus: false })

    const hierarchy: Farm[] = (hierarchyData as any)?.message?.farms ?? (hierarchyData as any)?.farms ?? []
    const selectedFarmObj = hierarchy.find((f: Farm) => f.name === selectedFarm)
    const clusters = selectedFarmObj?.clusters ?? []
    const selectedClusterObj = clusters.find((c: Cluster) => c.name === selectedCluster)
    const fieldsList: FieldItem[] = selectedClusterObj?.fields ?? []
    const selectedFieldsInCluster = formData.allowed_farm_fields.filter(id => fieldsList.some((f: FieldItem) => f.name === id))

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
            if (formData.offices.length === 0 && formData.allowed_farm_fields.length === 0) {
                toast.error('Please select at least one work location (corporate office or farm field)')
                return
            }
            await createEmployee({
                ...formData,
                offices: formData.offices,
                allowed_farm_fields: formData.allowed_farm_fields
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
                allowed_farm_fields: [],
                holiday_list: '',
                roles: ['Employee']
            })
            setSelectedFarm('')
            setSelectedCluster('')
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

                        <Dropdown
                            label="Gender"
                            options={[
                                { value: 'Male', label: 'Male' },
                                { value: 'Female', label: 'Female' },
                                { value: 'Other', label: 'Other' },
                            ]}
                            value={formData.gender}
                            onChange={v => setFormData(prev => ({ ...prev, gender: v }))}
                            placeholder="Select Gender"
                            required
                        />
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

                        <Dropdown
                            label="Company"
                            options={(companies ?? []).map(c => ({ value: c.name, label: c.name }))}
                            value={formData.company}
                            onChange={v => setFormData(prev => ({ ...prev, company: v }))}
                            placeholder="Select Company"
                            required
                        />
                        <div className="md:col-span-2">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                Corporate offices
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
                            {formData.offices.length > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Selected: {formData.offices.map(officeId => {
                                        const office = offices?.find(o => o.name === officeId)
                                        return office?.office_name || officeId
                                    }).join(', ')}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Farm land</label>
                            {hierarchy.length === 0 ? (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                    No farm land data available. To assign geo-fenced fields to employees, ensure the F2C (Farm to Crop) app is installed and Geo Fencing Areas with types Farm, Cluster, and Field are created in the system.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Dropdown
                                            label="Farm"
                                            options={hierarchy.map((f: Farm) => ({ value: f.name, label: f.area_name || f.name }))}
                                            value={selectedFarm}
                                            onChange={v => { setSelectedFarm(v); setSelectedCluster('') }}
                                            placeholder="Select farm first"
                                        />
                                        <Dropdown
                                            label="Cluster"
                                            options={clusters.map((c: Cluster) => ({ value: c.name, label: c.area_name || c.name }))}
                                            value={selectedCluster}
                                            onChange={v => setSelectedCluster(v)}
                                            placeholder={selectedFarm ? 'Select cluster' : 'Select farm first'}
                                        />
                                    </div>
                                    {fieldsList.length > 0 && (
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs sm:text-sm text-gray-600">Fields</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            allowed_farm_fields: [...new Set([...prev.allowed_farm_fields, ...fieldsList.map((f: FieldItem) => f.name)])]
                                                        }))}
                                                        className="text-xs font-medium text-blue-600 hover:underline"
                                                    >
                                                        Select all
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            allowed_farm_fields: prev.allowed_farm_fields.filter(id => !fieldsList.some((ff: FieldItem) => ff.name === id))
                                                        }))}
                                                        className="text-xs font-medium text-gray-500 hover:underline"
                                                    >
                                                        Clear all
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                                                {fieldsList.map((f: FieldItem) => (
                                                    <label key={f.name} className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedFieldsInCluster.includes(f.name)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData(prev => ({ ...prev, allowed_farm_fields: [...prev.allowed_farm_fields, f.name] }))
                                                                } else {
                                                                    setFormData(prev => ({ ...prev, allowed_farm_fields: prev.allowed_farm_fields.filter(id => id !== f.name) }))
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                        <span className="text-sm text-gray-800">{f.area_name || f.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {formData.allowed_farm_fields.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Total farm fields selected: {formData.allowed_farm_fields.length}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500">Select farm and cluster, then choose fields where this employee can mark attendance.</p>
                                </>
                            )}
                        </div>

                        <Dropdown
                            label="Designation"
                            options={(designations ?? []).map(d => ({ value: d.name, label: d.name }))}
                            value={formData.designation}
                            onChange={v => setFormData(prev => ({ ...prev, designation: v }))}
                            placeholder="Select Designation"
                            searchable
                        />

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
                        <Dropdown
                            label="Reports To"
                            options={(employees ?? []).map(e => ({
                                value: e.name,
                                label: `${(e as { employee_name?: string }).employee_name ?? e.name} (${e.name})`,
                            }))}
                            value={formData.reports_to}
                            onChange={v => setFormData(prev => ({ ...prev, reports_to: v }))}
                            placeholder="Select Manager"
                            required
                        />

                        <div>
                            <Dropdown
                                label="Holiday List"
                                options={(holidayLists ?? []).map(hl => ({
                                    value: hl.name,
                                    label: (hl as { holiday_list_name?: string }).holiday_list_name || hl.name,
                                }))}
                                value={formData.holiday_list}
                                onChange={v => setFormData(prev => ({ ...prev, holiday_list: v }))}
                                placeholder="Select Holiday List (Optional)"
                            />
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
