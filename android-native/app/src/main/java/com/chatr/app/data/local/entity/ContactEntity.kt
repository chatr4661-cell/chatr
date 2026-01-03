package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.api.Contact
import com.chatr.app.data.api.ContactResponse

@Entity(tableName = "contacts")
data class ContactEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val contactUserId: String?,
    val contactName: String,
    val contactPhone: String?,
    val isRegistered: Boolean = false,
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null,
    val lastSyncedAt: Long = System.currentTimeMillis()
) {
    fun toContactResponse(): ContactResponse {
        return ContactResponse(
            id = id,
            userId = userId,
            contactUserId = contactUserId,
            contactName = contactName,
            contactPhone = contactPhone,
            isRegistered = isRegistered,
            avatarUrl = avatarUrl,
            isOnline = isOnline
        )
    }
    
    fun toContact(): Contact {
        return Contact(
            id = contactUserId ?: id,
            name = contactName,
            phoneNumber = contactPhone,
            avatarUrl = avatarUrl,
            isOnline = isOnline,
            isRegistered = isRegistered
        )
    }
    
    companion object {
        fun fromContactResponse(contact: ContactResponse): ContactEntity {
            return ContactEntity(
                id = contact.id,
                userId = contact.userId,
                contactUserId = contact.contactUserId,
                contactName = contact.contactName,
                contactPhone = contact.contactPhone,
                isRegistered = contact.isRegistered,
                avatarUrl = contact.avatarUrl,
            )
        }
    }
}
