package net.matrixcapital.vitaforge.ui.weight

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.WeightPoint
import net.matrixcapital.vitaforge.model.WeightSeries
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.theme.VF

@Composable
fun WeightScreen() {
    val scope = rememberCoroutineScope()
    var series by remember { mutableStateOf<WeightSeries?>(null) }
    var input by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        try {
            series = Api.weightSeries()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val loggedToday = series?.points?.any { it.loggedOn == DateUtil.today() } == true

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Weight", fontSize = 24.sp, fontWeight = FontWeight.Bold)

        VFCard {
            Text("Today's weigh-in", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            if (loggedToday) {
                Text("Today's weight is logged ✓", color = MaterialTheme.colorScheme.primary)
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = input, onValueChange = { input = it },
                        label = { Text("kg") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                        modifier = Modifier.width(140.dp),
                    )
                    Spacer(Modifier.width(12.dp))
                    Button(
                        enabled = input.toDoubleOrNull() != null && !saving,
                        onClick = {
                            val kg = input.toDoubleOrNull() ?: return@Button
                            saving = true
                            scope.launch {
                                try {
                                    Api.logWeight(net.matrixcapital.vitaforge.model.WeightLogIn(DateUtil.today(), kg))
                                    input = ""
                                    reloadKey++
                                } catch (e: Exception) {
                                    error = e.message
                                } finally {
                                    saving = false
                                }
                            }
                        },
                    ) { Text("Log") }
                }
            }
        }

        val s = series
        when {
            s != null && s.points.isNotEmpty() -> VFCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Trend", fontWeight = FontWeight.SemiBold)
                    s.latestTrendKg?.let { Text("%.1f kg".format(it), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) }
                }
                Spacer(Modifier.height(8.dp))
                WeightChart(s.points)
            }
            loading -> Box(Modifier.fillMaxWidth().padding(top = 40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error)
            else -> Text(
                "Log your weight daily — the trend line is what tracks progress.",
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
    }
}

@Composable
private fun WeightChart(points: List<WeightPoint>) {
    if (points.size < 2) {
        Text("A couple of days of weigh-ins will draw the trend.", fontSize = 12.sp, color = Color.Gray)
        return
    }
    val values = points.map { it.weightKg } + points.map { it.trendKg }
    val minV = values.min()
    val range = (values.max() - minV).coerceAtLeast(0.1)
    val brand = VF.colors.brand

    Canvas(Modifier.fillMaxWidth().height(200.dp)) {
        val n = points.size
        fun x(i: Int) = if (n == 1) 0f else size.width * i / (n - 1)
        fun y(v: Double) = (size.height - ((v - minV) / range * size.height)).toFloat()

        val rawPath = Path()
        val trendPath = Path()
        points.forEachIndexed { i, p ->
            val rx = x(i)
            if (i == 0) {
                rawPath.moveTo(rx, y(p.weightKg)); trendPath.moveTo(rx, y(p.trendKg))
            } else {
                rawPath.lineTo(rx, y(p.weightKg)); trendPath.lineTo(rx, y(p.trendKg))
            }
        }
        drawPath(rawPath, color = Color.Gray.copy(alpha = 0.4f), style = Stroke(width = 2.dp.toPx()))
        drawPath(trendPath, color = brand, style = Stroke(width = 3.dp.toPx()))
        points.forEachIndexed { i, p ->
            drawCircle(Color.Gray.copy(alpha = 0.5f), radius = 2.5.dp.toPx(), center = Offset(x(i), y(p.weightKg)))
        }
    }
}
