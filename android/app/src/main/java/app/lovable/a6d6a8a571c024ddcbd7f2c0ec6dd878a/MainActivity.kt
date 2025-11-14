package app.lovable.a6d6a8a571c024ddcbd7f2c0ec6dd878a

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register plugins
        registerPlugin(com.getcapacitor.plugin.App::class.java)
        registerPlugin(com.getcapacitor.community.bluetoothle.BluetoothLe::class.java)
    }
}
