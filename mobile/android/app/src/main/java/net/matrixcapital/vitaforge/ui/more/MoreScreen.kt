package net.matrixcapital.vitaforge.ui.more

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import net.matrixcapital.vitaforge.session.SessionViewModel
import net.matrixcapital.vitaforge.ui.components.VFCard
import net.matrixcapital.vitaforge.ui.recipes.RecipesScreen
import net.matrixcapital.vitaforge.ui.settings.SettingsScreen
import net.matrixcapital.vitaforge.ui.trends.TrendsScreen

private enum class MoreDest(val title: String) { TRENDS("Trends"), RECIPES("Recipes"), SETTINGS("Settings") }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreScreen(session: SessionViewModel) {
    var dest by remember { mutableStateOf<MoreDest?>(null) }

    if (dest == null) {
        Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("More", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            MoreDest.entries.forEach { d ->
                VFCard(modifier = Modifier.clickable { dest = d }) {
                    Text(d.title, fontWeight = FontWeight.Medium)
                }
            }
        }
    } else {
        val current = dest!!
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text(current.title) },
                    navigationIcon = {
                        IconButton(onClick = { dest = null }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                        }
                    },
                )
            },
        ) { padding ->
            Box(Modifier.fillMaxSize().padding(padding)) {
                when (current) {
                    MoreDest.TRENDS -> TrendsScreen()
                    MoreDest.RECIPES -> RecipesScreen()
                    MoreDest.SETTINGS -> SettingsScreen(session)
                }
            }
        }
    }
}
