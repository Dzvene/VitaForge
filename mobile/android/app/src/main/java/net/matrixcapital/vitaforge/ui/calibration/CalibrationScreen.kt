package net.matrixcapital.vitaforge.ui.calibration

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
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.CalibrationStatus
import net.matrixcapital.vitaforge.model.EstimateResult
import net.matrixcapital.vitaforge.ui.components.VFCard

@Composable
fun CalibrationScreen() {
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf<CalibrationStatus?>(null) }
    var result by remember { mutableStateOf<EstimateResult?>(null) }
    var loading by remember { mutableStateOf(true) }
    var working by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        try {
            status = Api.calibrationStatus()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    fun run(op: suspend () -> EstimateResult) {
        working = true
        scope.launch {
            try {
                result = op()
                status = Api.calibrationStatus()
            } catch (e: Exception) {
                error = e.message
            } finally {
                working = false
            }
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Calibration", fontSize = 24.sp, fontWeight = FontWeight.Bold)

        val s = status
        when {
            s != null -> {
                VFCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(if (s.phase == "completed") "Calibrated" else "Calibrating", fontWeight = FontWeight.SemiBold)
                        s.lastRealTdee?.let { Text("${it.toInt()} kcal", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold) }
                    }
                    Spacer(Modifier.height(8.dp))
                    LinearProgressIndicator(
                        progress = { (s.cleanDaysCollected.toFloat() / s.windowDays.coerceAtLeast(1)).coerceIn(0f, 1f) },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${s.cleanDaysCollected} / ${s.windowDays} clean days (a food log + a weigh-in)",
                        fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                    if (s.daysRemaining > 0) {
                        Text("~${s.daysRemaining} day(s) until the first estimate.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }

                VFCard {
                    Text(
                        "Real maintenance is back-calculated from your actual intake + weight trend — not a formula guess.",
                        fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(enabled = !working && s.readyToEstimate, onClick = { run { Api.calibrationRecalc() } }) {
                            Text("Recalculate")
                        }
                        OutlinedButton(enabled = !working, onClick = { run { Api.calibrationSkip() } }) {
                            Text("Skip")
                        }
                    }
                }

                result?.let { ResultCard(it) }
            }
            loading -> Box(Modifier.fillMaxWidth().padding(top = 40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
        }
    }
}

@Composable
private fun ResultCard(r: EstimateResult) {
    VFCard {
        if (r.ok) {
            Text("Estimate updated", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            r.realTdee?.let { Line("Real maintenance", "${it.toInt()} kcal") }
            r.avgDailyIntake?.let { Line("Avg intake", "${it.toInt()} kcal") }
            r.trendChangeKg?.let { Line("Trend change", "%.2f kg".format(it)) }
            r.targetCalories?.let { Line("New target", "${it.toInt()} kcal") }
        } else {
            Text(r.reason ?: "Not enough data yet.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        }
    }
}

@Composable
private fun Line(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        Text(value, fontWeight = FontWeight.Medium)
    }
}
