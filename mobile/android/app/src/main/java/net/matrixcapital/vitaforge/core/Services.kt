package net.matrixcapital.vitaforge.core

import android.content.Context

/** Tiny manual DI — initialized once from the Activity with the app context. */
object Services {
    lateinit var tokenStore: TokenStore
        private set
    lateinit var api: ApiClient
        private set

    fun init(context: Context) {
        if (::api.isInitialized) return
        val app = context.applicationContext
        tokenStore = TokenStore(app)
        api = ApiClient(tokenStore) { AppLanguage.current(app).code }
    }
}
