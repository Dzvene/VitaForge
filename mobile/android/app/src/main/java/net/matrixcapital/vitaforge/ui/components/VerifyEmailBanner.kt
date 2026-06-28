package net.matrixcapital.vitaforge.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.ui.theme.VF

/** Warn bar shown when the signed-in user hasn't verified their email. */
@Composable
fun VerifyEmailBanner(emailVerified: Boolean) {
    if (emailVerified) return
    val scope = rememberCoroutineScope()
    var dismissed by remember { mutableStateOf(false) }
    var sent by remember { mutableStateOf(false) }
    if (dismissed) return

    Row(
        Modifier.fillMaxWidth().background(VF.colors.fat.copy(alpha = 0.14f)).padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(Icons.Outlined.MailOutline, null, tint = VF.colors.fat, modifier = Modifier.size(18.dp))
        Text(
            if (sent) "Verification email sent." else "Verify your email to secure your account.",
            fontSize = 13.sp, color = androidx.compose.material3.MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.weight(1f),
        )
        if (!sent) {
            Text("Resend", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = VF.colors.brand,
                modifier = Modifier.clickable { scope.launch { runCatching { Api.resendVerification() }; sent = true } })
        }
        Icon(Icons.Filled.Close, "Dismiss", tint = androidx.compose.material3.MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(18.dp).clickable { dismissed = true })
    }
}
