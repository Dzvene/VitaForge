package net.matrixcapital.vitaforge.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.DonutLarge
import androidx.compose.material.icons.outlined.MonitorWeight
import androidx.compose.material.icons.outlined.MoreHoriz
import androidx.compose.material.icons.outlined.Tune
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
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.viewmodel.compose.viewModel
import net.matrixcapital.vitaforge.session.SessionViewModel
import net.matrixcapital.vitaforge.ui.theme.vfBackground
import net.matrixcapital.vitaforge.ui.auth.AuthScreen
import net.matrixcapital.vitaforge.ui.calibration.CalibrationScreen
import net.matrixcapital.vitaforge.ui.dashboard.DashboardScreen
import net.matrixcapital.vitaforge.ui.diary.DiaryScreen
import net.matrixcapital.vitaforge.ui.more.MoreScreen
import net.matrixcapital.vitaforge.ui.onboarding.OnboardingScreen
import net.matrixcapital.vitaforge.ui.weight.WeightScreen

@Composable
fun AppRoot(session: SessionViewModel = viewModel()) {
    LaunchedEffect(Unit) { session.bootstrap() }

    Box(Modifier.fillMaxSize().vfBackground()) {
        when (session.route) {
            SessionViewModel.Route.LOADING ->
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            SessionViewModel.Route.UNAUTH -> AuthScreen(session)
            SessionViewModel.Route.ONBOARDING -> OnboardingScreen(session)
            SessionViewModel.Route.READY -> MainScaffold(session)
        }
    }
}

private enum class Tab(val label: String) {
    TODAY("Today"), DIARY("Diary"), WEIGHT("Weight"), CALIBRATE("Calibrate"), MORE("More")
}

@Composable
private fun MainScaffold(session: SessionViewModel) {
    var tab by remember { mutableStateOf(Tab.TODAY) }
    Scaffold(
        containerColor = Color.Transparent,
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
                    selected = tab == Tab.WEIGHT,
                    onClick = { tab = Tab.WEIGHT },
                    icon = { Icon(Icons.Outlined.MonitorWeight, contentDescription = null) },
                    label = { Text(Tab.WEIGHT.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.CALIBRATE,
                    onClick = { tab = Tab.CALIBRATE },
                    icon = { Icon(Icons.Outlined.Tune, contentDescription = null) },
                    label = { Text(Tab.CALIBRATE.label) },
                )
                NavigationBarItem(
                    selected = tab == Tab.MORE,
                    onClick = { tab = Tab.MORE },
                    icon = { Icon(Icons.Outlined.MoreHoriz, contentDescription = null) },
                    label = { Text(Tab.MORE.label) },
                )
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (tab) {
                Tab.TODAY -> DashboardScreen(
                    onLogFood = { tab = Tab.DIARY },
                    onOpenCalibration = { tab = Tab.CALIBRATE },
                    onOpenWeight = { tab = Tab.WEIGHT },
                )
                Tab.DIARY -> DiaryScreen()
                Tab.WEIGHT -> WeightScreen()
                Tab.CALIBRATE -> CalibrationScreen()
                Tab.MORE -> MoreScreen(session)
            }
        }
    }
}
