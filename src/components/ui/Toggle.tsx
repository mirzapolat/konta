import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, label, description, disabled, size = 'md' }: ToggleProps) {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <div
        className={cn(
          'relative shrink-0 rounded-full transition-colors duration-200',
          size === 'sm' ? 'w-8 h-4' : 'w-10 h-5',
          checked ? 'bg-gray-900' : 'bg-gray-300'
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className={cn(
          'absolute top-0.5 rounded-full bg-white shadow transition-transform duration-200',
          size === 'sm' ? 'w-3 h-3 left-0.5' : 'w-4 h-4 left-0.5',
          checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5')
        )} />
      </div>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-gray-800">{label}</p>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      )}
    </label>
  )
}
