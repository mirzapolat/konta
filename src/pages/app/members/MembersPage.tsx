import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus, Crown, User, Trash2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import type { WorkspaceMember } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable } from '@/components/database/DataTable'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export default function MembersPage() {
  const { t, i18n } = useTranslation()
  const { currentWorkspace } = useWorkspaceStore()
  const { profile } = useAuthStore()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)
  const [removing, setRemoving] = useState(false)

  const isOwner = members.find(m => m.profile_id === profile?.id)?.status === 'owner'

  const load = async () => {
    if (!currentWorkspace) return
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('*, profile:profiles(*)')
      .eq('workspace_id', currentWorkspace.id)
      .order('updated_at', { ascending: false })
    setMembers(data as WorkspaceMember[] || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [currentWorkspace])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !currentWorkspace) return
    setInviting(true)
    // Find profile by email
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteEmail.trim())
      .single()
    if (!targetProfile) {
      toast.error('No account found with this email')
      setInviting(false)
      return
    }
    const { error } = await supabase.from('workspace_members').upsert({
      workspace_id: currentWorkspace.id,
      profile_id: targetProfile.id,
      status: 'invited',
    })
    if (error) toast.error(error.message)
    else { toast.success(t('workspace.member_invited')); await load() }
    setInviting(false)
    setShowInvite(false)
    setInviteEmail('')
  }

  const handleRemove = async () => {
    if (!removeTarget || !currentWorkspace) return
    setRemoving(true)
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('profile_id', removeTarget.profile_id)
    if (error) toast.error(error.message)
    else { toast.success('Member removed'); await load() }
    setRemoving(false)
    setRemoveTarget(null)
  }

  const statusBadge = (status: string) => {
    if (status === 'owner') return <Badge variant="default" dot>{t('workspace.owner')}</Badge>
    if (status === 'invited') return <Badge variant="warning" dot>{t('workspace.invited')}</Badge>
    return <Badge variant="muted" dot>{t('workspace.member')}</Badge>
  }

  const columns = [
    {
      key: 'name',
      header: t('common.name'),
      sortable: true,
      render: (m: WorkspaceMember) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
            {m.profile?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{m.profile?.name || '—'}</p>
            <p className="text-xs text-gray-400">{m.profile?.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Role',
      render: (m: WorkspaceMember) => statusBadge(m.status),
    },
    {
      key: 'updated_at',
      header: 'Since',
      sortable: true,
      render: (m: WorkspaceMember) => <span className="text-gray-500">{formatDate(m.updated_at, i18n.language)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('nav.members')}
        description={`${members.filter(m => m.status !== 'invited').length} members`}
        actions={isOwner && (
          <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowInvite(true)}>
            {t('workspace.invite_member')}
          </Button>
        )}
      />

      <DataTable
        data={members}
        columns={columns}
        keyField="profile_id"
        loading={loading}
        searchFields={['status'] as any}
        selectable={false}
        emptyMessage="No members"
        actions={isOwner ? (m: WorkspaceMember) => (
          m.status !== 'owner' ? (
            <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setRemoveTarget(m)} />
          ) : null
        ) : undefined}
      />

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title={t('workspace.invite_member')} size="sm">
        <form onSubmit={handleInvite} className="flex flex-col gap-3 mt-1">
          <Input
            label={t('workspace.invite_by_email')}
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            prefix={<Mail size={14} />}
            required
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={inviting}>Send invite</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemove}
        title={`Remove ${removeTarget?.profile?.name}?`}
        description="They will lose access to this workspace."
        confirmLabel="Remove"
        loading={removing}
      />
    </div>
  )
}
