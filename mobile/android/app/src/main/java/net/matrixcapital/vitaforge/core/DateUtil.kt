package net.matrixcapital.vitaforge.core

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** Diary/weight dates are local `YYYY-MM-DD` with no tz shift (MOBILE_API.md). */
object DateUtil {
    private val iso = SimpleDateFormat("yyyy-MM-dd", Locale.US) // device-local tz

    fun today(): String = iso.format(Date())

    fun addDays(day: String, delta: Int): String {
        val cal = Calendar.getInstance().apply { time = iso.parse(day) ?: Date() }
        cal.add(Calendar.DAY_OF_MONTH, delta)
        return iso.format(cal.time)
    }

    /** "Today" / "Yesterday" / localized weekday+date for the picker header. */
    fun label(day: String): String {
        val t = today()
        return when (day) {
            t -> "Today"
            addDays(t, -1) -> "Yesterday"
            addDays(t, 1) -> "Tomorrow"
            else -> {
                val d = iso.parse(day) ?: return day
                SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(d)
            }
        }
    }
}
