package com.chatr.app.di

import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.android.components.ViewModelComponent

@Module
@InstallIn(ViewModelComponent::class)
object ViewModelModule {
    // ViewModels are automatically injected by Hilt
    // No additional providers needed here
}
