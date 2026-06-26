# Release minification is disabled for now (see app/build.gradle.kts). When it is
# enabled, kotlinx.serialization needs its generated serializers kept:
-keepclassmembers class ** {
    *** Companion;
}
-keepclasseswithmembers class ** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class net.matrixcapital.vitaforge.model.** { *; }
