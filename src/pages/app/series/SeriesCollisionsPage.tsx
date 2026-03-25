import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { SeriesObject, SeriesEvent, AttendanceObject, AttendanceRecord } from '@/types'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { similarity } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

interface OutletCtx { series: SeriesObject | null }

interface DetectedCollision {
  field: string
  value1: string
  value2: string
  record1_id: string
  record2_id: string
  score: number
}

export default function SeriesCollisionsPage() {
  const { t } = useTranslation()
  const { series } = useOutletContext<OutletCtx>()
  const { profile } = useAuthStore()
  const [collisions, setCollisions] = useState<DetectedCollision[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!series?.id) return
      setLoading(true)

      const { data: eventsData } = await supabase
        .from('series_events')
        .select('event_id')
        .eq('series_id', series.id)

      if (!eventsData?.length) { setLoading(false); return }

      const eventIds = eventsData.map(e => e.event_id)
      const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .in('event_id', eventIds)

      if (!records) { setLoading(false); return }

      const combineOn = series.combine_on || 'email'
      const threshold = 0.75
      const detected: DetectedCollision[] = []
      const seen = new Set<string>()

      for (let i = 0; i < records.length; i++) {
        for (let j = i + 1; j < records.length; j++) {
          const a = records[i]
          const b = records[j]
          const va = a.content[combineOn]
          const vb = b.content[combineOn]
          if (!va || !vb || va === vb) continue
          const key = [a.id, b.id].sort().join('|')
          if (seen.has(key)) continue
          seen.add(key)
          const score = similarity(va, vb)
          if (score >= threshold) {
            detected.push({ field: combineOn, value1: va, value2: vb, record1_id: a.id, record2_id: b.id, score })
          }
        }
      }

      detected.sort((a, b) => b.score - a.score)
      setCollisions(detected.slice(0, 100))
      setLoading(false)
    }
    load()
  }, [series?.id])

  const handleChoose = async (collision: DetectedCollision, chosenValue: string) => {
    const key = `${collision.record1_id}|${collision.record2_id}`
    setResolving(key)
    const { error } = await supabase.from('series_collisions').insert({
      series_id: series!.id,
      field_name: collision.field,
      first_value: collision.value1,
      second_value: collision.value2,
      chosen_value: chosenValue,
      dismissed_at: new Date().toISOString(),
      dismissed_by: profile?.id,
    })
    if (error) toast.error(error.message)
    else {
      setCollisions(prev => prev.filter(c => !(c.record1_id === collision.record1_id && c.record2_id === collision.record2_id)))
      toast.success('Collision resolved')
    }
    setResolving(null)
  }

  const handleDismiss = (collision: DetectedCollision) => {
    setCollisions(prev => prev.filter(c => !(c.record1_id === collision.record1_id && c.record2_id === collision.record2_id)))
  }

  return (
    <div>
      <PageHeader
        title={t('series.collisions')}
        description={`Detected by fuzzy matching on "${series?.combine_on || 'email'}" field`}
      />

      {loading ? (
        <div className="text-center py-8 text-gray-400">Analysing records…</div>
      ) : collisions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 font-medium">No potential collisions detected</p>
          <p className="text-gray-300 text-xs mt-1">All records appear to be unique</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {collisions.map(c => {
            const key = `${c.record1_id}|${c.record2_id}`
            return (
              <div key={key} className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">{c.field}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-800 bg-white px-2 py-0.5 rounded border border-amber-200">{c.value1}</span>
                      <span className="text-gray-400 text-xs">≈</span>
                      <span className="text-sm font-mono text-gray-800 bg-white px-2 py-0.5 rounded border border-amber-200">{c.value2}</span>
                    </div>
                  </div>
                  <Badge variant="warning">{Math.round(c.score * 100)}% similar</Badge>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleChoose(c, c.value1)} loading={resolving === key}>
                    Use "{c.value1}"
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleChoose(c, c.value2)} loading={resolving === key}>
                    Use "{c.value2}"
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDismiss(c)}>
                    {t('series.collision_dismiss')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
