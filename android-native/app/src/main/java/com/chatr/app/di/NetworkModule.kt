package com.chatr.app.di

import android.content.Context
import com.chatr.app.config.SupabaseConfig
import com.chatr.app.data.api.*
import com.chatr.app.security.SecureStore
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/**
 * Network Module for Dependency Injection
 * 
 * Provides:
 * - OkHttpClient
 * - Gson
 * - Retrofit instances (functions + REST)
 * - All API interfaces
 * 
 * Does NOT provide repositories - those are created via @Inject constructor
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    // Edge Functions URL - for edge functions like auth-phone-otp
    private val FUNCTIONS_URL: String
        get() = SupabaseConfig.FUNCTIONS_URL + "/"
    
    // REST API URL - for RPC functions
    private val REST_URL: String
        get() = SupabaseConfig.REST_URL + "/"
    
    private val SUPABASE_ANON_KEY: String
        get() = SupabaseConfig.SUPABASE_ANON_KEY
    
    @Provides
    @Singleton
    fun provideSecureStore(@ApplicationContext context: Context): SecureStore {
        return SecureStore(context)
    }
    
    @Provides
    @Singleton
    fun provideGson(): Gson {
        return GsonBuilder()
            .setLenient()
            .create()
    }
    
    @Provides
    @Singleton
    fun provideLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
    }
    
    @Provides
    @Singleton
    @Named("authInterceptor")
    fun provideAuthInterceptor(secureStore: SecureStore): Interceptor {
        return Interceptor { chain ->
            val originalRequest = chain.request()
            val requestBuilder = originalRequest.newBuilder()
                .addHeader("apikey", SUPABASE_ANON_KEY)
                .addHeader("Content-Type", "application/json")
            
            // Add Authorization header if token exists
            secureStore.getString("access_token")?.let { token ->
                requestBuilder.addHeader("Authorization", "Bearer $token")
            }
            
            chain.proceed(requestBuilder.build())
        }
    }
    
    @Provides
    @Singleton
    fun provideOkHttpClient(
        loggingInterceptor: HttpLoggingInterceptor,
        @Named("authInterceptor") authInterceptor: Interceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor(authInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    @Named("functionsRetrofit")
    fun provideFunctionsRetrofit(okHttpClient: OkHttpClient, gson: Gson): retrofit2.Retrofit {
        return retrofit2.Retrofit.Builder()
            .baseUrl(FUNCTIONS_URL)
            .client(okHttpClient)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
            .build()
    }
    
    @Provides
    @Singleton
    @Named("restRetrofit")
    fun provideRestRetrofit(okHttpClient: OkHttpClient, gson: Gson): retrofit2.Retrofit {
        return retrofit2.Retrofit.Builder()
            .baseUrl(REST_URL)
            .client(okHttpClient)
            .addConverterFactory(retrofit2.converter.gson.GsonConverterFactory.create(gson))
            .build()
    }
    
    // ==================== API Interfaces ====================
    
    @Provides
    @Singleton
    fun provideChatrApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): ChatrApi {
        return retrofit.create(ChatrApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSupabaseRestApi(@Named("restRetrofit") retrofit: retrofit2.Retrofit): SupabaseRestApi {
        return retrofit.create(SupabaseRestApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSearchApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): SearchApi {
        return retrofit.create(SearchApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAIApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): AIApi {
        return retrofit.create(AIApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideCallsApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): CallsApi {
        return retrofit.create(CallsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideContactsApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): ContactsApi {
        return retrofit.create(ContactsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideLocationApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): LocationApi {
        return retrofit.create(LocationApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSocialApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): SocialApi {
        return retrofit.create(SocialApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideNotificationsApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): NotificationsApi {
        return retrofit.create(NotificationsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun providePaymentsApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): PaymentsApi {
        return retrofit.create(PaymentsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideStudioApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): StudioApi {
        return retrofit.create(StudioApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideGamesApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): GamesApi {
        return retrofit.create(GamesApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideStealthModeApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): StealthModeApi {
        return retrofit.create(StealthModeApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideChatrWorldApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): ChatrWorldApi {
        return retrofit.create(ChatrWorldApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAIBrowserApi(@Named("functionsRetrofit") retrofit: retrofit2.Retrofit): AIBrowserApi {
        return retrofit.create(AIBrowserApi::class.java)
    }
}
