package net.matrixcapital.vitaforge.ui.diary

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.DateUtil
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.DiaryAddIn
import net.matrixcapital.vitaforge.model.FoodOut
import net.matrixcapital.vitaforge.model.Meal
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFoodSheet(onDismiss: () -> Unit, onAdded: () -> Unit) {
    val sheetState = rememberModalBottomSheetState()
    val scope = rememberCoroutineScope()

    var meal by remember { mutableStateOf(defaultMeal()) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<FoodOut>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<FoodOut?>(null) }
    var grams by remember { mutableStateOf("100") }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) { results = emptyList(); return@LaunchedEffect }
        searching = true
        delay(300) // debounce
        results = runCatching { Api.searchFoods(q) }.getOrDefault(emptyList())
        searching = false
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text("Add food", fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
            Spacer(Modifier.height(12.dp))

            Row(
                Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Meal.entries.forEach { m ->
                    FilterChip(selected = m == meal, onClick = { meal = m }, label = { Text(mealLabel(m)) })
                }
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = query, onValueChange = { query = it },
                label = { Text("Search foods") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))

            if (searching) {
                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            LazyColumn(Modifier.fillMaxWidth().heightIn(max = 360.dp)) {
                items(results, key = { it.id }) { food ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clickable { selected = food; grams = "100" }
                            .padding(vertical = 10.dp),
                    ) {
                        Text(food.name)
                        Text(
                            "${food.kcal100g.toInt()} kcal / 100 g" + (food.brand?.let { " · $it" } ?: ""),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                }
            }
        }
    }

    val food = selected
    if (food != null) {
        val g = grams.toDoubleOrNull() ?: 0.0
        AlertDialog(
            onDismissRequest = { selected = null },
            title = { Text(food.name) },
            text = {
                Column {
                    OutlinedTextField(
                        value = grams, onValueChange = { grams = it },
                        label = { Text("Grams") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    )
                    Spacer(Modifier.height(6.dp))
                    Text("${(food.kcal100g * g / 100).toInt()} kcal", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)
                }
            },
            confirmButton = {
                TextButton(
                    enabled = g > 0,
                    onClick = {
                        scope.launch {
                            try {
                                Api.addDiary(DiaryAddIn(DateUtil.today(), meal, food.id, g))
                                selected = null
                                onAdded()
                            } catch (e: Exception) {
                                error = e.message ?: "Could not add"
                            }
                        }
                    },
                ) { Text("Add to ${mealLabel(meal)}") }
            },
            dismissButton = { TextButton(onClick = { selected = null }) { Text("Cancel") } },
        )
    }
}

private fun defaultMeal(): Meal = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..10 -> Meal.BREAKFAST
    in 11..15 -> Meal.LUNCH
    in 16..21 -> Meal.DINNER
    else -> Meal.SNACK
}
