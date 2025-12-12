"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  FileText,
  Globe,
  MessageSquare,
  Palette,
  Users,
  CreditCard,
  HelpCircle,
  ChevronRight,
  Upload,
  Settings,
  Mail,
  Calendar,
  UserPlus,
  Shield,
  Sparkles,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

const sections = [
  { id: "overview", title: "Übersicht", icon: Bot },
  { id: "getting-started", title: "Erste Schritte", icon: ChevronRight },
  { id: "chatbot", title: "Chatbot erstellen", icon: MessageSquare },
  { id: "design", title: "Design anpassen", icon: Palette },
  { id: "leads", title: "Lead-Generierung", icon: Mail },
  { id: "team", title: "Team-Verwaltung", icon: Users },
  { id: "billing", title: "Pläne & Abrechnung", icon: CreditCard },
  { id: "faq", title: "FAQ", icon: HelpCircle },
];

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((s) => ({
        id: s.id,
        element: document.getElementById(s.id),
      }));

      for (const section of sectionElements.reverse()) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <Bot className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Chatbot Platform</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Anmelden
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Kostenlos starten
              </Link>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-8">
          {/* Sidebar Navigation */}
          <nav
            className={`${
              mobileMenuOpen ? "block" : "hidden"
            } lg:block fixed lg:sticky top-16 lg:top-24 left-0 right-0 lg:left-auto lg:right-auto bg-white lg:bg-transparent z-40 lg:z-auto p-4 lg:p-0 border-b lg:border-0 lg:h-[calc(100vh-8rem)]`}
          >
            <div className="lg:sticky lg:top-24 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                      activeSection === section.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{section.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="space-y-16 pb-24">
            {/* Overview */}
            <section id="overview" className="scroll-mt-24">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                  Willkommen zur Chatbot Platform
                </h1>
                <p className="text-lg text-blue-100 mb-6 max-w-2xl">
                  Erstelle intelligente Chatbots, die auf deinen eigenen Dokumenten und
                  Webseiten basieren. Perfekt für Kundenservice, FAQ-Bots und Lead-Generierung.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center px-6 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                >
                  Jetzt kostenlos starten
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <FeatureCard
                  icon={FileText}
                  title="Dokumente hochladen"
                  description="PDF, Word, Excel und mehr - dein Chatbot lernt aus deinen Dokumenten."
                />
                <FeatureCard
                  icon={Globe}
                  title="Webseiten scrapen"
                  description="Importiere Inhalte direkt von deiner Website oder Sitemap."
                />
                <FeatureCard
                  icon={MessageSquare}
                  title="KI-gestützte Antworten"
                  description="Basierend auf Google Gemini für präzise und hilfreiche Antworten."
                />
                <FeatureCard
                  icon={Mail}
                  title="Lead-Generierung"
                  description="Sammle Kontaktdaten und generiere qualifizierte Leads."
                />
                <FeatureCard
                  icon={Users}
                  title="Team-Zusammenarbeit"
                  description="Arbeite mit deinem Team an Chatbots und verwalte Zugriffsrechte."
                />
                <FeatureCard
                  icon={Palette}
                  title="Vollständig anpassbar"
                  description="Passe Farben, Logo und Nachrichten an dein Branding an."
                />
              </div>
            </section>

            {/* Getting Started */}
            <section id="getting-started" className="scroll-mt-24">
              <SectionHeader
                icon={ChevronRight}
                title="Erste Schritte"
                description="In wenigen Minuten zu deinem ersten Chatbot"
              />

              <div className="space-y-6">
                <StepCard
                  number={1}
                  title="Account erstellen"
                  description="Registriere dich kostenlos mit deiner E-Mail-Adresse oder Google-Account. Du erhältst sofort Zugang zu allen Basis-Funktionen."
                />
                <StepCard
                  number={2}
                  title="Team einrichten"
                  description="Nach der Registrierung wird automatisch ein Team für dich erstellt. Du kannst später Teammitglieder einladen und Rollen vergeben."
                />
                <StepCard
                  number={3}
                  title="Ersten Chatbot erstellen"
                  description="Klicke auf 'Neuer Chatbot' im Dashboard. Gib einen Namen ein und lade deine ersten Dokumente hoch oder scrape eine Website."
                />
                <StepCard
                  number={4}
                  title="Testen & Veröffentlichen"
                  description="Teste deinen Chatbot im Vorschau-Modus und schalte ihn öffentlich, sobald du zufrieden bist. Teile den Link mit deinen Kunden."
                />
              </div>
            </section>

            {/* Chatbot Configuration */}
            <section id="chatbot" className="scroll-mt-24">
              <SectionHeader
                icon={MessageSquare}
                title="Chatbot erstellen & konfigurieren"
                description="Alle Optionen für deinen intelligenten Assistenten"
              />

              <div className="grid gap-6">
                <InfoCard
                  icon={Upload}
                  title="Dokumente hochladen"
                  items={[
                    "Unterstützte Formate: PDF, DOCX, TXT, CSV, Excel",
                    "Maximale Dateigrösse abhängig vom Plan",
                    "Dokumente werden automatisch indexiert",
                    "Mehrere Dokumente pro Chatbot möglich",
                  ]}
                />
                <InfoCard
                  icon={Globe}
                  title="Webseiten scrapen"
                  items={[
                    "Einzelne Seiten-URL eingeben",
                    "Oder komplette Sitemap importieren",
                    "Inhalte werden automatisch extrahiert",
                    "Regelmässige Aktualisierung möglich",
                  ]}
                />
                <InfoCard
                  icon={Settings}
                  title="System-Instruktionen"
                  items={[
                    "Definiere die Persönlichkeit des Chatbots",
                    "Gib Anweisungen für spezifische Antworten",
                    "Lege fest, welche Themen behandelt werden",
                    "Bestimme den Tonfall (formell/informell)",
                  ]}
                />
                <InfoCard
                  icon={MessageSquare}
                  title="Starter-Fragen & Willkommensnachricht"
                  items={[
                    "Willkommensnachricht beim Öffnen des Chats",
                    "Bis zu 4 Starter-Fragen als Vorschläge",
                    "Hilft Besuchern, ins Gespräch zu kommen",
                    "Vollständig anpassbar pro Chatbot",
                  ]}
                />
              </div>
            </section>

            {/* Design */}
            <section id="design" className="scroll-mt-24">
              <SectionHeader
                icon={Palette}
                title="Design anpassen"
                description="Passe den Chatbot an dein Branding an"
              />

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Theme-Farben</h3>
                  <p className="text-gray-600 mb-4">
                    Wähle aus vordefinierten Farbschemas oder passe die Hauptfarbe an dein Branding an.
                  </p>
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500" />
                    <div className="w-8 h-8 rounded-full bg-green-500" />
                    <div className="w-8 h-8 rounded-full bg-purple-500" />
                    <div className="w-8 h-8 rounded-full bg-orange-500" />
                    <div className="w-8 h-8 rounded-full bg-cyan-500" />
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Chat-Logo</h3>
                  <p className="text-gray-600">
                    Wähle ein animiertes Logo für deinen Chatbot. Das Logo erscheint im Header
                    und bei den Bot-Nachrichten.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Öffentlich / Privat</h3>
                  <p className="text-gray-600">
                    Private Chatbots sind nur für eingeloggte Teammitglieder sichtbar.
                    Öffentliche Chatbots können von jedem mit dem Link aufgerufen werden.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Eigene URL</h3>
                  <p className="text-gray-600">
                    Jeder Chatbot erhält eine eigene URL (z.B. /c/mein-chatbot).
                    Du kannst den URL-Slug frei wählen.
                  </p>
                </div>
              </div>
            </section>

            {/* Lead Generation */}
            <section id="leads" className="scroll-mt-24">
              <SectionHeader
                icon={Mail}
                title="Lead-Generierung"
                description="Sammle Kontaktdaten und generiere Leads"
              />

              <div className="grid gap-6">
                <InfoCard
                  icon={Mail}
                  title="Kontaktformular"
                  items={[
                    "Erscheint nach X Bot-Antworten (konfigurierbar)",
                    "Oder bei Exit-Intent (Maus verlässt Fenster)",
                    "Sammelt Name, E-Mail und Nachricht",
                    "Leads werden im Dashboard angezeigt",
                  ]}
                />
                <InfoCard
                  icon={Sparkles}
                  title="Newsletter-Anmeldung"
                  items={[
                    "Separates Widget für Newsletter-Signups",
                    "Eigener Trigger (nach X Antworten oder Exit)",
                    "Einfache E-Mail-Erfassung",
                    "Export als CSV möglich",
                  ]}
                />
                <InfoCard
                  icon={Calendar}
                  title="Kalender-Integration"
                  items={[
                    "Verlinke deinen Kalender (z.B. Calendly, Cal.com)",
                    "Button erscheint im Chat-Header",
                    "Automatische Erkennung von Termin-Anfragen",
                    "Direkter Link zur Terminbuchung",
                  ]}
                />
              </div>

              <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Leads verwalten</h3>
                <p className="text-blue-700">
                  Alle gesammelten Leads findest du unter Dashboard → Leads.
                  Du kannst nach Chatbot filtern, Details anzeigen und Leads als CSV exportieren.
                </p>
              </div>
            </section>

            {/* Team Management */}
            <section id="team" className="scroll-mt-24">
              <SectionHeader
                icon={Users}
                title="Team-Verwaltung"
                description="Arbeite mit deinem Team zusammen"
              />

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Mitglieder einladen</h3>
                  </div>
                  <p className="text-gray-600">
                    Lade Teammitglieder per E-Mail ein. Sie erhalten einen Link zur Registrierung
                    und werden automatisch deinem Team hinzugefügt.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Rollen & Rechte</h3>
                  </div>
                  <p className="text-gray-600">
                    Vergib unterschiedliche Rollen mit verschiedenen Berechtigungen
                    für die Verwaltung von Chatbots und Team.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Rolle</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Beschreibung</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Owner</td>
                      <td className="px-6 py-4 text-gray-600">Volle Kontrolle, kann Team löschen und Abrechnung verwalten</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Admin</td>
                      <td className="px-6 py-4 text-gray-600">Kann Chatbots und Mitglieder verwalten</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-medium text-gray-900">Member</td>
                      <td className="px-6 py-4 text-gray-600">Kann Chatbots nutzen und Leads einsehen</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Billing */}
            <section id="billing" className="scroll-mt-24">
              <SectionHeader
                icon={CreditCard}
                title="Pläne & Abrechnung"
                description="Flexible Pläne für jede Teamgrösse"
              />

              <div className="grid sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm font-medium text-gray-500 mb-1">Free</div>
                  <div className="text-2xl font-bold text-gray-900 mb-4">Kostenlos</div>
                  <ul className="space-y-2 text-gray-600">
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-green-500 mr-2" />
                      1 Chatbot
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-green-500 mr-2" />
                      100 Nachrichten/Monat
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-green-500 mr-2" />
                      10 MB Speicher
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-green-500 mr-2" />
                      1 Teammitglied
                    </li>
                  </ul>
                </div>
                <div className="bg-blue-600 rounded-xl p-6 text-white">
                  <div className="text-sm font-medium text-blue-200 mb-1">Pro & höher</div>
                  <div className="text-2xl font-bold mb-4">Ab CHF 29/Monat</div>
                  <ul className="space-y-2 text-blue-100">
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-blue-300 mr-2" />
                      Mehr Chatbots
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-blue-300 mr-2" />
                      Mehr Nachrichten
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-blue-300 mr-2" />
                      Mehr Speicherplatz
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-blue-300 mr-2" />
                      Öffentliche Chatbots
                    </li>
                    <li className="flex items-center">
                      <ChevronRight className="w-4 h-4 text-blue-300 mr-2" />
                      Team-Zusammenarbeit
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-100 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Upgrade-Prozess</h3>
                <p className="text-gray-600">
                  Upgrade jederzeit über Dashboard → Abrechnung. Die Zahlung erfolgt sicher über Stripe.
                  Du kannst deinen Plan jederzeit ändern oder kündigen.
                </p>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-24">
              <SectionHeader
                icon={HelpCircle}
                title="Häufige Fragen"
                description="Antworten auf die wichtigsten Fragen"
              />

              <div className="space-y-4">
                <FaqItem
                  question="Welche Dokumentformate werden unterstützt?"
                  answer="PDF, DOCX, TXT, CSV, Excel (XLSX) und weitere Textformate. Die Dokumente werden automatisch verarbeitet und für den Chatbot indexiert."
                />
                <FaqItem
                  question="Wie funktioniert das Website-Scraping?"
                  answer="Du kannst einzelne URLs eingeben oder eine Sitemap-URL. Die Inhalte werden automatisch extrahiert und als Wissensquelle für den Chatbot verwendet."
                />
                <FaqItem
                  question="Kann ich den Chatbot auf meiner Website einbetten?"
                  answer="Aktuell kannst du den Chatbot über einen direkten Link teilen. Eine Embed-Funktion (iFrame/Widget) ist in Planung."
                />
                <FaqItem
                  question="Wie sicher sind meine Daten?"
                  answer="Alle Daten werden verschlüsselt übertragen und gespeichert. Wir verwenden sichere Server und halten uns an Datenschutzrichtlinien."
                />
                <FaqItem
                  question="Kann ich den Plan jederzeit wechseln?"
                  answer="Ja, du kannst jederzeit upgraden oder downgraden. Bei einem Upgrade wird anteilig abgerechnet, bei einem Downgrade gilt der neue Plan ab der nächsten Periode."
                />
                <FaqItem
                  question="Wie kann ich Support kontaktieren?"
                  answer="Bei Fragen oder Problemen erreichst du uns per E-Mail. Als zahlender Kunde erhältst du prioritären Support."
                />
              </div>
            </section>

            {/* CTA */}
            <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-center text-white">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Bereit, deinen ersten Chatbot zu erstellen?
              </h2>
              <p className="text-blue-100 mb-6 max-w-xl mx-auto">
                Starte kostenlos und erstelle in wenigen Minuten einen intelligenten Chatbot
                für dein Unternehmen.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Jetzt kostenlos starten
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <Icon className="w-8 h-8 text-blue-600 mb-4" />
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center space-x-3 mb-2">
        <Icon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex space-x-4 bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center space-x-3 mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start text-gray-600">
            <ChevronRight className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  );
}
