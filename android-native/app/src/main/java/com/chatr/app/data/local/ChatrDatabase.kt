package com.chatr.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.chatr.app.data.local.dao.*
import com.chatr.app.data.local.entity.*

@Database(
    entities = [
        ChatEntity::class,
        MessageEntity::class,
        ContactEntity::class,
        NotificationEntity::class,
        PendingMessageEntity::class,
        CallLogEntity::class,
        CallEntity::class
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class ChatrDatabase : RoomDatabase() {
    
    abstract fun chatDao(): ChatDao
    abstract fun messageDao(): MessageDao
    abstract fun contactDao(): ContactDao
    abstract fun notificationDao(): NotificationDao
    abstract fun pendingMessageDao(): PendingMessageDao
    abstract fun callLogDao(): CallLogDao
    abstract fun callDao(): CallDao
    
    companion object {
        @Volatile
        private var INSTANCE: ChatrDatabase? = null
        
        fun getInstance(context: Context): ChatrDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ChatrDatabase::class.java,
                    "chatr_database"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
