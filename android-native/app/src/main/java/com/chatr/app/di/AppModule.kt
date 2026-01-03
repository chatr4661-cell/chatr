package com.chatr.app.di

import android.content.Context
import com.chatr.app.web.WebViewPoolManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * App Module for general application-level dependencies
 * 
 * NOTE: SupabaseClient is provided by SupabaseModule - do NOT duplicate here
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideWebViewPoolManager(
        @ApplicationContext context: Context
    ): WebViewPoolManager {
        return WebViewPoolManager(context)
    }
}
