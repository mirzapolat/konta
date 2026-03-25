import { useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { QrCode, List, Link2, Shield, Settings, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject } from '@/types'
import { formatDate } from '@/lib/utils'
import { PageSpinner } from '@/components/ui/Spinner'

export default function AttendanceLayout() {
  const { t, i18n } = useTranslation()
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<AttendanceObject | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('attendance_objects')
      .select('*')
      .eq('id', eventId)
      .single()
      .then(({ data }: { data: AttendanceObject | null }) => {
        setEvent(data)
        setLoading(false)
      })
  }, [eventId])

  if (loading) return <PageSpinner />

  const base = `/app/attendance/${eventId}`
  const navItems = [
    { to: `${base}/checkin`, label: t('attendance.checkin'), icon: <QrCode size={14} /> },
    { to: `${base}/list`, label: t('attendance.attendance'), icon: <List size={14} /> },
    { to: `${base}/excuse-links`, label: t('attendance.excuse_links'), icon: <Link2 size={14} /> },
    { to: `${base}/moderation`, label: t('attendance.moderation'), icon: <Shield size={14} /> },
    { to: `${base}/settings`, label: t('attendance.settings'), icon: <Settings size={14} /> },
  ]

  return (
    <div className="flex h-full -mx-6 -my-8">
      {/* Secondary sidebar — desktop only */}
      <aside className="hidden sm:flex w-52 shrink-0 border-r border-gray-200 flex-col bg-gray-50/50 h-full overflow-y-auto">
        <div className="px-3 py-4 border-b border-gray-100">
          <button
            onClick={() => navigate('/app/projects')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
          >
            <ChevronLeft size={12} />
            {t('common.back')}
          </button>
          <p className="text-sm font-semibold text-gray-900 truncate">{event?.name || '…'}</p>
          {event?.event_date && (
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(event.event_date, i18n.language)}
            </p>
          )}
        </div>
        <nav className="flex-1 p-2">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}>
              {({ isActive }) => (
                <div className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5',
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                )}>
                  {item.icon && <span className="shrink-0 text-gray-400">{item.icon}</span>}
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile top tab bar */}
        <div className="sm:hidden border-b border-gray-200 bg-white px-2 pt-2">
          <button
            onClick={() => navigate('/app/projects')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1.5 transition-colors"
          >
            <ChevronLeft size={12} />
            {t('common.back')}
          </button>
          <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-thin">
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to}>
                {({ isActive }) => (
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    isActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
                  )}>
                    {item.icon}
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          <Outlet context={{ event, setEvent }} />
        </div>
      </div>
    </div>
  )
}
