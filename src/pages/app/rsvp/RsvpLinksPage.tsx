import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RsvpObject, RsvpLink } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'

interface OutletCtx { rsvp: RsvpObject | null }

export default function RsvpLinksPage() {
  const { t } = useTranslation()
  const { rsvp } = useOutletContext<OutletCtx>()
  const [links, setLinks] = useState<RsvpLink[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const load = async () => {
    if (!rsvp?.id) return
    setLoading(true)
    const { data } = await supabase.from('rsvp_links').select('*').eq('rsvp_id', rsvp.id).order('created_at', { ascending: false })
    setLinks(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [rsvp?.id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rsvp) return
    setCreating(true)
    const { error } = await supabase.from('rsvp_links').insert({ rsvp_id: rsvp.id, label: label.trim(), active: true, open_count: 0, fill_count: 0 })
    if (error) toast.error(error.message)
    else { await load(); toast.success('Created') }
    setCreating(false)
    setShowCreate(false)
    setLabel('')
  }

  const handleToggle = async (link: RsvpLink) => {
    await supabase.from('rsvp_links').update({ active: !link.active }).eq('id', link.id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('rsvp_links').delete().eq('id', id)
    await load()
    setDeleteTarget(null)
  }

  const getRsvpUrl = (id: string) => `${window.location.origin}/rsvp/${id}`

  const columns = [
    { key: 'label', header: t('rsvp.link_label'), sortable: true },
    { key: 'open_count', header: t('rsvp.opens'), sortable: true, render: (l: RsvpLink) => <span className="text-gray-600">{l.open_count}</span> },
    { key: 'fill_count', header: t('rsvp.fills'), sortable: true, render: (l: RsvpLink) => <span className="text-gray-600">{l.fill_count}</span> },
    { key: 'active', header: 'Status', render: (l: RsvpLink) => <Badge variant={l.active ? 'success' : 'muted'} dot>{l.active ? t('rsvp.active') : t('rsvp.inactive')}</Badge> },
  ]

  return (
    <div>
      <PageHeader title={t('rsvp.links')} actions={
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setShowCreate(true)}>{t('rsvp.create_link')}</Button>
      } />
      <DataTable
        data={links} columns={columns as any} keyField="id" loading={loading} selectable={false}
        emptyMessage="No links yet"
        actions={(l: RsvpLink) => (
          <div className="flex gap-1">
            <button className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={() => { copyToClipboard(getRsvpUrl(l.id)); toast.success(t('common.copied')) }}><Copy size={13} /></button>
            <button className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={() => handleToggle(l)}>{l.active ? <ToggleRight size={13} className="text-emerald-500" /> : <ToggleLeft size={13} />}</button>
            <button className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(l.id)}><Trash2 size={13} /></button>
          </div>
        )}
      />
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('rsvp.create_link')} size="sm">
        <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-1">
          <Input label={t('rsvp.link_label')} value={label} onChange={e => setLabel(e.target.value)} required autoFocus />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={creating}>Create</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} title="Delete this link?" confirmLabel="Delete" />
    </div>
  )
}
