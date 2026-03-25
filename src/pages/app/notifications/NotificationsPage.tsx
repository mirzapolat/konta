import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatTimeAgo } from '@/lib/utils'
import { toast } from 'sonner'

interface WorkspaceInvite {
  workspace_id: string
  workspace_name: string
  from_name: string
  updated_at: string
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const { profile } = useAuthStore()
  const { workspaces, setWorkspaces, setCurrentWorkspace } = useWorkspaceStore()
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id, updated_at, workspaces(name)')
      .eq('profile_id', profile.id)
      .eq('status', 'invited')

    setInvites(
      (data || []).map((d: any) => ({
        workspace_id: d.workspace_id,
        workspace_name: d.workspaces?.name || 'Unknown',
        from_name: '',
        updated_at: d.updated_at,
      }))
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const handleAccept = async (invite: WorkspaceInvite) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ status: 'member' })
      .eq('workspace_id', invite.workspace_id)
      .eq('profile_id', profile!.id)
    if (error) { toast.error(error.message); return }

    const { data: ws } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', invite.workspace_id)
      .single()

    if (ws) {
      setWorkspaces([...workspaces, ws])
      setCurrentWorkspace(ws)
    }
    toast.success(`Joined "${invite.workspace_name}"`)
    await load()
  }

  const handleDecline = async (invite: WorkspaceInvite) => {
    await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', invite.workspace_id)
      .eq('profile_id', profile!.id)
    toast.success('Declined')
    await load()
  }

  return (
    <div>
      <PageHeader title={t('notifications.title')} />

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : invites.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t('notifications.empty')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map(invite => (
            <div
              key={invite.workspace_id}
              className="flex items-center justify-between gap-4 p-4 border border-gray-200 rounded-xl bg-white"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('notifications.workspace_invite', { workspace: invite.workspace_name })}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatTimeAgo(invite.updated_at, i18n.language)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleDecline(invite)}>
                  {t('notifications.decline')}
                </Button>
                <Button variant="primary" size="sm" icon={<Check size={12} />} onClick={() => handleAccept(invite)}>
                  {t('notifications.accept')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
