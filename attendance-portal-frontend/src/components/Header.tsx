import NotificationDropdown from './NotificationDropdown'

export default function Header({ title }: { title: string }) {

    return (
        <header className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
            <h1 className="text-xl font-semibold text-gray-800">{title}</h1>

            <div className="flex items-center gap-6">
                <NotificationDropdown />
            </div>
        </header>
    )
}
