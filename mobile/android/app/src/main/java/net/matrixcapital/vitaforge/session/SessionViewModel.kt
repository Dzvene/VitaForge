package net.matrixcapital.vitaforge.session

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.launch
import net.matrixcapital.vitaforge.core.AppLanguage
import net.matrixcapital.vitaforge.core.ApiException
import net.matrixcapital.vitaforge.core.Services
import net.matrixcapital.vitaforge.data.Api
import net.matrixcapital.vitaforge.model.LoginRequest
import net.matrixcapital.vitaforge.model.RegisterRequest
import net.matrixcapital.vitaforge.model.UserOut

/** Auth + routing state machine driving AppRoot. */
class SessionViewModel(app: Application) : AndroidViewModel(app) {

    enum class Route { LOADING, UNAUTH, ONBOARDING, READY }

    var route by mutableStateOf(Route.LOADING)
        private set
    var user by mutableStateOf<UserOut?>(null)
        private set
    var language by mutableStateOf(AppLanguage.current(app))
        private set

    fun bootstrap() = viewModelScope.launch {
        if (!Services.tokenStore.hasTokens) {
            route = Route.UNAUTH
            return@launch
        }
        try {
            user = Api.me()
            resolveProfile()
        } catch (e: Exception) {
            Services.tokenStore.clear()
            route = Route.UNAUTH
        }
    }

    /** 404 on GET /profile means onboarding isn't done (MOBILE_API.md). */
    private suspend fun resolveProfile() {
        route = try {
            Api.profile()
            Route.READY
        } catch (e: ApiException.Server) {
            if (e.status == 404) Route.ONBOARDING else Route.READY
        } catch (e: Exception) {
            Route.READY
        }
    }

    fun login(email: String, password: String, onError: (String) -> Unit) = viewModelScope.launch {
        try {
            Services.tokenStore.save(Api.login(LoginRequest(email, password)))
            user = Api.me()
            resolveProfile()
        } catch (e: Exception) {
            onError(e.message ?: "Sign-in failed")
        }
    }

    fun register(email: String, password: String, fullName: String?, onError: (String) -> Unit) =
        viewModelScope.launch {
            try {
                Api.register(RegisterRequest(email, password, fullName))
                Services.tokenStore.save(Api.login(LoginRequest(email, password)))
                user = Api.me()
                resolveProfile()
            } catch (e: Exception) {
                onError(e.message ?: "Registration failed")
            }
        }

    fun finishOnboarding() { route = Route.READY }

    fun setLanguage(lang: AppLanguage) {
        AppLanguage.set(getApplication(), lang)
        language = lang
    }

    fun logout() {
        Services.tokenStore.clear()
        user = null
        route = Route.UNAUTH
    }
}
