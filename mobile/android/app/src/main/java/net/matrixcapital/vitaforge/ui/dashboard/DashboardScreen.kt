package net.matrixcapital.vitaforge.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.LocalFireDepartment
import androidx.compose.material.icons.outlined.TrendingDown
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.CalibrationStatus
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.GuidanceItem
import net.matrixcapital.vitaforge.model.TargetOut
import net.matrixcapital.vitaforge.model.WeightLogIn
import net.matrixcapital.vitaforge.model.WeightSeries
import net.matrixcapital.vitaforge.ui.components.BadgeTone
import net.matrixcapital.vitaforge.ui.components.CalorieRing
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.GuidanceList
import net.matrixcapital.vitaforge.ui.components.HintsRail
import net.matrixcapital.vitaforge.ui.components.MacroBar
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFBadge
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant
import net.matrixcapital.vitaforge.ui.components.WarningList
import net.matrixcapital.vitaforge.ui.theme.VF

@Composable
fun DashboardScreen(
    onLogFood: () -> Unit = {},
    onOpenCalibration: () -> Unit = {},
    onOpenWeight: () -> Unit = {},
) {
    val cs = MaterialTheme.colorScheme
    val scope = rememberCoroutineScope()
    val today = DateUtil.today()

    var target by remember { mutableStateOf<TargetOut?>(null) }
    var day by remember { mutableStateOf<DaySummary?>(null) }
    var guidance by remember { mutableStateOf<List<GuidanceItem>>(emptyList()) }
    var calib by remember { mutableStateOf<CalibrationStatus?>(null) }
    var weight by remember { mutableStateOf<WeightSeries?>(null) }
    var loading by remember { mutableStateOf(true) }
    var quickKg by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        target = runCatching { Api.target() }.getOrNull()
        day = runCatching { Api.day(today) }.getOrNull()
        guidance = runCatching { Api.dayGuidance(today).items }.getOrDefault(emptyList())
        calib = runCatching { Api.calibrationStatus() }.getOrNull()
        weight = runCatching { Api.weightSeries() }.getOrNull()
        loading = false
    }

    val points = weight?.points ?: emptyList()
    val loggedToday = points.any { it.loggedOn == today }
    val trendChange = if (points.size >= 2) points.last().trendKg - points.first().trendKg else null

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Header
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                EyebrowLabel("Today")
                Text(today, fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
            }
            VFButton("Log food", onClick = onLogFood, leading = { Icon(Icons.Filled.Add, null, modifier = Modifier.size(18.dp)) })
        }

        // Calibrating banner
        val c = calib
        if (c != null && c.phase == "calibrating") {
            VFCard(variant2 = true) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    VFBadge("Calibrating", BadgeTone.Brand)
                    Text(
                        "${c.cleanDaysCollected} of ${c.windowDays} clean days",
                        fontSize = 13.sp, color = cs.onSurfaceVariant, modifier = Modifier.weight(1f),
                    )
                    Text("View", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = VF.colors.brand,
                        modifier = Modifier.clickable { onOpenCalibration() }.padding(start = 8.dp))
                }
            }
        }

        WarningList(refreshKey = reloadKey)

        // Calories + macros
        VFCard {
            val d = day
            val t = target
            if (loading) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Skeleton(Modifier.size(180.dp), height = 180.dp)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Skeleton(Modifier.fillMaxWidth(), height = 36.dp)
                        Skeleton(Modifier.fillMaxWidth(), height = 36.dp)
                        Skeleton(Modifier.fillMaxWidth(), height = 36.dp)
                    }
                }
            } else if (d != null && t != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CalorieRing(eaten = d.eaten.kcal, target = d.target.calories, size = 170.dp)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        MacroBar("Protein", d.eaten.proteinG, d.target.proteinG, VF.colors.protein)
                        MacroBar("Fat", d.eaten.fatG, d.target.fatG, VF.colors.fat)
                        MacroBar("Carbs", d.eaten.carbG, d.target.carbG, VF.colors.carb)
                    }
                }
                if (guidance.isNotEmpty()) {
                    Spacer(Modifier.height(16.dp))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(cs.outline))
                    Spacer(Modifier.height(16.dp))
                    GuidanceList(guidance)
                }
            }
        }

        // Maintenance
        VFCard {
            CardTitle("Maintenance", right = { Icon(Icons.Outlined.LocalFireDepartment, null, tint = VF.colors.brand, modifier = Modifier.size(18.dp)) })
            val t = target
            if (t == null) {
                Skeleton(Modifier.fillMaxWidth(), height = 36.dp)
            } else {
                Text("${Fmt.kcal(t.maintenanceKcal)} kcal/day", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text(
                    if (t.maintenanceSource == "calibrated") "calibrated from your data" else "formula estimate",
                    fontSize = 12.sp, color = cs.onSurfaceVariant.copy(alpha = 0.7f),
                )
                if (t.rateClamped) {
                    Spacer(Modifier.height(6.dp))
                    Text("Rate capped for a safe pace.", fontSize = 12.sp, color = VF.colors.fat)
                }
            }
        }

        // Weight trend
        VFCard {
            CardTitle("Weight trend", right = { Icon(Icons.Outlined.TrendingDown, null, tint = VF.colors.brand, modifier = Modifier.size(18.dp)) })
            if (points.isNotEmpty()) {
                Text("${Fmt.kg(points.last().trendKg)}", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text(
                    if (trendChange != null) "${Fmt.kgSigned(trendChange)} over ${points.size} days" else "smoothed trend",
                    fontSize = 12.sp, color = cs.onSurfaceVariant.copy(alpha = 0.7f),
                )
            } else {
                Text("No weigh-ins yet.", fontSize = 14.sp, color = cs.onSurfaceVariant)
            }
            Spacer(Modifier.height(12.dp))
            if (loggedToday) {
                Text("Weighed in today.", fontSize = 12.sp, color = cs.onSurfaceVariant.copy(alpha = 0.7f))
            } else {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VFField("kg", quickKg, { quickKg = it }, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                    VFButton("Weigh in", loading = saving, enabled = quickKg.toDoubleOrNull() != null, onClick = {
                        val kg = quickKg.toDoubleOrNull() ?: return@VFButton
                        saving = true
                        scope.launch {
                            runCatching { Api.logWeight(WeightLogIn(today, kg)) }
                            quickKg = ""; saving = false; reloadKey++
                        }
                    })
                }
            }
            if (points.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Text("Open chart", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = VF.colors.brand,
                    modifier = Modifier.clickable { onOpenWeight() })
            }
        }

        HintsRail()
    }
}
