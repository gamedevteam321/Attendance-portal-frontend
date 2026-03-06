import { useState, useEffect } from 'react'
import { useFrappePostCall, useFrappeGetDocList } from 'frappe-react-sdk'
import toast from 'react-hot-toast'
import Dropdown from './Dropdown'

interface LeaveAllocationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    employeeId: string
    employeeName: string
}

export default function LeaveAllocationModal({ isOpen, onClose, onSuccess, employeeId, employeeName }: LeaveAllocationModalProps) {
    const [formData, setFormData] = useState({
        leave_type: '',
        from_date: '',
        to_date: '',
        total_leaves: ''
    })
    const [loading, setLoading] = useState(false)

    const { call: allocateLeave } = useFrappePostCall('attendance_portal.api.allocate_leave')
    const { data: leaveTypes } = useFrappeGetDocList('Leave Type', {
        fields: ['name'],
        limit: 100
    })

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setFormData({
                leave_type: leaveTypes?.[0]?.name || '',
                from_date: '',
                to_date: '',
                total_leaves: ''
            })
        }
    }, [isOpen, leaveTypes])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await allocateLeave({
                employee_id: employeeId,
                leave_type: formData.leave_type,
                from_date: formData.from_date,
                to_date: formData.to_date,
                total_leaves: parseFloat(formData.total_leaves)
            })
            toast.success('Leave allocated successfully!')
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Failed to allocate leave')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-gray-800">Allocate Annual Leaves</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Allocate total annual leaves for {employeeName}</p>
                    <p className="text-xs text-gray-400 mt-1">Employee can use these leaves for any leave type</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <Dropdown
                        label="Leave Type"
                        options={(leaveTypes ?? []).map(lt => ({ value: lt.name, label: lt.name }))}
                        value={formData.leave_type}
                        onChange={v => setFormData(prev => ({ ...prev, leave_type: v }))}
                        placeholder="Select Leave Type"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                From Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.from_date}
                                onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                To Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={formData.to_date}
                                onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                                required
                                min={formData.from_date}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Leaves <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={formData.total_leaves}
                            onChange={(e) => setFormData({ ...formData, total_leaves: e.target.value })}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                            placeholder="e.g., 12"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                        >
                            {loading ? 'Allocating...' : 'Allocate Leave'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
