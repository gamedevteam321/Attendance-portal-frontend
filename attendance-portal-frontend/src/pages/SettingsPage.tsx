import { useState, useEffect } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface LeaveSettings {
    monthly_casual_leaves: number
    monthly_sick_leaves: number
}

export default function SettingsPage() {
    const { isHrAdmin } = useAuth()
    const [monthlyCasual, setMonthlyCasual] = useState<string>('1')
    const [monthlySick, setMonthlySick] = useState<string>('1')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const { call: getSettings } = useFrappePostCall<{ message: LeaveSettings }>('attendance_portal.api.get_leave_settings')
    const { call: setSettings } = useFrappePostCall('attendance_portal.api.set_leave_settings')

    useEffect(() => {
        if (!isHrAdmin) return
        setLoading(true)
        getSettings({})
            .then((res: any) => {
                const data = res?.message ?? res
                if (data && typeof data.monthly_casual_leaves === 'number') {
                    setMonthlyCasual(String(data.monthly_casual_leaves))
                }
                if (data && typeof data.monthly_sick_leaves === 'number') {
                    setMonthlySick(String(data.monthly_sick_leaves))
                }
            })
            .catch(() => toast.error('Failed to load leave settings'))
            .finally(() => setLoading(false))
    }, [isHrAdmin])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const casual = parseFloat(monthlyCasual)
        const sick = parseFloat(monthlySick)
        if (Number.isNaN(casual) || casual < 0) {
            toast.error('Enter a valid number for Monthly Casual Leaves')
            return
        }
        if (Number.isNaN(sick) || sick < 0) {
            toast.error('Enter a valid number for Monthly Sick Leaves')
            return
        }
        setSaving(true)
        try {
            await setSettings({
                monthly_casual_leaves: casual,
                monthly_sick_leaves: sick
            })
            toast.success('Leave settings saved. These values will be used when leaves are auto-allocated each month.')
        } catch (err: any) {
            toast.error(err.message || 'Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    if (!isHrAdmin) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <p className="text-gray-600">You do not have permission to view this page.</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-gray-800">Leave Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Set how many casual and sick leaves are auto-allocated to each active employee at the start of every month. Values can be decimals (e.g. 1.5).
                    </p>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monthly Casual Leaves
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={monthlyCasual}
                                    onChange={e => setMonthlyCasual(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Added per employee on the 1st of each month.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Monthly Sick Leaves
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={monthlySick}
                                    onChange={e => setMonthlySick(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">Added per employee on the 1st of each month.</p>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                                >
                                    {saving ? 'Saving...' : 'Save settings'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    )
}
