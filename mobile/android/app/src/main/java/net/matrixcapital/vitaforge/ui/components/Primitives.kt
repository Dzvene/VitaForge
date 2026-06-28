package net.matrixcapital.vitaforge.ui.components

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.ui.theme.VF

// -----------------------------------------------------------------------------
// Buttons — mirror web ui/primitives.tsx variants (primary/secondary/ghost/danger).
// -----------------------------------------------------------------------------
enum class VFVariant { Primary, Secondary, Ghost, Danger }

@Composable
fun VFButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: VFVariant = VFVariant.Primary,
    enabled: Boolean = true,
    loading: Boolean = false,
    leading: (@Composable () -> Unit)? = null,
    full: Boolean = false,
    small: Boolean = false,
) {
    val cs = MaterialTheme.colorScheme
    val brand = VF.colors.brand
    val shape = RoundedCornerShape(if (small) 10.dp else 12.dp)
    val container: Color
    val content: Color
    var border: BorderStroke? = null
    when (variant) {
        VFVariant.Primary -> { container = brand; content = Color.White }
        VFVariant.Secondary -> { container = cs.surface; content = cs.onSurface; border = BorderStroke(1.dp, cs.outlineVariant) }
        VFVariant.Ghost -> { container = Color.Transparent; content = cs.onSurfaceVariant }
        VFVariant.Danger -> { container = cs.error.copy(alpha = 0.12f); content = cs.error; border = BorderStroke(1.dp, cs.error.copy(alpha = 0.3f)) }
    }
    val alpha = if (enabled && !loading) 1f else 0.5f
    Row(
        modifier
            .then(if (full) Modifier.fillMaxWidth() else Modifier)
            .heightIn(min = if (small) 32.dp else 40.dp)
            .clip(shape)
            .graphicsLayer { this.alpha = alpha }
            .background(container, shape)
            .then(if (border != null) Modifier.border(border, shape) else Modifier)
            .clickable(enabled = enabled && !loading, onClick = onClick)
            .padding(horizontal = if (small) 12.dp else 16.dp, vertical = if (small) 6.dp else 9.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (loading) {
            CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = content)
        } else if (leading != null) {
            androidx.compose.runtime.CompositionLocalProvider(LocalContentColor provides content) { leading() }
        }
        Text(text, color = content, fontSize = if (small) 13.sp else 14.sp, fontWeight = FontWeight.Medium)
    }
}

// -----------------------------------------------------------------------------
// Field + text input
// -----------------------------------------------------------------------------
@Composable
fun VFField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    hint: String? = null,
    error: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    singleLine: Boolean = true,
) {
    val cs = MaterialTheme.colorScheme
    Column(modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            singleLine = singleLine,
            isError = error != null,
            visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = VF.colors.brand,
                focusedLabelColor = VF.colors.brand,
                unfocusedContainerColor = cs.surfaceVariant.copy(alpha = 0.5f),
                focusedContainerColor = cs.surfaceVariant.copy(alpha = 0.5f),
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Text(error, color = cs.error, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp, start = 4.dp))
        } else if (hint != null) {
            Text(hint, color = cs.onSurfaceVariant.copy(alpha = 0.8f), fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp, start = 4.dp))
        }
    }
}

// -----------------------------------------------------------------------------
// Badge — tone pill
// -----------------------------------------------------------------------------
enum class BadgeTone { Neutral, Brand, Ok, Warn, Danger }

@Composable
fun VFBadge(text: String, tone: BadgeTone = BadgeTone.Neutral) {
    val cs = MaterialTheme.colorScheme
    val color = when (tone) {
        BadgeTone.Neutral -> cs.onSurfaceVariant
        BadgeTone.Brand -> VF.colors.brand
        BadgeTone.Ok -> VF.colors.carb
        BadgeTone.Warn -> VF.colors.fat
        BadgeTone.Danger -> cs.error
    }
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.15f))
            .border(1.dp, color.copy(alpha = 0.3f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 3.dp),
    ) {
        Text(text, color = color, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

// -----------------------------------------------------------------------------
// Skeleton — shimmering placeholder
// -----------------------------------------------------------------------------
@Composable
fun Skeleton(modifier: Modifier = Modifier, height: Dp = 16.dp) {
    val cs = MaterialTheme.colorScheme
    val transition = rememberInfiniteTransition(label = "shimmer")
    val x by transition.animateFloat(
        initialValue = -2f, targetValue = 2f,
        animationSpec = infiniteRepeatable(tween(1300), RepeatMode.Restart), label = "x",
    )
    val base = cs.onSurface.copy(alpha = 0.07f)
    val hi = cs.onSurface.copy(alpha = 0.13f)
    Box(
        modifier
            .height(height)
            .clip(RoundedCornerShape(8.dp))
            .background(base)
            .drawWithContent {
                drawContent()
                val w = size.width
                drawRect(
                    Brush.linearGradient(
                        colors = listOf(Color.Transparent, hi, Color.Transparent),
                        start = androidx.compose.ui.geometry.Offset(x * w, 0f),
                        end = androidx.compose.ui.geometry.Offset((x + 1f) * w, 0f),
                    ),
                )
            },
    )
}

// -----------------------------------------------------------------------------
// Empty state — dashed box with icon/title/hint/action
// -----------------------------------------------------------------------------
@Composable
fun EmptyState(
    title: String,
    modifier: Modifier = Modifier,
    icon: (@Composable () -> Unit)? = null,
    hint: String? = null,
    action: (@Composable () -> Unit)? = null,
) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .border(1.dp, cs.outline, RoundedCornerShape(18.dp))
            .padding(vertical = 36.dp, horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (icon != null) {
            androidx.compose.runtime.CompositionLocalProvider(LocalContentColor provides cs.onSurfaceVariant.copy(alpha = 0.6f)) { icon() }
        }
        Text(title, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = cs.onSurface)
        if (hint != null) Text(hint, fontSize = 12.sp, color = cs.onSurfaceVariant.copy(alpha = 0.7f))
        if (action != null) action()
    }
}

// -----------------------------------------------------------------------------
// Segmented control — row of pills inside a track
// -----------------------------------------------------------------------------
@Composable
fun <T> Segmented(
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val cs = MaterialTheme.colorScheme
    Row(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(cs.surfaceVariant.copy(alpha = 0.6f))
            .border(1.dp, cs.outline, RoundedCornerShape(12.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        options.forEach { (value, label) ->
            val active = value == selected
            Box(
                Modifier
                    .clip(RoundedCornerShape(9.dp))
                    .background(if (active) VF.colors.brand else Color.Transparent)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(
                    label,
                    color = if (active) Color.White else cs.onSurfaceVariant,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}
