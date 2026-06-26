package net.matrixcapital.vitaforge.core

import android.content.Context
import androidx.core.content.edit

/** UI language, sent as Accept-Language on every request (en/ru/de). */
enum class AppLanguage(val code: String, val display: String) {
    EN("en", "English"),
    RU("ru", "Русский"),
    DE("de", "Deutsch");

    companion object {
        private const val PREFS = "vf_settings"
        private const val KEY = "vf_lang"

        fun current(context: Context): AppLanguage {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val stored = prefs.getString(KEY, null)
            if (stored != null) {
                entries.firstOrNull { it.code == stored }?.let { return it }
            }
            val device = java.util.Locale.getDefault().language
            return entries.firstOrNull { it.code == device } ?: EN
        }

        fun set(context: Context, lang: AppLanguage) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit { putString(KEY, lang.code) }
        }
    }
}
