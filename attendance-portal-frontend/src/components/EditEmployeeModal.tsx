import { useState, useEffect, useMemo } from 'react'
import { useFrappePostCall, useFrappeGetDocList, useFrappeGetDoc, useFrappeGetCall } from 'frappe-react-sdk'
import toast from 'react-hot-toast'
import AddDesignationModal from './AddDesignationModal'
import Dropdown from './Dropdown'
import { DESK_ROLE_OPTIONS, OPERATIONAL_ROLE_OPTIONS } from '../constants/employeePortalRoles'
import {
    type Farm,
    type Cluster,
    type FieldItem,
    countGeoByLevelInTree,
    farmDropdownOptions,
    farmsWithClustersFlat,
    findFarmInTree,
    flattenFarmsDepthFirst,
    toggleGeoId,
} from '../utils/geoFencingHierarchy'
import { getFrappeErrorMessage } from '../utils/frappeErrorMessage'

type GeoTab = 'farm' | 'cluster' | 'field'

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
    const [submitError, setSubmitError] = useState('')
    const [addDesignationModalOpen, setAddDesignationModalOpen] = useState(false)
    const [selectedFarm, setSelectedFarm] = useState<string>('')
    const [selectedCluster, setSelectedCluster] = useState<string>('')
    const [geoTab, setGeoTab] = useState<GeoTab>('farm')
    const [operationalRoles, setOperationalRoles] = useState<string[]>([])
    const [deskRoles, setDeskRoles] = useState<string[]>(['Employee'])

    const employeeDocSwrKey = isOpen && employeeId ? `Employee:${employeeId}` : null
    const { data: employee, mutate: mutateEmployee } = useFrappeGetDoc('Employee', employeeId, employeeDocSwrKey, {
        revalidateOnFocus: false,
    })

    const userId = employee?.user_id ?? ''
    const canEditUserRoles = !!userId && userId !== 'Administrator'

    const userRolesSwrKey =
        isOpen && !!employeeId && !!userId && canEditUserRoles
            ? `attendance_portal.api.get_user_roles_for_employee_edit?user_id=${encodeURIComponent(userId)}`
            : null

    const {
        data: userRolesPayload,
        isLoading: userRolesLoading,
        error: userRolesError,
        mutate: mutateUserRoles,
    } = useFrappeGetCall<{ roles: string[] } | { message: { roles: string[] } }>(
        'attendance_portal.api.get_user_roles_for_employee_edit',
        { user_id: userId },
        userRolesSwrKey,
        { revalidateOnFocus: false, revalidateOnMount: true }
    )

    const fetchedRoleNames = useMemo(() => {
        const p = userRolesPayload as Record<string, unknown> | undefined
        const raw =
            (p?.data as { message?: { roles?: unknown[] } } | undefined)?.message?.roles
            ?? (p?.message as { roles?: unknown[] } | undefined)?.roles
            ?? (p as { roles?: unknown[] } | undefined)?.roles
        if (!Array.isArray(raw)) return []
        return raw.map(x => String(x).trim()).filter(Boolean)
    }, [userRolesPayload])

    const { call: updateEmployee } = useFrappePostCall('attendance_portal.api.update_employee')
    const geoHierarchySwrKey = isOpen ? 'attendance_portal.api.get_geo_fencing_hierarchy' : null

    const {
        data: hierarchyData,
        isLoading: hierarchyLoading,
        error: hierarchyError,
        mutate: mutateHierarchy,
    } = useFrappeGetCall<{ farms: Farm[] } | { message: { farms: Farm[] } }>(
        'attendance_portal.api.get_geo_fencing_hierarchy',
        undefined,
        geoHierarchySwrKey,
        { revalidateOnFocus: false, revalidateOnMount: true }
    )

    const hierarchy: Farm[] = (hierarchyData as any)?.message?.farms ?? (hierarchyData as any)?.farms ?? []
    const hierarchyReady = !hierarchyLoading && !hierarchyError
    const farmsFlat = useMemo(() => flattenFarmsDepthFirst(hierarchy), [hierarchy])
    const selectedFarmObj = selectedFarm ? findFarmInTree(hierarchy, selectedFarm) : undefined
    const clusters = selectedFarmObj?.clusters ?? []
    const selectedClusterObj = clusters.find((c: Cluster) => c.name === selectedCluster)
    const fieldsList: FieldItem[] = selectedClusterObj?.fields ?? []
    const selectedFieldsInCluster = formData.allowed_farm_fields.filter(id => fieldsList.some((f: FieldItem) => f.name === id))

    const geoCounts = useMemo(
        () => countGeoByLevelInTree(formData.allowed_farm_fields, hierarchy),
        [formData.allowed_farm_fields, hierarchy]
    )

    const userRolesSyncKey = useMemo(() => [...fetchedRoleNames].sort().join('|'), [fetchedRoleNames])

    // Fetch lists for dropdowns
    const { data: designations, mutate: mutateDesignations } = useFrappeGetDocList('Designation', { fields: ['name'], limit: 100 })
    const { data: employees } = useFrappeGetDocList('Employee', { fields: ['name', 'employee_name'], limit: 100 })
    const { data: companies } = useFrappeGetDocList('Company', { fields: ['name'] })
    const { data: offices } = useFrappeGetDocList('Office Location', { fields: ['name', 'office_name', 'company'] })
    const { data: holidayLists } = useFrappeGetDocList('Holiday List', { fields: ['name', 'holiday_list_name'] })

    useEffect(() => {
        if (isOpen) setSubmitError('')
    }, [isOpen])

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

    useEffect(() => {
        if (!isOpen) return
        if (!canEditUserRoles) {
            setOperationalRoles([])
            setDeskRoles(['Employee'])
            return
        }
        if (userRolesLoading || userRolesError) return
        const lowerFromServer = new Set(fetchedRoleNames.map(r => r.toLowerCase()))
        const desk = DESK_ROLE_OPTIONS.filter(opt => lowerFromServer.has(opt.toLowerCase()))
        if (!desk.includes('Employee')) desk.unshift('Employee')
        setDeskRoles([...new Set(desk)])
        setOperationalRoles(
            OPERATIONAL_ROLE_OPTIONS.filter(opt => lowerFromServer.has(opt.toLowerCase()))
        )
    }, [isOpen, canEditUserRoles, userRolesLoading, userRolesError, userRolesSyncKey, fetchedRoleNames])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitError('')
        setLoading(true)

        try {
            const payload: Record<string, unknown> = {
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
            }
            if (canEditUserRoles) {
                const desk = deskRoles.includes('Employee') ? deskRoles : ['Employee', ...deskRoles]
                payload.roles = [...new Set([...desk, ...operationalRoles])]
            }
            await updateEmployee(payload as any)
            setSubmitError('')
            toast.success('Employee updated successfully!')
            onSuccess()
            mutateEmployee()
            if (canEditUserRoles) mutateUserRoles()
            onClose()
        } catch (error: unknown) {
            const msg = getFrappeErrorMessage(error, 'Failed to update employee')
            setSubmitError(msg)
            toast.error(msg)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleDesignationCreated = (name: string) => {
        mutateDesignations()
        setFormData(prev => ({ ...prev, designation: name }))
    }

    const submitBlockedByUser = canEditUserRoles && (userRolesLoading || !!userRolesError)

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

                        <div className="md:col-span-2 space-y-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">User roles</label>
                            {!userId && (
                                <p className="text-sm text-gray-500">No user is linked to this employee — roles cannot be edited here.</p>
                            )}
                            {userId === 'Administrator' && (
                                <p className="text-sm text-gray-500">System Administrator user — roles are not edited from this form.</p>
                            )}
                            {canEditUserRoles && userRolesLoading && (
                                <p className="text-sm text-gray-500">Loading user roles…</p>
                            )}
                            {canEditUserRoles && userRolesError && (
                                <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 text-sm text-amber-900 space-y-2">
                                    <p>Could not load roles for this user.</p>
                                    <button
                                        type="button"
                                        onClick={() => mutateUserRoles()}
                                        className="text-sm font-medium text-amber-800 underline hover:no-underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {canEditUserRoles && !userRolesLoading && !userRolesError && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Desk roles</p>
                                        <div className="space-y-2 p-4 border border-gray-300 rounded-lg bg-gray-50">
                                            {DESK_ROLE_OPTIONS.map(role => (
                                                <label key={role} className="flex items-start gap-3 cursor-pointer group hover:bg-white/50 p-2 rounded transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={deskRoles.includes(role)}
                                                        disabled={role === 'Employee'}
                                                        onChange={(e) => {
                                                            if (role === 'Employee') return
                                                            if (e.target.checked) {
                                                                setDeskRoles(prev => [...new Set([...prev, role])])
                                                            } else {
                                                                setDeskRoles(prev => prev.filter(r => r !== role))
                                                            }
                                                        }}
                                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">
                                                        {role}
                                                        {role === 'Employee' && (
                                                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full ml-2">Required</span>
                                                        )}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-600 mb-2">Operational roles</p>
                                        <div className="space-y-2 p-4 border border-gray-300 rounded-lg bg-gray-50 max-h-56 overflow-y-auto">
                                            {OPERATIONAL_ROLE_OPTIONS.map(role => (
                                                <label key={role} className="flex items-start gap-3 cursor-pointer group hover:bg-white/50 p-2 rounded transition">
                                                    <input
                                                        type="checkbox"
                                                        checked={operationalRoles.includes(role)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setOperationalRoles(prev => [...new Set([...prev, role])])
                                                            } else {
                                                                setOperationalRoles(prev => prev.filter(r => r !== role))
                                                            }
                                                        }}
                                                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">{role}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {canEditUserRoles && !userRolesLoading && !userRolesError && (
                                <p className="text-xs text-gray-500">
                                    Roles are loaded from the server (same as Desk). Other roles (e.g. Report Manager) are unchanged on save.
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2 space-y-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Farm land (geo areas)</label>
                            {hierarchyError && (
                                <div className="p-4 border border-red-200 rounded-lg bg-red-50 text-sm text-red-800 space-y-2">
                                    <p>Could not load geo areas. Check your connection or try again.</p>
                                    <button
                                        type="button"
                                        onClick={() => mutateHierarchy()}
                                        className="text-sm font-medium text-red-700 underline hover:no-underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {!hierarchyError && hierarchyLoading && (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                    Loading farm areas…
                                </div>
                            )}
                            {hierarchyReady && hierarchy.length === 0 && (
                                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600">
                                    No farm land data available. To assign geo-fenced fields to employees, ensure the F2C (Farm to Crop) app is installed and Geo Fencing Areas with types Farm, Cluster, and Field are created in the system.
                                </div>
                            )}
                            {hierarchyReady && hierarchy.length > 0 && (
                                <>
                                    <div className="flex flex-wrap gap-1 border-b border-gray-200">
                                        {([
                                            { id: 'farm' as const, label: 'Farm' },
                                            { id: 'cluster' as const, label: 'Cluster' },
                                            { id: 'field' as const, label: 'Field' },
                                        ]).map(({ id, label }) => (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setGeoTab(id)}
                                                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${geoTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {geoTab === 'farm' && (
                                        <div className="space-y-1 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-52 overflow-y-auto">
                                            {farmsFlat.map((f: Farm) => (
                                                <label key={f.name} className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.allowed_farm_fields.includes(f.name)}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            allowed_farm_fields: toggleGeoId(prev.allowed_farm_fields, f.name, e.target.checked)
                                                        }))}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-gray-800">{f.area_name || f.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {geoTab === 'cluster' && (
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                            {farmsWithClustersFlat(hierarchy).map(({ farm: f, clusters: farmClusters }) => (
                                                <div key={f.name} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{f.area_name || f.name}</p>
                                                    <div className="space-y-1">
                                                        {farmClusters.map((c: Cluster) => (
                                                            <label key={c.name} className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={formData.allowed_farm_fields.includes(c.name)}
                                                                    onChange={(e) => setFormData(prev => ({
                                                                        ...prev,
                                                                        allowed_farm_fields: toggleGeoId(prev.allowed_farm_fields, c.name, e.target.checked)
                                                                    }))}
                                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                                />
                                                                <span className="text-sm text-gray-800">{c.area_name || c.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {geoTab === 'field' && (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <Dropdown
                                                    label="Farm"
                                                    options={farmDropdownOptions(hierarchy)}
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
                                                        <span className="text-sm text-gray-600">Fields</span>
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
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500">Select farm and cluster, then choose fields where this employee can mark attendance.</p>
                                        </>
                                    )}

                                    {formData.allowed_farm_fields.length > 0 && (
                                        <p className="text-xs text-gray-500">
                                            Geo summary: {geoCounts.farmCount} farm(s), {geoCounts.clusterCount} cluster(s), {geoCounts.fieldCount} field(s)
                                            — {formData.allowed_farm_fields.length} area(s) total.
                                        </p>
                                    )}
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

                    {submitError && (
                        <div
                            className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-900"
                            role="alert"
                        >
                            <p className="font-medium text-red-800">Could not save changes</p>
                            <p className="mt-1 whitespace-pre-wrap">{submitError}</p>
                        </div>
                    )}

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
                            disabled={loading || submitBlockedByUser}
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
