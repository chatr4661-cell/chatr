package app.lovable.a6d6a8a571c024ddcbd7f2c0ec6dd878a

import android.util.Log
import com.getcapacitor.plugin.PushNotifications
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FCMService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")
        PushNotifications.onNewToken(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Push notification received")
        PushNotifications.sendRemoteMessage(remoteMessage)
    }

    companion object {
        private const val TAG = "FCMService"
    }
}
