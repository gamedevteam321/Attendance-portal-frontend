import { useState } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import toast from 'react-hot-toast'

interface AddDesignationModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated: (designationName: string) => void
}

export default function AddDesignationModal({ isOpen, onClose, onCreated }: AddDesignationModalProps) {
    const [name, setName] = useState('')
    const [saving, setSaving] = useState(false)
    const { call: createDesignation } = useFrappePostCall('attendance_portal.api.create_designation')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            toast.error('Enter a designation name')
            return
        }
        setSaving(true)
        try {
            const createdName = await createDesignation({ designation_name: trimmed })
            toast.success(`Designation "${createdName}" added`)
            onCreated(createdName)
            setName('')
            onClose()
        } catch (err: any) {
            toast.error(err.message || 'Failed to add designation')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        setName('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Add Designation</h3>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        <span className="material-symbols-rounded text-xl">close</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Designation name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Senior Developer"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Adding…' : 'Add'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
