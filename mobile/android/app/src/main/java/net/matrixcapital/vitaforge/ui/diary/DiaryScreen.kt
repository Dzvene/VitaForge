package net.matrixcapital.vitaforge.ui.diary

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
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
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
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.DiaryEntryOut
import net.matrixcapital.vitaforge.model.GuidanceItem
import net.matrixcapital.vitaforge.model.Meal
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EmptyState
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.GuidanceList
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant
import net.matrixcapital.vitaforge.ui.theme.VF

@Composable
fun DiaryScreen() {
    val scope = rememberCoroutineScope()
    val cs = MaterialTheme.colorScheme
    var day by remember { mutableStateOf(DateUtil.today()) }
    var summary by remember { mutableStateOf<DaySummary?>(null) }
    var guidance by remember { mutableStateOf<List<GuidanceItem>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var reloadKey by remember { mutableIntStateOf(0) }
    var addMeal by remember { mutableStateOf<Meal?>(null) }
    var customOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Pair<Int, String>?>(null) }

    LaunchedEffect(day, reloadKey) {
        loading = true
        summary = runCatching { Api.day(day) }.getOrNull()
        guidance = runCatching { Api.dayGuidance(day).items }.getOrDefault(emptyList())
        loading = false
    }

    fun reload() { reloadKey++ }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // Day nav
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Previous day",
                tint = cs.onSurfaceVariant, modifier = Modifier.size(28.dp).clickable { day = DateUtil.addDays(day, -1) })
            Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text(DateUtil.label(day), fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = cs.onSurface)
                Text(day, fontSize = 11.sp, color = cs.onSurfaceVariant.copy(alpha = 0.7f))
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Next day",
                tint = cs.onSurfaceVariant, modifier = Modifier.size(28.dp).clickable { day = DateUtil.addDays(day, 1) })
        }

        VFButton("Copy yesterday", variant = VFVariant.Secondary, small = true, onClick = {
            scope.launch { runCatching { Api.copyDay(DateUtil.addDays(day, -1), day) }; reload() }
        })

        // Mini totals
        val s = summary
        if (s != null) {
            VFCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Total("Calories", Fmt.kcal(s.eaten.kcal), "/ ${Fmt.kcal(s.target.calories)}")
                    Total("Protein", Fmt.g(s.eaten.proteinG), "/ ${Fmt.g(s.target.proteinG)}")
                    Total("Fat", Fmt.g(s.eaten.fatG), "/ ${Fmt.g(s.target.fatG)}")
                    Total("Carbs", Fmt.g(s.eaten.carbG), "/ ${Fmt.g(s.target.carbG)}")
                }
            }
        }

        GuidanceList(guidance)

        // Meals
        val entries = s?.entries ?: emptyList()
        Meal.entries.forEach { m ->
            val mealEntries = entries.filter { it.meal == m }
            val mealKcal = mealEntries.sumOf { it.nutrients.kcal }
            VFCard {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(mealLabel(m), fontWeight = FontWeight.SemiBold, color = cs.onSurface, modifier = Modifier.weight(1f))
                    if (mealKcal > 0) {
                        Text("${Fmt.kcal(mealKcal)} kcal", fontSize = 12.sp, color = cs.onSurfaceVariant, modifier = Modifier.padding(end = 8.dp))
                    }
                    VFButton("Add", variant = VFVariant.Ghost, small = true,
                        leading = { Icon(Icons.Filled.Add, null, modifier = Modifier.size(16.dp)) },
                        onClick = { addMeal = m })
                }
                if (mealEntries.isEmpty()) {
                    Text("No items yet.", fontSize = 12.sp, color = cs.onSurfaceVariant.copy(alpha = 0.6f), modifier = Modifier.padding(top = 6.dp))
                } else {
                    mealEntries.forEach { e ->
                        EntryRow(
                            e,
                            editingGrams = editing?.takeIf { it.first == e.id }?.second,
                            onStartEdit = { editing = e.id to e.grams.toInt().toString() },
                            onEditChange = { editing = e.id to it },
                            onSaveEdit = {
                                val g = editing?.second?.toDoubleOrNull()
                                editing = null
                                if (g != null && g > 0) scope.launch { runCatching { Api.updateDiary(e.id, g) }; reload() }
                            },
                            onCancelEdit = { editing = null },
                            onDelete = { scope.launch { runCatching { Api.deleteDiary(e.id) }; reload() } },
                        )
                    }
                }
            }
        }

        if (s != null && entries.isEmpty() && !loading) {
            EmptyState(
                title = "Nothing logged yet",
                hint = "Add a food to start your day.",
                action = { VFButton("Log food", onClick = { addMeal = Meal.BREAKFAST }) },
            )
        }
    }

    addMeal?.let { m ->
        AddFoodSheet(
            day = day,
            defaultMeal = m,
            onClose = { addMeal = null },
            onChanged = { reload() },
            onCreateCustom = { addMeal = null; customOpen = true },
        )
    }

    if (customOpen) {
        CustomFoodDialog(onClose = { customOpen = false }, onCreated = { customOpen = false; reload() })
    }
}

@Composable
private fun Total(label: String, value: String, sub: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
        Text(sub, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
    }
}

@Composable
private fun EntryRow(
    entry: DiaryEntryOut,
    editingGrams: String?,
    onStartEdit: () -> Unit,
    onEditChange: (String) -> Unit,
    onSaveEdit: () -> Unit,
    onCancelEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    val cs = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(entry.foodName, fontWeight = FontWeight.Medium, color = cs.onSurface)
            Text(
                "${Fmt.g(entry.grams)} · P${Fmt.g(entry.nutrients.proteinG)} F${Fmt.g(entry.nutrients.fatG)} C${Fmt.g(entry.nutrients.carbG)}",
                fontSize = 12.sp, color = cs.onSurfaceVariant,
            )
        }
        if (editingGrams != null) {
            VFField("g", editingGrams, onEditChange, modifier = Modifier.width(90.dp), keyboardType = KeyboardType.Decimal)
            Icon(Icons.Filled.Check, "Save", tint = VF.colors.brand, modifier = Modifier.size(22.dp).clickable(onClick = onSaveEdit).padding(start = 6.dp))
            Icon(Icons.Filled.Close, "Cancel", tint = cs.onSurfaceVariant, modifier = Modifier.size(22.dp).clickable(onClick = onCancelEdit).padding(start = 6.dp))
        } else {
            Text("${Fmt.kcal(entry.nutrients.kcal)}", fontWeight = FontWeight.Medium, color = cs.onSurface)
            Icon(Icons.Filled.Edit, "Edit", tint = cs.onSurfaceVariant, modifier = Modifier.size(20.dp).clickable(onClick = onStartEdit).padding(start = 10.dp))
            Icon(Icons.Filled.Delete, "Delete", tint = cs.error, modifier = Modifier.size(20.dp).clickable(onClick = onDelete).padding(start = 8.dp))
        }
    }
}

internal fun mealLabel(meal: Meal) = when (meal) {
    Meal.BREAKFAST -> "Breakfast"
    Meal.LUNCH -> "Lunch"
    Meal.DINNER -> "Dinner"
    Meal.SNACK -> "Snack"
}
