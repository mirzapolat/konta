import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import AppLogo from '@/components/ui/AppLogo'

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isDE ? 'Datenschutzerklärung' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-gray-400 mb-10">{isDE ? 'Stand: März 2025' : 'As of: March 2025'}</p>

        <div className="space-y-8 text-sm text-gray-700">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '1. Verantwortlicher' : '1. Controller'}
            </h2>
            <p>
              {isDE
                ? 'Verantwortlicher im Sinne der DSGVO ist:'
                : 'The controller within the meaning of the GDPR is:'}<br />
              Mirza Polat<br />
              E-Mail: <a href="mailto:hello@mirzapolat.com" className="text-gray-900 hover:underline">hello@mirzapolat.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '2. Erhobene Daten' : '2. Data collected'}
            </h2>
            <p>
              {isDE
                ? 'Konta erhebt und verarbeitet folgende personenbezogene Daten: Name, E-Mail-Adresse und weitere Felder, die vom Veranstaltungsorganisator konfiguriert wurden. Diese Daten werden ausschließlich zum Zweck der Anwesenheitsverfolgung, RSVP-Verwaltung und Serienanalyse verarbeitet.'
                : 'Konta collects and processes the following personal data: name, email address, and additional fields configured by the event organiser. This data is processed solely for the purpose of attendance tracking, RSVP management, and series analysis.'}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '3. Rechtsgrundlage' : '3. Legal basis'}
            </h2>
            <p>
              {isDE
                ? 'Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse des Veranstaltungsorganisators an der Durchführung der Veranstaltung).'
                : 'Processing is based on Art. 6(1)(b) GDPR (performance of a contract) and Art. 6(1)(f) GDPR (legitimate interest of the event organiser in conducting the event).'}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '4. Speicherung und Löschung' : '4. Storage and deletion'}
            </h2>
            <p>
              {isDE
                ? 'Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen Zweck erforderlich ist. Nutzer können ihre Daten jederzeit löschen lassen, indem sie sich an den Verantwortlichen wenden.'
                : 'Personal data is stored only for as long as necessary for the respective purpose. Users may request deletion of their data at any time by contacting the controller.'}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '5. Betroffenenrechte' : '5. Data subject rights'}
            </h2>
            <p>
              {isDE
                ? 'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Wenden Sie sich dazu an: hello@mirzapolat.com. Sie haben außerdem das Recht, sich bei einer Datenschutzbehörde zu beschweren.'
                : 'You have the right of access, rectification, erasure, restriction of processing, data portability and objection. Contact: hello@mirzapolat.com. You also have the right to lodge a complaint with a supervisory authority.'}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '6. Technische Infrastruktur' : '6. Technical infrastructure'}
            </h2>
            <p>
              {isDE
                ? 'Konta verwendet Supabase als selbst gehostete Datenbankinfrastruktur. Daten werden in Europa gespeichert. Es werden Cookies ausschließlich für die Sitzungsverwaltung und Sprachpräferenz verwendet.'
                : 'Konta uses Supabase as self-hosted database infrastructure. Data is stored in Europe. Cookies are used solely for session management and language preference.'}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {isDE ? '7. Kontakt' : '7. Contact'}
            </h2>
            <p>
              {isDE
                ? 'Bei Fragen zum Datenschutz wenden Sie sich bitte an:'
                : 'For privacy-related questions, please contact:'}<br />
              <a href="mailto:hello@mirzapolat.com" className="text-gray-900 hover:underline">hello@mirzapolat.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 px-6 text-center text-sm text-gray-400">
        <Link to="/" className="hover:underline">Konta</Link>
        {' · '}
        <Link to="/imprint" className="hover:underline">{t('landing.imprint')}</Link>
      </footer>
    </div>
  )
}
