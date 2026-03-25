import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Download, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { RsvpObject, RsvpRecord } from '@/types'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { DataTable } from '@/components/database/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'
import { downloadCSV, formatDateTime } from '@/lib/utils'

interface OutletCtx { rsvp: RsvpObject | null }

export default function RsvpSubmissionsPage() {
  const { t, i18n } = useTranslation()
  const { rsvp } = useOutletContext<OutletCtx>()
  const [records, setRecords] = useState<RsvpRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [detailRecord, setDetailRecord] = useState<RsvpRecord | null>(null)

  const load = useCallback(async () => {
    if (!rsvp?.id) return
    setLoading(true)
    const { data } = await supabase.from('rsvp_records').select('*').eq('rsvp_id', rsvp.id).order('submitted_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }, [rsvp?.id])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    if (!rsvp) return
    const headers = [...rsvp.fields.map(f => f.label), 'Submitted at']
    const rows = records.map(r => [...rsvp.fields.map(f => r.content[f.name] || ''), formatDateTime(r.submitted_at, i18n.language)])
    downloadCSV(`${rsvp.name}-submissions.csv`, [headers, ...rows])
  }

  const columns = [
    ...rsvp?.fields.slice(0, 3).map(f => ({
      key: f.name,
      header: f.label,
      sortable: true,
      render: (r: RsvpRecord) => <span className="text-gray-700">{r.content[f.name] || '—'}</span>,
    })) || [],
    {
      key: 'submitted_at',
      header: t('rsvp.submitted_at'),
      sortable: true,
      render: (r: RsvpRecord) => <span className="text-gray-500 text-xs">{formatDateTime(r.submitted_at, i18n.language)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('rsvp.submissions')}
        description={`${records.length} submissions`}
        actions={
          <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExport}>{t('rsvp.export_csv')}</Button>
        }
      />
      <DataTable
        data={records} columns={columns as any} keyField="id" loading={loading}
        emptyMessage={t('rsvp.empty_submissions')}
        onRowClick={r => setDetailRecord(r)}
        actions={(r: RsvpRecord) => (
          <button className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100" onClick={() => setDetailRecord(r)}><Eye size={13} /></button>
        )}
      />
      <Modal open={!!detailRecord} onClose={() => setDetailRecord(null)} title={t('rsvp.submission_detail')} size="md">
        {detailRecord && rsvp && (
          <div className="flex flex-col gap-3 mt-1">
            {rsvp.fields.map(f => (
              <div key={f.name} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{f.label}</span>
                <span className="text-sm text-gray-900">{detailRecord.content[f.name] || '—'}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 mt-1">
              <span className="text-xs text-gray-400">{t('rsvp.submitted_at')}: {formatDateTime(detailRecord.submitted_at, i18n.language)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
