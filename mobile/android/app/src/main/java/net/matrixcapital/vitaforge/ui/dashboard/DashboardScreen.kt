package net.matrixcapital.vitaforge.ui.dashboard

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
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
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.GuidanceItem
import net.matrixcapital.vitaforge.model.TargetOut
import net.matrixcapital.vitaforge.ui.components.CalorieRing
import net.matrixcapital.vitaforge.ui.components.MacroBar
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.theme.Brand
import net.matrixcapital.vitaforge.ui.theme.CarbColor
import net.matrixcapital.vitaforge.ui.theme.FatColor
import net.matrixcapital.vitaforge.ui.theme.ProteinColor

@Composable
fun DashboardScreen() {
    var target by remember { mutableStateOf<TargetOut?>(null) }
    var day by remember { mutableStateOf<DaySummary?>(null) }
    var guidance by remember { mutableStateOf<List<GuidanceItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val today = DateUtil.today()
            target = Api.target()
            day = Api.day(today)
            guidance = runCatching { Api.dayGuidance(today).items }.getOrDefault(emptyList())
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    val d = day
    val t = target

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Today", fontSize = 24.sp, fontWeight = FontWeight.Bold)

        if (d != null && t != null) {
            VFCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CalorieRing(eaten = d.eaten.kcal, target = d.target.calories, ringColor = Brand)
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        MacroBar("Protein", d.eaten.proteinG, d.target.proteinG, ProteinColor)
                        MacroBar("Fat", d.eaten.fatG, d.target.fatG, FatColor)
                        MacroBar("Carbs", d.eaten.carbG, d.target.carbG, CarbColor)
                    }
                }
            }

            VFCard {
                Text("Maintenance", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(4.dp))
                Text("${t.maintenanceKcal.toInt()} kcal/day", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                Text(
                    if (t.maintenanceSource == "calibrated") "calibrated from your data" else "formula estimate",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    fontSize = 12.sp,
                )
            }

            if (guidance.isNotEmpty()) {
                VFCard {
                    Text("Guidance", fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    guidance.forEach { item ->
                        Text("• ${item.message}", fontSize = 14.sp, modifier = Modifier.padding(vertical = 2.dp))
                    }
                }
            }
        } else if (loading) {
            Box(Modifier.fillMaxWidth().padding(top = 80.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (error != null) {
            Text(error!!, color = MaterialTheme.colorScheme.error)
        }
    }
}
