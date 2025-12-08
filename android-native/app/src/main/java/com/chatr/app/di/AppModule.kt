package com.chatr.app.di

import android.content.Context
import com.chatr.app.BuildConfig
import com.chatr.app.data.SupabaseClientProvider
import com.chatr.app.web.WebViewPoolManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        return SupabaseClientProvider.create(
            url = BuildConfig.SUPABASE_URL,
            anonKey = BuildConfig.SUPABASE_ANON_KEY
        )
    }

    @Provides
    @Singleton
    fun provideWebViewPoolManager(
        @ApplicationContext context: Context
    ): WebViewPoolManager {
        return WebViewPoolManager(context)
    }
}
