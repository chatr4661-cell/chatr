package com.chatr.app.di

import com.chatr.app.web.WebViewPoolManager
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.components.ViewModelComponent
import dagger.hilt.android.scopes.ViewModelScoped

@Module
@InstallIn(ViewModelComponent::class)
object ViewModelModule {
    // ViewModels get WebViewPoolManager from AppModule singleton
}
