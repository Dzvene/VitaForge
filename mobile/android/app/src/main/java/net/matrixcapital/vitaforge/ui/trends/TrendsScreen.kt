package net.matrixcapital.vitaforge.ui.trends

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.GoalOut
import net.matrixcapital.vitaforge.model.PaceOut
import net.matrixcapital.vitaforge.model.PeriodSummary
import net.matrixcapital.vitaforge.model.TrendsOut
import net.matrixcapital.vitaforge.ui.components.VFCard

@Composable
fun TrendsScreen() {
    var trends by remember { mutableStateOf<TrendsOut?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            trends = Api.trends()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Trends", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        val t = trends
        when {
            t != null -> {
                GoalCard(t.goal)
                PeriodCard("Last 7 days", t.week)
                PeriodCard("Last 30 days", t.month)
                t.pace?.let { PaceCard(it) }
            }
            loading -> Box(Modifier.fillMaxWidth().padding(top = 40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun GoalCard(g: GoalOut) {
    if (g.status == "no_target") return
    VFCard {
        Text("Goal", fontWeight = FontWeight.SemiBold)
        g.progressPct?.let {
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(progress = { (it / 100.0).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(g.startWeightKg?.let { "%.1f".format(it) } ?: "—", fontSize = 12.sp, color = muted())
            g.currentWeightKg?.let { Text("%.1f kg".format(it), fontWeight = FontWeight.Bold) }
            Text(g.targetWeightKg?.let { "%.1f".format(it) } ?: "—", fontSize = 12.sp, color = muted())
        }
        Spacer(Modifier.height(6.dp))
        Text(goalStatus(g))
    }
}

private fun goalStatus(g: GoalOut): String = when (g.status) {
    "reached" -> "Goal reached 🎉"
    "on_track" -> g.etaWeeks?.let { "On track — about ${it.toInt()} week(s) to go." } ?: "On track."
    "off_track" -> "Off track — the trend isn't moving toward the target."
    "stalled" -> "Stalled — no clear trend yet."
    "no_data" -> "Log weight to see progress."
    else -> ""
}

@Composable
private fun PeriodCard(title: String, p: PeriodSummary) {
    VFCard {
        Text(title, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Line("Logging", "${p.daysLogged}/${p.daysTotal} days (${p.loggingAdherencePct.toInt()}%)")
        p.avg?.let { Line("Avg intake", "${it.kcal.toInt()} kcal") }
        p.onTargetPct?.let { Line("On target", "${p.onTargetDays} days (${it.toInt()}%)") }
        if (p.weightChangeKg != null && p.weeklyRateKg != null) {
            Line("Weight", "%+.2f kg (%+.2f/wk)".format(p.weightChangeKg, p.weeklyRateKg))
        }
    }
}

@Composable
private fun PaceCard(pace: PaceOut) {
    VFCard {
        Text("Pace", fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(6.dp))
        Line("Target", "%+.2f kg/wk".format(pace.targetRateKgPerWeek))
        pace.actualRateKgPerWeek?.let { Line("Actual", "%+.2f kg/wk".format(it)) }
        pace.onPacePct?.let { Line("On pace", "${it.toInt()}%") }
    }
}

@Composable
private fun Line(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = muted())
        Text(value, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun muted() = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
