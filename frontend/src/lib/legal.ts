/**
 * Public legal / policy content, per locale. Long-form text lives here rather
 * than in the i18n message catalog so the t() namespaces stay lean. The legal
 * pages read the active i18n language and render the matching document.
 *
 * ⚠️ Boilerplate drafted for a pre-launch, free, no-ads tracker. Items in
 * [brackets] are placeholders the operator MUST fill with real details before a
 * production launch (legal name, postal address, hosting provider). The German
 * Impressum (§5 DDG/TMG) and Datenschutz (GDPR/DSGVO) are legally required for
 * the DACH market and need a real responsible person + address.
 */

export type LegalDoc = "impressum" | "privacy" | "terms" | "cookies";

export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalContent {
  title: string;
  updated: string; // ISO date, shown as "last updated"
  intro?: string;
  sections: LegalSection[];
}

const OPERATOR = "[Operator legal name]";
const ADDRESS = "[Street, Postal code City, Country]";
const EMAIL = "rybalkin.nikolay@gmail.com";
const UPDATED = "2026-06-25";

type Locale = "en" | "ru" | "de";

export const LEGAL: Record<Locale, Record<LegalDoc, LegalContent>> = {
  en: {
    impressum: {
      title: "Imprint",
      updated: UPDATED,
      intro: "Information pursuant to § 5 DDG (German Digital Services Act).",
      sections: [
        { heading: "Operator", body: [`${OPERATOR}`, `${ADDRESS}`] },
        { heading: "Contact", body: [`Email: ${EMAIL}`] },
        {
          heading: "Responsible for content",
          body: [`${OPERATOR}, address as above (§ 18 (2) MStV).`],
        },
        {
          heading: "EU dispute resolution",
          body: [
            "The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr.",
            "We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration board.",
          ],
        },
        {
          heading: "Liability for content",
          body: [
            "As a service provider we are responsible for our own content on these pages under general law. We are not obliged to monitor transmitted or stored third-party information.",
            "VitaForge is an informational and tracking tool. It does not provide medical advice — see the Terms.",
          ],
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      updated: UPDATED,
      intro:
        "We keep data collection to the minimum needed to run a calorie & macro tracker. No ads, no third-party trackers, nothing sold.",
      sections: [
        {
          heading: "Controller",
          body: [`${OPERATOR}, ${ADDRESS}. Contact: ${EMAIL}.`],
        },
        {
          heading: "What we collect",
          body: [
            "Account: your email address and a hashed password (we never store the plaintext password).",
            "Profile & logs you enter: sex, age, height, weight, activity, goal, food diary entries, weigh-ins and the targets/calibration derived from them.",
            "Technical: standard server logs (IP, timestamp, request) kept briefly for security and operation.",
          ],
        },
        {
          heading: "Why (legal basis)",
          body: [
            "To provide the service you signed up for — performance of a contract (Art. 6 (1)(b) GDPR).",
            "To keep the service secure and working — our legitimate interest (Art. 6 (1)(f) GDPR).",
          ],
        },
        {
          heading: "Local storage (no cookies for tracking)",
          body: [
            "Your browser stores a login token and your language/theme preferences locally. These are essential for the app to work and are not used to track you across sites.",
          ],
        },
        {
          heading: "Sharing & hosting",
          body: [
            "We do not sell your data and do not share it with advertisers. Data is processed on hosting infrastructure located in the European Union ([hosting provider]).",
          ],
        },
        {
          heading: "Retention",
          body: [
            "We keep your data while your account exists. Delete your account at any time (Settings → Data & account) and all your data is erased.",
          ],
        },
        {
          heading: "Your rights (GDPR)",
          body: [
            "You can access, rectify, export and erase your data, and object to or restrict processing. The app gives you self-service export and deletion under Settings → Data & account.",
            `For any request, contact ${EMAIL}. You also have the right to lodge a complaint with a supervisory authority.`,
          ],
        },
        {
          heading: "Changes",
          body: ["We may update this policy; the date above reflects the latest version."],
        },
      ],
    },
    terms: {
      title: "Terms of Service",
      updated: UPDATED,
      intro: "Plain terms for using VitaForge. By creating an account you agree to them.",
      sections: [
        {
          heading: "The service",
          body: [
            "VitaForge is a calorie and macro tracker that estimates your real maintenance from your own intake and weight trend. It is provided free of charge, with no ads and no paywall.",
          ],
        },
        {
          heading: "Not medical advice",
          body: [
            "VitaForge is an informational tool, not a medical device or a substitute for professional advice. Consult a qualified professional before making significant dietary changes, especially with a health condition, pregnancy, or an eating disorder history.",
          ],
        },
        {
          heading: "Your account",
          body: [
            "Keep your credentials secure and provide accurate information. You are responsible for activity under your account.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Don't abuse, disrupt, reverse-engineer, or attempt to gain unauthorized access to the service or other users' data.",
          ],
        },
        {
          heading: "Availability & warranty",
          body: [
            'The service is provided "as is", without warranties of any kind. As a free service we may change, suspend, or discontinue features, and we don\'t guarantee uninterrupted availability.',
          ],
        },
        {
          heading: "Liability",
          body: [
            "To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service. Nothing here limits liability that cannot be limited by law.",
          ],
        },
        {
          heading: "Termination",
          body: [
            "You can delete your account at any time. We may suspend accounts that violate these terms.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookies & Local Storage",
      updated: UPDATED,
      intro: "Short version: we use essential local storage only, and no tracking or advertising cookies.",
      sections: [
        {
          heading: "What we store",
          body: [
            "Login token — keeps you signed in.",
            "Language preference — remembers EN / RU / DE.",
            "Theme preference — remembers light / dark / system.",
          ],
        },
        {
          heading: "What we don't do",
          body: [
            "No advertising cookies, no analytics that profile you, no third-party trackers. Because we only use storage that's strictly necessary to run the app, no consent banner is required.",
          ],
        },
      ],
    },
  },

  ru: {
    impressum: {
      title: "Выходные данные (Impressum)",
      updated: UPDATED,
      intro: "Сведения согласно § 5 DDG (Закон ФРГ о цифровых услугах).",
      sections: [
        { heading: "Оператор", body: [`${OPERATOR}`, `${ADDRESS}`] },
        { heading: "Контакт", body: [`Email: ${EMAIL}`] },
        {
          heading: "Ответственный за содержание",
          body: [`${OPERATOR}, адрес выше (§ 18 (2) MStV).`],
        },
        {
          heading: "Разрешение споров (ЕС)",
          body: [
            "Еврокомиссия предоставляет платформу для онлайн-разрешения споров (ODR): https://ec.europa.eu/consumers/odr.",
            "Мы не обязаны и не намерены участвовать в разбирательствах перед арбитражной комиссией по потребительским спорам.",
          ],
        },
        {
          heading: "Ответственность за содержание",
          body: [
            "Как поставщик услуг мы отвечаем за собственный контент по общим нормам права и не обязаны отслеживать переданную или сохранённую информацию третьих лиц.",
            "VitaForge — информационный инструмент учёта. Он не даёт медицинских рекомендаций — см. Условия.",
          ],
        },
      ],
    },
    privacy: {
      title: "Политика конфиденциальности",
      updated: UPDATED,
      intro:
        "Мы собираем минимум данных, нужных для работы трекера калорий и макросов. Без рекламы, без сторонних трекеров, ничего не продаём.",
      sections: [
        { heading: "Контролёр данных", body: [`${OPERATOR}, ${ADDRESS}. Контакт: ${EMAIL}.`] },
        {
          heading: "Что мы собираем",
          body: [
            "Аккаунт: ваш email и хэш пароля (открытый пароль не храним).",
            "Профиль и записи: пол, возраст, рост, вес, активность, цель, записи дневника еды, взвешивания и рассчитанные из них нормы/калибровка.",
            "Технические: стандартные серверные логи (IP, время, запрос) — кратковременно, для безопасности и работы.",
          ],
        },
        {
          heading: "Зачем (правовое основание)",
          body: [
            "Для предоставления услуги, на которую вы подписались — исполнение договора (ст. 6 (1)(b) GDPR).",
            "Для безопасности и работоспособности сервиса — наш законный интерес (ст. 6 (1)(f) GDPR).",
          ],
        },
        {
          heading: "Локальное хранилище (без трекинговых cookie)",
          body: [
            "Браузер локально хранит токен входа и настройки языка/темы. Они необходимы для работы приложения и не используются для слежки между сайтами.",
          ],
        },
        {
          heading: "Передача и хостинг",
          body: [
            "Мы не продаём ваши данные и не передаём их рекламодателям. Данные обрабатываются на инфраструктуре в Европейском союзе ([хостинг-провайдер]).",
          ],
        },
        {
          heading: "Срок хранения",
          body: [
            "Данные хранятся, пока существует аккаунт. Удалите аккаунт в любой момент (Настройки → Данные и аккаунт) — все данные стираются.",
          ],
        },
        {
          heading: "Ваши права (GDPR)",
          body: [
            "Вы можете получить доступ, исправить, экспортировать и удалить данные, возразить против обработки или ограничить её. В приложении есть самостоятельный экспорт и удаление: Настройки → Данные и аккаунт.",
            `По любому запросу пишите на ${EMAIL}. Вы также вправе подать жалобу в надзорный орган.`,
          ],
        },
        {
          heading: "Изменения",
          body: ["Мы можем обновлять политику; дата выше отражает актуальную версию."],
        },
      ],
    },
    terms: {
      title: "Условия использования",
      updated: UPDATED,
      intro: "Простые условия пользования VitaForge. Создавая аккаунт, вы соглашаетесь с ними.",
      sections: [
        {
          heading: "Сервис",
          body: [
            "VitaForge — трекер калорий и макросов, который оценивает ваш реальный maintenance по собственному потреблению и тренду веса. Предоставляется бесплатно, без рекламы и пейволла.",
          ],
        },
        {
          heading: "Не медицинская консультация",
          body: [
            "VitaForge — информационный инструмент, не медицинское изделие и не замена профессиональной консультации. Перед существенными изменениями рациона проконсультируйтесь со специалистом, особенно при заболеваниях, беременности или истории расстройств пищевого поведения.",
          ],
        },
        {
          heading: "Ваш аккаунт",
          body: [
            "Храните доступы в безопасности и указывайте достоверные данные. Вы отвечаете за действия под своим аккаунтом.",
          ],
        },
        {
          heading: "Допустимое использование",
          body: [
            "Не злоупотребляйте сервисом, не нарушайте его работу, не пытайтесь получить несанкционированный доступ к данным других пользователей.",
          ],
        },
        {
          heading: "Доступность и гарантии",
          body: [
            "Сервис предоставляется «как есть», без каких-либо гарантий. Как бесплатный сервис, мы можем менять, приостанавливать или прекращать функции и не гарантируем бесперебойную работу.",
          ],
        },
        {
          heading: "Ответственность",
          body: [
            "В пределах, допустимых законом, мы не несём ответственности за косвенный ущерб от использования сервиса. Это не ограничивает ответственность, которую нельзя ограничить по закону.",
          ],
        },
        {
          heading: "Прекращение",
          body: [
            "Вы можете удалить аккаунт в любой момент. Мы можем заблокировать аккаунты, нарушающие условия.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie и локальное хранилище",
      updated: UPDATED,
      intro: "Коротко: только необходимое локальное хранилище, без трекинга и рекламных cookie.",
      sections: [
        {
          heading: "Что мы храним",
          body: [
            "Токен входа — чтобы вы оставались авторизованы.",
            "Язык — запоминает EN / RU / DE.",
            "Тему — запоминает светлую / тёмную / системную.",
          ],
        },
        {
          heading: "Чего мы не делаем",
          body: [
            "Никаких рекламных cookie, профилирующей аналитики и сторонних трекеров. Поскольку мы используем только строго необходимое хранилище, баннер согласия не требуется.",
          ],
        },
      ],
    },
  },

  de: {
    impressum: {
      title: "Impressum",
      updated: UPDATED,
      intro: "Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz).",
      sections: [
        { heading: "Betreiber", body: [`${OPERATOR}`, `${ADDRESS}`] },
        { heading: "Kontakt", body: [`E-Mail: ${EMAIL}`] },
        {
          heading: "Verantwortlich für den Inhalt",
          body: [`${OPERATOR}, Anschrift wie oben (§ 18 Abs. 2 MStV).`],
        },
        {
          heading: "EU-Streitschlichtung",
          body: [
            "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr.",
            "Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
          ],
        },
        {
          heading: "Haftung für Inhalte",
          body: [
            "Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.",
            "VitaForge ist ein Informations- und Tracking-Werkzeug. Es ersetzt keine medizinische Beratung — siehe Nutzungsbedingungen.",
          ],
        },
      ],
    },
    privacy: {
      title: "Datenschutzerklärung",
      updated: UPDATED,
      intro:
        "Wir erheben nur die Daten, die für einen Kalorien- und Makro-Tracker nötig sind. Keine Werbung, keine Drittanbieter-Tracker, kein Datenverkauf.",
      sections: [
        { heading: "Verantwortlicher", body: [`${OPERATOR}, ${ADDRESS}. Kontakt: ${EMAIL}.`] },
        {
          heading: "Welche Daten",
          body: [
            "Konto: deine E-Mail-Adresse und ein Passwort-Hash (das Klartext-Passwort speichern wir nie).",
            "Profil & Einträge: Geschlecht, Alter, Größe, Gewicht, Aktivität, Ziel, Ernährungstagebuch, Wägungen und die daraus abgeleiteten Ziele/Kalibrierung.",
            "Technisch: übliche Server-Logs (IP, Zeitstempel, Anfrage), kurz aufbewahrt zur Sicherheit und zum Betrieb.",
          ],
        },
        {
          heading: "Wozu (Rechtsgrundlage)",
          body: [
            "Zur Bereitstellung des Dienstes — Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).",
            "Zur Sicherheit und Funktion des Dienstes — berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO).",
          ],
        },
        {
          heading: "Lokaler Speicher (keine Tracking-Cookies)",
          body: [
            "Dein Browser speichert lokal ein Login-Token sowie Sprach- und Theme-Einstellungen. Diese sind für die App notwendig und werden nicht zum seitenübergreifenden Tracking genutzt.",
          ],
        },
        {
          heading: "Weitergabe & Hosting",
          body: [
            "Wir verkaufen deine Daten nicht und geben sie nicht an Werbetreibende weiter. Die Verarbeitung erfolgt auf Hosting-Infrastruktur in der Europäischen Union ([Hosting-Anbieter]).",
          ],
        },
        {
          heading: "Speicherdauer",
          body: [
            "Wir speichern deine Daten, solange dein Konto besteht. Lösche dein Konto jederzeit (Einstellungen → Daten & Konto) — alle Daten werden entfernt.",
          ],
        },
        {
          heading: "Deine Rechte (DSGVO)",
          body: [
            "Du hast Recht auf Auskunft, Berichtigung, Export, Löschung sowie Widerspruch und Einschränkung der Verarbeitung. Die App bietet Self-Service-Export und -Löschung unter Einstellungen → Daten & Konto.",
            `Für Anfragen schreibe an ${EMAIL}. Du hast zudem das Recht auf Beschwerde bei einer Aufsichtsbehörde.`,
          ],
        },
        {
          heading: "Änderungen",
          body: ["Wir können diese Erklärung aktualisieren; das Datum oben nennt die aktuelle Fassung."],
        },
      ],
    },
    terms: {
      title: "Nutzungsbedingungen",
      updated: UPDATED,
      intro: "Klare Bedingungen für die Nutzung von VitaForge. Mit der Kontoerstellung stimmst du ihnen zu.",
      sections: [
        {
          heading: "Der Dienst",
          body: [
            "VitaForge ist ein Kalorien- und Makro-Tracker, der deinen echten Erhaltungsbedarf aus deiner Zufuhr und deinem Gewichtstrend schätzt. Er ist kostenlos, ohne Werbung und ohne Paywall.",
          ],
        },
        {
          heading: "Keine medizinische Beratung",
          body: [
            "VitaForge ist ein Informationswerkzeug, kein Medizinprodukt und kein Ersatz für professionelle Beratung. Konsultiere vor wesentlichen Ernährungsänderungen Fachpersonal — besonders bei Erkrankungen, Schwangerschaft oder einer Vorgeschichte von Essstörungen.",
          ],
        },
        {
          heading: "Dein Konto",
          body: [
            "Halte deine Zugangsdaten sicher und mache wahrheitsgemäße Angaben. Für Aktivitäten unter deinem Konto bist du verantwortlich.",
          ],
        },
        {
          heading: "Zulässige Nutzung",
          body: [
            "Missbrauche oder störe den Dienst nicht, betreibe kein Reverse Engineering und versuche keinen unbefugten Zugriff auf Daten anderer Nutzer.",
          ],
        },
        {
          heading: "Verfügbarkeit & Gewährleistung",
          body: [
            "Der Dienst wird „wie besehen“ ohne jegliche Gewährleistung bereitgestellt. Als kostenloser Dienst können wir Funktionen ändern, aussetzen oder einstellen und garantieren keine unterbrechungsfreie Verfügbarkeit.",
          ],
        },
        {
          heading: "Haftung",
          body: [
            "Soweit gesetzlich zulässig, haften wir nicht für indirekte oder Folgeschäden aus der Nutzung des Dienstes. Eine Haftung, die nicht beschränkt werden darf, bleibt unberührt.",
          ],
        },
        {
          heading: "Beendigung",
          body: [
            "Du kannst dein Konto jederzeit löschen. Wir können Konten sperren, die gegen diese Bedingungen verstoßen.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookies & lokaler Speicher",
      updated: UPDATED,
      intro: "Kurz: nur notwendiger lokaler Speicher, keine Tracking- oder Werbe-Cookies.",
      sections: [
        {
          heading: "Was wir speichern",
          body: [
            "Login-Token — hält dich angemeldet.",
            "Sprache — merkt sich EN / RU / DE.",
            "Theme — merkt sich hell / dunkel / System.",
          ],
        },
        {
          heading: "Was wir nicht tun",
          body: [
            "Keine Werbe-Cookies, kein profilierendes Tracking, keine Drittanbieter-Tracker. Da wir nur unbedingt notwendigen Speicher nutzen, ist kein Einwilligungsbanner erforderlich.",
          ],
        },
      ],
    },
  },
};
