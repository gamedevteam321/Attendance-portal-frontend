import { useState, useEffect, useRef } from 'react'

export interface DropdownOption {
    value: string
    label: string
}

interface DropdownProps {
    label?: string
    options: DropdownOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    required?: boolean
    className?: string
    triggerClassName?: string
    /** Show search input to filter options by typing */
    searchable?: boolean
    /** Optional footer content (e.g. "Add new" button). Receives closeDropdown so footer can close the list. */
    renderFooter?: (closeDropdown: () => void) => React.ReactNode
}

export default function Dropdown({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select…',
    required,
    className = '',
    triggerClassName = '',
    searchable,
    renderFooter,
}: DropdownProps) {
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const searchInputRef = useRef<HTMLInputElement>(null)
    const ref = useRef<HTMLDivElement>(null)

    const selectedLabel = value ? (options.find(o => o.value === value)?.label ?? value) : ''

    const filteredOptions = searchable && searchQuery.trim()
        ? options.filter(
            o =>
                o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.value.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) {
            document.addEventListener('mousedown', handleClickOutside)
            if (searchable) {
                setSearchQuery('')
                setTimeout(() => searchInputRef.current?.focus(), 0)
            }
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [open, searchable])

    return (
        <div ref={ref} className={`relative ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className={`w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 flex items-center justify-between min-h-[42px] ${triggerClassName}`}
            >
                <span className={value ? '' : 'text-gray-500'}>{selectedLabel || placeholder}</span>
                <span className="material-symbols-rounded text-lg text-gray-400">
                    {open ? 'expand_less' : 'expand_more'}
                </span>
            </button>
            {open && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-hidden flex flex-col">
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="relative">
                                <span className="material-symbols-rounded absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none">
                                    search
                                </span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search…"
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}
                    <div className="overflow-y-auto py-1 flex-1 min-h-0">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('')
                                setOpen(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50"
                        >
                            {placeholder}
                        </button>
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
                        ) : (
                        filteredOptions.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value)
                                    setOpen(false)
                                }}
                                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${value === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-800 hover:bg-gray-50'}`}
                            >
                                {value === opt.value && (
                                    <span className="material-symbols-rounded text-base">check</span>
                                )}
                                {opt.label}
                            </button>
                        ))
                        )}
                    </div>
                    {renderFooter && (
                        <div className="border-t border-gray-100 p-1 bg-gray-50">
                            {renderFooter(() => setOpen(false))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
