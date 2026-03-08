export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-600" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  )
}
