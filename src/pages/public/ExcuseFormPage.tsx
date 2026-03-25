import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceExcuseLink } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format } from 'date-fns'

const STORAGE_KEY = 'konta_saved_form_data'

export default function ExcuseFormPage() {
  const { linkId } = useParams()
  const { t } = useTranslation()
  const [link, setLink] = useState<AttendanceExcuseLink | null>(null)
  const [event, setEvent] = useState<AttendanceObject | null>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!linkId) { setLoading(false); return }
      const { data: linkData } = await supabase
        .from('attendance_excuselinks')
        .select('*')
        .eq('id', linkId)
        .single()
      if (!linkData || !linkData.active) { setError('link_expired'); setLoading(false); return }
      if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
        setError('link_expired'); setLoading(false); return
      }
      setLink(linkData)
      const { data: eventData } = await supabase
        .from('attendance_objects')
        .select('*, workspaces(*)')
        .eq('id', linkData.event_id)
        .single()
      if (!eventData) { setError('event_not_active'); setLoading(false); return }
      setEvent(eventData)
      setWorkspace((eventData as any).workspaces)

      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const prefilled: Record<string, string> = {}
          for (const field of eventData.fields) {
            if (parsed[field.name]) prefilled[field.name] = parsed[field.name]
          }
          setFormData(prefilled)
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [linkId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !link) return
    setSubmitting(true)
    await supabase.from('attendance_records').insert({
      event_id: event.id,
      content: formData,
      status: 'excused',
      recorded_with: 'link',
      client_id: null,
      client_id_collision: null,
    })
    setSubmitted(true)
    setSubmitting(false)
  }

  const logoUrl = event?.branding_enabled !== false && workspace?.branding?.logo_url
    ? workspace.branding.logo_url
    : null

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {logoUrl && <div className="flex justify-center mb-6"><img src={logoUrl} alt="" className="h-12 object-contain" /></div>}
        {event && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            {event.event_date && <p className="text-gray-500 text-sm mt-1">{format(new Date(event.event_date), 'dd.MM.yyyy · HH:mm')}</p>}
          </div>
        )}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">{children}</div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/privacy" className="hover:underline">Privacy</Link>{' · '}<Link to="/imprint" className="hover:underline">Imprint</Link>
        </p>
      </div>
    </div>
  )

  if (loading) return <Wrapper><div className="text-center text-gray-400 py-8">Loading…</div></Wrapper>
  if (error) return <Wrapper><div className="text-center py-4"><p className="text-gray-600 font-medium">{t('public.link_expired')}</p></div></Wrapper>
  if (submitted) return (
    <Wrapper>
      <div className="text-center flex flex-col items-center gap-4 py-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('public.success_title')}</h2>
          <p className="text-gray-500 text-sm mt-1">{t('public.success_desc')}</p>
        </div>
      </div>
    </Wrapper>
  )

  return (
    <Wrapper>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('public.excuse_title')}</h2>
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
          Your data is processed according to our <Link to="/privacy" className="underline">privacy policy</Link>.
        </p>
        <Button type="submit" variant="primary" className="w-full" loading={submitting}>
          {t('public.excuse_submit')}
        </Button>
      </form>
    </Wrapper>
  )
}
