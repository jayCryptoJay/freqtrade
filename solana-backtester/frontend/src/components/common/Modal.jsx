import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          'relative bg-bg-secondary border border-bg-border rounded-t-2xl sm:rounded-2xl w-full animate-slide-up',
          'max-h-[90dvh] flex flex-col',
          size === 'lg' ? 'sm:max-w-2xl' : size === 'xl' ? 'sm:max-w-4xl' : 'sm:max-w-lg'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bg-border shrink-0">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-gray-400 hover:text-white transition-colors touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4">{children}</div>
      </div>
    </div>
  )
}
