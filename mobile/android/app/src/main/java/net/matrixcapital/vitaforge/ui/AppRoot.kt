package net.matrixcapital.vitaforge.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.DonutLarge
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import net.matrixcapital.vitaforge.session.SessionViewModel
import net.matrixcapital.vitaforge.ui.auth.AuthScreen
import net.matrixcapital.vitaforge.ui.dashboard.DashboardScreen
import net.matrixcapital.vitaforge.ui.diary.DiaryScreen
import net.matrixcapital.vitaforge.ui.onboarding.OnboardingScreen
import net.matrixcapital.vitaforge.ui.settings.SettingsScreen

@Composable
fun AppRoot(session: SessionViewModel = viewModel()) {
    LaunchedEffect(Unit) { session.bootstrap() }

    when (session.route) {
        SessionViewModel.Route.LOADING ->
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        SessionViewModel.Route.UNAUTH -> AuthScreen(session)
        SessionViewModel.Route.ONBOARDING -> OnboardingScreen(session)
        SessionViewModel.Route.READY -> MainScaffold(session)
    }
}

private enum class Tab(val label: String) { TODAY("Today"), DIARY("Diary"), SETTINGS("Settings") }

@Composable
private fun MainScaffold(session: SessionViewModel) {
    var tab by remember { mutableStateOf(Tab.TODAY) }
    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = tab == Tab.TODAY,
                    onClick = { tab = Tab.TODAY },
                    icon = { Icon(Icons.Outlined.DonutLarge, contentDescription = null) },
                    label = { Text(Tab.TODAY.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.DIARY,
                    onClick = { tab = Tab.DIARY },
                    icon = { Icon(Icons.Outlined.Book, contentDescription = null) },
                    label = { Text(Tab.DIARY.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.SETTINGS,
                    onClick = { tab = Tab.SETTINGS },
                    icon = { Icon(Icons.Outlined.Settings, contentDescription = null) },
                    label = { Text(Tab.SETTINGS.label) },
                )
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                Tab.TODAY -> DashboardScreen()
                Tab.DIARY -> DiaryScreen()
                Tab.SETTINGS -> SettingsScreen(session)
            }
        }
    }
}
