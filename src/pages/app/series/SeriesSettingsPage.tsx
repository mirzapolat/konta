import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import type { SeriesObject } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Section, PageHeader } from '@/components/ui/PageHeader'
import { toast } from 'sonner'

interface OutletCtx { series: SeriesObject | null; setSeries: (s: SeriesObject) => void }

export default function SeriesSettingsPage() {
  const { t } = useTranslation()
  const { series, setSeries } = useOutletContext<OutletCtx>()
  const [name, setName] = useState(series?.name || '')
  const [combineOn, setCombineOn] = useState(series?.combine_on || 'email')
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!series) return
    setSaving(true)
    const { data, error } = await supabase
      .from('series_objects')
      .update({ name: name.trim(), combine_on: combineOn.trim().toLowerCase() })
      .eq('id', series.id)
      .select().single()
    if (error) toast.error(error.message)
    else { setSeries(data); toast.success('Saved') }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <PageHeader title={t('series.settings')} />
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Section title="General">
          <div className="flex flex-col gap-4">
            <Input label="Series name" value={name} onChange={e => setName(e.target.value)} required />
            <Input
              label={t('series.combine_on')}
              value={combineOn}
              onChange={e => setCombineOn(e.target.value)}
              hint="Field name used to group attendance records across events (default: email)"
            />
          </div>
        </Section>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving}>{t('common.save')}</Button>
        </div>
      </form>
    </div>
  )
}
