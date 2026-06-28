package net.matrixcapital.vitaforge.ui.trends

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.GoalOut
import net.matrixcapital.vitaforge.model.PaceOut
import net.matrixcapital.vitaforge.model.PeriodSummary
import net.matrixcapital.vitaforge.model.TrendsOut
import net.matrixcapital.vitaforge.ui.components.BadgeTone
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EmptyState
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.ProgressBar
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFBadge
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.theme.VF
import kotlin.math.max

@Composable
fun TrendsScreen() {
    var data by remember { mutableStateOf<TrendsOut?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        data = runCatching { Api.trends() }.getOrNull()
        loading = false
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Header()
        val d = data
        when {
            loading -> {
                repeat(3) {
                    VFCard {
                        Skeleton(Modifier.fillMaxWidth(), height = 20.dp)
                        Spacer(Modifier.height(10.dp))
                        Skeleton(Modifier.fillMaxWidth(0.7f))
                        Spacer(Modifier.height(8.dp))
                        Skeleton(Modifier.fillMaxWidth())
                    }
                }
            }
            d != null -> Body(d)
            else -> VFCard {
                EmptyState(
                    title = "Couldn't load trends",
                    hint = "Check your connection and try again.",
                )
            }
        }
    }
}

@Composable
private fun Header() {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        EyebrowLabel("Insights")
        Text("Trends", fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
        Text(
            "Your last week and month at a glance.",
            fontSize = 13.sp,
            color = muted(),
        )
    }
}

@Composable
private fun Body(d: TrendsOut) {
    val noData = d.week.daysLogged == 0 && d.month.daysLogged == 0

    if (noData) {
        VFCard {
            CardTitle("Nothing logged yet")
            Spacer(Modifier.height(6.dp))
            Text("Log a few days to see trends.", fontSize = 13.sp, color = muted())
        }
    }

    GoalCard(d.goal)
    PeriodCard("This week", d, d.week)
    PeriodCard("This month", d, d.month)
    d.pace?.let { PaceCard(it) }
    IntakeChart(d)
}

@Composable
private fun GoalCard(g: GoalOut) {
    VFCard {
        if (g.status == "no_target") {
            CardTitle("Goal")
            Spacer(Modifier.height(8.dp))
            Text("No goal weight set.", fontSize = 13.sp, color = muted())
            Spacer(Modifier.height(10.dp))
            VFButton("Set goal", onClick = {})
            return@VFCard
        }

        CardTitle(
            "Goal",
            right = {
                when {
                    g.status == "reached" -> VFBadge("Reached", BadgeTone.Ok)
                    g.progressPct != null -> Text(
                        Fmt.pct(g.progressPct),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            },
        )

        g.progressPct?.let { pct ->
            Spacer(Modifier.height(10.dp))
            ProgressBar(
                fraction = (pct / 100.0).toFloat().coerceIn(0f, 1f),
                color = if (g.status == "off_track") VF.colors.fat else VF.colors.brand,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    g.startWeightKg?.let { Fmt.kg(it) } ?: "—",
                    fontSize = 12.sp,
                    color = muted(),
                )
                Text(
                    "Now " + (g.currentWeightKg?.let { Fmt.kg(it) } ?: "—"),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    g.targetWeightKg?.let { Fmt.kg(it) } ?: "—",
                    fontSize = 12.sp,
                    color = muted(),
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        Text(goalStatusLine(g), fontSize = 13.sp, color = muted())
    }
}

private fun goalStatusLine(g: GoalOut): String {
    val rem = g.remainingKg?.let { Fmt.kg(it) } ?: "—"
    return when (g.status) {
        "no_data" -> "Not enough data yet."
        "reached" -> "Goal reached."
        "stalled" -> "Progress stalled — $rem to go."
        "off_track" -> "Off track — $rem to go."
        "on_track" -> "On track — $rem to go" + (g.etaDate?.let { " · ETA $it" } ?: "")
        else -> ""
    }
}

@Composable
private fun PeriodCard(label: String, d: TrendsOut, p: PeriodSummary) {
    VFCard {
        CardTitle(
            label,
            right = {
                Text("${p.daysLogged}/${p.daysTotal} days", fontSize = 13.sp, color = muted())
            },
        )
        Spacer(Modifier.height(10.dp))
        ProgressBar(
            fraction = (p.loggingAdherencePct / 100.0).toFloat().coerceIn(0f, 1f),
            color = VF.colors.brand,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(4.dp))
        Text("logging", fontSize = 11.sp, color = muted())

        val avg = p.avg
        if (avg != null) {
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Stat(
                    modifier = Modifier.weight(1f),
                    label = "Avg calories",
                    value = Fmt.kcal(avg.kcal),
                    sub = p.avgKcalDelta?.let { "vs target ${signedKcal(it)}" },
                )
                Stat(
                    modifier = Modifier.weight(1f),
                    label = "On-target days",
                    value = "${p.onTargetDays}/${p.daysLogged}",
                    sub = p.onTargetPct?.let { Fmt.pct(it) },
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                MacroStat(Modifier.weight(1f), "Protein", VF.colors.protein, avg.proteinG, d.targetProteinG)
                MacroStat(Modifier.weight(1f), "Fat", VF.colors.fat, avg.fatG, d.targetFatG)
                MacroStat(Modifier.weight(1f), "Carbs", VF.colors.carb, avg.carbG, d.targetCarbG)
            }
        } else {
            Spacer(Modifier.height(10.dp))
            Text("Nothing logged", fontSize = 13.sp, color = muted())
        }

        p.weeklyRateKg?.let { rate ->
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Weight rate", fontSize = 13.sp, color = muted())
                Text(Fmt.kgSigned(rate) + "/wk", fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun Stat(modifier: Modifier, label: String, value: String, sub: String?) {
    Column(modifier) {
        Text(label, fontSize = 11.sp, color = muted())
        Spacer(Modifier.height(2.dp))
        Text(value, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        if (sub != null) {
            Spacer(Modifier.height(2.dp))
            Text(sub, fontSize = 11.sp, color = muted())
        }
    }
}

@Composable
private fun MacroStat(modifier: Modifier, label: String, color: Color, value: Double, target: Double) {
    Column(modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Dot(color)
            Spacer(Modifier.width(4.dp))
            Text(label, fontSize = 11.sp, color = muted())
        }
        Spacer(Modifier.height(2.dp))
        Text(Fmt.g(value), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
        Text("of ${Fmt.g(target)}", fontSize = 11.sp, color = muted())
    }
}

@Composable
private fun Dot(color: Color) {
    Canvas(Modifier.size(8.dp)) {
        drawCircle(color = color)
    }
}

@Composable
private fun PaceCard(pace: PaceOut) {
    VFCard {
        if (pace.goal == "maintain") {
            CardTitle("Pace")
            Spacer(Modifier.height(8.dp))
            Text(
                "Holding maintenance — actual ${Fmt.kgSigned(pace.actualRateKgPerWeek ?: 0.0)}/wk.",
                fontSize = 13.sp,
                color = muted(),
            )
            return@VFCard
        }

        val onPace = pace.onPacePct
        CardTitle(
            "Pace",
            right = {
                VFBadge(
                    Fmt.pct(onPace ?: 0.0),
                    tone = when {
                        onPace != null && onPace >= 70 -> BadgeTone.Ok
                        onPace != null && onPace >= 30 -> BadgeTone.Warn
                        else -> BadgeTone.Danger
                    },
                )
            },
        )
        Spacer(Modifier.height(10.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Stat(
                modifier = Modifier.weight(1f),
                label = "Planned",
                value = Fmt.kgSigned(pace.targetRateKgPerWeek) + "/wk",
                sub = null,
            )
            Stat(
                modifier = Modifier.weight(1f),
                label = "Actual",
                value = Fmt.kgSigned(pace.actualRateKgPerWeek ?: 0.0) + "/wk",
                sub = null,
            )
        }
        Spacer(Modifier.height(10.dp))
        Text("Based on your weight trend vs your plan.", fontSize = 12.sp, color = muted())
    }
}

@Composable
private fun IntakeChart(d: TrendsOut) {
    VFCard {
        CardTitle("Last 30 days")
        Spacer(Modifier.height(12.dp))

        val anyLogged = d.daily.any { it.logged }
        if (!anyLogged || d.daily.isEmpty()) {
            Text("Nothing logged", fontSize = 13.sp, color = muted())
            return@VFCard
        }

        val target = d.targetKcal
        val maxVal = max(
            target,
            d.daily.mapNotNull { it.kcal }.maxOrNull() ?: target,
        ).coerceAtLeast(1.0)

        val under = VF.colors.brand
        val over = VF.colors.fat
        val missing = muted()
        val lineColor = muted()

        Canvas(
            Modifier
                .fillMaxWidth()
                .height(140.dp),
        ) {
            val n = d.daily.size
            val w = size.width
            val h = size.height
            val slot = w / n
            val barW = (slot * 0.6f).coerceAtLeast(1f)
            val targetY = h - (target / maxVal).toFloat() * h

            // dashed target line
            drawLine(
                color = lineColor.copy(alpha = 0.5f),
                start = Offset(0f, targetY),
                end = Offset(w, targetY),
                strokeWidth = 1.5f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 6f), 0f),
            )

            d.daily.forEachIndexed { i, pt ->
                val cx = slot * i + slot / 2f
                val kcal = pt.kcal
                if (!pt.logged || kcal == null) {
                    // thin baseline tick for missing days
                    drawRect(
                        color = missing.copy(alpha = 0.35f),
                        topLeft = Offset(cx - barW / 2f, h - 2f),
                        size = Size(barW, 2f),
                    )
                } else {
                    val barH = (kcal / maxVal).toFloat() * h
                    val color = if (kcal > target) over else under
                    drawRect(
                        color = color,
                        topLeft = Offset(cx - barW / 2f, h - barH),
                        size = Size(barW, barH),
                    )
                }
            }
        }

        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            LegendItem(under, "under")
            LegendItem(over, "over")
            LegendItem(muted().copy(alpha = 0.5f), "missing")
        }
    }
}

@Composable
private fun LegendItem(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Dot(color)
        Spacer(Modifier.width(4.dp))
        Text(label, fontSize = 11.sp, color = muted())
    }
}

private fun signedKcal(v: Double): String {
    val sign = if (v >= 0) "+" else "−"
    return sign + Fmt.kcal(kotlin.math.abs(v))
}

@Composable
private fun muted(): Color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
