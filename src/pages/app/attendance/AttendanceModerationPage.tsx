import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceModeration } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { copyToClipboard, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

interface OutletCtx {
  event: AttendanceObject | null
}

export default function AttendanceModerationPage() {
  const { t, i18n } = useTranslation()
  const { event } = useOutletContext<OutletCtx>()
  const [links, setLinks] = useState<AttendanceModeration[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState('')
  const [expires, setExpires] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const load = async () => {
    if (!event?.id) return
    setLoading(true)
    const { data } = await supabase
      .from('attendance_moderation')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [event?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setCreating(true)
    const { error } = await supabase.from('attendance_moderation').insert({
      event_id: event.id,
      label: label.trim(),
      active: true,
      expires_at: expires || null,
    })
    if (error) toast.error(error.message)
    else { toast.success('Created'); await load() }
    setCreating(false)
    setShowCreate(false)
    setLabel('')
    setExpires('')
  }

  const handleToggle = async (link: AttendanceModeration) => {
    await supabase.from('attendance_moderation').update({ active: !link.active }).eq('id', link.id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('attendance_moderation').delete().eq('id', id)
    await load()
    setDeleteTarget(null)
    toast.success('Deleted')
  }

  const getModerationUrl = (id: string) => `${window.location.origin}/moderate/${id}`

  const columns = [
    { key: 'label', header: t('moderation.label'), sortable: true },
    {
      key: 'active',
      header: 'Status',
      render: (l: AttendanceModeration) => (
        <Badge variant={l.active ? 'success' : 'muted'} dot>
          {l.active ? t('moderation.active') : t('moderation.inactive')}
        </Badge>
      ),
    },
    {
      key: 'expires_at',
      header: t('moderation.expires'),
      render: (l: AttendanceModeration) => l.expires_at
        ? <span className="text-gray-500 text-xs">{formatDateTime(l.expires_at, i18n.language)}</span>
        : <span className="text-gray-400 text-xs">{t('moderation.no_expiry')}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('moderation.title')}
        actions={
          <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>
            {t('moderation.create')}
          </Button>
        }
      />

      <DataTable
        data={links}
        columns={columns as any}
        keyField="id"
        loading={loading}
        selectable={false}
        emptyMessage={t('moderation.empty')}
        emptyDescription={t('moderation.empty_desc')}
        actions={(l: AttendanceModeration) => (
          <div className="flex gap-1">
            <button
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              title={t('moderation.copy_link')}
              onClick={() => { copyToClipboard(getModerationUrl(l.id)); toast.success(t('common.copied')) }}
            >
              <Copy size={13} />
            </button>
            <button
              className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              onClick={() => handleToggle(l)}
            >
              {l.active ? <ToggleRight size={13} className="text-emerald-500" /> : <ToggleLeft size={13} />}
            </button>
            <button
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
              onClick={() => setDeleteTarget(l.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('moderation.create')} size="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-1">
          <Input
            label={t('moderation.label')}
            value={label}
            onChange={e => setLabel(e.target.value)}
            required
            autoFocus
          />
          <Input
            label={t('moderation.expires')}
            type="datetime-local"
            value={expires}
            onChange={e => setExpires(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        title="Delete this moderation link?"
        confirmLabel="Delete"
      />
    </div>
  )
}
