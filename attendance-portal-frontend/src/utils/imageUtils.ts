import { SITE_URL } from '../config'

/**
 * Get the full URL for an image
 * If the URL is relative (starts with /files/ or /private/files/), prepend the site URL
 * Otherwise, return as is (for external URLs like dicebear)
 */
export function getImageUrl(imageUrl: string | null | undefined, siteUrl?: string): string | null {
    if (!imageUrl) {
        return null
    }
    
    // Trim whitespace
    const trimmedUrl = imageUrl.trim()
    if (!trimmedUrl) {
        return null
    }
    
    // If it's already a full URL (http:// or https://), return as is
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        return trimmedUrl
    }
    
    // If it's a relative path (starts with /files/ or /private/files/), prepend site URL
    if (trimmedUrl.startsWith('/files/') || trimmedUrl.startsWith('/private/files/')) {
        const baseUrl = siteUrl || SITE_URL || 'http://localhost:8000'
        if (!baseUrl) {
            console.warn('No base URL available for image:', trimmedUrl)
            return trimmedUrl // Fallback if no base URL available
        }
        
        // Remove trailing slash from baseUrl if present
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        const fullUrl = `${cleanBaseUrl}${trimmedUrl}`
        
        // Debug logging (can be removed in production)
        // if (process.env.NODE_ENV === 'development') {
        //     console.log('Image URL conversion:', { original: trimmedUrl, full: fullUrl })
        // }
        
        return fullUrl
    }
    
    // For other relative paths, try to prepend site URL
    if (trimmedUrl.startsWith('/')) {
        const baseUrl = siteUrl || SITE_URL || 'http://localhost:8000'
        if (baseUrl) {
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
            return `${cleanBaseUrl}${trimmedUrl}`
        }
    }
    
    // For other cases, return as is
    return trimmedUrl
}

