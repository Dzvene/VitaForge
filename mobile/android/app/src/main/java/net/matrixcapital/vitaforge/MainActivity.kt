package net.matrixcapital.vitaforge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import net.matrixcapital.vitaforge.core.Services
import net.matrixcapital.vitaforge.ui.AppRoot
import net.matrixcapital.vitaforge.ui.theme.VitaForgeTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Services.init(applicationContext)
        net.matrixcapital.vitaforge.core.ThemeController.init(applicationContext)
        setContent {
            VitaForgeTheme { AppRoot() }
        }
    }
}
