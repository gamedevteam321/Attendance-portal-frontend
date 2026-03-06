import { useState, useEffect } from 'react'
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetDoc, useFrappeGetCall } from 'frappe-react-sdk'
import toast from 'react-hot-toast'
import AddDesignationModal from './AddDesignationModal'
import Dropdown from './Dropdown'

type Farm = { name: string; area_name: string; clusters: { name: string; area_name: string; fields: { name: string; area_name: string }[] }[] }

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
        company: '',
        offices: [] as string[],
        allowed_farm_fields: [] as string[],
        holiday_list: ''
    })
    const [loading, setLoading] = useState(false)
    const [addDesignationModalOpen, setAddDesignationModalOpen] = useState(false)
    const [selectedFarm, setSelectedFarm] = useState<string>('')
    const [selectedCluster, setSelectedCluster] = useState<string>('')

    const { data: employee, mutate: mutateEmployee } = useFrappeGetDoc('Employee', employeeId, {
        enabled: isOpen && !!employeeId
    })

    const { call: updateEmployee } = useFrappePostCall('attendance_portal.api.update_employee')
    const { data: hierarchyData } = useFrappeGetCall<{ farms: Farm[] } | { message: { farms: Farm[] } }>('attendance_portal.api.get_geo_fencing_hierarchy', undefined, { revalidateOnFocus: false })

    const hierarchy = (hierarchyData as any)?.message?.farms ?? (hierarchyData as any)?.farms ?? []
    const selectedFarmObj = hierarchy.find(f => f.name === selectedFarm)
    const clusters = selectedFarmObj?.clusters ?? []
    const selectedClusterObj = clusters.find(c => c.name === selectedCluster)
    const fieldsList = selectedClusterObj?.fields ?? []
    const selectedFieldsInCluster = formData.allowed_farm_fields.filter(id => fieldsList.some(f => f.name === id))

    // Fetch lists for dropdowns
    const { data: designations, mutate: mutateDesignations } = useFrappeGetDocList('Designation', { fields: ['name'], limit: 100 })
    const { data: employees } = useFrappeGetDocList('Employee', { fields: ['name', 'employee_name'], limit: 100 })
    const { data: companies } = useFrappeGetDocList('Company', { fields: ['name'] })
    const { data: offices } = useFrappeGetDocList('Office Location', { fields: ['name', 'office_name', 'company'] })
    const { data: holidayLists } = useFrappeGetDocList('Holiday List', { fields: ['name', 'holiday_list_name'] })

    useEffect(() => {
        if (employee) {
            const officeLocations = employee.allowed_locations?.map((loc: any) => loc.office).filter(Boolean) || []
            const farmFields = employee.allowed_geo_areas?.map((row: any) => row.geo_fencing_area).filter(Boolean) || []
            setFormData({
                first_name: employee.first_name || '',
                last_name: employee.last_name || '',
                email: employee.user_id || '',
                password: '',
                designation: employee.designation || '',
                reports_to: employee.reports_to || '',
                status: employee.status || 'Active',
                company: employee.company || '',
                offices: officeLocations,
                allowed_farm_fields: farmFields,
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
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                designation: formData.designation,
                reports_to: formData.reports_to,
                status: formData.status,
                company: formData.company,
                offices: formData.offices,
                allowed_farm_fields: formData.allowed_farm_fields,
                password: formData.password || undefined,
                holiday_list: formData.holiday_list || undefined
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

    const handleDesignationCreated = (name: string) => {
        mutateDesignations()
        setFormData(prev => ({ ...prev, designation: name }))
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
                                type={employee?.user_id === 'Administrator' ? 'text' : 'email'}
                                required
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {employee?.user_id === 'Administrator' && (
                                <p className="text-xs text-gray-500 mt-1"></p>
                            )}
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

                        <Dropdown
                            label="Designation"
                            options={(designations ?? []).map(d => ({ value: d.name, label: d.name }))}
                            value={formData.designation}
                            onChange={v => setFormData(prev => ({ ...prev, designation: v }))}
                            placeholder="Select Designation"
                            searchable
                            renderFooter={closeDropdown => (
                                <button
                                    type="button"
                                    onClick={() => {
                                        closeDropdown()
                                        setAddDesignationModalOpen(true)
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md flex items-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-lg">add</span>
                                    Add new designation
                                </button>
                            )}
                        />
                        <AddDesignationModal
                            isOpen={addDesignationModalOpen}
                            onClose={() => setAddDesignationModalOpen(false)}
                            onCreated={handleDesignationCreated}
                        />

                        <Dropdown
                            label="Company"
                            options={(companies ?? []).map(c => ({ value: c.name, label: c.name }))}
                            value={formData.company}
                            onChange={v => setFormData(prev => ({ ...prev, company: v }))}
                            placeholder="Select Company"
                        />

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Work Locations
                                <span className="text-xs text-gray-500 font-normal ml-2">(Select one or more)</span>
                            </label>
                            <div className="space-y-2 p-4 border border-gray-300 rounded-lg bg-gray-50 max-h-48 overflow-y-auto">
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
                                            <span className="text-sm font-medium text-gray-800">{o.office_name}</span>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Farm land</label>
                            {hierarchy.length === 0 ? (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                    No farm land data available. To assign geo-fenced fields to employees, ensure the F2C (Farm to Crop) app is installed and Geo Fencing Areas with types Farm, Cluster, and Field are created in the system.
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <Dropdown
                                            label="Farm"
                                            options={hierarchy.map(f => ({ value: f.name, label: f.area_name || f.name }))}
                                            value={selectedFarm}
                                            onChange={v => { setSelectedFarm(v); setSelectedCluster('') }}
                                            placeholder="Select farm first"
                                        />
                                        <Dropdown
                                            label="Cluster"
                                            options={clusters.map(c => ({ value: c.name, label: c.area_name || c.name }))}
                                            value={selectedCluster}
                                            onChange={v => setSelectedCluster(v)}
                                            placeholder={selectedFarm ? 'Select cluster' : 'Select farm first'}
                                        />
                                    </div>
                                    {fieldsList.length > 0 && (
                                        <div className="pt-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-gray-600">Fields</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            allowed_farm_fields: [...new Set([...prev.allowed_farm_fields, ...fieldsList.map(f => f.name)])]
                                                        }))}
                                                        className="text-xs font-medium text-blue-600 hover:underline"
                                                    >
                                                        Select all
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            allowed_farm_fields: prev.allowed_farm_fields.filter(id => !fieldsList.some(ff => ff.name === id))
                                                        }))}
                                                        className="text-xs font-medium text-gray-500 hover:underline"
                                                    >
                                                        Clear all
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                                                {fieldsList.map(f => (
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
                                                <p className="text-xs text-gray-500 mt-1">Total farm fields selected: {formData.allowed_farm_fields.length}</p>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-500">Select farm and cluster, then choose fields where this employee can mark attendance.</p>
                                </>
                            )}
                        </div>

                        <Dropdown
                            label="Reports To"
                            options={(employees ?? []).map(e => ({
                                    value: e.name,
                                    label: `${e.employee_name ?? e.name} (${e.name})`,
                                }))}
                            value={formData.reports_to}
                            onChange={v => setFormData(prev => ({ ...prev, reports_to: v }))}
                            placeholder="Select Manager"
                        />

                        <Dropdown
                            label="Status"
                            options={[
                                { value: 'Active', label: 'Active' },
                                { value: 'Inactive', label: 'Inactive' },
                                { value: 'Suspended', label: 'Suspended' },
                                { value: 'Left', label: 'Left' },
                            ]}
                            value={formData.status}
                            onChange={v => setFormData(prev => ({ ...prev, status: v }))}
                            placeholder="Select Status"
                            required
                        />

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
                        <p className="text-xs text-gray-500 mt-1 md:col-span-2">Select a holiday list for this employee (e.g., 5 Day Week or 6 Day Week)</p>
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
