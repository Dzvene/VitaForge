package net.matrixcapital.vitaforge.ui.diary

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.DaySummary
import net.matrixcapital.vitaforge.model.DiaryEntryOut
import net.matrixcapital.vitaforge.model.Meal

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiaryScreen() {
    val scope = rememberCoroutineScope()
    var day by remember { mutableStateOf<DaySummary?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var showAdd by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        try {
            day = Api.day(DateUtil.today())
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Diary") }) },
        floatingActionButton = {
            FloatingActionButton(onClick = { showAdd = true }) {
                Icon(Icons.Filled.Add, contentDescription = "Add food")
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            val d = day
            when {
                d != null -> {
                    if (d.entries.isEmpty()) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("Nothing logged yet — tap + to add a food.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                    } else {
                        LazyColumn(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                            Meal.entries.forEach { meal ->
                                val entries = d.entries.filter { it.meal == meal }
                                if (entries.isNotEmpty()) {
                                    item {
                                        Text(
                                            mealLabel(meal),
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(top = 14.dp, bottom = 4.dp),
                                        )
                                    }
                                    items(entries, key = { it.id }) { entry ->
                                        EntryRow(entry) {
                                            scope.launch {
                                                runCatching { Api.deleteDiary(entry.id) }
                                                reloadKey++
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                error != null -> Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            }
        }
    }

    if (showAdd) {
        AddFoodSheet(
            onDismiss = { showAdd = false },
            onAdded = { showAdd = false; reloadKey++ },
        )
    }
}

@Composable
private fun EntryRow(entry: DiaryEntryOut, onDelete: () -> Unit) {
    androidx.compose.foundation.layout.Row(
        Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(entry.foodName, fontWeight = FontWeight.Medium)
            Text(
                "${entry.grams.toInt()} g · ${entry.nutrients.kcal.toInt()} kcal",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }
        IconButton(onClick = onDelete) {
            Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
        }
    }
}

internal fun mealLabel(meal: Meal) = when (meal) {
    Meal.BREAKFAST -> "Breakfast"
    Meal.LUNCH -> "Lunch"
    Meal.DINNER -> "Dinner"
    Meal.SNACK -> "Snack"
}
