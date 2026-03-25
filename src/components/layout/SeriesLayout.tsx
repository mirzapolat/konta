import { useEffect, useState } from 'react'
import { Outlet, useParams, useNavigate, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Users, Shuffle, Settings, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { SeriesObject } from '@/types'
import { PageSpinner } from '@/components/ui/Spinner'

export default function SeriesLayout() {
  const { t } = useTranslation()
  const { seriesId } = useParams()
  const navigate = useNavigate()
  const [series, setSeries] = useState<SeriesObject | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!seriesId) return
    supabase
      .from('series_objects')
      .select('*')
      .eq('id', seriesId)
      .single()
      .then(({ data }: { data: SeriesObject | null }) => {
        setSeries(data)
        setLoading(false)
      })
  }, [seriesId])

  if (loading) return <PageSpinner />

  const base = `/app/series/${seriesId}`
  const navItems = [
    { to: `${base}/events`, label: t('series.events'), icon: <CalendarDays size={14} /> },
    { to: `${base}/attendees`, label: t('series.attendees'), icon: <Users size={14} /> },
    { to: `${base}/collisions`, label: t('series.collisions'), icon: <Shuffle size={14} /> },
    { to: `${base}/settings`, label: t('series.settings'), icon: <Settings size={14} /> },
  ]

  return (
    <div className="flex h-full -mx-6 -my-8">
      <aside className="hidden sm:flex w-52 shrink-0 border-r border-gray-200 flex-col bg-gray-50/50 h-full overflow-y-auto">
        <div className="px-3 py-4 border-b border-gray-100">
          <button
            onClick={() => navigate('/app/projects')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
          >
            <ChevronLeft size={12} />
            {t('common.back')}
          </button>
          <p className="text-sm font-semibold text-gray-900 truncate">{series?.name || '…'}</p>
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
      <div className="flex-1 overflow-y-auto flex flex-col">
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
          <Outlet context={{ series, setSeries }} />
        </div>
      </div>
    </div>
  )
}
