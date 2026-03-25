import { useEffect, useState, useRef, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  Play, Square, Maximize, Minimize, EyeOff, Eye,
  Copy, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AttendanceObject, AttendanceCode } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmModal } from '@/components/ui/Modal'
import { copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface OutletCtx {
  event: AttendanceObject | null
  setEvent: (e: AttendanceObject) => void
}

interface Counts {
  total: number
  attended: number
  excused: number
  collisions: number
}

function AnimatedCounter({ value, label, className }: { value: number; label: string; className?: string }) {
  const [display, setDisplay] = useState(value)
  const [bump, setBump] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (value !== prev.current) {
      setBump(true)
      setTimeout(() => setBump(false), 300)
      prev.current = value
    }
    setDisplay(value)
  }, [value])

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 ${className}`}>
      <span
        className={`text-4xl font-bold text-gray-900 tabular-nums transition-transform duration-200 ${bump ? 'scale-125' : 'scale-100'}`}
      >
        {display}
      </span>
      <span className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">{label}</span>
    </div>
  )
}

export default function AttendanceCheckinPage() {
  const { t } = useTranslation()
  const { event, setEvent } = useOutletContext<OutletCtx>()
  const [counts, setCounts] = useState<Counts>({ total: 0, attended: 0, excused: 0, collisions: 0 })
  const [activeCode, setActiveCode] = useState<AttendanceCode | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showCounters, setShowCounters] = useState(true)
  const [showStopWarning, setShowStopWarning] = useState(false)
  const [connectedClients, setConnectedClients] = useState(1)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<any>(null)
  const presenceRef = useRef<any>(null)

  const eventId = event?.id

  // Load counts
  const loadCounts = useCallback(async () => {
    if (!eventId) return
    const { data } = await supabase
      .from('attendance_records')
      .select('status, client_id_collision')
      .eq('event_id', eventId)
    if (!data) return
    setCounts({
      total: data.length,
      attended: data.filter(r => r.status === 'attended').length,
      excused: data.filter(r => r.status === 'excused').length,
      collisions: data.filter(r => r.client_id_collision !== null).length,
    })
  }, [eventId])

  // Load current active code
  const loadActiveCode = useCallback(async () => {
    if (!eventId || !event?.active) { setActiveCode(null); return }
    const { data } = await supabase
      .from('attendance_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (data) setActiveCode(data)
  }, [eventId, event?.active])

  // Countdown timer for rotating codes
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    if (!event?.active || !event.security_rotatingcode_enabled || !activeCode) return

    const interval = event.security_rotatingcode_interval || 10
    const created = new Date(activeCode.created_at).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - created) / 1000)
    const remaining = interval - (elapsed % interval)
    setCountdown(remaining)

    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          rotateCode()
          return interval
        }
        return c - 1
      })
    }, 1000)

    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [event?.active, event?.security_rotatingcode_enabled, event?.security_rotatingcode_interval, activeCode?.id])

  const rotateCode = useCallback(async () => {
    if (!eventId) return
    const interval = event?.security_rotatingcode_interval || 10
    const { data } = await supabase
      .from('attendance_codes')
      .insert({
        event_id: eventId,
        type: 'rotating',
        expires_at: new Date(Date.now() + (interval + 10) * 1000).toISOString(),
      })
      .select()
      .single()
    if (data) {
      setActiveCode(data)
      // Broadcast to other clients
      channelRef.current?.send({ type: 'broadcast', event: 'code_rotated', payload: { code: data } })
    }
  }, [eventId, event?.security_rotatingcode_interval])

  // Realtime subscriptions
  useEffect(() => {
    if (!eventId) return

    // Subscribe to attendance records for live count
    const recordsSub = supabase
      .channel(`records:${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `event_id=eq.${eventId}`,
      }, () => loadCounts())
      .subscribe()

    // Subscribe to event status changes
    const eventSub = supabase
      .channel(`event:${eventId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'attendance_objects',
        filter: `id=eq.${eventId}`,
      }, (payload) => {
        setEvent(payload.new as AttendanceObject)
      })
      .subscribe()

    // Broadcast channel for code rotation sync
    channelRef.current = supabase.channel(`broadcast:${eventId}`)
    channelRef.current
      .on('broadcast', { event: 'code_rotated' }, ({ payload }: any) => {
        setActiveCode(payload.code)
      })
      .subscribe()

    // Presence for connected clients count
    presenceRef.current = supabase.channel(`presence:${eventId}`, {
      config: { presence: { key: crypto.randomUUID() } }
    })
    presenceRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = presenceRef.current.presenceState()
        setConnectedClients(Object.keys(state).length)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceRef.current.track({ online_at: new Date().toISOString() })
        }
      })

    loadCounts()
    loadActiveCode()

    return () => {
      supabase.removeChannel(recordsSub)
      supabase.removeChannel(eventSub)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (presenceRef.current) supabase.removeChannel(presenceRef.current)
    }
  }, [eventId])

  const handleStart = async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('attendance_objects')
      .update({ active: true })
      .eq('id', eventId)
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setEvent(data)

    if (event?.security_rotatingcode_enabled) {
      await rotateCode()
    } else {
      // Create or fetch static code
      const { data: existing } = await supabase
        .from('attendance_codes')
        .select('*')
        .eq('event_id', eventId)
        .eq('type', 'static')
        .single()
      if (!existing) {
        const { data: code } = await supabase
          .from('attendance_codes')
          .insert({ event_id: eventId, type: 'static', expires_at: null })
          .select()
          .single()
        setActiveCode(code)
      } else {
        setActiveCode(existing)
      }
    }
  }

  const handleStop = async () => {
    if (!eventId) return
    const { data, error } = await supabase
      .from('attendance_objects')
      .update({ active: false })
      .eq('id', eventId)
      .select()
      .single()
    if (error) toast.error(error.message)
    else {
      setEvent(data)
      setActiveCode(null)
    }
    setShowStopWarning(false)
  }

  const handleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setIsFullscreen(f => !f)
  }

  const getAttendUrl = (codeId: string) =>
    `${window.location.origin}/attend/${codeId}`

  const handleCopyLink = () => {
    if (!activeCode) return
    copyToClipboard(getAttendUrl(activeCode.id))
    toast.success(t('common.copied'))
  }

  const handleDownloadQR = () => {
    if (!activeCode || !event) return
    const svg = document.getElementById('qr-code-svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, 400, 480)
      ctx.fillStyle = '#111111'
      ctx.font = 'bold 16px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(event.name, 200, 30)
      if (event.event_date) {
        ctx.font = '13px system-ui'
        ctx.fillStyle = '#666666'
        ctx.fillText(format(new Date(event.event_date), 'dd.MM.yyyy HH:mm'), 200, 50)
      }
      ctx.drawImage(img, 50, 70, 300, 300)
      const link = document.createElement('a')
      link.download = `${event.name}-qr.jpg`
      link.href = canvas.toDataURL('image/jpeg', 0.95)
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const logoUrl = event?.branding_enabled !== false ? event &&
    // workspace branding logo would be loaded here
    undefined : undefined

  const qrSize = isFullscreen ? 280 : 220

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-8 p-8' : ''}>
      <div className={`flex flex-col gap-6 ${isFullscreen ? 'w-full max-w-lg' : ''}`}>
        {/* Header */}
        {!isFullscreen && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('attendance.checkin')}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {connectedClients > 1 && `${connectedClients} clients connected · `}
                {event?.active ? (
                  <span className="text-emerald-600 font-medium">Live</span>
                ) : (
                  <span className="text-gray-400">Stopped</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={showCounters ? <EyeOff size={14} /> : <Eye size={14} />}
                onClick={() => setShowCounters(s => !s)}
              >
                {showCounters ? t('attendance.hide_counters') : t('attendance.show_counters')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                onClick={handleFullscreen}
              />
              {event?.active ? (
                <Button variant="danger" size="sm" icon={<Square size={14} />} onClick={() => setShowStopWarning(true)}>
                  {t('attendance.stop_event')}
                </Button>
              ) : (
                <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={handleStart}>
                  {t('attendance.start_event')}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center">
          {event?.active && activeCode ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative p-5 border-2 border-gray-200 rounded-2xl bg-white shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={getAttendUrl(activeCode.id)}
                  size={qrSize}
                  level="M"
                  includeMargin={false}
                  imageSettings={logoUrl ? {
                    src: logoUrl,
                    height: 40,
                    width: 40,
                    excavate: true,
                  } : undefined}
                />
              </div>

              {/* Countdown / static controls */}
              {event.security_rotatingcode_enabled ? (
                <div className="flex items-center gap-2">
                  <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all duration-1000"
                      style={{
                        width: `${(countdown / (event.security_rotatingcode_interval || 10)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {t('attendance.next_rotation')} {countdown}s
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" icon={<Copy size={13} />} onClick={handleCopyLink}>
                    {t('attendance.copy_link')}
                  </Button>
                  <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleDownloadQR}>
                    {t('attendance.download_qr')}
                  </Button>
                </div>
              )}

              {isFullscreen && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Minimize size={14} />}
                  onClick={handleFullscreen}
                >
                  {t('attendance.exit_fullscreen')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3 border-2 border-dashed border-gray-200 rounded-2xl w-full max-w-xs">
              <p className="text-gray-400 font-medium text-sm">{t('attendance.event_stopped')}</p>
              <p className="text-gray-300 text-xs">{t('attendance.event_stopped_desc')}</p>
              {!isFullscreen && (
                <Button variant="primary" size="sm" icon={<Play size={14} />} onClick={handleStart}>
                  {t('attendance.start_event')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Counters */}
        {showCounters && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnimatedCounter value={counts.total} label={t('attendance.total')} />
            <AnimatedCounter value={counts.attended} label={t('attendance.checked_in')} />
            <AnimatedCounter value={counts.excused} label={t('attendance.excused')} />
            <AnimatedCounter value={counts.collisions} label={t('attendance.collisions')} />
          </div>
        )}

        {isFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            icon={event?.active ? <Square size={14} /> : <Play size={14} />}
            onClick={event?.active ? () => setShowStopWarning(true) : handleStart}
          >
            {event?.active ? t('attendance.stop_event') : t('attendance.start_event')}
          </Button>
        )}
      </div>

      <ConfirmModal
        open={showStopWarning}
        onClose={() => setShowStopWarning(false)}
        onConfirm={handleStop}
        title={t('attendance.stop_warning')}
        description={t('attendance.stop_warning_desc')}
        confirmLabel={t('attendance.stop')}
        cancelLabel={t('attendance.keep_running')}
        variant="primary"
      />
    </div>
  )
}
