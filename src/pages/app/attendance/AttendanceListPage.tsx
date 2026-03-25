import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Upload, Trash2, CheckCircle, XCircle, AlertTriangle, MoreHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceRecord } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { downloadCSV, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

interface OutletCtx {
  event: AttendanceObject | null
  setEvent: (e: AttendanceObject) => void
}

export default function AttendanceListPage() {
  const { t, i18n } = useTranslation()
  const { event } = useOutletContext<OutletCtx>()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'attended' | 'excused' | 'collision'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCollisionModal, setShowCollisionModal] = useState<AttendanceRecord | null>(null)
  const [addForm, setAddForm] = useState<Record<string, string>>({})
  const [addStatus, setAddStatus] = useState<'attended' | 'excused'>('attended')
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!event?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('event_id', event.id)
      .order('recorded_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }, [event?.id])

  useEffect(() => { load() }, [load])

  // Realtime updates
  useEffect(() => {
    if (!event?.id) return
    const ch = supabase.channel(`records-list:${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `event_id=eq.${event.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [event?.id, load])

  const filtered = records.filter(r => {
    if (filter === 'attended') return r.status === 'attended' && !r.client_id_collision
    if (filter === 'excused') return r.status === 'excused'
    if (filter === 'collision') return !!r.client_id_collision
    return true
  })

  const handleToggleStatus = async (record: AttendanceRecord) => {
    const newStatus = record.status === 'attended' ? 'excused' : 'attended'
    await supabase.from('attendance_records').update({ status: newStatus }).eq('id', record.id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('attendance_records').delete().eq('id', id)
    await load()
    setDeleteTarget(null)
  }

  const handleDeleteSelected = async (ids: (string | number)[]) => {
    await supabase.from('attendance_records').delete().in('id', ids as string[])
    await load()
    toast.success(`Deleted ${ids.length} records`)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setAdding(true)
    const { error } = await supabase.from('attendance_records').insert({
      event_id: event.id,
      content: addForm,
      status: addStatus,
      recorded_with: 'manual',
      client_id: null,
      client_id_collision: null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Added'); await load() }
    setAdding(false)
    setShowAddModal(false)
    setAddForm({})
  }

  const handleExportCSV = () => {
    if (!event) return
    const nameField = event.fields.find(f => f.name === 'name' || f.type === 'text')
    const emailField = event.fields.find(f => f.name === 'email' || f.type === 'email')
    const rows = [
      ['Name', 'Email', 'Status', 'Date', 'Time', 'Recorded with'],
      ...filtered.map(r => [
        r.content[nameField?.name || 'name'] || '',
        r.content[emailField?.name || 'email'] || '',
        r.status,
        formatDateTime(r.recorded_at, i18n.language).split(' ')[0],
        formatDateTime(r.recorded_at, i18n.language).split(' ')[1],
        r.recorded_with,
      ])
    ]
    downloadCSV(`${event.name}-attendance.csv`, rows)
  }

  const collisionRecords = (record: AttendanceRecord) =>
    records.filter(r => r.client_id === record.client_id && r.id !== record.id)

  const statusBadge = (r: AttendanceRecord) => {
    if (r.client_id_collision) return <Badge variant="warning" dot>Collision</Badge>
    if (r.status === 'attended') return <Badge variant="success" dot>{t('attendance.status_attended')}</Badge>
    return <Badge variant="info" dot>{t('attendance.status_excused')}</Badge>
  }

  const columns = [
    ...event?.fields.filter(f => f.show_in_table !== false).map(f => ({
      key: f.name,
      header: f.label,
      sortable: true,
      render: (r: AttendanceRecord) => <span className="text-gray-700">{r.content[f.name] || '—'}</span>,
    })) || [],
    {
      key: 'recorded_at',
      header: t('common.date'),
      sortable: true,
      render: (r: AttendanceRecord) => <span className="text-gray-500 text-xs">{formatDateTime(r.recorded_at, i18n.language)}</span>,
    },
    {
      key: 'status',
      header: t('attendance.col_status'),
      render: (r: AttendanceRecord) => (
        <button onClick={() => r.client_id_collision ? setShowCollisionModal(r) : null}>
          {statusBadge(r)}
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('attendance.attendance')}
        description={`${records.length} records`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExportCSV}>
              {t('attendance.export_csv')}
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowAddModal(true)}>
              {t('attendance.add_manually')}
            </Button>
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(['all', 'attended', 'excused', 'collision'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? t('attendance.filter_all') :
             f === 'attended' ? t('attendance.filter_attended') :
             f === 'excused' ? t('attendance.filter_excused') :
             t('attendance.filter_collision')}
            {' '}
            <span className="opacity-60">
              {f === 'all' ? records.length :
               f === 'attended' ? records.filter(r => r.status === 'attended' && !r.client_id_collision).length :
               f === 'excused' ? records.filter(r => r.status === 'excused').length :
               records.filter(r => r.client_id_collision).length}
            </span>
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns as any}
        keyField="id"
        loading={loading}
        onDeleteSelected={handleDeleteSelected}
        emptyMessage="No records"
        actions={(r: AttendanceRecord) => (
          <div className="flex gap-1">
            <button
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              title={r.status === 'attended' ? t('attendance.mark_excused') : t('attendance.mark_attended')}
              onClick={() => handleToggleStatus(r)}
            >
              {r.status === 'attended' ? <XCircle size={13} /> : <CheckCircle size={13} />}
            </button>
            <button
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
              title={t('attendance.delete_record')}
              onClick={() => setDeleteTarget(r.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      />

      {/* Add manually modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={t('attendance.add_manually')} size="md">
        <form onSubmit={handleAdd} className="flex flex-col gap-4 mt-1">
          {event?.fields.map(f => (
            <Input
              key={f.name}
              label={f.label}
              type={f.type === 'email' ? 'email' : 'text'}
              value={addForm[f.name] || ''}
              onChange={e => setAddForm(prev => ({ ...prev, [f.name]: e.target.value }))}
              required={f.required}
            />
          ))}
          <Select
            label="Status"
            value={addStatus}
            onChange={e => setAddStatus(e.target.value as any)}
            options={[
              { value: 'attended', label: t('attendance.status_attended') },
              { value: 'excused', label: t('attendance.status_excused') },
            ]}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={adding}>Add</Button>
          </div>
        </form>
      </Modal>

      {/* Collision detail modal */}
      <Modal
        open={!!showCollisionModal}
        onClose={() => setShowCollisionModal(null)}
        title={t('attendance.collision_detail')}
        size="lg"
      >
        {showCollisionModal && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-500">{t('attendance.collision_records')}</p>
            {collisionRecords(showCollisionModal).concat([showCollisionModal]).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                <div className="text-sm">
                  {event?.fields.map(f => (
                    <span key={f.name} className="mr-3">
                      <span className="text-gray-400">{f.label}: </span>
                      <span className="text-gray-900">{r.content[f.name] || '—'}</span>
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 block mt-0.5">{formatDateTime(r.recorded_at, i18n.language)}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={async () => {
                    await supabase.from('attendance_records').update({ client_id_collision: null }).eq('id', r.id)
                    await load()
                  }}>Clear</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Delete</Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 justify-end border-t border-gray-100 pt-3">
              <Button variant="danger" size="sm" onClick={async () => {
                const ids = collisionRecords(showCollisionModal).map(r => r.id)
                await handleDeleteSelected(ids)
                setShowCollisionModal(null)
              }}>
                {t('attendance.delete_all_collisions')}
              </Button>
              <Button variant="primary" size="sm" onClick={async () => {
                const ids = collisionRecords(showCollisionModal).concat([showCollisionModal]).map(r => r.id)
                await supabase.from('attendance_records').update({ client_id_collision: null }).in('id', ids)
                await load()
                setShowCollisionModal(null)
              }}>
                {t('attendance.clear_collisions')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete this record?"
        confirmLabel="Delete"
      />
    </div>
  )
}
