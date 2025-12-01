import { useState, useEffect, useRef } from 'react'
import { useFrappeGetDoc, useFrappePostCall } from 'frappe-react-sdk'
import { useAuth } from '../contexts/AuthContext'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getImageUrl } from '../utils/imageUtils'
import ImageCropModal from '../components/ImageCropModal'

export default function ProfilePage() {
    const { employeeId, employeeName, isManager, isHrAdmin, user, logout } = useAuth()
    const [leaveBalances, setLeaveBalances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [oldPassword, setOldPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [changingPassword, setChangingPassword] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [selectedAvatarStyle, setSelectedAvatarStyle] = useState('avataaars')
    const [uploadingPhoto, setUploadingPhoto] = useState(false)
    const [showCropModal, setShowCropModal] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: employee, mutate: refetchEmployee } = useFrappeGetDoc('Employee', employeeId || '', {
        enabled: !!employeeId
    })

    const { call: getBalances } = useFrappePostCall('attendance_portal.api.get_leave_balances')
    const { call: updatePassword } = useFrappePostCall('frappe.core.doctype.user.user.update_password')
    const { call: updateProfilePhoto } = useFrappePostCall('attendance_portal.api.update_employee_profile_photo')
    const { call: uploadFile } = useFrappePostCall('attendance_portal.api.upload_profile_photo')

    useEffect(() => {
        const fetchLeaveData = async () => {
            if (!employeeId) {
                setLoading(false)
                return
            }
            try {
                const balRes = await getBalances({ employee: employeeId })
                const balances = (balRes as any)?.message || balRes || []
                setLeaveBalances(balances)
            } catch (error) {
                console.error('Failed to fetch leave data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchLeaveData()
    }, [employeeId, getBalances])

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all fields')
            return
        }
        
        if (newPassword !== confirmPassword) {
            toast.error('New password and confirm password do not match')
            return
        }
        
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters long')
            return
        }
        
        setChangingPassword(true)
        try {
            await updatePassword({
                old_password: oldPassword,
                new_password: newPassword,
                logout_all_sessions: 0
            })
            toast.success('Password changed successfully')
            setShowPasswordModal(false)
            setOldPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error: any) {
            console.error('Failed to change password:', error)
            toast.error(error?.message || error?.exception || 'Failed to change password')
        } finally {
            setChangingPassword(false)
        }
    }

    const avatarStyles = [
        { id: 'avataaars', name: 'Avataaars', icon: '👤' },
        { id: 'micah', name: 'Micah', icon: '😊' },
        { id: 'open-peeps', name: 'Open Peeps', icon: '🧑' },
        { id: 'personas', name: 'Personas', icon: '👨' },
        { id: 'pixel-art', name: 'Pixel Art', icon: '🎮' },
        { id: 'bottts', name: 'Bottts', icon: '🤖' },
        { id: 'lorelei', name: 'Lorelei', icon: '👩' },
        { id: 'notionists', name: 'Notionists', icon: '💼' },
    ]

    const handleAvatarSelect = async (style: string) => {
        if (!employeeId) return
        
        setUploadingPhoto(true)
        try {
            const avatarUrl = `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(employeeName || user || 'User')}`
            await updateProfilePhoto({ image_url: avatarUrl })
            toast.success('Profile photo updated successfully')
            setShowPhotoModal(false)
            refetchEmployee()
        } catch (error: any) {
            console.error('Failed to update profile photo:', error)
            toast.error(error?.message || error?.exception || 'Failed to update profile photo')
        } finally {
            setUploadingPhoto(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file')
            return
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('Image size should be less than 5MB')
            return
        }

        // Read file and show crop modal
        const reader = new FileReader()
        reader.onloadend = () => {
            const imageSrc = reader.result as string
            setImageToCrop(imageSrc)
            setShowCropModal(true)
        }
        reader.onerror = () => {
            toast.error('Failed to read file')
        }
        reader.readAsDataURL(file)
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleCropComplete = async (croppedImage: string) => {
        setShowCropModal(false)
        setUploadingPhoto(true)
        
        try {
            // Extract base64 string from data URL
            const base64String = croppedImage.split(',')[1]
            const filename = `profile_${Date.now()}.jpg`

            // Upload file using Frappe API
            const fileDoc = await uploadFile({
                content: base64String,
                filename: filename,
                dt: 'Employee',
                dn: employeeId,
                fieldname: 'image'
            })

            // Get the file URL - handle different response structures
            let fileUrl: string | null = null
            const response = (fileDoc as any)?.message || fileDoc
            
            if (typeof response === 'string') {
                // If response is a string, it might be the file URL
                fileUrl = response
            } else if (response?.file_url) {
                fileUrl = response.file_url
            } else if (response?.name) {
                // If we get a file name, construct the URL
                // Files are typically stored at /files/[filename] or /private/files/[filename]
                fileUrl = `/files/${response.name}`
            }
            
            if (!fileUrl) {
                console.error('File upload response:', fileDoc)
                throw new Error('Failed to get file URL from upload response')
            }

            // Update employee with the file URL
            await updateProfilePhoto({ image_url: fileUrl })
            toast.success('Profile photo updated successfully')
            setShowPhotoModal(false)
            setImageToCrop(null)
            refetchEmployee()
        } catch (error: any) {
            console.error('Failed to upload file:', error)
            toast.error(error?.message || error?.exception || 'Failed to upload photo')
        } finally {
            setUploadingPhoto(false)
        }
    }

    if (loading && employeeId) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
                    <div className="animate-pulse">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gray-200 rounded-full mx-auto mb-4"></div>
                        <div className="h-5 sm:h-6 bg-gray-200 rounded w-40 sm:w-48 mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-28 sm:w-32 mx-auto"></div>
                    </div>
                </div>
            </div>
        )
    }

    if (!employeeId) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-12 text-center">
                    <div className="text-4xl sm:text-5xl md:text-6xl mb-4">👤</div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">No Employee Record</h2>
                    <p className="text-sm sm:text-base text-gray-600 px-4">No employee record found for your account. Please contact your HR administrator.</p>
                </div>
            </div>
        )
    }

    const getInitials = (name: string) => {
        if (!name) return 'U'
        const parts = name.split(' ')
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    const InfoCard = ({ title, value, icon }: { title: string, value: string | null | undefined, icon: string }) => (
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-blue-600 text-lg sm:text-xl">{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1">{title}</p>
                <p className="text-sm sm:text-base text-gray-800 font-semibold break-words">{value || 'Not set'}</p>
            </div>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            {/* Profile Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-blue-50 rounded-full -mr-8 sm:-mr-12 md:-mr-16 -mt-8 sm:-mt-12 md:-mt-16 opacity-50"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8">
                    {/* Avatar */}
                    <div className="relative group">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl md:text-4xl shadow-lg flex-shrink-0 overflow-hidden">
                            {getImageUrl(employee?.image) ? (
                                <img src={getImageUrl(employee?.image) || ''} alt={employeeName || 'User'} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span>{getInitials(employeeName || user || 'U')}</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowPhotoModal(true)}
                            className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full flex items-center justify-center transition-all duration-200"
                            title="Change Profile Photo"
                        >
                            <span className="material-symbols-rounded text-white opacity-0 group-hover:opacity-100 text-xl sm:text-2xl transition-opacity">
                                camera_alt
                            </span>
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left w-full">
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 break-words">{employeeName || user}</h1>
                        <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">Employee ID: {employeeId}</p>
                        
                        {/* Role Badges */}
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <span className="px-2 sm:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                                Employee
                            </span>
                            {isManager && (
                                <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium">
                                    Manager
                                </span>
                            )}
                            {isHrAdmin && (
                                <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs sm:text-sm font-medium">
                                    HR Admin
                                </span>
                            )}
                            {employee?.status && (
                                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                                    employee.status === 'Active' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-gray-100 text-gray-700'
                                }`}>
                                    {employee.status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Company Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-600 text-xl sm:text-2xl">business</span>
                        <span>Company Details</span>
                    </h2>
                    <div className="space-y-3 sm:space-y-4">
                        <InfoCard 
                            title="Designation" 
                            value={employee?.designation} 
                            icon="work"
                        />
                        <InfoCard 
                            title="Department" 
                            value={employee?.department} 
                            icon="groups"
                        />
                        <InfoCard 
                            title="Company" 
                            value={employee?.company} 
                            icon="apartment"
                        />
                        <InfoCard 
                            title="Branch" 
                            value={employee?.branch} 
                            icon="location_on"
                        />
                        {employee?.reports_to && (
                            <InfoCard 
                                title="Reports To" 
                                value={employee?.reports_to_name || employee?.reports_to} 
                                icon="supervisor_account"
                            />
                        )}
                    </div>
                </div>

                {/* Personal Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6">
                    <div className="flex justify-between items-center mb-4 sm:mb-6">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="material-symbols-rounded text-indigo-600 text-xl sm:text-2xl">person</span>
                            <span>Personal Information</span>
                        </h2>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                        >
                            <span className="material-symbols-rounded text-lg">lock</span>
                            <span>Change Password</span>
                        </button>
                    </div>
                    <div className="space-y-3 sm:space-y-4">
                        <InfoCard 
                            title="Email" 
                            value={employee?.user_id || employee?.company_email || employee?.personal_email} 
                            icon="email"
                        />
                        <InfoCard 
                            title="Phone" 
                            value={employee?.cell_number} 
                            icon="phone"
                        />
                        <InfoCard 
                            title="Gender" 
                            value={employee?.gender} 
                            icon="wc"
                        />
                        {employee?.date_of_birth && (
                            <InfoCard 
                                title="Date of Birth" 
                                value={format(new Date(employee.date_of_birth), 'MMMM d, yyyy')} 
                                icon="cake"
                            />
                        )}
                        {employee?.date_of_joining && (
                            <InfoCard 
                                title="Date of Joining" 
                                value={format(new Date(employee.date_of_joining), 'MMMM d, yyyy')} 
                                icon="event"
                            />
                        )}
                    </div>
                </div>

                {/* Leave Balances */}
                {leaveBalances.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 lg:col-span-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <span className="material-symbols-rounded text-green-600 text-xl sm:text-2xl">event_available</span>
                            <span>Leave Balances</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {leaveBalances.map((balance) => (
                                <div key={balance.leave_type} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 md:p-6 border border-blue-100">
                                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                                        <h3 className="text-sm sm:text-base font-semibold text-gray-800 break-words">{balance.leave_type}</h3>
                                        <span className="material-symbols-rounded text-blue-600 text-xl sm:text-2xl flex-shrink-0 ml-2">
                                            {balance.leave_type === 'Casual Leave' ? 'beach_access' : 
                                             balance.leave_type === 'Sick Leave' ? 'local_hospital' : 
                                             'event_repeat'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-gray-600">Allocated:</span>
                                            <span className="font-semibold text-gray-800">{balance.allocated}</span>
                                        </div>
                                        <div className="flex justify-between text-xs sm:text-sm">
                                            <span className="text-gray-600">Used:</span>
                                            <span className="font-semibold text-gray-800">{balance.used}</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                                            <span className="text-gray-700 font-medium text-xs sm:text-sm">Remaining:</span>
                                            <span className={`font-bold text-base sm:text-lg ${
                                                balance.remaining > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {balance.remaining}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Emergency Contact */}
                {(employee?.person_to_be_contacted || employee?.emergency_phone_number) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 md:p-6 lg:col-span-2">
                        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
                            <span className="material-symbols-rounded text-red-600 text-xl sm:text-2xl">emergency</span>
                            <span>Emergency Contact</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {employee?.person_to_be_contacted && (
                                <InfoCard 
                                    title="Contact Name" 
                                    value={employee.person_to_be_contacted} 
                                    icon="person"
                                />
                            )}
                            {employee?.emergency_phone_number && (
                                <InfoCard 
                                    title="Phone Number" 
                                    value={employee.emergency_phone_number} 
                                    icon="phone"
                                />
                            )}
                            {employee?.relation && (
                                <InfoCard 
                                    title="Relation" 
                                    value={employee.relation} 
                                    icon="family_restroom"
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile/Tablet Logout Button - Bottom */}
            <div className="xl:hidden mt-6 flex justify-start">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                >
                    <span className="material-symbols-rounded text-xl">logout</span>
                    <span>Logout</span>
                </button>
            </div>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-symbols-rounded text-blue-600">lock</span>
                                <span>Change Password</span>
                            </h2>
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false)
                                    setOldPassword('')
                                    setNewPassword('')
                                    setConfirmPassword('')
                                }}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <span className="material-symbols-rounded text-2xl">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false)
                                        setOldPassword('')
                                        setNewPassword('')
                                        setConfirmPassword('')
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                                    disabled={changingPassword}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    {changingPassword ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Profile Photo Modal */}
            {showPhotoModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-symbols-rounded text-blue-600">photo_camera</span>
                                <span>Change Profile Photo</span>
                            </h2>
                            <button
                                onClick={() => setShowPhotoModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                                disabled={uploadingPhoto}
                            >
                                <span className="material-symbols-rounded text-2xl">close</span>
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Upload Own Photo */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Upload Your Photo</h3>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={uploadingPhoto}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                        className="flex flex-col items-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="material-symbols-rounded text-4xl text-gray-400">cloud_upload</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {uploadingPhoto ? 'Uploading...' : 'Click to upload or drag and drop'}
                                        </span>
                                        <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
                                    </button>
                                </div>
                            </div>

                            {/* Choose Avatar */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Choose an Avatar</h3>
                                <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
                                    {avatarStyles.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => handleAvatarSelect(style.id)}
                                            disabled={uploadingPhoto}
                                            className={`
                                                aspect-square rounded-xl border-2 p-3 flex flex-col items-center justify-center gap-2
                                                transition-all hover:scale-105
                                                ${selectedAvatarStyle === style.id 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                                }
                                                disabled:opacity-50 disabled:cursor-not-allowed
                                            `}
                                        >
                                            <img
                                                src={`https://api.dicebear.com/9.x/${style.id}/svg?seed=${encodeURIComponent(employeeName || user || 'User')}`}
                                                alt={style.name}
                                                className="w-full h-full object-contain"
                                            />
                                            <span className="text-xs font-medium text-gray-700">{style.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {uploadingPhoto && (
                            <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                                    <span className="text-sm font-medium">Updating profile photo...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Crop Modal */}
            <ImageCropModal
                isOpen={showCropModal}
                imageSrc={imageToCrop || ''}
                onClose={() => {
                    setShowCropModal(false)
                    setImageToCrop(null)
                }}
                onCropComplete={handleCropComplete}
                aspectRatio={1}
            />
        </div>
    )
}
