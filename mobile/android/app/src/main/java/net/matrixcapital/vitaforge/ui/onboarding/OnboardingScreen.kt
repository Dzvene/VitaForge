package net.matrixcapital.vitaforge.ui.onboarding

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.ActivityLevel
import net.matrixcapital.vitaforge.model.GoalKind
import net.matrixcapital.vitaforge.model.ProfileUpsert
import net.matrixcapital.vitaforge.model.Sex
import net.matrixcapital.vitaforge.session.SessionViewModel

@Composable
fun OnboardingScreen(session: SessionViewModel) {
    val scope = rememberCoroutineScope()

    var sex by remember { mutableStateOf(Sex.MALE) }
    var age by remember { mutableStateOf("30") }
    var height by remember { mutableStateOf("175") }
    var weight by remember { mutableStateOf("75") }
    var activity by remember { mutableStateOf(ActivityLevel.MODERATE) }
    var goal by remember { mutableStateOf(GoalKind.LOSE) }
    var rate by remember { mutableStateOf("0.5") }
    var targetWeight by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    fun save() {
        error = null
        busy = true
        val payload = ProfileUpsert(
            sex = sex,
            age = age.toIntOrNull() ?: 30,
            heightCm = height.toDoubleOrNull() ?: 175.0,
            currentWeightKg = weight.toDoubleOrNull() ?: 75.0,
            activityLevel = activity,
            goal = goal,
            targetRateKgPerWeek = if (goal == GoalKind.MAINTAIN) 0.0 else (rate.toDoubleOrNull() ?: 0.5),
            targetWeightKg = if (goal == GoalKind.MAINTAIN) null else targetWeight.toDoubleOrNull(),
        )
        scope.launch {
            try {
                Api.saveProfile(payload)
                session.finishOnboarding()
            } catch (e: Exception) {
                error = e.message ?: "Could not save"
                busy = false
            }
        }
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
    ) {
        Text("Set up your norm", fontSize = 24.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(16.dp))

        Label("Sex")
        ChipRow(Sex.entries, sex, { sex = it }) { sexLabel(it) }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumberField("Age", age, { age = it }, Modifier.weight(1f), KeyboardType.Number)
            NumberField("Height cm", height, { height = it }, Modifier.weight(1f))
            NumberField("Weight kg", weight, { weight = it }, Modifier.weight(1f))
        }

        Spacer(Modifier.height(12.dp))
        Label("Activity")
        ChipRow(ActivityLevel.entries, activity, { activity = it }) { activityLabel(it) }

        Spacer(Modifier.height(12.dp))
        Label("Goal")
        ChipRow(GoalKind.entries, goal, { goal = it }) { goalLabel(it) }

        if (goal != GoalKind.MAINTAIN) {
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NumberField("Rate kg/wk", rate, { rate = it }, Modifier.weight(1f))
                NumberField("Target kg (opt)", targetWeight, { targetWeight = it }, Modifier.weight(1f))
            }
        }

        if (error != null) {
            Spacer(Modifier.height(12.dp))
            Text(error!!, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(20.dp))
        Button(onClick = { save() }, enabled = !busy, modifier = Modifier.fillMaxWidth()) {
            Text("Start")
        }
    }
}

@Composable
private fun Label(text: String) =
    Text(text, fontWeight = FontWeight.Medium, modifier = Modifier.padding(bottom = 4.dp))

@Composable
private fun <T> ChipRow(options: List<T>, selected: T, onSelect: (T) -> Unit, label: (T) -> String) {
    Row(
        Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { option ->
            FilterChip(
                selected = option == selected,
                onClick = { onSelect(option) },
                label = { Text(label(option)) },
            )
        }
    }
}

@Composable
private fun NumberField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    keyboard: KeyboardType = KeyboardType.Decimal,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
        modifier = modifier,
    )
}

private fun sexLabel(s: Sex) = if (s == Sex.MALE) "Male" else "Female"

private fun goalLabel(g: GoalKind) = when (g) {
    GoalKind.LOSE -> "Lose fat"
    GoalKind.MAINTAIN -> "Maintain"
    GoalKind.GAIN -> "Gain"
}

private fun activityLabel(a: ActivityLevel) = when (a) {
    ActivityLevel.SEDENTARY -> "Sedentary"
    ActivityLevel.LIGHT -> "Light"
    ActivityLevel.MODERATE -> "Moderate"
    ActivityLevel.HIGH -> "High"
    ActivityLevel.VERY_HIGH -> "Very high"
}
