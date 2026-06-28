package net.matrixcapital.vitaforge.ui.diary

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.FoodCreate
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant

@Composable
fun CustomFoodDialog(onClose: () -> Unit, onCreated: () -> Unit) {
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var brand by remember { mutableStateOf("") }
    var kcal by remember { mutableStateOf("") }
    var protein by remember { mutableStateOf("") }
    var fat by remember { mutableStateOf("") }
    var carb by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    val canSave = name.isNotBlank() && kcal.toDoubleOrNull() != null

    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Custom food", fontWeight = FontWeight.SemiBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                VFField("Name", name, { name = it })
                VFField("Brand (optional)", brand, { brand = it })
                EyebrowLabel("per 100 g")
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VFField("kcal", kcal, { kcal = it }, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                    VFField("Protein", protein, { protein = it }, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VFField("Fat", fat, { fat = it }, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                    VFField("Carbs", carb, { carb = it }, modifier = Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                }
            }
        },
        confirmButton = {
            VFButton("Create food", enabled = canSave, loading = busy, onClick = {
                busy = true
                scope.launch {
                    runCatching {
                        Api.createFood(
                            FoodCreate(
                                name = name.trim(),
                                brand = brand.ifBlank { null },
                                kcal100g = kcal.toDoubleOrNull() ?: 0.0,
                                protein100g = protein.toDoubleOrNull() ?: 0.0,
                                fat100g = fat.toDoubleOrNull() ?: 0.0,
                                carb100g = carb.toDoubleOrNull() ?: 0.0,
                            ),
                        )
                    }
                    busy = false
                    onCreated()
                }
            })
        },
        dismissButton = { VFButton("Cancel", variant = VFVariant.Ghost, onClick = onClose) },
    )
}
