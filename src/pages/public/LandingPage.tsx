import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  QrCode, ClipboardList, BarChart2, Globe, Shield, Server,
  Heart, ArrowRight, Check
} from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'
import { Button } from '@/components/ui/Button'
import i18n from '@/lib/i18n'

export default function LandingPage() {
  const { t } = useTranslation()

  const features = [
    {
      icon: <QrCode size={20} />,
      title: t('landing.feature_attendance'),
      desc: t('landing.feature_attendance_desc'),
    },
    {
      icon: <ClipboardList size={20} />,
      title: t('landing.feature_rsvp'),
      desc: t('landing.feature_rsvp_desc'),
    },
    {
      icon: <BarChart2 size={20} />,
      title: t('landing.feature_series'),
      desc: t('landing.feature_series_desc'),
    },
    {
      icon: <Globe size={20} />,
      title: t('landing.feature_bilingual'),
      desc: t('landing.feature_bilingual_desc'),
    },
    {
      icon: <Shield size={20} />,
      title: t('landing.feature_gdpr'),
      desc: t('landing.feature_gdpr_desc'),
    },
    {
      icon: <Server size={20} />,
      title: t('landing.feature_private'),
      desc: t('landing.feature_private_desc'),
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AppLogo size={22} />
            <span className="text-sm font-semibold text-gray-900">Konta</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'de' ? 'en' : 'de')}
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              {i18n.language === 'de' ? 'EN' : 'DE'}
            </button>
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">{t('auth.login')}</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">{t('landing.cta')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <AppLogo size={56} />
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight mb-6">
            {t('landing.hero_title')}
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
            {t('landing.hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register">
              <Button variant="primary" size="lg" icon={<ArrowRight size={16} />}>
                {t('landing.cta')}
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">{t('landing.open_app')}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GDPR trust bar */}
      <section className="py-12 px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500">
          {[
            'GDPR compliant',
            'Self-hosted data',
            'No tracking',
            'Open architecture',
          ].map(item => (
            <div key={item} className="flex items-center gap-2">
              <Check size={14} className="text-emerald-500" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Support */}
      <section className="py-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart size={22} className="text-rose-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('landing.support_title')}</h2>
          <p className="text-gray-500 mb-6">{t('landing.support_desc')}</p>
          <a
            href="https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" icon={<Heart size={16} className="text-rose-400" />}>
              {t('landing.support_cta')}
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <AppLogo size={16} />
            <span>Konta</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/privacy" className="hover:text-gray-700 transition-colors">{t('landing.privacy')}</Link>
            <Link to="/imprint" className="hover:text-gray-700 transition-colors">{t('landing.imprint')}</Link>
            <a href="https://donate.stripe.com/aFa8wO78f6zndFp2xF0kE03" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">{t('landing.support_cta')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
