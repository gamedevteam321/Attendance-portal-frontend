import { useState } from 'react'

interface GeolocationCoords {
    lat: number
    lng: number
}

export const useGeolocation = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getCurrentPosition = (): Promise<GeolocationCoords> => {
        setLoading(true)
        setError(null)

        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                const err = 'Geolocation is not supported by your browser'
                setError(err)
                setLoading(false)
                reject(err)
                return
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLoading(false)
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    })
                },
                (error) => {
                    const err = `Error getting location: ${error.message}`
                    setError(err)
                    setLoading(false)
                    reject(err)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            )
        })
    }

    return { getCurrentPosition, loading, error }
}
