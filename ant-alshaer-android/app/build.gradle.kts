plugins { id("com.android.application") }
val uploadKeyStorePath = System.getenv("ANT_ALSHAER_KEYSTORE_PATH")
android {
    namespace = "com.q8ux.antalshaer"
    compileSdk = 36
    buildToolsVersion = "35.0.0"
    defaultConfig {
        applicationId = "com.q8ux.antalshaer"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
    signingConfigs {
        if (!uploadKeyStorePath.isNullOrBlank()) {
            create("playUpload") {
                storeFile = file(uploadKeyStorePath)
                storePassword = System.getenv("ANT_ALSHAER_STORE_PASSWORD")
                keyAlias = System.getenv("ANT_ALSHAER_KEY_ALIAS")
                keyPassword = System.getenv("ANT_ALSHAER_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            isDebuggable = false
            if (!uploadKeyStorePath.isNullOrBlank()) signingConfig = signingConfigs.getByName("playUpload")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    buildFeatures { buildConfig = false }
}
