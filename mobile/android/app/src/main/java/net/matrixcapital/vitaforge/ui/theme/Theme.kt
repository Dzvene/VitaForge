package net.matrixcapital.vitaforge.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Brand palette — light-first, blue-steel brand + teal accent (mirrors the web
// design system, our own colors).
val Brand = Color(0xFF2966EB)
val AccentTeal = Color(0xFF00A69E)
val ProteinColor = Color(0xFF3385F5)
val FatColor = Color(0xFFF29E33)
val CarbColor = Color(0xFF4DB880)

private val LightColors = lightColorScheme(
    primary = Brand,
    onPrimary = Color.White,
    secondary = AccentTeal,
    background = Color(0xFFF6F7F9),
    surface = Color.White,
    surfaceVariant = Color(0xFFEFF1F5),
    onBackground = Color(0xFF121417),
    onSurface = Color(0xFF121417),
)

@Composable
fun VitaForgeTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = LightColors, content = content)
}
