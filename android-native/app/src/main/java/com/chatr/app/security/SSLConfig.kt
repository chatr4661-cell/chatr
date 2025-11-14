package com.chatr.app.security

import android.content.Context
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import java.io.InputStream
import java.security.KeyStore
import java.security.cert.CertificateFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

object SSLConfig {
    
    fun createSecureOkHttpClient(context: Context): OkHttpClient {
        val certificatePinner = CertificatePinner.Builder()
            .add("your-api-domain.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
            .add("your-signaling-domain.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
            .build()
        
        return OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .build()
    }
    
    fun createSSLContext(context: Context, certFileName: String): SSLContext {
        val certificateFactory = CertificateFactory.getInstance("X.509")
        val inputStream: InputStream = context.assets.open(certFileName)
        val certificate = certificateFactory.generateCertificate(inputStream)
        inputStream.close()
        
        val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
        keyStore.load(null, null)
        keyStore.setCertificateEntry("ca", certificate)
        
        val tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm()
        val tmf = TrustManagerFactory.getInstance(tmfAlgorithm)
        tmf.init(keyStore)
        
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, tmf.trustManagers, null)
        
        return sslContext
    }
    
    fun getTrustManager(context: Context, certFileName: String): X509TrustManager {
        val sslContext = createSSLContext(context, certFileName)
        val trustManagers = sslContext.socketFactory.defaultCipherSuites
        return sslContext.socketFactory as X509TrustManager
    }
}
