package com.chatr.app.di

import android.content.Context
import com.chatr.app.data.api.*
import com.chatr.app.data.repository.*
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
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    private const val BASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co/functions/v1/"
    private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    
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
    fun provideRetrofit(okHttpClient: OkHttpClient, gson: Gson): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
    }
    
    // API Interfaces
    @Provides
    @Singleton
    fun provideChatrApi(retrofit: Retrofit): ChatrApi {
        return retrofit.create(ChatrApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSearchApi(retrofit: Retrofit): SearchApi {
        return retrofit.create(SearchApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideAIApi(retrofit: Retrofit): AIApi {
        return retrofit.create(AIApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideCallsApi(retrofit: Retrofit): CallsApi {
        return retrofit.create(CallsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideContactsApi(retrofit: Retrofit): ContactsApi {
        return retrofit.create(ContactsApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideLocationApi(retrofit: Retrofit): LocationApi {
        return retrofit.create(LocationApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideSocialApi(retrofit: Retrofit): SocialApi {
        return retrofit.create(SocialApi::class.java)
    }
    
    @Provides
    @Singleton
    fun provideNotificationsApi(retrofit: Retrofit): NotificationsApi {
        return retrofit.create(NotificationsApi::class.java)
    }
    
    // Repositories
    @Provides
    @Singleton
    fun provideAuthRepository(api: ChatrApi, secureStore: SecureStore): AuthRepository {
        return AuthRepository(api, secureStore)
    }
    
    @Provides
    @Singleton
    fun provideChatRepository(api: ChatrApi): ChatRepository {
        return ChatRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideMessagesRepository(api: ChatrApi): MessagesRepository {
        return MessagesRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideCallsRepository(api: CallsApi): CallsRepository {
        return CallsRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideContactsRepository(api: ContactsApi): ContactsRepository {
        return ContactsRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideSearchRepository(api: SearchApi): SearchRepository {
        return SearchRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideAiRepository(api: AIApi): AiRepository {
        return AiRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideLocationRepository(api: LocationApi): LocationRepository {
        return LocationRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideSocialRepository(api: SocialApi): SocialRepository {
        return SocialRepository(api)
    }
    
    @Provides
    @Singleton
    fun provideNotificationsRepository(api: NotificationsApi): NotificationsRepository {
        return NotificationsRepository(api)
    }
}
