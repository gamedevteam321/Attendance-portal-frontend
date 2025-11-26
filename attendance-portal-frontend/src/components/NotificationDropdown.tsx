import { useState, useEffect, useRef } from 'react'
import { useFrappePostCall } from 'frappe-react-sdk'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    timestamp: string
    link: string
    unread: boolean
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const dropdownRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    const { call: fetchNotifications } = useFrappePostCall('attendance_portal.api.get_notifications')

    useEffect(() => {
        loadNotifications()

        // Refresh notifications every 30 seconds
        const interval = setInterval(loadNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const loadNotifications = async () => {
        try {
            const res = await fetchNotifications({ limit: 20 })
            const data = (res as any)?.message || res || []
            setNotifications(data)
        } catch (error) {
            console.error('Failed to load notifications:', error)
        }
    }

    const handleNotificationClick = (notification: Notification) => {
        navigate(notification.link)
        setIsOpen(false)
    }

    const unreadCount = notifications.filter(n => n.unread).length

    const getNotificationIcon = (type: string) => {
        if (type.includes('leave')) return 'event_busy'
        if (type.includes('remote')) return 'home'
        return 'notifications'
    }

    const getNotificationColor = (type: string) => {
        if (type.includes('approved')) return 'text-green-600 bg-green-50'
        if (type.includes('rejected')) return 'text-red-600 bg-red-50'
        if (type.includes('pending')) return 'text-yellow-600 bg-yellow-50'
        return 'text-blue-600 bg-blue-50'
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 transition relative"
            >
                <span className="sr-only">Notifications</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs text-gray-500">{unreadCount} unread</span>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <span className="material-symbols-rounded text-4xl text-gray-300 mb-2 block">notifications_off</span>
                                <p>No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className="w-full p-4 hover:bg-gray-50 transition text-left flex gap-3"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationColor(notification.type)}`}>
                                            <span className="material-symbols-rounded text-lg">
                                                {getNotificationIcon(notification.type)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="font-medium text-sm text-gray-800">{notification.title}</p>
                                                {notification.unread && (
                                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
