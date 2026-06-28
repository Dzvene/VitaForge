package net.matrixcapital.vitaforge.core

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.edit

enum class ThemeMode(val code: String, val label: String) {
    LIGHT("light", "Light"),
    DARK("dark", "Dark"),
    SYSTEM("system", "System");

    companion object {
        fun from(code: String?): ThemeMode = entries.firstOrNull { it.code == code } ?: SYSTEM
    }
}

/** Holds the chosen theme as observable Compose state; persists to prefs.
 *  VitaForgeTheme reads [mode] so a change recomposes the whole tree. */
object ThemeController {
    private const val PREFS = "vf_settings"
    private const val KEY = "vf_theme"

    var mode by mutableStateOf(ThemeMode.SYSTEM)
        private set

    fun init(context: Context) {
        val stored = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null)
        mode = ThemeMode.from(stored)
    }

    fun set(context: Context, m: ThemeMode) {
        mode = m
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit { putString(KEY, m.code) }
    }
}
