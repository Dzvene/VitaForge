package net.matrixcapital.vitaforge.ui.settings

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.AppLanguage
import net.matrixcapital.vitaforge.core.Fmt
import net.matrixcapital.vitaforge.core.ThemeController
import net.matrixcapital.vitaforge.core.ThemeMode
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.ActivityLevel
import net.matrixcapital.vitaforge.model.GoalKind
import net.matrixcapital.vitaforge.model.ProfileOut
import net.matrixcapital.vitaforge.model.ProfileUpsert
import net.matrixcapital.vitaforge.model.ReminderPrefs
import net.matrixcapital.vitaforge.model.Sex
import net.matrixcapital.vitaforge.model.TargetOut
import net.matrixcapital.vitaforge.model.UpdateAccountIn
import net.matrixcapital.vitaforge.session.SessionViewModel
import net.matrixcapital.vitaforge.ui.components.CardTitle
import net.matrixcapital.vitaforge.ui.components.EyebrowLabel
import net.matrixcapital.vitaforge.ui.components.Segmented
import net.matrixcapital.vitaforge.ui.components.Skeleton
import net.matrixcapital.vitaforge.ui.components.VFButton
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.components.VFField
import net.matrixcapital.vitaforge.ui.components.VFVariant

@Composable
fun SettingsScreen(session: SessionViewModel) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val cs = MaterialTheme.colorScheme

    var profile by remember { mutableStateOf<ProfileOut?>(null) }
    var target by remember { mutableStateOf<TargetOut?>(null) }
    var reminders by remember { mutableStateOf<ReminderPrefs?>(null) }
    var loading by remember { mutableStateOf(true) }
    var status by remember { mutableStateOf<String?>(null) }

    // editable form
    var sex by remember { mutableStateOf(Sex.MALE) }
    var age by remember { mutableStateOf("") }
    var height by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var activity by remember { mutableStateOf(ActivityLevel.MODERATE) }
    var goal by remember { mutableStateOf(GoalKind.LOSE) }
    var rate by remember { mutableStateOf("") }
    var targetWeight by remember { mutableStateOf("") }
    var proteinAbsMode by remember { mutableStateOf(false) }
    var proteinPerKg by remember { mutableStateOf("") }
    var proteinAbs by remember { mutableStateOf("") }
    var fatPerKg by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }

    // account
    var name by remember { mutableStateOf(session.user?.fullName ?: "") }
    var email by remember { mutableStateOf(session.user?.email ?: "") }
    // password
    var curPw by remember { mutableStateOf("") }
    var newPw by remember { mutableStateOf("") }
    var confirmPw by remember { mutableStateOf("") }
    // delete
    var deletePw by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        profile = runCatching { Api.profile() }.getOrNull()
        target = runCatching { Api.target() }.getOrNull()
        reminders = runCatching { Api.reminderConfig().prefs }.getOrNull()
        profile?.let { p ->
            sex = p.sex; age = p.age.toString(); height = p.heightCm.toInt().toString()
            weight = p.currentWeightKg.toString(); activity = p.activityLevel; goal = p.goal
            rate = p.targetRateKgPerWeek.toString(); targetWeight = p.targetWeightKg?.toString() ?: ""
            proteinAbsMode = p.proteinGAbs != null
            proteinPerKg = p.proteinGPerKg?.toString() ?: ""
            proteinAbs = p.proteinGAbs?.toString() ?: ""
            fatPerKg = p.fatGPerKg?.toString() ?: ""
        }
        loading = false
    }

    if (loading) {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Skeleton(Modifier.fillMaxWidth(0.4f), height = 28.dp)
            Skeleton(Modifier.fillMaxWidth(), height = 120.dp)
            Skeleton(Modifier.fillMaxWidth(), height = 200.dp)
        }
        return
    }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column {
            EyebrowLabel("Account")
            Text("Settings", fontSize = 24.sp, fontWeight = FontWeight.SemiBold, color = cs.onSurface)
            Text(session.user?.email ?: "", fontSize = 12.sp, color = cs.onSurfaceVariant)
        }

        // Language
        VFCard {
            CardTitle("Language")
            Segmented(
                options = AppLanguage.entries.map { it to it.display },
                selected = session.language,
                onSelect = { session.changeLanguage(it) },
                modifier = Modifier.horizontalScroll(rememberScrollState()),
            )
        }

        // Theme
        VFCard {
            CardTitle("Theme")
            Segmented(
                options = ThemeMode.entries.map { it to it.label },
                selected = ThemeController.mode,
                onSelect = { ThemeController.set(context, it) },
            )
        }

        // Profile
        VFCard {
            CardTitle("Profile")
            Segmented(listOf(Sex.MALE to "Male", Sex.FEMALE to "Female"), sex, { sex = it })
            Spacer(Modifier.height(10.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                VFField("Age", age, { age = it }, Modifier.weight(1f), keyboardType = KeyboardType.Number)
                VFField("Height cm", height, { height = it }, Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                VFField("Weight kg", weight, { weight = it }, Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
            }
            Spacer(Modifier.height(10.dp))
            EyebrowLabel("Activity")
            Spacer(Modifier.height(6.dp))
            Segmented(
                options = ActivityLevel.entries.map { it to activityLabel(it) },
                selected = activity, onSelect = { activity = it },
                modifier = Modifier.horizontalScroll(rememberScrollState()),
            )
        }

        // Goal
        VFCard {
            CardTitle("Goal")
            Segmented(GoalKind.entries.map { it to goalLabel(it) }, goal, { goal = it })
            if (goal != GoalKind.MAINTAIN) {
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VFField("Rate kg/week", rate, { rate = it }, Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                    VFField("Target kg (opt)", targetWeight, { targetWeight = it }, Modifier.weight(1f), keyboardType = KeyboardType.Decimal)
                }
            }
        }

        // Macros
        VFCard {
            CardTitle("Macros")
            Segmented(listOf(false to "g/kg", true to "g/day"), proteinAbsMode, { proteinAbsMode = it })
            Spacer(Modifier.height(10.dp))
            if (proteinAbsMode) {
                VFField("Protein g/day", proteinAbs, { proteinAbs = it }, keyboardType = KeyboardType.Decimal)
            } else {
                VFField("Protein g/kg", proteinPerKg, { proteinPerKg = it }, keyboardType = KeyboardType.Decimal)
            }
            Spacer(Modifier.height(8.dp))
            VFField("Fat g/kg", fatPerKg, { fatPerKg = it }, keyboardType = KeyboardType.Decimal)
        }

        // Current norm
        VFCard {
            CardTitle("Current norm")
            val t = target
            if (t != null) {
                NormRow("Target", "${Fmt.kcal(t.targetCalories)} kcal")
                NormRow("Protein", Fmt.g(t.proteinG))
                NormRow("Fat", Fmt.g(t.fatG))
                NormRow("Carbs", Fmt.g(t.carbG))
                NormRow("Basis", if (t.maintenanceSource == "calibrated") "Calibrated" else "Formula")
            } else Skeleton(Modifier.fillMaxWidth(), height = 24.dp)
            Spacer(Modifier.height(10.dp))
            VFButton("Recompute norm", variant = VFVariant.Secondary, full = true, onClick = {
                scope.launch { target = runCatching { Api.recompute() }.getOrNull(); status = "Norm recomputed." }
            })
        }

        // Save profile
        VFButton("Save changes", full = true, loading = saving, onClick = {
            saving = true
            scope.launch {
                val body = ProfileUpsert(
                    sex = sex,
                    age = age.toIntOrNull() ?: 30,
                    heightCm = height.toDoubleOrNull() ?: 175.0,
                    currentWeightKg = weight.toDoubleOrNull() ?: 75.0,
                    activityLevel = activity,
                    goal = goal,
                    targetRateKgPerWeek = if (goal == GoalKind.MAINTAIN) 0.0 else (rate.toDoubleOrNull() ?: 0.5),
                    targetWeightKg = if (goal == GoalKind.MAINTAIN) null else targetWeight.toDoubleOrNull(),
                    proteinGPerKg = if (proteinAbsMode) null else proteinPerKg.toDoubleOrNull(),
                    proteinGAbs = if (proteinAbsMode) proteinAbs.toDoubleOrNull() else null,
                    fatGPerKg = fatPerKg.toDoubleOrNull(),
                )
                runCatching { Api.saveProfile(body) }
                target = runCatching { Api.target() }.getOrNull()
                saving = false; status = "Saved."
            }
        })

        // Account details
        VFCard {
            CardTitle("Account details")
            VFField("Name", name, { name = it })
            Spacer(Modifier.height(8.dp))
            VFField("Email", email, { email = it }, keyboardType = KeyboardType.Email,
                hint = if (email != session.user?.email) "Changing email needs re-verification." else null)
            Spacer(Modifier.height(10.dp))
            VFButton("Update account", variant = VFVariant.Secondary, onClick = {
                scope.launch {
                    runCatching { Api.updateAccount(UpdateAccountIn(name.ifBlank { null }, email)) }
                        .onSuccess { status = "Account updated." }
                        .onFailure { status = it.message ?: "Update failed." }
                }
            })
        }

        // Change password
        VFCard {
            CardTitle("Change password")
            VFField("Current password", curPw, { curPw = it }, password = true)
            Spacer(Modifier.height(8.dp))
            VFField("New password", newPw, { newPw = it }, password = true,
                error = if (newPw.isNotEmpty() && newPw.length < 8) "At least 8 characters." else null)
            Spacer(Modifier.height(8.dp))
            VFField("Confirm", confirmPw, { confirmPw = it }, password = true,
                error = if (confirmPw.isNotEmpty() && confirmPw != newPw) "Doesn't match." else null)
            Spacer(Modifier.height(10.dp))
            VFButton("Change password", variant = VFVariant.Secondary,
                enabled = curPw.isNotBlank() && newPw.length >= 8 && newPw == confirmPw, onClick = {
                    scope.launch {
                        runCatching { Api.changePassword(curPw, newPw) }
                            .onSuccess { status = "Password changed."; curPw = ""; newPw = ""; confirmPw = "" }
                            .onFailure { status = it.message ?: "Failed." }
                    }
                })
        }

        // Reminders
        VFCard {
            CardTitle("Reminders")
            val r = reminders
            if (r == null) {
                Text("Reminders unavailable.", fontSize = 12.sp, color = cs.onSurfaceVariant)
            } else {
                var enabled by remember { mutableStateOf(r.enabled) }
                var weighTime by remember { mutableStateOf(r.weighInTime) }
                var mealTime by remember { mutableStateOf(r.logMealsTime) }
                Segmented(listOf(true to "On", false to "Off"), enabled, { enabled = it })
                Spacer(Modifier.height(10.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    VFField("Weigh-in time", weighTime, { weighTime = it }, Modifier.weight(1f))
                    VFField("Log meals time", mealTime, { mealTime = it }, Modifier.weight(1f))
                }
                Spacer(Modifier.height(10.dp))
                VFButton("Save reminders", variant = VFVariant.Secondary, onClick = {
                    scope.launch {
                        runCatching {
                            Api.setReminderPrefs(
                                r.copy(enabled = enabled, weighInTime = weighTime, logMealsTime = mealTime,
                                    locale = session.language.code),
                            )
                        }.onSuccess { status = "Reminders saved." }
                    }
                })
            }
        }

        // Data / danger
        VFCard {
            CardTitle("Data")
            VFButton("Export my data (JSON)", variant = VFVariant.Secondary, full = true, onClick = {
                scope.launch { runCatching { Api.exportData() }.onSuccess { status = "Export ready (${it.length} chars)." } }
            })
            Spacer(Modifier.height(10.dp))
            EyebrowLabel("Danger zone")
            Spacer(Modifier.height(6.dp))
            VFField("Password to delete", deletePw, { deletePw = it }, password = true)
            Spacer(Modifier.height(8.dp))
            VFButton("Delete account", variant = VFVariant.Danger, full = true, enabled = deletePw.isNotBlank(), onClick = {
                scope.launch {
                    runCatching { Api.deleteAccount(deletePw) }.onSuccess { session.logout() }
                        .onFailure { status = it.message ?: "Delete failed." }
                }
            })
        }

        VFButton("Sign out", variant = VFVariant.Ghost, full = true, onClick = { session.logout() })

        if (status != null) {
            Text(status!!, fontSize = 12.sp, color = cs.onSurfaceVariant)
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun NormRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface)
    }
}

private fun goalLabel(g: GoalKind) = when (g) {
    GoalKind.LOSE -> "Lose fat"; GoalKind.MAINTAIN -> "Maintain"; GoalKind.GAIN -> "Gain"
}

private fun activityLabel(a: ActivityLevel) = when (a) {
    ActivityLevel.SEDENTARY -> "Sedentary"; ActivityLevel.LIGHT -> "Light"
    ActivityLevel.MODERATE -> "Moderate"; ActivityLevel.HIGH -> "High"; ActivityLevel.VERY_HIGH -> "Very high"
}
