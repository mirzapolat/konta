import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, EventField, FieldType, CollisionMode } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Section, PageHeader } from '@/components/ui/PageHeader'
import { Toggle } from '@/components/ui/Toggle'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'sonner'

interface OutletCtx {
  event: AttendanceObject | null
  setEvent: (e: AttendanceObject) => void
}

const DEFAULT_FIELDS: EventField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, show_in_table: true },
  { name: 'email', label: 'Email', type: 'email', required: true, show_in_table: true },
]

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone number' },
  { value: 'select', label: 'Select from list' },
]

export default function AttendanceSettingsPage() {
  const { t } = useTranslation()
  const { event, setEvent } = useOutletContext<OutletCtx>()
  const [name, setName] = useState(event?.name || '')
  const [eventDate, setEventDate] = useState(event?.event_date ? event.event_date.slice(0, 16) : '')
  const [fields, setFields] = useState<EventField[]>(event?.fields || DEFAULT_FIELDS)
  const [rotatingEnabled, setRotatingEnabled] = useState(event?.security_rotatingcode_enabled ?? true)
  const [rotationInterval, setRotationInterval] = useState(event?.security_rotatingcode_interval || 10)
  const [collisionMode, setCollisionMode] = useState<CollisionMode>(event?.security_clientidchecks_type || 'ignore')
  const [clientIdEnabled, setClientIdEnabled] = useState(event?.security_clientidchecks_enabled ?? false)
  const [emailReceipts, setEmailReceipts] = useState(event?.email_receipts ?? false)
  const [brandingEnabled, setBrandingEnabled] = useState(event?.branding_enabled ?? true)
  const [saving, setSaving] = useState(false)
  const [showAddField, setShowAddField] = useState(false)
  const [newField, setNewField] = useState<Partial<EventField>>({ type: 'text', required: false })
  const [hasRecords, setHasRecords] = useState(false)
  const [showFieldWarning, setShowFieldWarning] = useState(false)

  useEffect(() => {
    if (event?.id) {
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('event_id', event.id)
        .then(({ count }) => setHasRecords((count || 0) > 0))
    }
  }, [event?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setSaving(true)
    const { data, error } = await supabase
      .from('attendance_objects')
      .update({
        name: name.trim(),
        event_date: eventDate || null,
        fields,
        security_rotatingcode_enabled: rotatingEnabled,
        security_rotatingcode_interval: rotationInterval,
        security_clientidchecks_enabled: clientIdEnabled,
        security_clientidchecks_type: collisionMode,
        email_receipts: emailReceipts,
        branding_enabled: brandingEnabled,
      })
      .eq('id', event.id)
      .select()
      .single()
    if (error) toast.error(error.message)
    else { setEvent(data); toast.success('Saved') }
    setSaving(false)
  }

  const handleAddField = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newField.name || !newField.label) return
    const field: EventField = {
      name: newField.name.toLowerCase().replace(/\s+/g, '_'),
      label: newField.label,
      type: newField.type as FieldType || 'text',
      required: newField.required || false,
      show_in_table: true,
    }
    setFields(prev => [...prev, field])
    setNewField({ type: 'text', required: false })
    setShowAddField(false)
  }

  const handleRemoveField = (name: string) => {
    if (name === 'email') { toast.error('Email field cannot be removed'); return }
    if (hasRecords) setShowFieldWarning(true)
    setFields(prev => prev.filter(f => f.name !== name))
  }

  const isDefault = (name: string) => name === 'name' || name === 'email'

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader title={t('event_settings.title')} />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* General */}
        <Section title="General">
          <div className="flex flex-col gap-4">
            <Input
              label={t('event_settings.event_name')}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label={`${t('event_settings.event_date')} & ${t('event_settings.event_time')}`}
              type="datetime-local"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
            />
          </div>
        </Section>

        {/* Branding */}
        <Section title={t('event_settings.branding')}>
          <Toggle
            checked={brandingEnabled}
            onChange={setBrandingEnabled}
            label={t('event_settings.branding')}
            description={t('event_settings.branding_desc')}
          />
        </Section>

        {/* Form fields */}
        <Section title={t('event_settings.fields')}>
          {hasRecords && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              {t('event_settings.fields_change_warning')}
            </div>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {fields.map(f => (
              <div key={f.name} className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg bg-white">
                <GripVertical size={14} className="text-gray-300" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800">{f.label}</span>
                  <span className="text-xs text-gray-400 ml-2">({f.type})</span>
                  {f.required && <span className="text-xs text-red-400 ml-1">*</span>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={f.show_in_table ?? true}
                      onChange={e => setFields(prev => prev.map(pf => pf.name === f.name ? { ...pf, show_in_table: e.target.checked } : pf))}
                      className="rounded border-gray-300"
                    />
                    {t('event_settings.field_show_in_table')}
                  </label>
                  {!isDefault(f.name) && (
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f.name)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" icon={<Plus size={13} />} onClick={() => setShowAddField(true)}>
            {t('event_settings.add_field')}
          </Button>
        </Section>

        {/* Security */}
        <Section title={t('event_settings.security')}>
          <div className="flex flex-col gap-5">
            <Toggle
              checked={rotatingEnabled}
              onChange={setRotatingEnabled}
              label={t('event_settings.rotating_codes')}
              description="QR code changes automatically on a timer"
            />

            {rotatingEnabled && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  {t('event_settings.rotation_interval')}: <span className="font-bold text-gray-900">{rotationInterval}s</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="300"
                  value={rotationInterval}
                  onChange={e => setRotationInterval(Number(e.target.value))}
                  className="w-full accent-gray-900"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>3s</span>
                  <span>5 min</span>
                </div>
              </div>
            )}

            <Toggle
              checked={clientIdEnabled}
              onChange={setClientIdEnabled}
              label="Device tracking"
              description="Track device IDs to detect duplicate check-ins"
            />

            {clientIdEnabled && (
              <Select
                label={t('event_settings.collision_mode')}
                value={collisionMode}
                onChange={e => setCollisionMode(e.target.value as CollisionMode)}
                options={[
                  { value: 'ignore', label: t('event_settings.collision_ignore') },
                  { value: 'mark', label: t('event_settings.collision_mark') },
                  { value: 'block', label: t('event_settings.collision_block') },
                ]}
              />
            )}
          </div>
        </Section>

        {/* Email receipts */}
        <Section title={t('event_settings.email_receipts')}>
          <Toggle
            checked={emailReceipts}
            onChange={setEmailReceipts}
            label={t('event_settings.email_receipts')}
            description={t('event_settings.email_receipts_desc')}
          />
        </Section>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>{t('common.save')}</Button>
        </div>
      </form>

      {/* Add field modal */}
      <Modal open={showAddField} onClose={() => setShowAddField(false)} title={t('event_settings.add_field')} size="sm">
        <form onSubmit={handleAddField} className="flex flex-col gap-3 mt-1">
          <Input
            label={t('event_settings.field_name')}
            value={newField.label || ''}
            onChange={e => setNewField(prev => ({ ...prev, label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
            required
            autoFocus
          />
          <Select
            label={t('event_settings.field_type')}
            value={newField.type || 'text'}
            onChange={e => setNewField(prev => ({ ...prev, type: e.target.value as FieldType }))}
            options={FIELD_TYPES}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={newField.required || false}
              onChange={e => setNewField(prev => ({ ...prev, required: e.target.checked }))}
              className="rounded border-gray-300"
            />
            {t('event_settings.field_required')}
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowAddField(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Add field</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
