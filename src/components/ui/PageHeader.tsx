import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6', className)}>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  )
}

interface SectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <div className={cn('border border-gray-200 rounded-xl p-5', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-sm font-semibold text-gray-800">{title}</h3>}
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
