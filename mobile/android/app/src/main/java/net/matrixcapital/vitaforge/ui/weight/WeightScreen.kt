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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.WeightLogIn
import net.matrixcapital.vitaforge.model.WeightPoint
import net.matrixcapital.vitaforge.model.WeightSeries
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EmptyState
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant
import net.matrixcapital.vitaforge.ui.theme.VF

@Composable
fun WeightScreen() {
    val scope = rememberCoroutineScope()
    val brand = VF.colors.brand
    var series by remember { mutableStateOf<WeightSeries?>(null) }
    var date by remember { mutableStateOf(DateUtil.today()) }
    var kg by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(true) }
    var saving by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        series = runCatching { Api.weightSeries() }.getOrNull()
        loading = false
    }

    val s = series
    val points = s?.points ?: emptyList()
    val latest = points.lastOrNull()
    val change: Double? = if (points.size >= 2) points.last().trendKg - points.first().trendKg else null

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // 1. Header
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            EyebrowLabel("Weight")
            Text("Weight", fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
        }

        // 2. History
        VFCard {
            CardTitle(
                "History",
                right = if (latest != null && s?.latestTrendKg != null) {
                    { Text("${Fmt.kg(s.latestTrendKg!!)} trend", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp) }
                } else null,
            )
            Spacer(Modifier.height(8.dp))
            when {
                loading -> Skeleton(height = 200.dp)
                points.isNotEmpty() -> {
                    WeightChart(points)
                    if (points.size >= 2) {
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Canvas(Modifier.size(8.dp)) { drawCircle(Color.Gray.copy(alpha = 0.5f)) }
                                Text("raw", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Canvas(Modifier.size(width = 16.dp, height = 8.dp)) {
                                    drawLine(brand, Offset(0f, size.height / 2), Offset(size.width, size.height / 2), strokeWidth = 3.dp.toPx())
                                }
                                Text("trend", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                else -> EmptyState(
                    title = "No weigh-ins yet",
                    hint = "A couple of days of weigh-ins will draw the trend.",
                )
            }
        }

        // 3. Log weight
        VFCard {
            CardTitle("Log weight")
            Spacer(Modifier.height(8.dp))
            VFField(
                label = "Date",
                value = date,
                onValueChange = { date = it },
            )
            Spacer(Modifier.height(8.dp))
            VFField(
                label = "Weight (kg)",
                value = kg,
                onValueChange = { kg = it },
                keyboardType = KeyboardType.Decimal,
                hint = "min 30",
            )
            Spacer(Modifier.height(12.dp))
            VFButton(
                text = "Save",
                full = true,
                enabled = kg.toDoubleOrNull() != null,
                loading = saving,
                onClick = {
                    val w = kg.toDoubleOrNull() ?: return@VFButton
                    saving = true
                    scope.launch {
                        runCatching { Api.logWeight(WeightLogIn(date, w)) }
                        kg = ""
                        saving = false
                        reloadKey++
                    }
                },
            )
        }

        // 4. Since start
        if (change != null) {
            VFCard {
                CardTitle("Since start")
                Spacer(Modifier.height(8.dp))
                Text(Fmt.kgSigned(change), fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
                Text("over ${points.size} days", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        // 5. Recent entries
        if (points.isNotEmpty()) {
            VFCard {
                CardTitle("Recent entries")
                Spacer(Modifier.height(8.dp))
                points.reversed().take(10).forEach { p ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Column {
                            Text(DateUtil.label(p.loggedOn), fontWeight = FontWeight.Medium)
                            Text(
                                "${Fmt.kg(p.weightKg)} · ${Fmt.kg(p.trendKg)} trend",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        VFButton(
                            text = "Delete",
                            small = true,
                            variant = VFVariant.Ghost,
                            onClick = {
                                scope.launch {
                                    runCatching { Api.deleteWeight(p.id) }
                                    reloadKey++
                                }
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WeightChart(points: List<WeightPoint>) {
    if (points.size < 2) {
        Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
            Text("A couple of days of weigh-ins will draw the trend.", fontSize = 12.sp, color = Color.Gray)
        }
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
