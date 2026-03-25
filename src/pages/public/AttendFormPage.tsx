import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceCode, EventField } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { generateClientId } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

const STORAGE_KEY = 'konta_saved_form_data'

function PublicFormWrapper({ children, event, workspace }: {
  children: React.ReactNode
  event?: AttendanceObject | null
  workspace?: { name: string; branding?: { logo_url?: string } | null } | null
}) {
  const logoUrl = event?.branding_enabled !== false && workspace?.branding?.logo_url
    ? workspace.branding.logo_url
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {logoUrl && (
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt={workspace?.name} className="h-12 object-contain" />
          </div>
        )}
        {event && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            {event.event_date && (
              <p className="text-gray-500 text-sm mt-1">
                {format(new Date(event.event_date), 'dd.MM.yyyy · HH:mm')}
              </p>
            )}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by{' '}
          <Link to="/" className="font-medium hover:underline">Konta</Link>
          {' · '}
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          {' · '}
          <Link to="/imprint" className="hover:underline">Imprint</Link>
        </p>
      </div>
    </div>
  )
}

export default function AttendFormPage() {
  const { codeId } = useParams()
  const { t, i18n } = useTranslation()
  const [code, setCode] = useState<AttendanceCode | null>(null)
  const [event, setEvent] = useState<AttendanceObject | null>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSaveHint, setShowSaveHint] = useState(false)
  const [collisionWarning, setCollisionWarning] = useState(false)

  const clientId = generateClientId()

  useEffect(() => {
    const load = async () => {
      if (!codeId) { setLoading(false); return }

      // Load code
      const { data: codeData } = await supabase
        .from('attendance_codes')
        .select('*')
        .eq('id', codeId)
        .single()

      if (!codeData) { setError('link_expired'); setLoading(false); return }

      // Check expiry
      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        setError('link_expired'); setLoading(false); return
      }

      setCode(codeData)

      // Load event
      const { data: eventData } = await supabase
        .from('attendance_objects')
        .select('*, workspaces(*)')
        .eq('id', codeData.event_id)
        .single()

      if (!eventData || !eventData.active) { setError('event_not_active'); setLoading(false); return }
      setEvent(eventData)
      setWorkspace((eventData as any).workspaces)

      // Pre-fill from saved data
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const prefilled: Record<string, string> = {}
          for (const field of eventData.fields) {
            if (parsed[field.name]) prefilled[field.name] = parsed[field.name]
          }
          setFormData(prefilled)
          setShowSaveHint(Object.keys(prefilled).length > 0)
        } catch {}
      }

      // Check collision
      if (eventData.security_clientidchecks_enabled) {
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('event_id', eventData.id)
          .eq('client_id', clientId)
          .limit(1)

        if (existing && existing.length > 0) {
          if (eventData.security_clientidchecks_type === 'block') {
            setError('already_submitted'); setLoading(false); return
          } else if (eventData.security_clientidchecks_type === 'mark') {
            setCollisionWarning(true)
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [codeId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !code) return
    setSubmitting(true)

    // Check for existing collision record
    let collisionId: string | null = null
    if (event.security_clientidchecks_enabled && event.security_clientidchecks_type === 'mark') {
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('event_id', event.id)
        .eq('client_id', clientId)
        .limit(1)
      if (existing && existing.length > 0) collisionId = existing[0].id
    }

    const { error: insertError } = await supabase.from('attendance_records').insert({
      event_id: event.id,
      content: formData,
      status: 'attended',
      recorded_with: code.type === 'rotating' ? 'qr' : 'link',
      client_id: clientId,
      client_id_collision: collisionId,
    })

    if (insertError) {
      toast.error(insertError.message)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setSubmitting(false)
  }

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    toast.success('Saved for next time')
  }

  if (loading) {
    return (
      <PublicFormWrapper>
        <div className="text-center text-gray-400 py-8">Loading…</div>
      </PublicFormWrapper>
    )
  }

  if (error) {
    return (
      <PublicFormWrapper event={event} workspace={workspace}>
        <div className="text-center py-4">
          <p className="text-gray-600 font-medium">
            {error === 'already_submitted' ? t('public.already_submitted') :
             error === 'event_not_active' ? t('public.event_not_active') :
             t('public.link_expired')}
          </p>
        </div>
      </PublicFormWrapper>
    )
  }

  if (submitted) {
    return (
      <PublicFormWrapper event={event} workspace={workspace}>
        <div className="text-center flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t('public.success_title')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('public.success_desc')}</p>
          </div>
          <Button variant="outline" size="sm" icon={<Save size={13} />} onClick={handleSave}>
            {t('public.save_submission')}
          </Button>
        </div>
      </PublicFormWrapper>
    )
  }

  return (
    <PublicFormWrapper event={event} workspace={workspace}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('public.attend_title')}</h2>
      {collisionWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          {t('public.collision_warning')}
        </div>
      )}
      {showSaveHint && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
          Pre-filled from your last submission.
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {event?.fields.map(field => (
          <Input
            key={field.name}
            label={field.label}
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={formData[field.name] || ''}
            onChange={e => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
            required={field.required}
          />
        ))}
        <p className="text-xs text-gray-400">
          {t('public.privacy_notice', {
            components: { privacy: <Link to="/privacy" className="underline" /> }
          })}
          {' '}
          <Link to="/privacy" className="underline">Privacy policy</Link>.
        </p>
        <Button type="submit" variant="primary" className="w-full" loading={submitting}>
          {t('public.attend_submit')}
        </Button>
      </form>
    </PublicFormWrapper>
  )
}
