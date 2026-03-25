import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'

export default function ImprintPage() {
  const { t, i18n } = useTranslation()
  const isDE = i18n.language === 'de'

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100 px-6 h-14 flex items-center">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm">
            <ChevronLeft size={16} />
            Konta
          </Link>
          <AppLogo size={20} />
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">
          {isDE ? 'Impressum' : 'Imprint'}
        </h1>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? 'Angaben gemäß § 5 TMG' : 'Information according to § 5 TMG'}
            </h2>
            <p>
              Mirza Polat<br />
              {isDE ? 'Adresse: wird noch ergänzt' : 'Address: to be added'}<br />
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Kontakt</h2>
            <p>
              E-Mail: <a href="mailto:hello@mirzapolat.com" className="text-gray-900 hover:underline">hello@mirzapolat.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? 'Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV' : 'Responsible for content according to § 55 para. 2 RStV'}
            </h2>
            <p>Mirza Polat</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? 'Haftungsausschluss' : 'Disclaimer'}
            </h2>
            <p className="text-gray-500">
              {isDE
                ? 'Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.'
                : 'The contents of our pages have been created with the utmost care. However, we cannot guarantee the accuracy, completeness or topicality of the content.'}
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        <Link to="/" className="hover:underline">Konta</Link>
        {' · '}
        <Link to="/privacy" className="hover:underline">{t('landing.privacy')}</Link>
      </footer>
    </div>
  )
}
