import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RsvpObject, RsvpField, RsvpFieldType } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Section, PageHeader } from '@/components/ui/PageHeader'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

interface OutletCtx { rsvp: RsvpObject | null; setRsvp: (r: RsvpObject) => void }

const FIELD_TYPES: { value: RsvpFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' },
  { value: 'phone', label: 'Phone' },
  { value: 'select', label: 'Select from list' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
]

export default function RsvpFormPage() {
  const { t } = useTranslation()
  const { rsvp, setRsvp } = useOutletContext<OutletCtx>()
  const [name, setName] = useState(rsvp?.name || '')
  const [eventDate, setEventDate] = useState(rsvp?.event_date ? rsvp.event_date.slice(0, 16) : '')
  const [fields, setFields] = useState<RsvpField[]>(rsvp?.fields || [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
  ])
  const [active, setActive] = useState(rsvp?.active ?? true)
  const [emailReceipts, setEmailReceipts] = useState(rsvp?.email_receipts ?? false)
  const [saving, setSaving] = useState(false)
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState<Partial<RsvpField>>({ type: 'text', required: false })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rsvp) return
    setSaving(true)
    const { data, error } = await supabase
      .from('rsvp_objects')
      .update({ name: name.trim(), event_date: eventDate || null, fields, active, email_receipts: emailReceipts })
      .eq('id', rsvp.id)
      .select().single()
    if (error) toast.error(error.message)
    else { setRsvp(data); toast.success('Saved') }
    setSaving(false)
  }

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newField.label) return
    setFields(prev => [...prev, {
      name: newField.label!.toLowerCase().replace(/\s+/g, '_'),
      label: newField.label!,
      description: newField.description,
      type: newField.type as RsvpFieldType || 'text',
      required: newField.required || false,
    }])
    setNewField({ type: 'text', required: false })
    setShowAddField(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader title={t('rsvp.form')} />
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Section title="General">
          <div className="flex flex-col gap-4">
            <Input label={t('rsvp.form_name')} value={name} onChange={e => setName(e.target.value)} required />
            <Input label={t('rsvp.event_date')} type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            <Toggle checked={active} onChange={setActive} label="Form active" description="Accept new submissions" />
            <Toggle checked={emailReceipts} onChange={setEmailReceipts} label="Email receipts" description="Send confirmation to submitters" />
          </div>
        </Section>

        <Section title={t('rsvp.fields')}>
          <div className="flex flex-col gap-2 mb-3">
            {fields.map((f, i) => (
              <div key={f.name} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-white">
                <GripVertical size={14} className="text-gray-300" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{f.label}</span>
                  {f.description && <span className="text-xs text-gray-400 ml-2">— {f.description}</span>}
                  <span className="text-xs text-gray-400 ml-2">({f.type})</span>
                  {f.required && <span className="text-xs text-red-400 ml-1">*</span>}
                </div>
                {f.name !== 'name' && f.name !== 'email' && (
                  <button type="button" onClick={() => setFields(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setShowAddField(true)}>
            {t('rsvp.add_field')}
          </Button>
        </Section>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>{t('common.save')}</Button>
        </div>
      </form>

      <Modal open={showAddField} onClose={() => setShowAddField(false)} title={t('rsvp.add_field')} size="sm">
        <form onSubmit={handleAddField} className="flex flex-col gap-3 mt-1">
          <Input label="Label" value={newField.label || ''} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))} required autoFocus />
          <Input label="Description (optional)" value={newField.description || ''} onChange={e => setNewField(p => ({ ...p, description: e.target.value }))} />
          <Select label="Type" value={newField.type || 'text'} onChange={e => setNewField(p => ({ ...p, type: e.target.value as RsvpFieldType }))} options={FIELD_TYPES} />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={newField.required || false} onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))} className="rounded border-gray-300" />
            Required
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowAddField(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
