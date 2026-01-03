package com.chatr.app.data.repository

import com.chatr.app.data.api.*
import com.chatr.app.data.models.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContactsRepository @Inject constructor(
    private val api: ContactsApi
) {
    
    fun getContacts(): Flow<Result<List<ContactResponse>>> = flow {
        emit(safeApiCall { api.getContacts() })
    }
    
    suspend fun syncContacts(contacts: List<ContactInfo>): Result<List<User>> {
        return safeApiCall { api.syncContacts(contacts) }
    }
    
    suspend fun blockContact(userId: String): Result<Unit> {
        return safeApiCall { 
            api.blockContact(BlockContactRequest(userId)) 
        }
    }
    
    suspend fun unblockContact(userId: String): Result<Unit> {
        return safeApiCall { api.unblockContact(userId) }
    }
    
    fun getBlockedContacts(): Flow<Result<List<ContactResponse>>> = flow {
        emit(safeApiCall { api.getBlockedContacts() })
    }
}
