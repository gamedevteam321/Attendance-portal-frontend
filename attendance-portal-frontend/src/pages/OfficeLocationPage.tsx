import { useState, useEffect, useRef, useCallback } from 'react'
import { useFrappePostCall, useFrappeDeleteDoc, useFrappeGetDocList } from 'frappe-react-sdk'
import {
    useJsApiLoader,
    GoogleMap,
    Marker,
    Circle,
} from '@react-google-maps/api'
import { useGeolocation } from '../hooks/useGeolocation'
import toast from 'react-hot-toast'
import Dropdown from '../components/Dropdown'

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 }
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' }
/** Load only core map; Places (new) is loaded via importLibrary in the component to avoid legacy API. */
const GOOGLE_MAPS_LIBRARIES: never[] = []

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

/** Map section: Google Maps with search (new Place Autocomplete), current location, and work location marker. */
function WorkLocationMapSection({
    apiKey,
    formData,
    setFormData: _setFormData,
    editingLocation: _editingLocation,
    currentLocation,
    centerOnCurrentLocation,
    onMapLoad,
    onMapClick,
    onPlaceSelected,
    onGetCurrentLocation,
    getCurrentLocationLoading,
}: {
    apiKey: string
    formData: Partial<OfficeLocation>
    setFormData: React.Dispatch<React.SetStateAction<Partial<OfficeLocation>>>
    editingLocation: OfficeLocation | null
    currentLocation: { lat: number; lng: number } | null
    centerOnCurrentLocation: boolean
    onMapLoad: (map: google.maps.Map) => void
    onMapClick: (e: google.maps.MapMouseEvent) => void
    onPlaceSelected: (data: { lat: number; lng: number; address: string }) => void
    onGetCurrentLocation: () => void
    getCurrentLocationLoading: boolean
}) {
    const placeAutocompleteContainerRef = useRef<HTMLDivElement>(null)
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        libraries: GOOGLE_MAPS_LIBRARIES,
    })

    // New Places API (PlaceAutocompleteElement) — avoids legacy API not enabled for new projects
    const placeAutocompleteElRef = useRef<HTMLElement | null>(null)
    useEffect(() => {
        if (!isLoaded || !placeAutocompleteContainerRef.current || typeof google === 'undefined') return
        const container = placeAutocompleteContainerRef.current
        let cancelled = false
        ;(async () => {
            const lib = await google.maps.importLibrary('places')
            if (cancelled) return
            const placeEl = new (lib as unknown as { PlaceAutocompleteElement: new (opts?: object) => HTMLElement }).PlaceAutocompleteElement({})
            placeAutocompleteElRef.current = placeEl as unknown as HTMLElement
            placeEl.addEventListener('gmp-select', async (ev: unknown) => {
                const e = ev as { placePrediction: { toPlace: () => Promise<google.maps.places.Place> } }
                const place = await e.placePrediction.toPlace()
                if (!place) return
                await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] })
                const loc = place.location
                if (loc && typeof (loc as { lat: () => number }).lat === 'function') {
                    const lat = (loc as { lat: () => number; lng: () => number }).lat()
                    const lng = (loc as { lat: () => number; lng: () => number }).lng()
                    const address = (place.formattedAddress as string) ?? (place.displayName as string) ?? ''
                    onPlaceSelected({ lat, lng, address })
                }
            })
            container.appendChild(placeEl as unknown as Node)
            // Force light/white search bar (PlaceAutocompleteElement defaults to dark)
            const el = placeEl as unknown as HTMLElement
            el.style.setProperty('color-scheme', 'light')
            el.style.setProperty('background-color', 'white')
            el.style.setProperty('border', '1px solid #e5e7eb')
            el.style.setProperty('border-radius', '0.5rem')
        })()
        return () => {
            cancelled = true
            const el = placeAutocompleteElRef.current
            if (el && container.contains(el)) container.removeChild(el)
            placeAutocompleteElRef.current = null
        }
    }, [isLoaded, onPlaceSelected])

    // Focus on marked work location unless user clicked "Get current location"
    const center =
        centerOnCurrentLocation && currentLocation
            ? { lat: currentLocation.lat, lng: currentLocation.lng }
            : formData.latitude != null && formData.longitude != null
                ? { lat: formData.latitude, lng: formData.longitude }
                : currentLocation || DEFAULT_CENTER

    if (loadError) {
        return (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-red-600 text-sm p-4 text-center z-10 rounded-xl">
                <div className="max-w-md space-y-2">
                    <p className="font-medium">Google Maps could not be loaded.</p>
                    <p className="text-gray-600 text-xs">Search and map need a valid API key in site config (<code className="bg-gray-200 px-1 rounded">google_maps_api_key</code>). In Google Cloud Console enable <strong>Maps JavaScript API</strong> and <strong>Places API (New)</strong>, and add <code className="bg-gray-200 px-1 rounded">localhost:*</code> (or your domain) to API key referrer restrictions.</p>
                </div>
            </div>
        )
    }
    if (!isLoaded) {
        return (
            <div className="h-[360px] sm:h-[440px] flex items-center justify-center bg-gray-100 text-gray-600 text-sm rounded-xl border border-gray-200">
                Loading map…
            </div>
        )
    }
    return (
        <div className="space-y-2">
            <div className="h-[360px] sm:h-[440px] min-h-[280px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
                <GoogleMap
                    mapContainerStyle={MAP_CONTAINER_STYLE}
                    center={center}
                    zoom={15}
                    onClick={onMapClick}
                    onLoad={onMapLoad}
                    mapTypeId="satellite"
                    options={{
                        mapTypeId: 'satellite',
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: true,
                        zoomControl: true,
                    }}
                >
                    {/* New Places API search — rendered via useEffect into placeAutocompleteContainerRef (styled white in effect) */}
                    <div
                        ref={placeAutocompleteContainerRef}
                        className="absolute left-2 right-2 top-2 z-[1000] rounded-lg bg-white shadow [&>*]:w-full [&>*]:rounded-lg"
                    />
                    {/* Current location marker (blue/dot) */}
                    {currentLocation && (
                        <Marker
                            position={currentLocation}
                            title="You are here"
                            options={{
                                icon: {
                                    path: google.maps.SymbolPath.CIRCLE,
                                    scale: 10,
                                    fillColor: '#3b82f6',
                                    fillOpacity: 1,
                                    strokeColor: '#1d4ed8',
                                    strokeWeight: 2,
                                },
                            }}
                        />
                    )}
                    {/* Work location marker and circle */}
                    {formData.latitude && formData.longitude && (
                        <>
                            <Marker
                                position={{ lat: formData.latitude, lng: formData.longitude }}
                                title="Work location"
                            />
                            <Circle
                                center={{ lat: formData.latitude, lng: formData.longitude }}
                                radius={formData.radius_meters || 100}
                                options={{
                                    fillColor: '#2563eb',
                                    fillOpacity: 0.2,
                                    strokeColor: '#2563eb',
                                    strokeWeight: 2,
                                }}
                            />
                        </>
                    )}
                </GoogleMap>
                <button
                    type="button"
                    onClick={onGetCurrentLocation}
                    disabled={getCurrentLocationLoading}
                    className="absolute bottom-52 right-3 z-[1000] flex items-center justify-center p-2.5 rounded-lg shadow bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-60"
                    title="Get current location"
                >
                    <span className="material-symbols-rounded text-xl">my_location</span>
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
                Click map to set work location. Blue dot = your current location.
            </p>
        </div>
    )
}

export default function OfficeLocationPage() {
    const { call: getLocations } = useFrappePostCall('attendance_portal.api.get_office_locations')
    const { call: getGoogleMapsKey } = useFrappePostCall('attendance_portal.api.get_google_maps_api_key')
    const { data: companies } = useFrappeGetDocList<{ name: string; company_name?: string }>('Company', {
        fields: ['name', 'company_name'],
        limit: 200,
    })
    const [locations, setLocations] = useState<OfficeLocation[]>([])
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null)

    const { deleteDoc } = useFrappeDeleteDoc()
    const { getCurrentPosition, loading: geoLoading } = useGeolocation()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null)
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [centerOnCurrentLocation, setCenterOnCurrentLocation] = useState(false)

    const [formData, setFormData] = useState<Partial<OfficeLocation>>({
        office_name: '',
        company: '',
        latitude: 0,
        longitude: 0,
        radius_meters: 100,
        is_active: 1,
        address: '',
    })

    useEffect(() => {
        getGoogleMapsKey({})
            .then((res: unknown) => {
                const raw = (res as { message?: string })?.message ?? res
                const key = typeof raw === 'string' ? raw.trim() : ''
                setGoogleMapsApiKey(key || '')
            })
            .catch(() => setGoogleMapsApiKey(''))
    }, [getGoogleMapsKey])

    const fetchLocations = async () => {
        try {
            const res = await getLocations({})
            setLocations((res as any).message || res || [])
        } catch (error) {
            console.error('Failed to fetch locations', error)
        }
    }

    useEffect(() => {
        fetchLocations()
    }, [])

    const fetchCurrentLocation = useCallback((focusOnCurrent = false) => {
        if (focusOnCurrent) setCenterOnCurrentLocation(true)
        getCurrentPosition()
            .then(({ lat, lng }) => {
                setCurrentLocation({ lat, lng })
                if (map) {
                    map.panTo({ lat, lng })
                    map.setZoom(17)
                }
                toast.success('Current location shown on map')
            })
            .catch(() => toast.error('Could not get your location'))
    }, [getCurrentPosition, map])

    useEffect(() => {
        if (isModalOpen && !currentLocation) fetchCurrentLocation(false)
    }, [isModalOpen])

    const handleEdit = (location: OfficeLocation) => {
        setEditingLocation(location)
        setFormData(location)
        setCenterOnCurrentLocation(false)
        setIsModalOpen(true)
    }

    const handleAddNew = () => {
        setEditingLocation(null)
        const defaultCompany = companies?.[0]?.name || ''
        setFormData({
            office_name: '',
            company: defaultCompany,
            latitude: undefined,
            longitude: undefined,
            radius_meters: 100,
            is_active: 1,
            address: '',
        })
        setCenterOnCurrentLocation(false)
        setIsModalOpen(true)
    }

    const handleDelete = async (name: string) => {
        if (confirm('Are you sure you want to delete this work location?')) {
            try {
                await deleteDoc('Office Location', name)
                toast.success('Work location deleted')
                fetchLocations()
            } catch (error: any) {
                toast.error(error.message || 'Failed to delete')
            }
        }
    }

    const { call: manageLocation, loading: saving } = useFrappePostCall('attendance_portal.api.manage_office_location')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLocation && (formData.latitude == null || formData.longitude == null)) {
            toast.error('Please set a location on the map or search for an address.')
            return
        }
        try {
            await manageLocation({ data: formData })
            toast.success(editingLocation ? 'Work location updated' : 'Work location created')
            setIsModalOpen(false)
            fetchLocations()
        } catch (error: any) {
            toast.error(error.message || 'Failed to save')
        }
    }

    const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance)
        mapInstance.setMapTypeId('satellite')
    }, [])

    const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat()
        const lng = e.latLng?.lng()
        if (lat == null || lng == null) return
        setCenterOnCurrentLocation(false)
        setFormData((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }))
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
                setFormData((prev) => ({
                    ...prev,
                    address: results[0].formatted_address,
                }))
            }
        })
        toast.success('Location updated')
    }, [])

    const onPlaceSelected = useCallback(
        (data: { lat: number; lng: number; address: string }) => {
            setCenterOnCurrentLocation(false)
            setFormData((prev) => ({
                ...prev,
                latitude: data.lat,
                longitude: data.lng,
                address: data.address,
            }))
            map?.panTo({ lat: data.lat, lng: data.lng })
            toast.success('Location updated')
        },
        [map]
    )

    useEffect(() => {
        if (map && formData.latitude && formData.longitude) {
            map.panTo({ lat: formData.latitude, lng: formData.longitude })
        }
    }, [formData.latitude, formData.longitude, map])

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Work Locations</h1>
                    <p className="text-sm sm:text-base text-gray-500 mt-1">Manage allowed geofencing zones for attendance.</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 font-medium text-sm sm:text-base transition shadow-sm hover:shadow-md w-full sm:w-auto"
                >
                    <span className="material-symbols-rounded text-lg sm:text-xl">add</span>
                    <span>Add Work Location</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {locations?.map((location) => (
                    <div key={location.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="h-24 sm:h-32 bg-gray-100 relative">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span className="material-symbols-rounded text-3xl sm:text-4xl">map</span>
                            </div>
                        </div>
                        <div className="p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                                <h3 className="font-bold text-gray-800 text-base sm:text-lg break-words">{location.office_name}</h3>
                                <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap self-start sm:self-auto ${location.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {location.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 line-clamp-2">{location.address || 'No address provided'}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500 mb-3 sm:mb-4">
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">radar</span>
                                    {location.radius_meters}m Radius
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="material-symbols-rounded text-sm">location_on</span>
                                    <span className="break-all">
                                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-3 sm:pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => handleEdit(location)}
                                    className="flex-1 py-2 text-xs sm:text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(location.name)}
                                    className="flex-1 py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-xl">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
                            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
                                {editingLocation ? 'Edit Work Location' : 'Add New Work Location'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <span className="material-symbols-rounded text-xl sm:text-2xl">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 p-4 sm:p-6">
                            <div className="overflow-y-auto flex-1 min-h-0 space-y-6">
                                {/* Form fields - full width row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Work Location Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.office_name}
                                            onChange={(e) => setFormData({ ...formData, office_name: e.target.value })}
                                            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                                            placeholder="e.g. Headquarters"
                                        />
                                    </div>
                                    <Dropdown
                                        label="Company"
                                        options={(companies ?? []).map((c: { name: string; company_name?: string }) => ({
                                            value: c.name,
                                            label: c.company_name || c.name,
                                        }))}
                                        value={formData.company ?? ''}
                                        onChange={(v) => setFormData({ ...formData, company: v })}
                                        placeholder="Select company"
                                        required
                                    />
                                    <div className="flex items-end gap-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={!!formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                        <label htmlFor="isActive" className="text-xs sm:text-sm font-medium text-gray-700">Location is Active</label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea
                                        rows={2}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                                        placeholder="Full address..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                                        Geofence Radius: <span className="text-blue-600 font-bold">{formData.radius_meters} meters</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="1000"
                                        step="10"
                                        value={formData.radius_meters}
                                        onChange={(e) => setFormData({ ...formData, radius_meters: Number(e.target.value) })}
                                        className="w-full max-w-xs h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                </div>

                                {/* Map - full modal width below */}
                                <div className="space-y-2 w-full">
                                <label className="block text-xs sm:text-sm font-medium text-gray-700">Map · Search & set location</label>
                                {googleMapsApiKey === null && (
                                    <div className="h-[360px] sm:h-[440px] flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-gray-600 text-sm">
                                        Loading map config…
                                    </div>
                                )}
                                {googleMapsApiKey === '' && (
                                    <div className="h-[360px] sm:h-[440px] flex items-center justify-center bg-gray-100 rounded-xl border border-gray-200 text-gray-600 text-sm p-4 text-center">
                                        Set <code className="bg-gray-200 px-1 rounded">google_maps_api_key</code> in site config to use the map.
                                    </div>
                                )}
                                {googleMapsApiKey && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => fetchCurrentLocation(true)}
                                            disabled={geoLoading}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {geoLoading ? 'Getting location…' : 'Show my location on map'}
                                        </button>
                                        <WorkLocationMapSection
                                            apiKey={googleMapsApiKey}
                                            formData={formData}
                                            setFormData={setFormData}
                                            editingLocation={editingLocation}
                                            currentLocation={currentLocation}
                                            centerOnCurrentLocation={centerOnCurrentLocation}
                                            onMapLoad={onMapLoad}
                                            onMapClick={onMapClick}
                                            onPlaceSelected={onPlaceSelected}
                                            onGetCurrentLocation={() => fetchCurrentLocation(true)}
                                            getCurrentLocationLoading={geoLoading}
                                        />
                                    </>
                                )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-6 mt-4 border-t border-gray-100 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : 'Save Work Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
