"""Lightweight i18n for backend user-facing messages (coaching copy, errors).

The active locale is held in a ContextVar so handlers/services can translate
without threading a locale argument through every signature. A middleware sets
it from the request's ``Accept-Language`` header; the default is English.

Pattern mirrors Invocore's backend i18n. Adding a message:
1. Add the key under all of ``en``/``ru``/``de`` in ``MESSAGES``.
2. Call ``tr("your.key")`` (or ``tr("your.key", count=3)`` for interpolation).
3. Missing translation falls back to English, then to the key — never raises.
"""

from contextvars import ContextVar
from typing import Literal

from starlette.middleware.base import BaseHTTPMiddleware

Locale = Literal["en", "ru", "de"]
SUPPORTED_LOCALES: tuple[Locale, ...] = ("en", "ru", "de")
DEFAULT_LOCALE: Locale = "en"

current_locale: ContextVar[Locale] = ContextVar("current_locale", default=DEFAULT_LOCALE)


def parse_accept_language(header: str | None) -> Locale:
    """First supported locale from an Accept-Language header, else the default.

    Quality factors are ignored — clients send ordered preferences and
    first-match-wins is enough for three locales.
    """
    if not header:
        return DEFAULT_LOCALE
    for part in header.split(","):
        tag = part.split(";", 1)[0].strip().lower()
        primary = tag.split("-", 1)[0]
        if primary in SUPPORTED_LOCALES:
            return primary  # type: ignore[return-value]
    return DEFAULT_LOCALE


def tr(key: str, /, **kwargs: object) -> str:
    """Translate ``key`` for the active locale, with ``str.format`` interpolation.

    Falls back English → key so a missing entry degrades gracefully.
    """
    locale = current_locale.get()
    entry = MESSAGES.get(key)
    if entry is None:
        return key
    text = entry.get(locale) or entry.get(DEFAULT_LOCALE) or key
    if kwargs:
        try:
            return text.format(**kwargs)
        except (KeyError, IndexError, ValueError):
            return text
    return text


class LocaleMiddleware(BaseHTTPMiddleware):
    """Set the request's i18n ContextVar from the Accept-Language header."""

    async def dispatch(self, request, call_next):
        token = current_locale.set(parse_accept_language(request.headers.get("accept-language")))
        try:
            return await call_next(request)
        finally:
            current_locale.reset(token)


# --- Message catalog -------------------------------------------------------
# key -> { locale -> text }. Coaching copy (spec §5) + the most user-visible
# errors. Interpolation uses {name} placeholders resolved by str.format.
MESSAGES: dict[str, dict[str, str]] = {
    # ---- coaching warnings (§5.2) ----
    "coaching.warning.aggressive_rate.title": {
        "en": "That pace is steep",
        "ru": "Темп слишком резкий",
        "de": "Dieses Tempo ist zu steil",
    },
    "coaching.warning.aggressive_rate.message": {
        "en": "A loss rate this fast tends to burn muscle and pull your metabolism down, so the result often rebounds. A moderate deficit holds better.",
        "ru": "Такая быстрая потеря веса обычно сжигает мышцы и замедляет обмен веществ, поэтому результат часто откатывается. Умеренный дефицит держится лучше.",
        "de": "Ein so schneller Gewichtsverlust verbrennt oft Muskeln und senkt deinen Stoffwechsel, daher kippt das Ergebnis häufig zurück. Ein moderates Defizit hält besser.",
    },
    "coaching.warning.skip_calibration.title": {
        "en": "Skipping calibration",
        "ru": "Пропуск калибровки",
        "de": "Kalibrierung überspringen",
    },
    "coaching.warning.skip_calibration.message": {
        "en": "Without two weeks at maintenance the target is built on the formula, which misses for most people, so the deficit may be off. You can still proceed.",
        "ru": "Без двух недель на поддержании цель строится по формуле, которая ошибается у большинства, поэтому дефицит может быть неточным. Вы всё равно можете продолжить.",
        "de": "Ohne zwei Wochen im Erhaltungsbereich basiert das Ziel auf der Formel, die bei den meisten danebenliegt — das Defizit kann also unpassend sein. Du kannst trotzdem fortfahren.",
    },
    "coaching.warning.missed_logging.title": {
        "en": "A few days unlogged",
        "ru": "Несколько дней без записей",
        "de": "Ein paar Tage nicht erfasst",
    },
    "coaching.warning.missed_logging.message": {
        "en": "On incomplete data the maintenance recalc is imprecise, so calibration takes longer. Logging every day keeps the estimate honest.",
        "ru": "На неполных данных пересчёт поддержания неточен, поэтому калибровка затягивается. Ежедневные записи делают оценку честной.",
        "de": "Bei unvollständigen Daten ist die Neuberechnung des Erhaltungsbedarfs ungenau, daher dauert die Kalibrierung länger. Tägliches Erfassen hält die Schätzung ehrlich.",
    },
    "coaching.warning.irregular_weighing.title": {
        "en": "Weigh-ins are spotty",
        "ru": "Взвешивания нерегулярны",
        "de": "Wägungen sind lückenhaft",
    },
    "coaching.warning.irregular_weighing.message": {
        "en": "The trend is built from daily morning weigh-ins; with gaps it drifts. A quick weigh each morning keeps the trend line trustworthy.",
        "ru": "Тренд строится по ежедневным утренним взвешиваниям; с пропусками он плывёт. Быстрое взвешивание каждое утро делает линию тренда надёжной.",
        "de": "Der Trend entsteht aus täglichen Morgenwägungen; mit Lücken driftet er. Eine kurze Wägung jeden Morgen hält die Trendlinie verlässlich.",
    },
    "coaching.warning.single_day_conclusion.title": {
        "en": "That's one day of raw weight",
        "ru": "Это вес за один день",
        "de": "Das ist ein Tag Rohgewicht",
    },
    "coaching.warning.single_day_conclusion.message": {
        "en": "Day-to-day weight swings 1–2 kg on water and glycogen. Read the week's trend, not this morning's number.",
        "ru": "Вес скачет на 1–2 кг в день из-за воды и гликогена. Смотрите на недельный тренд, а не на цифру этого утра.",
        "de": "Das Gewicht schwankt täglich um 1–2 kg durch Wasser und Glykogen. Lies den Wochentrend, nicht die Zahl von heute Morgen.",
    },
    "coaching.warning.low_protein.title": {
        "en": "Protein is low for a cut",
        "ru": "Мало белка для сушки",
        "de": "Protein ist für eine Diät zu niedrig",
    },
    "coaching.warning.low_protein.message": {
        "en": "In a deficit, protein is what holds onto muscle. Setting it well below the recommended range tends to mean losing muscle instead of fat.",
        "ru": "В дефиците именно белок удерживает мышцы. Если задать его сильно ниже рекомендованного, вы скорее потеряете мышцы, а не жир.",
        "de": "Im Defizit ist Protein das, was Muskeln erhält. Deutlich unter dem empfohlenen Bereich verlierst du eher Muskeln statt Fett.",
    },
    "coaching.warning.chronic_undereating.title": {
        "en": "You're under target a lot",
        "ru": "Вы часто недоедаете",
        "de": "Du liegst oft unter dem Ziel",
    },
    "coaching.warning.chronic_undereating.message": {
        "en": "Eating well under the target most days slows the result and hits recovery. The plan works best when you actually hit it.",
        "ru": "Если есть сильно ниже цели большинство дней, результат замедляется и страдает восстановление. План работает лучше, когда вы в него попадаете.",
        "de": "Die meisten Tage deutlich unter dem Ziel zu essen verlangsamt das Ergebnis und schadet der Erholung. Der Plan funktioniert am besten, wenn du ihn triffst.",
    },
    # ---- coaching hints (§5.1) ----
    "coaching.hint.why_maintenance_first.title": {
        "en": "Why eat at maintenance first",
        "ru": "Почему сначала есть на поддержании",
        "de": "Warum zuerst auf Erhaltung essen",
    },
    "coaching.hint.why_maintenance_first.body": {
        "en": "The formula is only a guess. We measure your real burn from your own intake and weight trend before cutting, so the deficit is built on facts.",
        "ru": "Формула — лишь догадка. Мы измеряем ваш реальный расход по вашему же потреблению и тренду веса до начала дефицита, чтобы он строился на фактах.",
        "de": "Die Formel ist nur eine Schätzung. Wir messen deinen echten Verbrauch aus deiner Zufuhr und deinem Gewichtstrend, bevor wir ins Defizit gehen — so basiert es auf Fakten.",
    },
    "coaching.hint.why_trend_not_scale.title": {
        "en": "Why we read the trend, not the scale",
        "ru": "Почему мы смотрим на тренд, а не на весы",
        "de": "Warum wir den Trend lesen, nicht die Waage",
    },
    "coaching.hint.why_trend_not_scale.body": {
        "en": "Water and glycogen swing the scale 1–2 kg a day. The smoothed trend shows the real direction.",
        "ru": "Вода и гликоген качают весы на 1–2 кг в день. Сглаженный тренд показывает реальное направление.",
        "de": "Wasser und Glykogen lassen die Waage täglich um 1–2 kg schwanken. Der geglättete Trend zeigt die echte Richtung.",
    },
    "coaching.hint.why_moderate_deficit.title": {
        "en": "Why a moderate deficit",
        "ru": "Почему умеренный дефицит",
        "de": "Warum ein moderates Defizit",
    },
    "coaching.hint.why_moderate_deficit.body": {
        "en": "A fast cut burns muscle and drops your metabolism. A moderate one is sustainable and keeps the muscle you have.",
        "ru": "Быстрая сушка сжигает мышцы и роняет метаболизм. Умеренная — устойчива и сохраняет имеющиеся мышцы.",
        "de": "Eine schnelle Diät verbrennt Muskeln und senkt deinen Stoffwechsel. Eine moderate ist nachhaltig und erhält deine Muskeln.",
    },
    "coaching.hint.why_protein_priority.title": {
        "en": "Why protein comes first",
        "ru": "Почему белок в приоритете",
        "de": "Warum Protein zuerst kommt",
    },
    "coaching.hint.why_protein_priority.body": {
        "en": "In a deficit, protein is what keeps muscle on. We set it first, then fill the rest with fat and carbs.",
        "ru": "В дефиците именно белок сохраняет мышцы. Мы задаём его первым, а остальное добираем жирами и углеводами.",
        "de": "Im Defizit erhält Protein die Muskeln. Wir legen es zuerst fest und füllen den Rest mit Fett und Kohlenhydraten.",
    },
    "coaching.hint.why_recalculate.title": {
        "en": "Why the norm changes over time",
        "ru": "Почему норма меняется со временем",
        "de": "Warum sich die Norm mit der Zeit ändert",
    },
    "coaching.hint.why_recalculate.body": {
        "en": "Your burn falls as you diet (metabolic adaptation). Recalculating keeps the target matched to your real pace.",
        "ru": "По мере диеты расход падает (метаболическая адаптация). Пересчёт держит цель в соответствии с вашим реальным темпом.",
        "de": "Dein Verbrauch sinkt während der Diät (metabolische Anpassung). Die Neuberechnung hält das Ziel an deinem echten Tempo.",
    },
    # ---- in-day guidance (§5.3, §5.4) ----
    "coaching.guidance.overage": {
        "en": "Today came in above target — that's fine. No need to cut back tomorrow; just return to the usual plan. One day doesn't move the weekly trend.",
        "ru": "Сегодня вышло выше цели — это нормально. Завтра урезать не нужно; просто вернитесь к обычному плану. Один день не сдвигает недельный тренд.",
        "de": "Heute lag über dem Ziel — das ist in Ordnung. Du musst morgen nicht kürzen; kehr einfach zum üblichen Plan zurück. Ein Tag bewegt den Wochentrend nicht.",
    },
    "coaching.guidance.protein_low": {
        "en": "About {grams} g of protein left — a lean source in your next meal would round the day out.",
        "ru": "Осталось около {grams} г белка — нежирный источник в следующем приёме хорошо завершит день.",
        "de": "Noch etwa {grams} g Protein übrig — eine magere Quelle bei der nächsten Mahlzeit würde den Tag abrunden.",
    },
    "coaching.guidance.fat_high": {
        "en": "Fat budget is nearly used up — maybe go lighter on fatty sources in what's left.",
        "ru": "Лимит жиров почти исчерпан — в оставшихся приёмах стоит выбрать менее жирное.",
        "de": "Das Fettbudget ist fast aufgebraucht — geh beim Rest vielleicht sparsamer mit fettreichen Quellen um.",
    },
    "coaching.guidance.carb_room": {
        "en": "Still room for ~{grams} g of carbs — handy around training.",
        "ru": "Ещё есть место для ~{grams} г углеводов — удобно вокруг тренировки.",
        "de": "Noch Platz für ~{grams} g Kohlenhydrate — praktisch rund ums Training.",
    },
    "coaching.guidance.on_track": {
        "en": "Day's looking balanced — nice work.",
        "ru": "День выглядит сбалансированным — отличная работа.",
        "de": "Der Tag sieht ausgewogen aus — gut gemacht.",
    },
    # ---- common errors (user-visible) ----
    "error.email_exists": {
        "en": "A user with this email already exists.",
        "ru": "Пользователь с такой почтой уже существует.",
        "de": "Ein Benutzer mit dieser E-Mail existiert bereits.",
    },
    "error.invalid_credentials": {
        "en": "Incorrect email or password.",
        "ru": "Неверная почта или пароль.",
        "de": "Falsche E-Mail oder falsches Passwort.",
    },
    "error.barcode_not_found": {
        "en": "No product with that barcode.",
        "ru": "Нет продукта с таким штрихкодом.",
        "de": "Kein Produkt mit diesem Barcode.",
    },
}
