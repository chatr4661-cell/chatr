package com.chatr.app.data.local.dao

import androidx.room.*
import com.chatr.app.data.local.entity.CallLogEntity

@Dao
interface CallLogDao {
    
    @Query("SELECT * FROM call_logs ORDER BY startTime DESC LIMIT :limit")
    suspend fun getCallHistory(limit: Int): List<CallLogEntity>
    
    @Query("SELECT * FROM call_logs WHERE id = :callId")
    suspend fun getCallById(callId: String): CallLogEntity?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(call: CallLogEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(calls: List<CallLogEntity>)
    
    @Query("DELETE FROM call_logs WHERE id = :callId")
    suspend fun deleteById(callId: String)
    
    @Query("DELETE FROM call_logs")
    suspend fun deleteAll()
    
    @Query("SELECT COUNT(*) FROM call_logs WHERE status = 'MISSED'")
    suspend fun getMissedCallCount(): Int
}
