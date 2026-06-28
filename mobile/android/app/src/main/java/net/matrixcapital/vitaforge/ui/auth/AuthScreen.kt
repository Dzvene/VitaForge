package net.matrixcapital.vitaforge.ui.auth

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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.core.AppLanguage
import net.matrixcapital.vitaforge.session.SessionViewModel

@Composable
fun AuthScreen(session: SessionViewModel) {
    var isLogin by remember { mutableStateOf(true) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var showForgot by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    if (showForgot) {
        var fgEmail by remember { mutableStateOf(email) }
        var fgSent by remember { mutableStateOf(false) }
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { showForgot = false },
            title = { Text("Reset password") },
            text = {
                if (fgSent) {
                    Text("If that email exists, a reset link is on its way.")
                } else {
                    OutlinedTextField(
                        value = fgEmail, onValueChange = { fgEmail = it },
                        label = { Text("Email") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                    )
                }
            },
            confirmButton = {
                if (!fgSent) {
                    TextButton(onClick = {
                        scope.launch { runCatching { net.matrixcapital.vitaforge.data.Api.forgotPassword(fgEmail.trim()) }; fgSent = true }
                    }) { Text("Send reset link") }
                } else {
                    TextButton(onClick = { showForgot = false }) { Text("Done") }
                }
            },
            dismissButton = { if (!fgSent) TextButton(onClick = { showForgot = false }) { Text("Cancel") } },
        )
    }

    val canSubmit = email.isNotBlank() && password.length >= 8 && !busy

    fun submit() {
        error = null
        busy = true
        val onError: (String) -> Unit = { error = it; busy = false }
        if (isLogin) session.login(email.trim(), password, onError)
        else session.register(email.trim(), password, fullName.ifBlank { null }, onError)
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Text("VitaForge", fontSize = 32.sp, fontWeight = FontWeight.Bold)
        Text(
            "Calibration-first calorie tracking",
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
        )
        Spacer(Modifier.height(24.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = isLogin, onClick = { isLogin = true }, label = { Text("Sign in") })
            FilterChip(selected = !isLogin, onClick = { isLogin = false }, label = { Text("Create account") })
        }
        Spacer(Modifier.height(16.dp))

        if (!isLogin) {
            OutlinedTextField(
                value = fullName, onValueChange = { fullName = it },
                label = { Text("Name (optional)") }, singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
        }
        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text("Email") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Password (min 8)") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            modifier = Modifier.fillMaxWidth(),
        )

        if (error != null) {
            Spacer(Modifier.height(8.dp))
            Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.fillMaxWidth())
        }

        Spacer(Modifier.height(16.dp))
        Button(onClick = { submit() }, enabled = canSubmit, modifier = Modifier.fillMaxWidth()) {
            if (busy) CircularProgressIndicator(Modifier.height(18.dp), strokeWidth = 2.dp)
            else Text(if (isLogin) "Sign in" else "Create account")
        }
        if (isLogin) {
            TextButton(onClick = { showForgot = true }) { Text("Forgot password?") }
        }

        Spacer(Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            AppLanguage.entries.forEach { lang ->
                TextButton(onClick = { session.changeLanguage(lang) }) {
                    Text(
                        lang.code.uppercase(),
                        fontWeight = if (session.language == lang) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
        }
        Text(
            "No ads · no paywall",
            fontSize = 12.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
        )
    }
}
