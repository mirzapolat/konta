import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { SeriesObject, SeriesEvent, AttendanceObject } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface OutletCtx { series: SeriesObject | null }

export default function SeriesEventsPage() {
  const { t, i18n } = useTranslation()
  const { series } = useOutletContext<OutletCtx>()
  const { currentWorkspace } = useWorkspaceStore()
  const [events, setEvents] = useState<(SeriesEvent & { attendance_object: AttendanceObject })[]>([])
  const [availableEvents, setAvailableEvents] = useState<AttendanceObject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [weight, setWeight] = useState('1')
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const load = async () => {
    if (!series?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('series_events')
      .select('*, attendance_object:attendance_objects(*)')
      .eq('series_id', series.id)
    setEvents(data || [])
    setLoading(false)
  }

  const loadAvailable = async () => {
    if (!currentWorkspace) return
    const { data } = await supabase
      .from('attendance_objects')
      .select('*')
      .eq('workspace_id', currentWorkspace.id)
      .order('event_date', { ascending: false })
    setAvailableEvents(data || [])
  }

  useEffect(() => { load() }, [series?.id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!series || !selectedEventId) return
    setAdding(true)
    const { error } = await supabase.from('series_events').insert({
      series_id: series.id,
      event_id: selectedEventId,
      weight: parseInt(weight) || 1,
    })
    if (error) toast.error(error.message)
    else { await load(); toast.success('Event added') }
    setAdding(false)
    setShowAdd(false)
    setSelectedEventId('')
    setWeight('1')
  }

  const handleDelete = async (eventId: string) => {
    await supabase.from('series_events').delete().eq('series_id', series!.id).eq('event_id', eventId)
    await load()
    setDeleteTarget(null)
  }

  const columns = [
    {
      key: 'name',
      header: 'Event',
      sortable: true,
      render: (e: any) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{e.attendance_object?.name || '—'}</p>
          {e.attendance_object?.event_date && (
            <p className="text-xs text-gray-400">{formatDate(e.attendance_object.event_date, i18n.language)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'weight',
      header: t('series.weight'),
      sortable: true,
      render: (e: any) => <span className="text-gray-600 font-mono">{e.weight}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('series.events')}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => { loadAvailable(); setShowAdd(true) }}>
            {t('series.add_event')}
          </Button>
        }
      />
      <DataTable
        data={events} columns={columns as any} keyField="event_id"
        loading={loading} selectable={false} emptyMessage="No events in this series yet"
        actions={(e: any) => (
          <button className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(e.event_id)}>
            <Trash2 size={13} />
          </button>
        )}
      />
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('series.add_event')} size="sm">
        <form onSubmit={handleAdd} className="flex flex-col gap-3 mt-1">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Event</label>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              required
              className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white"
            >
              <option value="">Select an event…</option>
              {availableEvents.filter(e => !events.find(se => se.event_id === e.id)).map(e => (
                <option key={e.id} value={e.id}>{e.name}{e.event_date ? ` — ${formatDate(e.event_date, i18n.language)}` : ''}</option>
              ))}
            </select>
          </div>
          <Input label={t('series.weight')} type="number" min="1" value={weight} onChange={e => setWeight(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={adding}>Add</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} title="Remove this event from the series?" confirmLabel="Remove" />
    </div>
  )
}
