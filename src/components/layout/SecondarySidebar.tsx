import { NavLink } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon?: React.ReactNode
}

interface SecondarySidebarProps {
  title: string
  subtitle?: string
  backTo?: string
  navItems: NavItem[]
  children?: React.ReactNode
}

export default function SecondarySidebar({ title, subtitle, backTo, navItems, children }: SecondarySidebarProps) {
  return (
    <div className="flex h-full">
      <aside className="w-48 shrink-0 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="px-3 py-4 border-b border-gray-100">
          {backTo && (
            <NavLink
              to={backTo}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
            >
              <ChevronLeft size={12} />
              Back to projects
            </NavLink>
          )}
          <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                )}>
                  {item.icon && <span className="shrink-0 text-gray-400">{item.icon}</span>}
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
        {children}
      </aside>
      <div className="flex-1 overflow-hidden" />
    </div>
  )
}
