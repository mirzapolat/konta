import { useEffect, useState, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, BarChart2 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import type { SeriesObject, SeriesEvent, AttendanceObject, AttendanceRecord } from '@/types'
import { Button } from '@/components/ui/Button'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { downloadCSV, formatDate } from '@/lib/utils'

interface OutletCtx { series: SeriesObject | null }

interface AttendeeRow {
  key: string
  value: string
  present: number
  excused: number
  absent: number
  total: number
  rate: number
}

export default function SeriesAttendeesPage() {
  const { t, i18n } = useTranslation()
  const { series } = useOutletContext<OutletCtx>()
  const [seriesEvents, setSeriesEvents] = useState<(SeriesEvent & { attendance_object: AttendanceObject })[]>([])
  const [allRecords, setAllRecords] = useState<Record<string, AttendanceRecord[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!series?.id) return
      setLoading(true)
      const { data: eventsData } = await supabase
        .from('series_events')
        .select('*, attendance_object:attendance_objects(*)')
        .eq('series_id', series.id)
      if (!eventsData) { setLoading(false); return }
      setSeriesEvents(eventsData)
      const recordsMap: Record<string, AttendanceRecord[]> = {}
      for (const se of eventsData) {
        const { data: records } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('event_id', se.event_id)
        recordsMap[se.event_id] = records || []
      }
      setAllRecords(recordsMap)
      setLoading(false)
    }
    load()
  }, [series?.id])

  const combineOn = series?.combine_on || 'email'

  const attendeeRows = useMemo((): AttendeeRow[] => {
    const map = new Map<string, AttendeeRow>()
    for (const se of seriesEvents) {
      const records = allRecords[se.event_id] || []
      const uniqueKeys = new Set<string>()
      for (const r of records) {
        const key = r.content[combineOn] || r.id
        uniqueKeys.add(key)
        if (!map.has(key)) {
          map.set(key, { key, value: r.content[combineOn] || key, present: 0, excused: 0, absent: 0, total: seriesEvents.length, rate: 0 })
        }
        const row = map.get(key)!
        if (r.status === 'attended') row.present += se.weight
        else if (r.status === 'excused') row.excused += se.weight
      }
      // Mark absent for those not in this event
      for (const [key, row] of map.entries()) {
        if (!uniqueKeys.has(key)) row.absent += se.weight
      }
    }
    const totalWeight = seriesEvents.reduce((s, e) => s + e.weight, 0) || 1
    return Array.from(map.values()).map(r => ({
      ...r,
      rate: Math.round((r.present / totalWeight) * 100),
    })).sort((a, b) => b.present - a.present)
  }, [seriesEvents, allRecords, combineOn])

  // Graph data: attendance per event
  const graphData = seriesEvents.map(se => {
    const records = allRecords[se.event_id] || []
    return {
      name: se.attendance_object?.name?.slice(0, 15) || formatDate(se.attendance_object?.event_date || '', i18n.language),
      attended: records.filter(r => r.status === 'attended').length,
      excused: records.filter(r => r.status === 'excused').length,
    }
  })

  const handleExportCSV = () => {
    const headers = ['Identifier', 'Present', 'Excused', 'Absent', 'Attendance rate']
    const rows = attendeeRows.map(r => [r.value, String(r.present), String(r.excused), String(r.absent), `${r.rate}%`])
    downloadCSV(`${series?.name || 'series'}-attendees.csv`, [headers, ...rows])
  }

  const handleExportMatrix = () => {
    const eventNames = seriesEvents.map(se => se.attendance_object?.name || se.event_id)
    const headers = ['Identifier', ...eventNames]
    const rows = attendeeRows.map(row => {
      const eventCols = seriesEvents.map(se => {
        const records = allRecords[se.event_id] || []
        const r = records.find(rec => rec.content[combineOn] === row.value)
        if (!r) return 'absent'
        return r.status
      })
      return [row.value, ...eventCols]
    })
    downloadCSV(`${series?.name || 'series'}-matrix.csv`, [headers, ...rows])
  }

  const columns = [
    { key: 'value', header: combineOn.charAt(0).toUpperCase() + combineOn.slice(1), sortable: true },
    { key: 'present', header: t('series.present'), sortable: true, render: (r: AttendeeRow) => <Badge variant="success">{r.present}</Badge> },
    { key: 'excused', header: t('series.excused'), sortable: true, render: (r: AttendeeRow) => <Badge variant="info">{r.excused}</Badge> },
    { key: 'absent', header: t('series.absent'), sortable: true, render: (r: AttendeeRow) => <Badge variant="muted">{r.absent}</Badge> },
    {
      key: 'rate',
      header: t('series.attendance_rate'),
      sortable: true,
      render: (r: AttendeeRow) => (
        <div className="flex items-center gap-2">
          <div className="w-16 sm:w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.rate}%` }} />
          </div>
          <span className="text-xs text-gray-600 tabular-nums">{r.rate}%</span>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('series.attendees')}
        description={`${attendeeRows.length} unique attendees`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExportCSV}>{t('series.export_csv')}</Button>
            <Button variant="outline" size="sm" icon={<BarChart2 size={13} />} onClick={handleExportMatrix}>{t('series.export_matrix')}</Button>
          </div>
        }
      />

      {/* Graph */}
      {graphData.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-800 mb-4">Attendance over time</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="attended" stackId="1" stroke="#10b981" fill="#d1fae5" name="Attended" />
              <Area type="monotone" dataKey="excused" stackId="1" stroke="#60a5fa" fill="#dbeafe" name="Excused" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable
        data={attendeeRows} columns={columns as any} keyField="key"
        loading={loading} emptyMessage="No attendees yet"
      />
    </div>
  )
}
