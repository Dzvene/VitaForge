package net.matrixcapital.vitaforge.core

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Diary/weight dates are local `YYYY-MM-DD` with no tz shift (MOBILE_API.md). */
object DateUtil {
    private val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US) // device-local tz
    fun today(): String = formatter.format(Date())
}
