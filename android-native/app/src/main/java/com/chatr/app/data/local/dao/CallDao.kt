package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.CallEntity
import kotlinx.coroutines.flow.Flow

/**
 * DAO for Call operations
 */
@Dao
interface CallDao {
    
    @Query("SELECT * FROM calls ORDER BY createdAt DESC LIMIT :limit")
    fun getCalls(limit: Int = 50): Flow<List<CallEntity>>
    
    @Query("SELECT * FROM calls WHERE id = :callId")
    suspend fun getCall(callId: String): CallEntity?
    
    @Query("SELECT * FROM calls WHERE status = 'MISSED' AND isSeen = 0")
    fun getMissedCalls(): Flow<List<CallEntity>>
    
    @Query("SELECT COUNT(*) FROM calls WHERE status = 'MISSED' AND isSeen = 0")
    fun getMissedCallsCount(): Flow<Int>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(call: CallEntity)
    
    @Update
    suspend fun update(call: CallEntity)
    
    @Query("UPDATE calls SET status = :status, endedAt = :endedAt, duration = :duration WHERE id = :callId")
    suspend fun updateCallEnded(callId: String, status: String, endedAt: Long, duration: Long)
    
    @Query("UPDATE calls SET isSeen = 1 WHERE isSeen = 0")
    suspend fun markAllAsSeen()
    
    @Delete
    suspend fun delete(call: CallEntity)
    
    @Query("DELETE FROM calls WHERE id = :callId")
    suspend fun deleteById(callId: String)
    
    @Query("DELETE FROM calls")
    suspend fun deleteAll()
}
