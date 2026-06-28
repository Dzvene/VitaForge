package net.matrixcapital.vitaforge.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.School
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.GuidanceItem
import net.matrixcapital.vitaforge.model.Hint
import net.matrixcapital.vitaforge.model.Warning
import net.matrixcapital.vitaforge.ui.theme.VF

/** §5.3/5.4 — in-day guidance items, no blame. Pure render from items. */
@Composable
fun GuidanceList(items: List<GuidanceItem>) {
    if (items.isEmpty()) return
    val cs = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { it ->
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                    .background(cs.surfaceVariant.copy(alpha = 0.6f)).padding(horizontal = 14.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(Icons.Outlined.Lightbulb, null, tint = guidanceTone(it.kind, cs.onSurface), modifier = Modifier.size(18.dp))
                Text(it.message, fontSize = 14.sp, color = cs.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun guidanceTone(kind: String, fallback: Color): Color = when (kind) {
    "protein_low" -> VF.colors.protein
    "fat_high" -> VF.colors.fat
    "carb_room" -> VF.colors.carb
    "on_track" -> VF.colors.carb
    "overage" -> VF.colors.brand
    else -> fallback
}

/** §5.2 — active warnings that auto-show, with accept / mute. Self-fetching. */
@Composable
fun WarningList(refreshKey: Int = 0) {
    val cs = MaterialTheme.colorScheme
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<Warning>>(emptyList()) }
    LaunchedEffect(refreshKey) {
        items = runCatching { Api.warnings().filter { it.autoShow } }.getOrDefault(emptyList())
    }
    if (items.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items.forEach { w ->
            VFCard(variant2 = true) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Icon(Icons.Outlined.WarningAmber, null, tint = VF.colors.fat, modifier = Modifier.size(20.dp))
                    Column(Modifier.fillMaxWidth()) {
                        Text(w.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = cs.onSurface)
                        Spacer(Modifier.height(4.dp))
                        Text(w.message, fontSize = 14.sp, color = cs.onSurfaceVariant)
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            VFButton("Got it", small = true, variant = VFVariant.Secondary, onClick = {
                                scope.launch { runCatching { Api.acceptWarning(w.type) }; items = items.filterNot { it.type == w.type } }
                            })
                            VFButton("Don't show again", small = true, variant = VFVariant.Ghost, onClick = {
                                scope.launch { runCatching { Api.dismissWarning(w.type) }; items = items.filterNot { it.type == w.type } }
                            })
                        }
                    }
                }
            }
        }
    }
}

/** §5.1 — passive hints, collapsible accordion. Self-fetching. */
@Composable
fun HintsRail() {
    val cs = MaterialTheme.colorScheme
    var hints by remember { mutableStateOf<List<Hint>>(emptyList()) }
    var openKey by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        hints = runCatching { Api.hints() }.getOrDefault(emptyList())
    }
    if (hints.isEmpty()) return
    VFCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Outlined.School, null, tint = VF.colors.brand, modifier = Modifier.size(18.dp))
            Text("Why this method", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = cs.onSurface, modifier = Modifier.weight(1f))
            VFBadge("Learn", BadgeTone.Brand)
        }
        Spacer(Modifier.height(8.dp))
        hints.forEach { h ->
            val open = openKey == h.key
            Column {
                Row(
                    Modifier.fillMaxWidth().clickable { openKey = if (open) null else h.key }.padding(vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(h.title, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = cs.onSurface, modifier = Modifier.weight(1f))
                    Icon(Icons.Filled.KeyboardArrowDown, null, tint = cs.onSurfaceVariant, modifier = Modifier.rotate(if (open) 180f else 0f))
                }
                AnimatedVisibility(open) {
                    Text(h.body, fontSize = 14.sp, color = cs.onSurfaceVariant, modifier = Modifier.padding(bottom = 12.dp, end = 24.dp))
                }
            }
        }
    }
}
