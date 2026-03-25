import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Section, PageHeader } from '@/components/ui/PageHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { toast } from 'sonner'
import i18n from '@/lib/i18n'

export default function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, setProfile, logout } = useAuthStore()

  const [name, setName] = useState(profile?.name || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const updates: any = {}
    if (name !== profile.name) updates.name = name.trim()
    if (email !== profile.email) updates.email = email.trim()

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
      if (error) { toast.error(error.message); setSaving(false); return }
      if (email !== profile.email) {
        await supabase.auth.updateUser({ email: email.trim() })
      }
      setProfile({ ...profile, ...updates })
      toast.success(t('auth.save_changes'))
    }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) toast.error(error.message)
    else { toast.success('Password updated'); setNewPassword('') }
    setSavingPassword(false)
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    // Delete profile (cascades via RLS/triggers in Supabase)
    await supabase.from('profiles').delete().eq('id', profile!.id)
    await logout()
    navigate('/login')
    setDeleting(false)
  }

  const handleLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    toast.success(lang === 'de' ? 'Sprache geändert' : 'Language changed')
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <PageHeader title={t('nav.account')} />

      {/* Profile */}
      <Section title="Profile">
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <Input
            label={t('auth.name')}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              {t('auth.save_changes')}
            </Button>
          </div>
        </form>
      </Section>

      {/* Password */}
      <Section title={t('auth.password_change')}>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          <Input
            label={t('auth.new_password')}
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            hint="Minimum 6 characters"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" size="sm" loading={savingPassword}>
              {t('auth.save_changes')}
            </Button>
          </div>
        </form>
      </Section>

      {/* Language */}
      <Section title="Language / Sprache">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-gray-400" />
          <Button
            variant={i18n.language === 'en' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleLanguage('en')}
          >
            English
          </Button>
          <Button
            variant={i18n.language === 'de' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleLanguage('de')}
          >
            Deutsch
          </Button>
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Danger zone" className="border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">{t('auth.delete_account')}</p>
            <p className="text-xs text-gray-500">Permanently delete your account and all data</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            Delete
          </Button>
        </div>
      </Section>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDeleteAccount}
        title={t('auth.delete_account')}
        description={t('auth.delete_account_confirm')}
        confirmLabel="Delete account"
        loading={deleting}
      />
    </div>
  )
}
