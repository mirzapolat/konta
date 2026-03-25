import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from './LoginPage'

export default function ConfirmPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as any)?.email || ''

  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Email confirmed!')
      navigate('/app/projects')
    }
    setLoading(false)
  }

  return (
    <AuthLayout>
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
          <Mail size={22} className="text-gray-600" />
        </div>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1 text-center">
        {t('auth.confirmation_sent')}
      </h1>
      <p className="text-gray-500 text-sm mb-6 text-center">
        {t('auth.confirmation_desc')}
      </p>

      <form onSubmit={handleVerify} className="flex flex-col gap-4">
        <Input
          label={t('auth.confirmation_code')}
          type="text"
          value={token}
          onChange={e => setToken(e.target.value)}
          required
          autoFocus
          placeholder="Enter the 6-digit code"
        />
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          {t('auth.verify')}
        </Button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        <Link to="/login" className="text-gray-900 font-medium hover:underline">
          {t('common.back')}
        </Link>
      </p>
    </AuthLayout>
  )
}
