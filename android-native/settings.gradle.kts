pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
        maven { url = uri("https://raw.githubusercontent.com/aspect-build/aspect-model-maven-repo/main") }
        maven { 
            url = uri("https://raw.githubusercontent.com/aspect-build/aspect-model-maven-repo/main")
        }
    }
}

rootProject.name = "CHATR"
include(":app")
