package com.chatr.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.chatr.app.data.api.Contact

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
    val lastSyncedAt: Long = System.currentTimeMillis()
) {
    fun toContact(): Contact {
        return Contact(
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
    
    companion object {
        fun fromContact(contact: Contact): ContactEntity {
            return ContactEntity(
                id = contact.id,
                userId = contact.userId,
                contactUserId = contact.contactUserId,
                contactName = contact.contactName,
                contactPhone = contact.contactPhone,
                isRegistered = contact.isRegistered,
                avatarUrl = contact.avatarUrl,
                isOnline = contact.isOnline
            )
        }
    }
}
