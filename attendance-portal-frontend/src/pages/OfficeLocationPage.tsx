import { useState, useEffect } from 'react'
import { useFrappePostCall, useFrappeCreateDoc, useFrappeUpdateDoc, useFrappeDeleteDoc } from 'frappe-react-sdk'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import toast from 'react-hot-toast'

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface OfficeLocation {
    name: string
    office_name: string
    company: string
    latitude: number
    longitude: number
    radius_meters: number
    is_active: number
    address?: string
}

export default function OfficeLocationPage() {
    const { call: getLocations } = useFrappePostCall('attendance_portal.api.get_office_locations')
    const [locations, setLocations] = useState<OfficeLocation[]>([])

    const { createDoc, loading: creating } = useFrappeCreateDoc()
    const { updateDoc, loading: updating } = useFrappeUpdateDoc()
    const { deleteDoc, loading: deleting } = useFrappeDeleteDoc()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null)

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<OfficeLocation>>({
        office_name: '',
        company: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 100,
        is_active: 1,
        address: ''
    })

    const fetchLocations = async () => {
        try {
            const res = await getLocations({})
            setLocations((res as any).message || res || [])
        } catch (error) {
            console.error("Failed to fetch locations", error)
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [])

    // Debounced Search Effect
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setIsSearching(true)
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
                    const data = await response.json()
                    setSuggestions(data || [])
                    setShowSuggestions(true)
                } catch (error) {
                    console.error("Search failed", error)
                } finally {
                    setIsSearching(false)
                }
            } else {
                setSuggestions([])
                setShowSuggestions(false)
            }
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [searchQuery])

    const handleSelectSuggestion = (suggestion: any) => {
        const { lat, lon, display_name } = suggestion
        setFormData(prev => ({
            ...prev,
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            address: display_name
        }))
        setSearchQuery(display_name)
        setShowSuggestions(false)
        toast.success('Location updated')
    }

    const handleEdit = (location: OfficeLocation) => {
        setEditingLocation(location)
        setFormData(location)
        setSearchQuery('')
        setSuggestions([])
        setIsModalOpen(true)
    }

    const handleAddNew = () => {
        setEditingLocation(null)
        setFormData({
            office_name: '',
            company: 'Nexchar',
            latitude: 28.6139, // Default to New Delhi
            longitude: 77.2090,
            radius_meters: 100,
            is_active: 1,
            address: ''
        })
        setSearchQuery('')
        setSuggestions([])
        setIsModalOpen(true)
    }

    const handleDelete = async (name: string) => {
        if (confirm('Are you sure you want to delete this location?')) {
            try {
                await deleteDoc('Office Location', name)
                toast.success('Location deleted')
                fetchLocations()
            } catch (error: any) {
                toast.error(error.message || 'Failed to delete')
            }
        }
    }

    const { call: manageLocation, loading: saving } = useFrappePostCall('attendance_portal.api.manage_office_location')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await manageLocation({ data: formData })
            toast.success(editingLocation ? 'Location updated' : 'Location created')
            setIsModalOpen(false)
            fetchLocations()
        } catch (error: any) {
            toast.error(error.message || 'Failed to save')
        }
    }

    // Map Component to handle clicks and view updates
    const MapController = () => {
        const map = useMap()

        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng
                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng
                }))

                // Reverse Geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.display_name) {
                            setFormData(prev => ({
                                ...prev,
                                address: data.display_name
                            }))
                        }
                    })
                    .catch(err => console.error("Reverse geocoding failed", err))
            },
        })

        // Update map view when coords change (e.g. from search)
        useEffect(() => {
            if (formData.latitude && formData.longitude) {
                map.flyTo([formData.latitude, formData.longitude], 16)
            }
        }, [formData.latitude, formData.longitude, map])

        return formData.latitude && formData.longitude ? (
            <>
                <Marker position={[formData.latitude, formData.longitude]} />
                <Circle
                    center={[formData.latitude, formData.longitude]}
                    radius={formData.radius_meters || 100}
                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.2 }}
                />
            </>
        ) : null
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Office Locations</h1>
                    <p className="text-gray-500">Manage allowed geofencing zones for attendance.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <span className="material-symbols-rounded">add</span>
                    Add Location
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations?.map(location => (
                    <div key={location.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="h-32 bg-gray-100 relative">
                            {/* Mini Map Preview (Static or just a placeholder) */}
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span className="material-symbols-rounded text-4xl">map</span>
                            </div>
                            {/* We could use a static map image here if we had an API key */}
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-gray-800 text-lg">{location.office_name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${location.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {location.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{location.address || 'No address provided'}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">radar</span>
                                    {location.radius_meters}m Radius
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">location_on</span>
                                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handleEdit(location)}
                                    className="flex-1 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(location.name)}
                                    className="flex-1 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingLocation ? 'Edit Location' : 'Add New Location'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-rounded">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.office_name}
                                        onChange={e => setFormData({ ...formData, office_name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="e.g. Headquarters"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="Company Name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea
                                        rows={3}
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                        placeholder="Full address..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Geofence Radius: <span className="text-blue-600 font-bold">{formData.radius_meters} meters</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="1000"
                                        step="10"
                                        value={formData.radius_meters}
                                        onChange={e => setFormData({ ...formData, radius_meters: Number(e.target.value) })}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Drag to adjust the allowed area size.</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        checked={!!formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Location is Active</label>
                                </div>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Location</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition pr-10"
                                        placeholder="Type to search (e.g. Connaught Place)..."
                                    />
                                    {isSearching && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        </div>
                                    )}
                                </div>

                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-[2000] w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                                        {suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-50 last:border-0"
                                            >
                                                {suggestion.display_name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="h-[400px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 relative">
                                <MapContainer
                                    center={[formData.latitude || 28.6139, formData.longitude || 77.2090]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    />
                                    <MapController />
                                </MapContainer>
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-xs font-medium z-[1000]">
                                    Click map to set location
                                </div>
                            </div>

                            <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
