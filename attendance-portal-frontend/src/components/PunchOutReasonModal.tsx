import { useState, useEffect } from 'react'

interface PunchOutReasonModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (reason: string, lat: number, lng: number) => void
    location: { lat: number; lng: number } | null
    isSubmitting?: boolean
}

export default function PunchOutReasonModal({ 
    isOpen, 
    onClose, 
    onSubmit, 
    location,
    isSubmitting = false 
}: PunchOutReasonModalProps) {
    const [reason, setReason] = useState('')

    useEffect(() => {
        if (isOpen) {
            setReason('')
        }
    }, [isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!reason.trim()) {
            alert('Please provide a reason for punching out outside work location')
            return
        }
        if (!location) {
            alert('Location not available. Please enable location services.')
            return
        }
        onSubmit(reason.trim(), location.lat, location.lng)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Punch Out Outside Work Location</h2>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="Please provide a reason for punching out outside the work location..."
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        {location && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                <p className="text-sm text-gray-600 mb-1">Current Location:</p>
                                <p className="text-xs text-gray-500">
                                    Latitude: {location.lat.toFixed(6)}, Longitude: {location.lng.toFixed(6)}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSubmitting || !reason.trim() || !location}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

