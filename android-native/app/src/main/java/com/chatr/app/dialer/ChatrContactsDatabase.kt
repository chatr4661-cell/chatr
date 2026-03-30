package com.chatr.app.dialer

import android.content.Context
import androidx.room.*

/**
 * Local Room database for Chatr contact cache
 * 
 * Used by:
 * - CallerIdProvider (instant phone lookups)
 * - SmartCallRouter (VoIP vs GSM decisions)
 * - System dialer (contact display)
 * 
 * Synced from Supabase every 15 minutes via SyncWorker
 */
@Database(
    entities = [ChatrContactEntity::class],
    version = 1,
    exportSchema = false
)
abstract class ChatrContactsDatabase : RoomDatabase() {
    abstract fun contactDao(): ChatrContactDao

    companion object {
        @Volatile
        private var INSTANCE: ChatrContactsDatabase? = null

        fun getInstance(context: Context): ChatrContactsDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    ChatrContactsDatabase::class.java,
                    "chatr_contacts.db"
                )
                .fallbackToDestructiveMigration()
                .build().also { INSTANCE = it }
            }
        }
    }
}

@Entity(tableName = "chatr_contacts")
data class ChatrContactEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "chatr_user_id") val chatrUserId: String,
    @ColumnInfo(name = "display_name") val displayName: String,
    @ColumnInfo(name = "phone") val phone: String,
    @ColumnInfo(name = "avatar_url") val avatarUrl: String?,
    @ColumnInfo(name = "last_seen") val lastSeen: String?,
    @ColumnInfo(name = "is_online") val isOnline: Boolean = false,
    @ColumnInfo(name = "synced_at") val syncedAt: Long = System.currentTimeMillis()
)

@Dao
interface ChatrContactDao {
    @Query("SELECT * FROM chatr_contacts WHERE phone = :phone LIMIT 1")
    fun getByPhone(phone: String): ChatrContactEntity?

    @Query("SELECT * FROM chatr_contacts WHERE chatr_user_id = :chatrId LIMIT 1")
    fun getByChatrId(chatrId: String): ChatrContactEntity?

    @Query("SELECT * FROM chatr_contacts ORDER BY display_name ASC")
    fun getAll(): List<ChatrContactEntity>

    @Query("SELECT COUNT(*) FROM chatr_contacts")
    fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    fun upsertAll(contacts: List<ChatrContactEntity>)

    @Query("DELETE FROM chatr_contacts WHERE synced_at < :before")
    fun deleteStale(before: Long)

    @Query("DELETE FROM chatr_contacts")
    fun deleteAll()
}
