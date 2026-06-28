package net.matrixcapital.vitaforge.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// VitaForge design language — ported 1:1 from the web token set
// (frontend globals.css: `:root` = light/default, `.dark` = dark). Components
// name semantic roles (surface / ink / brand / macro …), never raw hex.

// ---- Light (:root) ----
private val LCanvas = Color(0xFFF6F8FB)     // 246 248 251
private val LSurface = Color(0xFFFFFFFF)     // 255 255 255
private val LSurface2 = Color(0xFFF0F4F9)    // 240 244 249
private val LLine = Color(0xFFE2E8F0)        // 226 232 240
private val LLineStrong = Color(0xFFCBD5E1)  // 203 213 225
private val LInk = Color(0xFF151E2B)         // 21 30 43
private val LInkMuted = Color(0xFF5A6779)    // 90 103 121
private val LBrand = Color(0xFF2B7CF0)       // brand-500: 43 124 240
private val LAccent = Color(0xFF0DA5B4)      // 13 165 180
private val LProtein = Color(0xFF337AF0)     // 51 122 240
private val LFat = Color(0xFFC6860B)         // 198 134 11
private val LCarb = Color(0xFF0DA274)        // 13 162 116
private val LDanger = Color(0xFFE0313D)      // 224 49 61

// ---- Dark (.dark) ----
private val DCanvas = Color(0xFF0A0C10)      // 10 12 16
private val DSurface = Color(0xFF11141B)     // 17 20 27
private val DSurface2 = Color(0xFF161B24)    // 22 27 36
private val DLine = Color(0xFF232A36)        // 35 42 54
private val DLineStrong = Color(0xFF2E3744)  // 46 55 68
private val DInk = Color(0xFFE7ECF3)         // 231 236 243
private val DInkMuted = Color(0xFF97A1B2)    // 151 161 178
private val DBrand = Color(0xFF3D7BFF)       // brand-500: 61 123 255
private val DAccent = Color(0xFF22C7D6)      // 34 199 214
private val DProtein = Color(0xFF4F8DFD)     // 79 141 253
private val DFat = Color(0xFFF4B740)         // 244 183 64
private val DCarb = Color(0xFF34D39A)        // 52 211 154
private val DDanger = Color(0xFFFF5C63)      // 255 92 99

/** Brand + macro hues that flip with the theme (Material's ColorScheme has no
 *  slot for them). Read via [VF.colors] inside a composable. */
@Immutable
data class VFColors(
    val brand: Color,
    val accent: Color,
    val protein: Color,
    val fat: Color,
    val carb: Color,
)

private val LightVF = VFColors(LBrand, LAccent, LProtein, LFat, LCarb)
private val DarkVF = VFColors(DBrand, DAccent, DProtein, DFat, DCarb)

val LocalVFColors = staticCompositionLocalOf { LightVF }

object VF {
    val colors: VFColors
        @Composable @ReadOnlyComposable get() = LocalVFColors.current
}

private val LightColors = lightColorScheme(
    primary = LBrand,
    onPrimary = Color.White,
    secondary = LAccent,
    onSecondary = Color.White,
    background = LCanvas,
    onBackground = LInk,
    surface = LSurface,
    onSurface = LInk,
    surfaceVariant = LSurface2,
    onSurfaceVariant = LInkMuted,
    outline = LLine,
    outlineVariant = LLineStrong,
    error = LDanger,
)

private val DarkColors = darkColorScheme(
    primary = DBrand,
    onPrimary = Color.White,
    secondary = DAccent,
    onSecondary = Color(0xFF06121A),
    background = DCanvas,
    onBackground = DInk,
    surface = DSurface,
    onSurface = DInk,
    surfaceVariant = DSurface2,
    onSurfaceVariant = DInkMuted,
    outline = DLine,
    outlineVariant = DLineStrong,
    error = DDanger,
)

@Composable
fun VitaForgeTheme(
    darkTheme: Boolean = when (net.matrixcapital.vitaforge.core.ThemeController.mode) {
        net.matrixcapital.vitaforge.core.ThemeMode.LIGHT -> false
        net.matrixcapital.vitaforge.core.ThemeMode.DARK -> true
        net.matrixcapital.vitaforge.core.ThemeMode.SYSTEM -> isSystemInDarkTheme()
    },
    content: @Composable () -> Unit,
) {
    val scheme = if (darkTheme) DarkColors else LightColors
    val vf = if (darkTheme) DarkVF else LightVF
    MaterialTheme(colorScheme = scheme, typography = VFTypography) {
        // Default every bare Text() to Inter; styled Text() overrides size/weight
        // but inherits the family (mirrors the web's global Inter body font).
        CompositionLocalProvider(
            LocalVFColors provides vf,
            LocalTextStyle provides LocalTextStyle.current.copy(fontFamily = Inter),
            content = content,
        )
    }
}

/**
 * Two faint corner glows over the canvas — the brand tint top-right, the accent
 * tint bottom-left — matching the web `body` radial-gradient backdrop. Apply to
 * a full-screen container behind the content.
 */
@Composable
fun Modifier.vfBackground(darkTheme: Boolean = isSystemInDarkTheme()): Modifier {
    val vf = VF.colors
    val base = MaterialTheme.colorScheme.background
    val tintA = if (darkTheme) 0.08f else 0.05f
    val tintB = if (darkTheme) 0.06f else 0.05f
    return this
        .background(base)
        .drawBehind {
            drawRect(
                Brush.radialGradient(
                    colors = listOf(vf.brand.copy(alpha = tintA), Color.Transparent),
                    center = Offset(size.width, -size.height * 0.1f),
                    radius = size.maxDimension * 0.9f,
                ),
            )
            drawRect(
                Brush.radialGradient(
                    colors = listOf(vf.accent.copy(alpha = tintB), Color.Transparent),
                    center = Offset(-size.width * 0.1f, size.height * 1.1f),
                    radius = size.maxDimension * 0.8f,
                ),
            )
        }
}
