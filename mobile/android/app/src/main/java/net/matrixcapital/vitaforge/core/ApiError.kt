package net.matrixcapital.vitaforge.core

/** Typed API failures surfaced to the UI. */
sealed class ApiException(message: String) : Exception(message) {
    class Unauthorized : ApiException("Your session expired. Please sign in again.")
    class Server(val status: Int, val detail: String) : ApiException(detail)
    class Network(cause: Throwable) : ApiException(cause.message ?: "Network error")
}
