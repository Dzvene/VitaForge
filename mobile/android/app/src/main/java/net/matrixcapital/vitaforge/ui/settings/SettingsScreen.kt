package net.matrixcapital.vitaforge.ui.settings

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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.core.AppLanguage
import net.matrixcapital.vitaforge.session.SessionViewModel
import net.matrixcapital.vitaforge.ui.components.VFCard

@Composable
fun SettingsScreen(session: SessionViewModel) {
    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Settings", fontSize = 24.sp, fontWeight = FontWeight.Bold)

        VFCard {
            Text("Account", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Text(session.user?.email ?: "—")
            if (session.user?.emailVerified == false) {
                Text("Email not verified", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
            }
        }

        VFCard {
            Text("Language", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AppLanguage.entries.forEach { lang ->
                    FilterChip(
                        selected = session.language == lang,
                        onClick = { session.setLanguage(lang) },
                        label = { Text(lang.display) },
                    )
                }
            }
        }

        Button(
            onClick = { session.logout() },
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Sign out") }

        Text(
            "VitaForge — calibration-first, no ads, no paywall.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
        )
    }
}
