package net.matrixcapital.vitaforge.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.ui.theme.VF
import kotlin.math.max
import kotlin.math.min

/** Card container — rounded-2xl, surface, hairline border + soft shadow (web `.card`). */
@Composable
fun VFCard(
    modifier: Modifier = Modifier,
    variant2: Boolean = false,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(if (variant2) cs.surfaceVariant.copy(alpha = 0.6f) else cs.surface)
            .border(1.dp, cs.outline, RoundedCornerShape(18.dp))
            .padding(18.dp),
        content = content,
    )
}

@Composable
fun CardTitle(title: String, right: (@Composable () -> Unit)? = null) {
    Row(
        Modifier.fillMaxWidth().padding(bottom = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
        if (right != null) right()
    }
}

/** Small uppercase eyebrow label (web `.label`). */
@Composable
fun EyebrowLabel(text: String) {
    Text(
        text.uppercase(),
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        letterSpacing = 1.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
    )
}

/** Labelled macro progress bar (eaten vs target) with remaining/over caption. */
@Composable
fun MacroBar(label: String, eaten: Double, target: Double, tint: Color) {
    val cs = MaterialTheme.colorScheme
    val frac = Fmt.progress(eaten, target)
    val over = eaten > target
    val barColor = if (over) cs.error else tint
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = cs.onSurface)
            Text(
                buildAnnotatedMacro(eaten, target),
                color = cs.onSurfaceVariant,
                fontSize = 12.sp,
            )
        }
        Spacer(Modifier.height(6.dp))
        Box(
            Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50))
                .background(cs.onSurface.copy(alpha = 0.07f)),
        ) {
            Box(Modifier.fillMaxWidth(frac).height(10.dp).clip(RoundedCornerShape(50)).background(barColor))
        }
        Spacer(Modifier.height(4.dp))
        Text(
            if (over) "over by ${Fmt.g(eaten - target)}" else "${Fmt.g(max(0.0, target - eaten))} left",
            fontSize = 11.sp,
            color = cs.onSurfaceVariant.copy(alpha = 0.7f),
            modifier = Modifier.fillMaxWidth(),
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
        )
    }
}

private fun buildAnnotatedMacro(eaten: Double, target: Double): String =
    "${Fmt.g(eaten)} / ${Fmt.g(target)}"

/** Calorie ring — remaining calories centred; brand→accent sweep, danger when over. */
@Composable
fun CalorieRing(eaten: Double, target: Double, size: Dp = 200.dp) {
    val cs = MaterialTheme.colorScheme
    val frac = Fmt.progress(eaten, target)
    val over = target > 0 && eaten > target
    val remaining = (target - eaten)
    val sweepBrush = Brush.sweepGradient(listOf(VF.colors.brand, VF.colors.accent, VF.colors.brand))
    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size)) {
        Canvas(Modifier.size(size)) {
            val stroke = 16.dp.toPx()
            val arcSize = Size(this.size.width - stroke, this.size.height - stroke)
            val topLeft = Offset(stroke / 2, stroke / 2)
            drawArc(
                color = cs.onSurface.copy(alpha = 0.10f),
                startAngle = 0f, sweepAngle = 360f, useCenter = false,
                topLeft = topLeft, size = arcSize, style = Stroke(width = stroke),
            )
            if (over) {
                drawArc(
                    color = cs.error,
                    startAngle = -90f, sweepAngle = 360f, useCenter = false,
                    topLeft = topLeft, size = arcSize, style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            } else {
                drawArc(
                    brush = sweepBrush,
                    startAngle = -90f, sweepAngle = 360f * frac, useCenter = false,
                    topLeft = topLeft, size = arcSize, style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            EyebrowLabel(if (over) "over by" else "remaining")
            Text(
                Fmt.kcal(kotlin.math.abs(remaining)),
                fontSize = 36.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (over) cs.error else cs.onSurface,
            )
            Text(
                "${Fmt.kcal(eaten)} / ${Fmt.kcal(target)} kcal",
                fontSize = 12.sp,
                color = cs.onSurfaceVariant.copy(alpha = 0.7f),
            )
        }
    }
}

/** Thin progress bar used across cards (goal, adherence, calibration). */
@Composable
fun ProgressBar(fraction: Float, color: Color, modifier: Modifier = Modifier, height: Dp = 8.dp) {
    val cs = MaterialTheme.colorScheme
    Box(modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(50)).background(cs.onSurface.copy(alpha = 0.08f))) {
        Box(Modifier.fillMaxWidth(min(1f, max(0f, fraction))).height(height).clip(RoundedCornerShape(50)).background(color))
    }
}
