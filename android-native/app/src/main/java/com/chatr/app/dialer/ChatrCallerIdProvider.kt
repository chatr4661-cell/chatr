package com.chatr.app.dialer

import android.content.ContentProvider
import android.content.ContentValues
import android.content.UriMatcher
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              CHATR CALLER ID PROVIDER                                ║
 * ║                                                                      ║
 * ║  ContentProvider that feeds Chatr contact data to:                  ║
 * ║  • System dialer (caller ID for incoming VoIP calls)                ║
 * ║  • Contact apps (shows "On Chatr" badge)                            ║
 * ║  • Call log (proper names for VoIP calls)                           ║
 * ║                                                                      ║
 * ║  Data source: local SQLite cache of Chatr contacts                  ║
 * ║  Sync: Updated via SyncAdapter (every 15 min)                       ║
 * ║                                                                      ║
 * ║  Response time: <1ms (SQLite query)                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
class ChatrCallerIdProvider : ContentProvider() {

    companion object {
        private const val TAG = "ChatrCallerID"
        const val AUTHORITY = "com.chatr.app.callerid"

        // URI patterns
        private const val LOOKUP_BY_PHONE = 1
        private const val LOOKUP_BY_ID = 2
        private const val ALL_CHATR_CONTACTS = 3

        private val uriMatcher = UriMatcher(UriMatcher.NO_MATCH).apply {
            addURI(AUTHORITY, "phone/*", LOOKUP_BY_PHONE)
            addURI(AUTHORITY, "id/*", LOOKUP_BY_ID)
            addURI(AUTHORITY, "contacts", ALL_CHATR_CONTACTS)
        }

        // Columns exposed to system
        val COLUMNS = arrayOf(
            ContactsContract.PhoneLookup._ID,
            ContactsContract.PhoneLookup.DISPLAY_NAME,
            ContactsContract.PhoneLookup.NUMBER,
            ContactsContract.PhoneLookup.PHOTO_URI,
            ContactsContract.PhoneLookup.LABEL, // "Chatr VoIP"
            "is_chatr_user",
            "chatr_user_id",
            "last_seen"
        )
    }

    override fun onCreate(): Boolean {
        Log.d(TAG, "✅ ChatrCallerIdProvider created")
        return true
    }

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?
    ): Cursor? {
        return when (uriMatcher.match(uri)) {
            LOOKUP_BY_PHONE -> {
                val phone = uri.lastPathSegment ?: return null
                lookupByPhone(phone)
            }
            LOOKUP_BY_ID -> {
                val chatrId = uri.lastPathSegment ?: return null
                lookupById(chatrId)
            }
            ALL_CHATR_CONTACTS -> {
                getAllChatrContacts()
            }
            else -> null
        }
    }

    /**
     * Lookup a phone number — returns Chatr user info if registered
     * 
     * System dialer calls this for incoming caller ID:
     * content://com.chatr.app.callerid/phone/+919876543210
     */
    private fun lookupByPhone(phone: String): Cursor {
        val cursor = MatrixCursor(COLUMNS)

        try {
            val db = context?.let { ChatrContactsDatabase.getInstance(it) }
            val contact = db?.contactDao()?.getByPhone(normalizePhone(phone))

            if (contact != null) {
                cursor.addRow(arrayOf(
                    contact.id.hashCode().toLong(), // _ID
                    contact.displayName,             // DISPLAY_NAME
                    contact.phone,                   // NUMBER
                    contact.avatarUrl ?: "",          // PHOTO_URI
                    "Chatr VoIP",                    // LABEL
                    1,                                // is_chatr_user
                    contact.chatrUserId,              // chatr_user_id
                    contact.lastSeen ?: ""            // last_seen
                ))
                Log.d(TAG, "📞 CallerID hit: ${contact.displayName} for $phone")
            }
        } catch (e: Exception) {
            Log.e(TAG, "CallerID lookup failed for $phone", e)
        }

        return cursor
    }

    private fun lookupById(chatrId: String): Cursor {
        val cursor = MatrixCursor(COLUMNS)

        try {
            val db = context?.let { ChatrContactsDatabase.getInstance(it) }
            val contact = db?.contactDao()?.getByChatrId(chatrId)

            if (contact != null) {
                cursor.addRow(arrayOf(
                    contact.id.hashCode().toLong(),
                    contact.displayName,
                    contact.phone,
                    contact.avatarUrl ?: "",
                    "Chatr VoIP",
                    1,
                    contact.chatrUserId,
                    contact.lastSeen ?: ""
                ))
            }
        } catch (e: Exception) {
            Log.e(TAG, "CallerID lookup by ID failed", e)
        }

        return cursor
    }

    private fun getAllChatrContacts(): Cursor {
        val cursor = MatrixCursor(COLUMNS)

        try {
            val db = context?.let { ChatrContactsDatabase.getInstance(it) }
            val contacts = db?.contactDao()?.getAll() ?: emptyList()

            for (contact in contacts) {
                cursor.addRow(arrayOf(
                    contact.id.hashCode().toLong(),
                    contact.displayName,
                    contact.phone,
                    contact.avatarUrl ?: "",
                    "Chatr VoIP",
                    1,
                    contact.chatrUserId,
                    contact.lastSeen ?: ""
                ))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load all contacts", e)
        }

        return cursor
    }

    private fun normalizePhone(phone: String): String {
        val trimmed = phone.trim()
        val hasPlus = trimmed.startsWith("+")
        val hasDoubleZero = trimmed.startsWith("00")
        val digits = trimmed.replace(Regex("[^\\d]"), "")
        if (digits.isEmpty()) return ""
        return when {
            hasPlus -> "+$digits"
            hasDoubleZero -> "+${digits.substring(2)}"
            digits.length > 10 -> "+$digits"
            else -> "+91$digits"
        }
    }

    // Read-only provider
    override fun getType(uri: Uri): String = "vnd.android.cursor.item/vnd.chatr.callerid"
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
