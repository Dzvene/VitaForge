package net.matrixcapital.vitaforge.ui.diary

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.DiaryAddIn
import net.matrixcapital.vitaforge.model.FoodOut
import net.matrixcapital.vitaforge.model.Meal
import net.matrixcapital.vitaforge.model.RecipeLogIn
import net.matrixcapital.vitaforge.ui.components.Segmented
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant
import net.matrixcapital.vitaforge.ui.theme.VF
import java.util.Calendar

private enum class AddTab { SEARCH, RECENT, FAVORITES, RECIPES }
private val QUICK_GRAMS = listOf(30.0, 50.0, 100.0, 150.0, 200.0, 250.0)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddFoodSheet(
    day: String,
    defaultMeal: Meal,
    onClose: () -> Unit,
    onChanged: () -> Unit,
    onCreateCustom: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val cs = MaterialTheme.colorScheme

    var tab by remember { mutableStateOf(AddTab.SEARCH) }
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<FoodOut>>(emptyList()) }
    var recent by remember { mutableStateOf<List<FoodOut>>(emptyList()) }
    var favorites by remember { mutableStateOf<List<FoodOut>>(emptyList()) }
    var recipes by remember { mutableStateOf<List<net.matrixcapital.vitaforge.model.RecipeOut>>(emptyList()) }
    var loadingList by remember { mutableStateOf(false) }

    var selected by remember { mutableStateOf<FoodOut?>(null) }
    var meal by remember { mutableStateOf(defaultMeal) }
    var grams by remember { mutableStateOf("100") }
    var usePortion by remember { mutableStateOf(false) }
    var portionId by remember { mutableStateOf<Int?>(null) }
    var count by remember { mutableStateOf("1") }
    var isFav by remember { mutableStateOf(false) }

    // lazy loads per tab
    LaunchedEffect(tab) {
        when (tab) {
            AddTab.RECENT -> { loadingList = true; recent = runCatching { Api.recentFoods() }.getOrDefault(emptyList()); loadingList = false }
            AddTab.FAVORITES -> { loadingList = true; favorites = runCatching { Api.favorites() }.getOrDefault(emptyList()); loadingList = false }
            AddTab.RECIPES -> { loadingList = true; recipes = runCatching { Api.recipes() }.getOrDefault(emptyList()); loadingList = false }
            AddTab.SEARCH -> {}
        }
    }
    LaunchedEffect(query) {
        val q = query.trim()
        if (q.length < 2) { results = emptyList(); return@LaunchedEffect }
        delay(300)
        results = runCatching { Api.searchFoods(q) }.getOrDefault(emptyList())
    }

    ModalBottomSheet(onDismissRequest = onClose, sheetState = sheetState) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            val sel = selected
            if (sel == null) {
                Text("Add to ${mealLabel(meal)}", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = cs.onSurface)
                Spacer(Modifier.height(12.dp))
                Segmented(
                    options = listOf(
                        AddTab.SEARCH to "Search", AddTab.RECENT to "Recent",
                        AddTab.FAVORITES to "Favorites", AddTab.RECIPES to "Recipes",
                    ),
                    selected = tab, onSelect = { tab = it },
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                )
                Spacer(Modifier.height(12.dp))

                if (tab == AddTab.SEARCH) {
                    VFField("Search foods", query, { query = it }, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(8.dp))
                }

                Column(Modifier.fillMaxWidth().heightIn(max = 360.dp).verticalScroll(rememberScrollState())) {
                    if (tab == AddTab.RECIPES) {
                        if (recipes.isEmpty()) EmptyHint(if (loadingList) "Loading…" else "No recipes yet.")
                        recipes.forEach { r ->
                            FoodRowGeneric(r.name, "${Fmt.kcal(r.totals.kcal)} kcal · ${r.components.size} items", star = false) {
                                scope.launch {
                                    runCatching { Api.logRecipe(r.id, RecipeLogIn(day, defaultMeal)) }
                                    onChanged(); onClose()
                                }
                            }
                        }
                    } else {
                        val list = when (tab) {
                            AddTab.SEARCH -> results
                            AddTab.RECENT -> recent
                            AddTab.FAVORITES -> favorites
                            else -> emptyList()
                        }
                        if (list.isEmpty()) {
                            EmptyHint(
                                when {
                                    loadingList -> "Loading…"
                                    tab == AddTab.SEARCH && query.isBlank() -> "Type to search."
                                    else -> "Nothing here."
                                },
                            )
                        }
                        list.forEach { f ->
                            FoodRowGeneric(
                                f.name,
                                (f.brand?.let { "$it · " } ?: "") + "${Fmt.kcal(f.kcal100g)} kcal · P${Fmt.g(f.protein100g)} F${Fmt.g(f.fat100g)} C${Fmt.g(f.carb100g)} /100g",
                                star = f.source == "custom",
                            ) {
                                selected = f; grams = "100"; usePortion = false
                                portionId = f.portions.firstOrNull()?.id; count = "1"; isFav = false
                                scope.launch { isFav = runCatching { Api.favorites().any { it.id == f.id } }.getOrDefault(false) }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                VFButton("Create custom food", variant = VFVariant.Ghost, full = true, onClick = onCreateCustom)
            } else {
                // ---- Quantity step ----
                val effGrams = if (usePortion) {
                    val p = sel.portions.firstOrNull { it.id == portionId }
                    (p?.grams ?: 0.0) * (count.toDoubleOrNull() ?: 0.0)
                } else grams.toDoubleOrNull() ?: 0.0
                val factor = effGrams / 100.0

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack, "Back",
                        tint = cs.onSurfaceVariant,
                        modifier = Modifier.size(22.dp).clickable { selected = null },
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(sel.name, fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = cs.onSurface, modifier = Modifier.weight(1f))
                    Icon(
                        if (isFav) Icons.Filled.Star else Icons.Outlined.StarBorder, "Favorite",
                        tint = if (isFav) VF.colors.fat else cs.onSurfaceVariant,
                        modifier = Modifier.size(24.dp).clickable {
                            scope.launch {
                                runCatching { if (isFav) Api.removeFavorite(sel.id) else Api.addFavorite(sel.id) }
                                isFav = !isFav
                            }
                        },
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text("${Fmt.kcal(sel.kcal100g * factor)} kcal", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
                Text(
                    "P${Fmt.g(sel.protein100g * factor)} · F${Fmt.g(sel.fat100g * factor)} · C${Fmt.g(sel.carb100g * factor)}",
                    fontSize = 13.sp, color = cs.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                Segmented(
                    options = Meal.entries.map { it to mealLabel(it) },
                    selected = meal, onSelect = { meal = it },
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                )
                Spacer(Modifier.height(12.dp))
                if (sel.portions.isNotEmpty()) {
                    Segmented(
                        options = listOf(false to "Grams", true to "Portions"),
                        selected = usePortion, onSelect = { usePortion = it },
                    )
                    Spacer(Modifier.height(12.dp))
                }
                if (usePortion && sel.portions.isNotEmpty()) {
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        sel.portions.forEach { p ->
                            Chip("${p.name} (${Fmt.g(p.grams)})", active = p.id == portionId) { portionId = p.id }
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    VFField("Count", count, { count = it }, keyboardType = KeyboardType.Decimal)
                } else {
                    VFField("Grams", grams, { grams = it }, keyboardType = KeyboardType.Decimal)
                    Spacer(Modifier.height(8.dp))
                    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        QUICK_GRAMS.forEach { qg ->
                            Chip(Fmt.g(qg), active = grams.toDoubleOrNull() == qg) { grams = qg.toInt().toString() }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                VFButton(
                    if (effGrams > 0) "Add ${Fmt.g(effGrams)}" else "Add",
                    full = true, enabled = effGrams > 0,
                    onClick = {
                        scope.launch {
                            val body = if (usePortion)
                                DiaryAddIn(day, meal, sel.id, portionId = portionId, portionCount = count.toDoubleOrNull())
                            else DiaryAddIn(day, meal, sel.id, grams = grams.toDoubleOrNull())
                            runCatching { Api.addDiary(body) }
                            onChanged(); onClose()
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun EmptyHint(text: String) {
    Text(text, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 16.dp))
}

@Composable
private fun FoodRowGeneric(title: String, sub: String, star: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(title, fontWeight = FontWeight.Medium, color = cs.onSurface)
                if (star) Icon(Icons.Filled.Star, null, tint = VF.colors.fat, modifier = Modifier.size(14.dp))
            }
            Text(sub, fontSize = 12.sp, color = cs.onSurfaceVariant)
        }
    }
}

@Composable
private fun Chip(text: String, active: Boolean, onClick: () -> Unit) {
    val cs = MaterialTheme.colorScheme
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(if (active) VF.colors.brand else cs.surfaceVariant.copy(alpha = 0.6f))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(text, fontSize = 12.sp, color = if (active) androidx.compose.ui.graphics.Color.White else cs.onSurfaceVariant, fontWeight = FontWeight.Medium)
    }
}

internal fun defaultMealNow(): Meal = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
    in 5..10 -> Meal.BREAKFAST
    in 11..15 -> Meal.LUNCH
    in 16..21 -> Meal.DINNER
    else -> Meal.SNACK
}
