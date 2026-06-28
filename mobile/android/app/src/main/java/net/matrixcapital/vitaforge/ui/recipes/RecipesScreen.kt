package net.matrixcapital.vitaforge.ui.recipes

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
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
import net.matrixcapital.vitaforge.model.FoodOut
import net.matrixcapital.vitaforge.model.Meal
import net.matrixcapital.vitaforge.model.RecipeComponentIn
import net.matrixcapital.vitaforge.model.RecipeCreate
import net.matrixcapital.vitaforge.model.RecipeLogIn
import net.matrixcapital.vitaforge.model.RecipeOut
import net.matrixcapital.vitaforge.ui.components.EmptyState
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant

@Composable
fun RecipesScreen() {
    val scope = rememberCoroutineScope()
    var recipes by remember { mutableStateOf<List<RecipeOut>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    var reloadKey by remember { mutableIntStateOf(0) }

    var creating by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<RecipeOut?>(null) }
    var toLog by remember { mutableStateOf<RecipeOut?>(null) }

    LaunchedEffect(reloadKey) {
        loading = true
        error = null
        runCatching { Api.recipes() }
            .onSuccess { recipes = it }
            .onFailure { error = it.message }
        loading = false
    }

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        // 1. Header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column {
                EyebrowLabel("Cook")
                Text("Recipes", fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.weight(1f))
            VFButton(
                text = "New",
                onClick = { creating = true },
                leading = { Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp)) },
            )
        }

        if (message != null) {
            Text(message!!, color = net.matrixcapital.vitaforge.ui.theme.VF.colors.brand, fontSize = 13.sp)
        }
        if (error != null) {
            Text(error!!, color = net.matrixcapital.vitaforge.ui.theme.VF.colors.accent, fontSize = 13.sp)
        }

        // 2. List region
        when {
            loading -> Skeleton(Modifier.fillMaxWidth(), height = 80.dp)
            recipes.isNotEmpty() -> recipes.forEach { recipe ->
                VFCard {
                    Text(recipe.name, fontWeight = FontWeight.Medium)
                    val t = recipe.totals
                    Text(
                        "${Fmt.kcal(t.kcal)} kcal · P${Fmt.g(t.proteinG)} F${Fmt.g(t.fatG)} C${Fmt.g(t.carbG)}",
                        fontSize = 12.sp,
                        color = net.matrixcapital.vitaforge.ui.theme.VF.colors.brand,
                    )
                    Spacer(Modifier.size(6.dp))
                    recipe.components.forEach { c ->
                        Text(
                            "${c.foodName} … ${Fmt.g(c.grams)}",
                            fontSize = 12.sp,
                        )
                    }
                    Spacer(Modifier.size(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        VFButton(text = "Log", onClick = { toLog = recipe }, small = true)
                        VFButton(
                            text = "Edit",
                            onClick = { editing = recipe },
                            variant = VFVariant.Secondary,
                            small = true,
                        )
                        VFButton(
                            text = "Delete",
                            onClick = {
                                scope.launch {
                                    runCatching { Api.deleteRecipe(recipe.id) }
                                        .onSuccess {
                                            message = "Deleted"
                                            reloadKey++
                                        }
                                        .onFailure { error = it.message }
                                }
                            },
                            variant = VFVariant.Danger,
                            small = true,
                        )
                    }
                }
            }
            else -> EmptyState(
                title = "No recipes yet",
                hint = "Create one to log a meal in a tap.",
            )
        }
    }

    // Meal picker (log-to-diary flow)
    val logTarget = toLog
    if (logTarget != null) {
        AlertDialog(
            onDismissRequest = { toLog = null },
            title = { Text(logTarget.name) },
            text = { Text("Log this recipe to today's diary.") },
            confirmButton = {
                Column {
                    Meal.entries.forEach { meal ->
                        TextButton(onClick = {
                            toLog = null
                            scope.launch {
                                runCatching {
                                    Api.logRecipe(logTarget.id, RecipeLogIn(DateUtil.today(), meal))
                                }
                                    .onSuccess { message = "Logged to ${mealLabel(meal)}" }
                                    .onFailure { error = it.message }
                            }
                        }) { Text(mealLabel(meal)) }
                    }
                }
            },
            dismissButton = { TextButton(onClick = { toLog = null }) { Text("Cancel") } },
        )
    }

    // 3. Editor
    if (creating || editing != null) {
        RecipeEditor(
            initial = editing,
            onDismiss = {
                creating = false
                editing = null
            },
            onSaved = {
                creating = false
                editing = null
                message = "Saved"
                reloadKey++
            },
        )
    }
}

private class CompDraft(
    val foodId: Int,
    val foodName: String,
    val kcal100g: Double,
    grams: String,
) {
    var grams by mutableStateOf(grams)
}

@Composable
private fun RecipeEditor(
    initial: RecipeOut?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(initial?.name ?: "") }
    val comps = remember { mutableStateListOf<CompDraft>() }
    var saving by remember { mutableStateOf(false) }
    var editorError by remember { mutableStateOf<String?>(null) }

    var picking by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var searching by remember { mutableStateOf(false) }
    var results by remember { mutableStateOf<List<FoodOut>>(emptyList()) }

    LaunchedEffect(initial?.id) {
        comps.clear()
        initial?.components?.forEach { c ->
            val per100 = if (c.grams > 0.0) c.nutrients.kcal / c.grams * 100.0 else 0.0
            comps.add(CompDraft(c.foodId, c.foodName, per100, gramsToText(c.grams)))
        }
    }

    val totalKcal = comps.sumOf { it.kcal100g * (it.grams.toDoubleOrNull() ?: 0.0) / 100.0 }
    val canSave = name.isNotBlank() && comps.isNotEmpty() && !saving

    AlertDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text(if (initial != null) "Edit recipe" else "New recipe") },
        text = {
            Column(
                Modifier
                    .heightIn(max = 480.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                VFField(label = "Name", value = name, onValueChange = { name = it })

                comps.forEachIndexed { index, draft ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(draft.foodName, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                        }
                        Spacer(Modifier.width(8.dp))
                        VFField(
                            label = "g",
                            value = draft.grams,
                            onValueChange = { draft.grams = it },
                            modifier = Modifier.width(96.dp),
                            keyboardType = KeyboardType.Number,
                        )
                        Spacer(Modifier.width(4.dp))
                        TextButton(onClick = { comps.removeAt(index) }) {
                            Icon(Icons.Filled.Close, contentDescription = "Remove", modifier = Modifier.size(18.dp))
                        }
                    }
                }

                if (picking) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        VFField(
                            label = "Search food",
                            value = query,
                            onValueChange = { query = it },
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        VFButton(
                            text = "Go",
                            onClick = {
                                scope.launch {
                                    searching = true
                                    runCatching { Api.searchFoods(query) }
                                        .onSuccess { results = it }
                                        .onFailure { editorError = it.message }
                                    searching = false
                                }
                            },
                            small = true,
                            loading = searching,
                        )
                    }
                    results.forEach { food ->
                        VFButton(
                            text = "${food.name} · ${Fmt.kcal(food.kcal100g)}/100g",
                            onClick = {
                                comps.add(CompDraft(food.id, food.name, food.kcal100g, "100"))
                                picking = false
                                query = ""
                                results = emptyList()
                            },
                            variant = VFVariant.Ghost,
                            full = true,
                            small = true,
                        )
                    }
                } else {
                    VFButton(
                        text = "Add food",
                        onClick = { picking = true },
                        variant = VFVariant.Secondary,
                        small = true,
                    )
                }

                Text(
                    "Total: ${Fmt.kcal(totalKcal)} kcal",
                    fontWeight = FontWeight.SemiBold,
                    color = net.matrixcapital.vitaforge.ui.theme.VF.colors.brand,
                )
                if (editorError != null) {
                    Text(editorError!!, color = net.matrixcapital.vitaforge.ui.theme.VF.colors.accent, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            VFButton(
                text = "Save",
                onClick = {
                    scope.launch {
                        saving = true
                        editorError = null
                        val body = RecipeCreate(
                            name = name.trim(),
                            components = comps.map { RecipeComponentIn(it.foodId, it.grams.toDoubleOrNull() ?: 0.0) },
                        )
                        runCatching {
                            if (initial != null) Api.updateRecipe(initial.id, body) else Api.createRecipe(body)
                        }
                            .onSuccess { onSaved() }
                            .onFailure { editorError = it.message }
                        saving = false
                    }
                },
                enabled = canSave,
                loading = saving,
                full = true,
            )
        },
        dismissButton = {
            TextButton(onClick = { if (!saving) onDismiss() }) { Text("Cancel") }
        },
    )
}

private fun gramsToText(grams: Double): String =
    if (grams == grams.toLong().toDouble()) grams.toLong().toString() else grams.toString()

private fun mealLabel(meal: Meal) = when (meal) {
    Meal.BREAKFAST -> "Breakfast"
    Meal.LUNCH -> "Lunch"
    Meal.DINNER -> "Dinner"
    Meal.SNACK -> "Snack"
}
