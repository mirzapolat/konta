import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle, XCircle, Trash2, Play, Square } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceModeration, AttendanceRecord, AttendanceCode } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function ModerationViewPage() {
  const { linkId } = useParams()
  const { t, i18n } = useTranslation()
  const [link, setLink] = useState<AttendanceModeration | null>(null)
  const [event, setEvent] = useState<AttendanceObject | null>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [activeCode, setActiveCode] = useState<AttendanceCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = useCallback(async (eventId: string) => {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('event_id', eventId)
      .order('recorded_at', { ascending: false })
    setRecords(data || [])
  }, [])

  const loadCode = useCallback(async (eventId: string) => {
    const { data } = await supabase
      .from('attendance_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    setActiveCode(data)
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!linkId) { setLoading(false); return }
      const { data: linkData } = await supabase
        .from('attendance_moderation')
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
      await loadRecords(eventData.id)
      if (eventData.active) await loadCode(eventData.id)
      setLoading(false)
    }
    load()
  }, [linkId])

  // Realtime subscriptions
  useEffect(() => {
    if (!event?.id) return
    const ch = supabase.channel(`mod-records:${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records', filter: `event_id=eq.${event.id}` }, () => loadRecords(event.id))
      .subscribe()
    const eventCh = supabase.channel(`mod-event:${event.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'attendance_objects', filter: `id=eq.${event.id}` }, (p) => {
        const updated = p.new as AttendanceObject
        setEvent(updated)
        if (updated.active) loadCode(event.id)
        else setActiveCode(null)
      })
      .subscribe()
    const codeCh = supabase.channel(`mod-codes:${event.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_codes', filter: `event_id=eq.${event.id}` }, (p) => {
        setActiveCode(p.new as AttendanceCode)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
      supabase.removeChannel(eventCh)
      supabase.removeChannel(codeCh)
    }
  }, [event?.id])

  const handleToggleStatus = async (record: AttendanceRecord) => {
    const newStatus = record.status === 'attended' ? 'excused' : 'attended'
    await supabase.from('attendance_records').update({ status: newStatus, recorded_with: 'moderator' }).eq('id', record.id)
    await loadRecords(event!.id)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('attendance_records').delete().eq('id', id)
    await loadRecords(event!.id)
    toast.success('Deleted')
  }

  const getAttendUrl = (codeId: string) => `${window.location.origin}/attend/${codeId}`

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400">Loading…</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 font-medium">{t('public.link_expired')}</p>
        <Link to="/" className="text-sm text-gray-400 hover:underline mt-2 block">Go to Konta</Link>
      </div>
    </div>
  )

  const logoUrl = event?.branding_enabled !== false && workspace?.branding?.logo_url
    ? workspace.branding.logo_url : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {logoUrl && <img src={logoUrl} alt="" className="h-8 object-contain" />}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{event?.name}</h1>
              {event?.event_date && (
                <p className="text-sm text-gray-400">{format(new Date(event.event_date), 'dd.MM.yyyy · HH:mm')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={event?.active ? 'success' : 'muted'} dot>
              {event?.active ? 'Live' : 'Stopped'}
            </Badge>
            <span className="text-sm text-gray-500">{records.length} check-ins</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code */}
          {event?.active && activeCode && (
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-gray-700">Live QR Code</p>
                <QRCodeSVG
                  value={getAttendUrl(activeCode.id)}
                  size={180}
                  level="M"
                />
              </div>
            </div>
          )}

          {/* Attendance list */}
          <div className={event?.active && activeCode ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Attendance ({records.length})</p>
              </div>
              {records.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No check-ins yet</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900">{r.content['name'] || r.content[Object.keys(r.content)[0]] || '—'}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(r.recorded_at, i18n.language)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.status === 'attended' ? 'success' : 'info'} dot>
                          {r.status === 'attended' ? t('attendance.status_attended') : t('attendance.status_excused')}
                        </Badge>
                        <button
                          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                          onClick={() => handleToggleStatus(r)}
                          title="Toggle status"
                        >
                          {r.status === 'attended' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </button>
                        <button
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(r.id)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
