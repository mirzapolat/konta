import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Section, PageHeader } from '@/components/ui/PageHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function WorkspaceSettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace, workspaces, setCurrentWorkspace, setWorkspaces } = useWorkspaceStore()
  const { profile } = useAuthStore()
  const [name, setName] = useState(currentWorkspace?.name || '')
  const [logoUrl, setLogoUrl] = useState(currentWorkspace?.branding?.logo_url || '')
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showClear, setShowClear] = useState(false)
  const [showRemoveMembers, setShowRemoveMembers] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const members = useWorkspaceStore(s => s.members)
  const isOwner = members.find(m => m.profile_id === profile?.id)?.status === 'owner'

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name)
      setLogoUrl(currentWorkspace.branding?.logo_url || '')
    }
  }, [currentWorkspace])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentWorkspace) return
    setSaving(true)
    const { data, error } = await supabase
      .from('workspaces')
      .update({ name: name.trim(), branding: logoUrl ? { logo_url: logoUrl.trim() } : null })
      .eq('id', currentWorkspace.id)
      .select()
      .single()
    if (error) toast.error(error.message)
    else {
      setCurrentWorkspace(data)
      const updated = workspaces.map(w => w.id === data.id ? data : w)
      setWorkspaces(updated)
      toast.success('Saved')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!currentWorkspace) return
    setDeleting(true)
    const { error } = await supabase.from('workspaces').delete().eq('id', currentWorkspace.id)
    if (error) { toast.error(error.message); setDeleting(false); return }
    const remaining = workspaces.filter(w => w.id !== currentWorkspace.id)
    setWorkspaces(remaining)
    setCurrentWorkspace(remaining[0] || null)
    toast.success('Workspace deleted')
    navigate('/app/projects')
    setDeleting(false)
    setShowDelete(false)
  }

  const handleClear = async () => {
    if (!currentWorkspace) return
    // Delete all projects in workspace
    await supabase.from('projects').delete().eq('workspace_id', currentWorkspace.id)
    toast.success('Workspace cleared')
    setShowClear(false)
  }

  const handleRemoveAllMembers = async () => {
    if (!currentWorkspace) return
    await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .neq('profile_id', profile!.id)
    toast.success('All members removed')
    setShowRemoveMembers(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.settings')} />

      {/* General */}
      <Section title="General">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <Input
            label={t('workspace.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
            disabled={!isOwner}
          />
          <Input
            label={t('workspace.logo_url')}
            type="url"
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            disabled={!isOwner}
          />
          {logoUrl && (
            <div className="flex items-center gap-3">
              <img src={logoUrl} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
              <span className="text-xs text-gray-400">Logo preview</span>
            </div>
          )}
          {isOwner && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={saving}>{t('common.save')}</Button>
            </div>
          )}
        </form>
      </Section>

      {/* Danger zone */}
      {isOwner && (
        <Section title="Danger zone" className="border-red-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{t('workspace.remove_all_members')}</p>
                <p className="text-xs text-gray-500">Remove all members except yourself</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowRemoveMembers(true)}>
                {t('workspace.remove_all_members')}
              </Button>
            </div>
            <div className="border-t border-gray-100 flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{t('workspace.clear')}</p>
                <p className="text-xs text-gray-500">Delete all projects and data</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowClear(true)}>
                {t('workspace.clear')}
              </Button>
            </div>
            <div className="border-t border-gray-100 flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-red-700">{t('workspace.delete')}</p>
                <p className="text-xs text-gray-500">Permanently delete this workspace</p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                {t('workspace.delete')}
              </Button>
            </div>
          </div>
        </Section>
      )}

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title={t('workspace.delete_confirm', { name: currentWorkspace?.name })}
        confirmLabel="Delete"
        loading={deleting}
      />
      <ConfirmModal
        open={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={handleClear}
        title={t('workspace.clear_confirm', { name: currentWorkspace?.name })}
        confirmLabel="Clear"
        variant="primary"
      />
      <ConfirmModal
        open={showRemoveMembers}
        onClose={() => setShowRemoveMembers(false)}
        onConfirm={handleRemoveAllMembers}
        title={t('workspace.remove_all_members')}
        description="This will remove all members except you."
        confirmLabel="Remove all"
      />
    </div>
  )
}
