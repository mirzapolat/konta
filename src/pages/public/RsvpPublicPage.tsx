import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RsvpObject, RsvpLink } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format } from 'date-fns'

export default function RsvpPublicPage() {
  const { linkId } = useParams()
  const { t } = useTranslation()
  const [link, setLink] = useState<RsvpLink | null>(null)
  const [rsvp, setRsvp] = useState<RsvpObject | null>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!linkId) { setLoading(false); return }
      const { data: linkData } = await supabase.from('rsvp_links').select('*').eq('id', linkId).single()
      if (!linkData || !linkData.active) { setError('expired'); setLoading(false); return }
      setLink(linkData)
      // Increment open count
      await supabase.from('rsvp_links').update({ open_count: linkData.open_count + 1 }).eq('id', linkId)
      const { data: rsvpData } = await supabase.from('rsvp_objects').select('*, workspaces(*)').eq('id', linkData.rsvp_id).single()
      if (!rsvpData || !rsvpData.active) { setError('expired'); setLoading(false); return }
      setRsvp(rsvpData)
      setWorkspace((rsvpData as any).workspaces)
      setLoading(false)
    }
    load()
  }, [linkId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rsvp || !link) return
    setSubmitting(true)
    await supabase.from('rsvp_records').insert({ rsvp_id: rsvp.id, content: formData })
    await supabase.from('rsvp_links').update({ fill_count: link.fill_count + 1 }).eq('id', link.id)
    setSubmitted(true)
    setSubmitting(false)
  }

  const logoUrl = rsvp?.branding_enabled !== false && workspace?.branding?.logo_url ? workspace.branding.logo_url : null

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {logoUrl && <div className="flex justify-center mb-6"><img src={logoUrl} alt="" className="h-12 object-contain" /></div>}
        {rsvp && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{rsvp.name}</h1>
            {rsvp.event_date && <p className="text-gray-500 text-sm mt-1">{format(new Date(rsvp.event_date), 'dd.MM.yyyy · HH:mm')}</p>}
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {rsvp?.fields.map(field => (
          <div key={field.name}>
            {field.type === 'checkbox' ? (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[field.name] === 'true'}
                  onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.checked ? 'true' : 'false' }))}
                  className="mt-0.5 rounded border-gray-300"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">{field.label}</span>
                  {field.description && <p className="text-xs text-gray-400">{field.description}</p>}
                </div>
              </label>
            ) : field.type === 'select' && field.options ? (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">{field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                {field.description && <p className="text-xs text-gray-400 mb-1.5">{field.description}</p>}
                <select
                  value={formData[field.name] || ''}
                  onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                  required={field.required}
                  className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm bg-white"
                >
                  <option value="">Select…</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ) : (
              <div>
                {field.description && <p className="text-xs text-gray-400 mb-1">{field.description}</p>}
                <Input
                  label={field.label}
                  type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={formData[field.name] || ''}
                  onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                  required={field.required}
                />
              </div>
            )}
          </div>
        ))}
        <p className="text-xs text-gray-400">Your data is processed according to our <Link to="/privacy" className="underline">privacy policy</Link>.</p>
        <Button type="submit" variant="primary" className="w-full" loading={submitting}>{t('public.rsvp_submit')}</Button>
      </form>
    </Wrapper>
  )
}
