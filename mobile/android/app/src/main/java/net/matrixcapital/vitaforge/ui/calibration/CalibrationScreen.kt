package net.matrixcapital.vitaforge.ui.calibration

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.CalibrationStatus
import net.matrixcapital.vitaforge.model.EstimateResult
import net.matrixcapital.vitaforge.ui.components.BadgeTone
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.ProgressBar
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFBadge
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFVariant
import net.matrixcapital.vitaforge.ui.theme.VF
import kotlin.math.min
import kotlin.math.roundToInt

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun CalibrationScreen() {
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf<CalibrationStatus?>(null) }
    var result by remember { mutableStateOf<EstimateResult?>(null) }
    var loading by remember { mutableStateOf(true) }
    var working by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        status = runCatching { Api.calibrationStatus() }.getOrNull()
        loading = false
    }

    fun run(op: suspend () -> EstimateResult) {
        if (working) return
        working = true
        scope.launch {
            result = runCatching { op() }.getOrNull()
            working = false
            reloadKey++
        }
    }

    val s = status
    val done = s?.phase == "completed"
    val pct: Int = if (s != null && s.windowDays > 0) {
        min(100, (s.cleanDaysCollected.toDouble() / s.windowDays * 100).roundToInt())
    } else 0

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // 1. Header
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            EyebrowLabel("Calibration")
            Text("Calibration", fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            Text(
                "We measure your real maintenance from what you actually eat and how your weight trends — then apply your goal.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // 2. Baseline window
        VFCard {
            CardTitle(
                "Baseline window",
                right = {
                    if (done) VFBadge("Calibrated", BadgeTone.Ok) else VFBadge("In progress", BadgeTone.Brand)
                },
            )
            Spacer(Modifier.height(8.dp))
            if (loading || s == null) {
                Skeleton()
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("${s.cleanDaysCollected}/${s.windowDays} clean days")
                    Text("$pct%", fontWeight = FontWeight.Medium)
                }
                Spacer(Modifier.height(8.dp))
                ProgressBar(fraction = pct / 100f, color = VF.colors.brand)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Log most days and weigh in daily to collect clean days.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (!done && s.daysRemaining > 0) {
                    Text(
                        "${s.daysRemaining} days remaining",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (!done) {
                        VFButton("Compute", enabled = !working, onClick = { run { Api.calibrationEstimate() } })
                    }
                    if (done) {
                        VFButton("Recalculate", enabled = !working, onClick = { run { Api.calibrationRecalc() } })
                    }
                    if (!done) {
                        VFButton("Skip", variant = VFVariant.Ghost, enabled = !working, onClick = { run { Api.calibrationSkip() } })
                    }
                }
            }
        }

        // 3. Latest estimate
        VFCard {
            CardTitle("Latest estimate")
            Spacer(Modifier.height(8.dp))
            val r = result
            when {
                r != null && r.ok -> {
                    r.realTdee?.let { EstimateRow("Real maintenance", "${Fmt.kcal(it)} kcal") }
                    r.targetCalories?.let { EstimateRow("New target", "${Fmt.kcal(it)} kcal", strong = true) }
                    r.avgDailyIntake?.let { EstimateRow("Avg intake", "${Fmt.kcal(it)} kcal") }
                    r.trendChangeKg?.let { EstimateRow("Trend change", Fmt.kgSigned(it)) }
                }
                r != null && !r.ok -> {
                    Text(
                        r.reason ?: "Not enough clean data yet.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                s?.lastRealTdee != null -> {
                    EstimateRow("Last real maintenance", "${Fmt.kcal(s.lastRealTdee!!)} kcal", strong = true)
                }
                else -> {
                    Text(
                        "Run a calc once you've collected some clean days.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun EstimateRow(label: String, value: String, strong: Boolean = false) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = if (strong) FontWeight.Bold else FontWeight.Medium)
    }
}
