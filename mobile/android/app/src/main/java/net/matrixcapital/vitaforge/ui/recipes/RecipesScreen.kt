package net.matrixcapital.vitaforge.ui.recipes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import net.matrixcapital.vitaforge.model.Meal
import net.matrixcapital.vitaforge.model.RecipeLogIn
import net.matrixcapital.vitaforge.model.RecipeOut

@Composable
fun RecipesScreen() {
    val scope = rememberCoroutineScope()
    var recipes by remember { mutableStateOf<List<RecipeOut>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var toLog by remember { mutableStateOf<RecipeOut?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadKey) {
        loading = true
        try {
            recipes = Api.recipes()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Box(Modifier.fillMaxSize()) {
        when {
            recipes.isNotEmpty() -> LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
                items(recipes, key = { it.id }) { recipe ->
                    Row(
                        Modifier.fillMaxWidth().clickable { toLog = recipe }.padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(recipe.name, fontWeight = FontWeight.Medium)
                            Text(
                                "${recipe.totals.kcal.toInt()} kcal · ${recipe.components.size} items",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            )
                        }
                        IconButton(onClick = {
                            scope.launch {
                                runCatching { Api.deleteRecipe(recipe.id) }
                                reloadKey++
                            }
                        }) {
                            Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(16.dp))
            else -> Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Text(
                    "No recipes yet. Create them on the web app, then log them here in one tap.",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
            }
        }
    }

    val recipe = toLog
    if (recipe != null) {
        AlertDialog(
            onDismissRequest = { toLog = null },
            title = { Text(recipe.name) },
            text = { Text("Log this recipe to today's…") },
            confirmButton = {
                Column {
                    Meal.entries.forEach { meal ->
                        TextButton(onClick = {
                            toLog = null
                            scope.launch {
                                try {
                                    Api.logRecipe(recipe.id, RecipeLogIn(DateUtil.today(), meal))
                                } catch (e: Exception) {
                                    error = e.message
                                }
                            }
                        }) { Text(mealLabel(meal)) }
                    }
                }
            },
            dismissButton = { TextButton(onClick = { toLog = null }) { Text("Cancel") } },
        )
    }
}

private fun mealLabel(meal: Meal) = when (meal) {
    Meal.BREAKFAST -> "Breakfast"
    Meal.LUNCH -> "Lunch"
    Meal.DINNER -> "Dinner"
    Meal.SNACK -> "Snack"
}
