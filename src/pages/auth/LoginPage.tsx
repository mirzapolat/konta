import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import AppLogo from '@/components/ui/AppLogo'

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContinue, setShowContinue] = useState(!!profile)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      navigate('/app/projects')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app/projects` },
    })
  }

  if (showContinue && profile) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">{t('auth.active_session')}</h1>
        <p className="text-gray-500 text-sm mb-6">
          {t('auth.active_session_desc', { name: profile.name, email: profile.email })}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="primary" className="w-full" onClick={() => navigate('/app/projects')}>
            {t('auth.continue_session', { name: profile.name })}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setShowContinue(false)}>
            {t('auth.different_account')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">{t('auth.login')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('app.tagline')}</p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <Input
          label={t('auth.email')}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          {t('auth.login')}
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">{t('auth.or')}</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogle}>
        <GoogleIcon />
        {t('auth.continue_with_google')}
      </Button>

      <p className="text-sm text-center text-gray-500 mt-6">
        {t('auth.no_account')}{' '}
        <Link to="/register" className="text-gray-900 font-medium hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </AuthLayout>
  )
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5">
            <AppLogo size={28} />
            <span className="text-lg font-semibold text-gray-900">Konta</span>
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/privacy" className="hover:underline">Privacy</Link>
          {' · '}
          <Link to="/imprint" className="hover:underline">Imprint</Link>
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
