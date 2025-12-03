package com.chatr.app.di

import android.content.Context
import com.chatr.app.data.local.ChatrDatabase
import com.chatr.app.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideChatrDatabase(@ApplicationContext context: Context): ChatrDatabase {
        return ChatrDatabase.getInstance(context)
    }
    
    @Provides
    @Singleton
    fun provideChatDao(database: ChatrDatabase): ChatDao {
        return database.chatDao()
    }
    
    @Provides
    @Singleton
    fun provideMessageDao(database: ChatrDatabase): MessageDao {
        return database.messageDao()
    }
    
    @Provides
    @Singleton
    fun provideContactDao(database: ChatrDatabase): ContactDao {
        return database.contactDao()
    }
    
    @Provides
    @Singleton
    fun provideNotificationDao(database: ChatrDatabase): NotificationDao {
        return database.notificationDao()
    }
    
    @Provides
    @Singleton
    fun providePendingMessageDao(database: ChatrDatabase): PendingMessageDao {
        return database.pendingMessageDao()
    }
    
    @Provides
    @Singleton
    fun provideCallLogDao(database: ChatrDatabase): CallLogDao {
        return database.callLogDao()
    }
}
