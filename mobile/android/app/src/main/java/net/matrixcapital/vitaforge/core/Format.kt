package net.matrixcapital.vitaforge.core

import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

/** Display formatters mirroring the web `lib/format.ts`. */
object Fmt {
    fun kcal(v: Double): String = v.roundToInt().toString()
    fun g(v: Double): String = "${v.roundToInt()} g"
    fun kg(v: Double, unit: String = "kg"): String = "${round1(v)} $unit"
    fun kgSigned(v: Double, unit: String = "kg"): String {
        val s = if (v > 0) "+" else ""
        return "$s${round1(v)} $unit"
    }
    fun pct(v: Double): String = "${v.roundToInt()}%"
    fun round1(v: Double): String {
        val r = (v * 10).roundToInt() / 10.0
        return if (r % 1.0 == 0.0) r.toInt().toString() else r.toString()
    }
    /** 0..1 progress fraction, clamped. */
    fun progress(eaten: Double, target: Double): Float =
        if (target > 0) min(1.0, eaten / target).toFloat() else 0f

    fun abs1(v: Double): String = round1(abs(v))
}
