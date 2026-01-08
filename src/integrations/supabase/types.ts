export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_followers: {
        Row: {
          account_id: string
          followed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          followed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          followed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_followers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "official_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_action_logs: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      ai_agent_analytics: {
        Row: {
          agent_id: string
          average_response_time_seconds: number | null
          conversations_started: number | null
          created_at: string | null
          date: string
          id: string
          messages_sent: number | null
        }
        Insert: {
          agent_id: string
          average_response_time_seconds?: number | null
          conversations_started?: number | null
          created_at?: string | null
          date?: string
          id?: string
          messages_sent?: number | null
        }
        Update: {
          agent_id?: string
          average_response_time_seconds?: number | null
          conversations_started?: number | null
          created_at?: string | null
          date?: string
          id?: string
          messages_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_analytics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_training: {
        Row: {
          agent_id: string
          answer: string
          created_at: string | null
          id: string
          question: string
        }
        Insert: {
          agent_id: string
          answer: string
          created_at?: string | null
          id?: string
          question: string
        }
        Update: {
          agent_id?: string
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_training_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          agent_avatar_url: string | null
          agent_description: string | null
          agent_name: string
          agent_personality: string
          agent_purpose: string
          auto_reply_enabled: boolean | null
          created_at: string | null
          greeting_message: string | null
          id: string
          is_active: boolean | null
          knowledge_base: string | null
          response_delay_seconds: number | null
          total_conversations: number | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_avatar_url?: string | null
          agent_description?: string | null
          agent_name: string
          agent_personality?: string
          agent_purpose: string
          auto_reply_enabled?: boolean | null
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          response_delay_seconds?: number | null
          total_conversations?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_avatar_url?: string | null
          agent_description?: string | null
          agent_name?: string
          agent_personality?: string
          agent_purpose?: string
          auto_reply_enabled?: boolean | null
          created_at?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          knowledge_base?: string | null
          response_delay_seconds?: number | null
          total_conversations?: number | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_moments: {
        Row: {
          conversation_snippet: string
          created_at: string | null
          emotion_captured: string | null
          id: string
          is_public: boolean | null
          like_count: number | null
          share_count: number | null
          user_id: string
        }
        Insert: {
          conversation_snippet: string
          created_at?: string | null
          emotion_captured?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          share_count?: number | null
          user_id: string
        }
        Update: {
          conversation_snippet?: string
          created_at?: string | null
          emotion_captured?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          share_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_stickers: {
        Row: {
          created_at: string | null
          id: string
          source_photo_url: string
          sticker_url: string
          style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source_photo_url: string
          sticker_url: string
          style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source_photo_url?: string
          sticker_url?: string
          style?: string | null
          user_id?: string
        }
        Relationships: []
      }
      album_photos: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          photo_url: string
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url: string
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_applications: {
        Row: {
          city: string
          college: string
          created_at: string
          email: string
          experience: string | null
          full_name: string
          id: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          social_media: string | null
          status: string
          user_id: string
          why_join: string
          year: string
        }
        Insert: {
          city: string
          college: string
          created_at?: string
          email: string
          experience?: string | null
          full_name: string
          id?: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: string | null
          status?: string
          user_id: string
          why_join: string
          year: string
        }
        Update: {
          city?: string
          college?: string
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          id?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_media?: string | null
          status?: string
          user_id?: string
          why_join?: string
          year?: string
        }
        Relationships: []
      }
      analytics_data: {
        Row: {
          active_providers: number | null
          created_at: string | null
          date: string
          id: string
          new_users: number | null
          total_appointments: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          active_providers?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_users?: number | null
          total_appointments?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          active_providers?: number | null
          created_at?: string | null
          date?: string
          id?: string
          new_users?: number | null
          total_appointments?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string | null
          id: string
          read_at: string | null
          user_id: string | null
        }
        Insert: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Update: {
          announcement_id?: string | null
          id?: string
          read_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string | null
          created_by: string
          delivery_method: string | null
          id: string
          is_active: boolean | null
          message: string
          target_audience: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          delivery_method?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          target_audience?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          delivery_method?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          target_audience?: string | null
          title?: string
        }
        Relationships: []
      }
      app_analytics: {
        Row: {
          app_id: string | null
          created_at: string | null
          event_type: string
          id: string
          session_duration: number | null
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          session_duration?: number | null
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          session_duration?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_analytics_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_builder_projects: {
        Row: {
          app_type: string | null
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          project_name: string
          published_app_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_type?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          project_name: string
          published_app_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_type?: string | null
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          project_name?: string
          published_app_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_builder_projects_published_app_id_fkey"
            columns: ["published_app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_permissions: {
        Row: {
          app_id: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          last_used_at: string | null
          permission_name: string
          revoked_at: string | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          last_used_at?: string | null
          permission_name: string
          revoked_at?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          last_used_at?: string | null
          permission_name?: string
          revoked_at?: string | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_permissions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "chatr_os_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_reviews: {
        Row: {
          app_id: string
          created_at: string | null
          id: string
          rating: number | null
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: string
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: string
          rating?: number | null
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_sessions: {
        Row: {
          app_id: string
          background_time_seconds: number | null
          battery_drain: number | null
          cpu_usage_avg: number | null
          crash_count: number | null
          created_at: string
          data_received: number | null
          data_sent: number | null
          duration_seconds: number | null
          id: string
          memory_usage_peak: number | null
          screen_time_seconds: number | null
          session_end: string | null
          session_start: string
          user_id: string
        }
        Insert: {
          app_id: string
          background_time_seconds?: number | null
          battery_drain?: number | null
          cpu_usage_avg?: number | null
          crash_count?: number | null
          created_at?: string
          data_received?: number | null
          data_sent?: number | null
          duration_seconds?: number | null
          id?: string
          memory_usage_peak?: number | null
          screen_time_seconds?: number | null
          session_end?: string | null
          session_start?: string
          user_id: string
        }
        Update: {
          app_id?: string
          background_time_seconds?: number | null
          battery_drain?: number | null
          cpu_usage_avg?: number | null
          crash_count?: number | null
          created_at?: string
          data_received?: number | null
          data_sent?: number | null
          duration_seconds?: number | null
          id?: string
          memory_usage_peak?: number | null
          screen_time_seconds?: number | null
          session_end?: string | null
          session_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_sessions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "chatr_os_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_submissions: {
        Row: {
          app_name: string
          app_url: string
          category_id: string | null
          created_at: string | null
          description: string | null
          developer_id: string | null
          icon_url: string | null
          id: string
          privacy_policy_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshots: string[] | null
          submission_status: string | null
          submitted_at: string | null
          support_email: string | null
          tags: string[] | null
          terms_url: string | null
          updated_at: string | null
        }
        Insert: {
          app_name: string
          app_url: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: string | null
          icon_url?: string | null
          id?: string
          privacy_policy_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshots?: string[] | null
          submission_status?: string | null
          submitted_at?: string | null
          support_email?: string | null
          tags?: string[] | null
          terms_url?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string
          app_url?: string
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: string | null
          icon_url?: string | null
          id?: string
          privacy_policy_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshots?: string[] | null
          submission_status?: string | null
          submitted_at?: string | null
          support_email?: string | null
          tags?: string[] | null
          terms_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_submissions_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_usage: {
        Row: {
          app_id: string
          created_at: string | null
          id: string
          last_used_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_usage_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_usage_sessions: {
        Row: {
          app_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          session_end: string | null
          session_start: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_end?: string | null
          session_start?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          session_end?: string | null
          session_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_usage_sessions_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          cash_amount: number | null
          created_at: string | null
          diagnosis: string | null
          duration_minutes: number | null
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          payment_method: string | null
          points_used: number | null
          provider_id: string
          service_id: string | null
          status: string | null
          treatment_plan: Json | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          cash_amount?: number | null
          created_at?: string | null
          diagnosis?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          payment_method?: string | null
          points_used?: number | null
          provider_id: string
          service_id?: string | null
          status?: string | null
          treatment_plan?: Json | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          cash_amount?: number | null
          created_at?: string | null
          diagnosis?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          payment_method?: string | null
          points_used?: number | null
          provider_id?: string
          service_id?: string | null
          status?: string | null
          treatment_plan?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      ar_brand_filters: {
        Row: {
          brand_id: string | null
          category: string | null
          created_at: string | null
          filter_asset_url: string
          filter_description: string | null
          filter_name: string
          id: string
          is_featured: boolean | null
          preview_image_url: string | null
          usage_count: number | null
        }
        Insert: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          filter_asset_url: string
          filter_description?: string | null
          filter_name: string
          id?: string
          is_featured?: boolean | null
          preview_image_url?: string | null
          usage_count?: number | null
        }
        Update: {
          brand_id?: string | null
          category?: string | null
          created_at?: string | null
          filter_asset_url?: string
          filter_description?: string | null
          filter_name?: string
          id?: string
          is_featured?: boolean | null
          preview_image_url?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ar_brand_filters_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_room_participants: {
        Row: {
          id: string
          is_muted: boolean | null
          is_speaking: boolean | null
          joined_at: string | null
          left_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_muted?: boolean | null
          is_speaking?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "audio_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_rooms: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          participant_count: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          participant_count?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          participant_count?: number | null
          title?: string
        }
        Relationships: []
      }
      backup_history: {
        Row: {
          backup_key: string
          created_at: string | null
          id: string
          includes_media: boolean | null
          message_count: number | null
          size_bytes: number | null
          user_id: string
        }
        Insert: {
          backup_key: string
          created_at?: string | null
          id?: string
          includes_media?: boolean | null
          message_count?: number | null
          size_bytes?: number | null
          user_id: string
        }
        Update: {
          backup_key?: string
          created_at?: string | null
          id?: string
          includes_media?: boolean | null
          message_count?: number | null
          size_bytes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_contacts: {
        Row: {
          blocked_at: string | null
          blocked_user_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_user_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_user_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bmi_records: {
        Row: {
          bmi_category: string
          bmi_encrypted: string | null
          bmi_value: number
          body_fat_percent: number | null
          created_at: string
          height_cm: number
          height_encrypted: string | null
          id: string
          recorded_at: string
          user_id: string
          waist_cm: number | null
          weight_encrypted: string | null
          weight_kg: number
        }
        Insert: {
          bmi_category: string
          bmi_encrypted?: string | null
          bmi_value: number
          body_fat_percent?: number | null
          created_at?: string
          height_cm: number
          height_encrypted?: string | null
          id?: string
          recorded_at?: string
          user_id: string
          waist_cm?: number | null
          weight_encrypted?: string | null
          weight_kg: number
        }
        Update: {
          bmi_category?: string
          bmi_encrypted?: string | null
          bmi_value?: number
          body_fat_percent?: number | null
          created_at?: string
          height_cm?: number
          height_encrypted?: string | null
          id?: string
          recorded_at?: string
          user_id?: string
          waist_cm?: number | null
          weight_encrypted?: string | null
          weight_kg?: number
        }
        Relationships: []
      }
      booking_status_updates: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          status: string
          updated_by: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          status: string
          updated_by: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          status?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_updates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_impressions: {
        Row: {
          brand_id: string | null
          created_at: string | null
          detected_object: string | null
          duration_seconds: number | null
          id: string
          impression_type: string | null
          placement_id: string | null
          user_id: string | null
          video_session_id: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          detected_object?: string | null
          duration_seconds?: number | null
          id?: string
          impression_type?: string | null
          placement_id?: string | null
          user_id?: string | null
          video_session_id?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          detected_object?: string | null
          duration_seconds?: number | null
          id?: string
          impression_type?: string | null
          placement_id?: string | null
          user_id?: string | null
          video_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_impressions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_impressions_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "brand_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_partnerships: {
        Row: {
          brand_logo_url: string | null
          brand_name: string
          brand_website: string | null
          budget_remaining: number | null
          contact_email: string | null
          cost_per_impression: number | null
          cost_per_interaction: number | null
          created_at: string | null
          id: string
          status: string | null
          target_categories: string[] | null
          target_demographics: Json | null
          updated_at: string | null
        }
        Insert: {
          brand_logo_url?: string | null
          brand_name: string
          brand_website?: string | null
          budget_remaining?: number | null
          contact_email?: string | null
          cost_per_impression?: number | null
          cost_per_interaction?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          target_categories?: string[] | null
          target_demographics?: Json | null
          updated_at?: string | null
        }
        Update: {
          brand_logo_url?: string | null
          brand_name?: string
          brand_website?: string | null
          budget_remaining?: number | null
          contact_email?: string | null
          cost_per_impression?: number | null
          cost_per_interaction?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          target_categories?: string[] | null
          target_demographics?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_placements: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          object_type: string
          priority: number | null
          replacement_asset_url: string
          replacement_type: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          object_type: string
          priority?: number | null
          replacement_asset_url: string
          replacement_type?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          object_type?: string
          priority?: number | null
          replacement_asset_url?: string
          replacement_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_placements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_lists: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          recipient_id: string
        }
        Insert: {
          broadcast_id: string
          recipient_id: string
        }
        Update: {
          broadcast_id?: string
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      business_broadcasts: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string | null
          id: string
          message: string
          recipient_count: number | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          target_audience: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          target_audience?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string
          recipient_count?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          target_audience?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_broadcasts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_catalog: {
        Row: {
          business_id: string
          category: string
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_service: boolean | null
          name: string
          price: number | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_service?: boolean | null
          name: string
          price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_service?: boolean | null
          name?: string
          price?: number | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_catalog_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      business_conversations: {
        Row: {
          assigned_to: string | null
          business_id: string
          conversation_id: string
          created_at: string | null
          customer_id: string | null
          id: string
          last_message_at: string | null
          priority: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          conversation_id: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          conversation_id?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_conversations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offerings: {
        Row: {
          available: boolean | null
          business_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number | null
        }
        Insert: {
          available?: boolean | null
          business_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
        }
        Update: {
          available?: boolean | null
          business_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_offerings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          broadcasts_enabled: boolean | null
          business_email: string | null
          business_hours: Json | null
          business_name: string
          business_phone: string | null
          business_type: string
          contact_info: Json | null
          created_at: string | null
          description: string | null
          gst_number: string | null
          id: string
          location: Json | null
          logo_url: string | null
          notification_preferences: Json | null
          pan_number: string | null
          updated_at: string | null
          user_id: string
          verification_date: string | null
          verification_documents: Json | null
          verified: boolean | null
        }
        Insert: {
          broadcasts_enabled?: boolean | null
          business_email?: string | null
          business_hours?: Json | null
          business_name: string
          business_phone?: string | null
          business_type: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          gst_number?: string | null
          id?: string
          location?: Json | null
          logo_url?: string | null
          notification_preferences?: Json | null
          pan_number?: string | null
          updated_at?: string | null
          user_id: string
          verification_date?: string | null
          verification_documents?: Json | null
          verified?: boolean | null
        }
        Update: {
          broadcasts_enabled?: boolean | null
          business_email?: string | null
          business_hours?: Json | null
          business_name?: string
          business_phone?: string | null
          business_type?: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          gst_number?: string | null
          id?: string
          location?: Json | null
          logo_url?: string | null
          notification_preferences?: Json | null
          pan_number?: string | null
          updated_at?: string | null
          user_id?: string
          verification_date?: string | null
          verification_documents?: Json | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subscriptions: {
        Row: {
          billing_cycle_start: string | null
          business_id: string
          created_at: string | null
          features: Json | null
          id: string
          monthly_price: number | null
          next_billing_date: string | null
          plan_type: string
          status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle_start?: string | null
          business_id: string
          created_at?: string | null
          features?: Json | null
          id?: string
          monthly_price?: number | null
          next_billing_date?: string | null
          plan_type: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle_start?: string | null
          business_id?: string
          created_at?: string | null
          features?: Json | null
          id?: string
          monthly_price?: number | null
          next_billing_date?: string | null
          plan_type?: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_team_members: {
        Row: {
          business_id: string
          id: string
          invited_by: string | null
          joined_at: string | null
          permissions: Json | null
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role: string
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          permissions?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_participants: {
        Row: {
          audio_enabled: boolean | null
          call_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          user_id: string | null
          video_enabled: boolean | null
        }
        Insert: {
          audio_enabled?: boolean | null
          call_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id?: string | null
          video_enabled?: boolean | null
        }
        Update: {
          audio_enabled?: boolean | null
          call_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          user_id?: string | null
          video_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "missed_calls_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      call_recordings: {
        Row: {
          call_id: string
          duration_seconds: number | null
          expires_at: string | null
          file_size_bytes: number | null
          id: string
          recorded_at: string | null
          recording_url: string
          user_id: string
        }
        Insert: {
          call_id: string
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string | null
          recording_url: string
          user_id: string
        }
        Update: {
          call_id?: string
          duration_seconds?: number | null
          expires_at?: string | null
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string | null
          recording_url?: string
          user_id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          average_bitrate: number | null
          call_type: string
          caller_avatar: string | null
          caller_id: string
          caller_name: string | null
          caller_phone: string | null
          connection_quality: string | null
          conversation_id: string
          created_at: string | null
          duration: number | null
          ended_at: string | null
          id: string
          is_group: boolean | null
          missed: boolean | null
          packet_loss_percentage: number | null
          participants: Json | null
          quality_metrics: Json | null
          quality_rating: number | null
          receiver_avatar: string | null
          receiver_id: string | null
          receiver_name: string | null
          receiver_phone: string | null
          reconnection_count: number | null
          started_at: string | null
          status: string | null
          total_participants: number | null
          webrtc_state: string | null
        }
        Insert: {
          average_bitrate?: number | null
          call_type: string
          caller_avatar?: string | null
          caller_id: string
          caller_name?: string | null
          caller_phone?: string | null
          connection_quality?: string | null
          conversation_id: string
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          id?: string
          is_group?: boolean | null
          missed?: boolean | null
          packet_loss_percentage?: number | null
          participants?: Json | null
          quality_metrics?: Json | null
          quality_rating?: number | null
          receiver_avatar?: string | null
          receiver_id?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          reconnection_count?: number | null
          started_at?: string | null
          status?: string | null
          total_participants?: number | null
          webrtc_state?: string | null
        }
        Update: {
          average_bitrate?: number | null
          call_type?: string
          caller_avatar?: string | null
          caller_id?: string
          caller_name?: string | null
          caller_phone?: string | null
          connection_quality?: string | null
          conversation_id?: string
          created_at?: string | null
          duration?: number | null
          ended_at?: string | null
          id?: string
          is_group?: boolean | null
          missed?: boolean | null
          packet_loss_percentage?: number | null
          participants?: Json | null
          quality_metrics?: Json | null
          quality_rating?: number | null
          receiver_avatar?: string | null
          receiver_id?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          reconnection_count?: number | null
          started_at?: string | null
          status?: string | null
          total_participants?: number | null
          webrtc_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_alerts: {
        Row: {
          alert_type: string
          caregiver_user_id: string
          created_at: string | null
          family_member_id: string
          id: string
          is_actioned: boolean | null
          is_read: boolean | null
          message: string | null
          severity: string | null
          title: string
        }
        Insert: {
          alert_type: string
          caregiver_user_id: string
          created_at?: string | null
          family_member_id: string
          id?: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          title: string
        }
        Update: {
          alert_type?: string
          caregiver_user_id?: string
          created_at?: string | null
          family_member_id?: string
          id?: string
          is_actioned?: boolean | null
          is_read?: boolean | null
          message?: string | null
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_alerts_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          current_progress: number | null
          id: string
          joined_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "health_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participations: {
        Row: {
          challenge_id: string | null
          coins_awarded: number | null
          completed: boolean | null
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          coins_awarded?: number | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          coins_awarded?: number | null
          completed?: boolean | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "fame_cam_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "fame_cam_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_brand_triggers: {
        Row: {
          brand_id: string | null
          created_at: string | null
          current_daily_count: number | null
          id: string
          last_reset_date: string | null
          max_daily_triggers: number | null
          response_asset_url: string | null
          response_type: string | null
          trigger_keywords: string[]
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          current_daily_count?: number | null
          id?: string
          last_reset_date?: string | null
          max_daily_triggers?: number | null
          response_asset_url?: string | null
          response_type?: string | null
          trigger_keywords: string[]
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          current_daily_count?: number | null
          id?: string
          last_reset_date?: string | null
          max_daily_triggers?: number | null
          response_asset_url?: string | null
          response_type?: string | null
          trigger_keywords?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "chat_brand_triggers_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_api_usage: {
        Row: {
          api_name: string
          created_at: string | null
          daily_limit: number | null
          date: string | null
          id: string
          request_count: number | null
        }
        Insert: {
          api_name: string
          created_at?: string | null
          daily_limit?: number | null
          date?: string | null
          id?: string
          request_count?: number | null
        }
        Update: {
          api_name?: string
          created_at?: string | null
          daily_limit?: number | null
          date?: string | null
          id?: string
          request_count?: number | null
        }
        Relationships: []
      }
      chatr_badges: {
        Row: {
          badge_type: string
          coin_reward: number | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          badge_type: string
          coin_reward?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requirement_type: string
          requirement_value: number
        }
        Update: {
          badge_type?: string
          coin_reward?: number | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      chatr_business_ad_rewards: {
        Row: {
          ad_spend_amount: number
          business_id: string
          coins_earned: number
          commission_percentage: number | null
          created_at: string
          id: string
          paid_at: string | null
          payment_status: string | null
          referrer_id: string | null
        }
        Insert: {
          ad_spend_amount: number
          business_id: string
          coins_earned: number
          commission_percentage?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_status?: string | null
          referrer_id?: string | null
        }
        Update: {
          ad_spend_amount?: number
          business_id?: string
          coins_earned?: number
          commission_percentage?: number | null
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_status?: string | null
          referrer_id?: string | null
        }
        Relationships: []
      }
      chatr_coin_balances: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_login_date: string | null
          lifetime_earned: number
          lifetime_spent: number
          longest_streak: number
          total_coins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          lifetime_earned?: number
          lifetime_spent?: number
          longest_streak?: number
          total_coins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          lifetime_earned?: number
          lifetime_spent?: number
          longest_streak?: number
          total_coins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_coin_rewards: {
        Row: {
          action_type: string
          coin_amount: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          max_per_day: number | null
          max_total: number | null
          rupee_value: number
          updated_at: string
        }
        Insert: {
          action_type: string
          coin_amount: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_total?: number | null
          rupee_value: number
          updated_at?: string
        }
        Update: {
          action_type?: string
          coin_amount?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_total?: number | null
          rupee_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      chatr_coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          metadata: Json | null
          reference_id: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_creator_rewards: {
        Row: {
          coins_earned: number | null
          content_type: string
          created_at: string
          engagement_score: number | null
          id: string
          period_end: string
          period_start: string
          revenue_share: number | null
          user_id: string
        }
        Insert: {
          coins_earned?: number | null
          content_type: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          period_end: string
          period_start: string
          revenue_share?: number | null
          user_id: string
        }
        Update: {
          coins_earned?: number | null
          content_type?: string
          created_at?: string
          engagement_score?: number | null
          id?: string
          period_end?: string
          period_start?: string
          revenue_share?: number | null
          user_id?: string
        }
        Relationships: []
      }
      chatr_deals: {
        Row: {
          category: string
          coupon_code: string | null
          created_at: string | null
          current_redemptions: number | null
          deal_price: number | null
          description: string | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          max_redemptions: number | null
          merchant_id: string | null
          original_price: number | null
          starts_at: string | null
          terms_conditions: string | null
          title: string
        }
        Insert: {
          category: string
          coupon_code?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          deal_price?: number | null
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_redemptions?: number | null
          merchant_id?: string | null
          original_price?: number | null
          starts_at?: string | null
          terms_conditions?: string | null
          title: string
        }
        Update: {
          category?: string
          coupon_code?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          deal_price?: number | null
          description?: string | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_redemptions?: number | null
          merchant_id?: string | null
          original_price?: number | null
          starts_at?: string | null
          terms_conditions?: string | null
          title?: string
        }
        Relationships: []
      }
      chatr_food_orders: {
        Row: {
          created_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_instructions: string | null
          id: string
          items: Json
          payment_method: string | null
          payment_status: string | null
          restaurant_id: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          id?: string
          items: Json
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_instructions?: string | null
          id?: string
          items?: Json
          payment_method?: string | null
          payment_status?: string | null
          restaurant_id?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatr_food_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "chatr_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_healthcare: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          available_days: string[] | null
          city: string | null
          closing_time: string | null
          consultation_fee: number | null
          created_at: string | null
          description: string | null
          email: string | null
          gallery_images: string[] | null
          id: string
          image_url: string | null
          insurance_providers: string[] | null
          is_active: boolean | null
          is_mental_health_provider: boolean | null
          is_verified: boolean | null
          languages: string[] | null
          latitude: number | null
          longitude: number | null
          mental_health_specialties: string[] | null
          name: string
          offers_teletherapy: boolean | null
          opening_time: string | null
          owner_id: string | null
          phone: string | null
          provider_type: string
          rating_average: number | null
          rating_count: number | null
          specialty: string | null
          therapy_modes: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          available_days?: string[] | null
          city?: string | null
          closing_time?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          insurance_providers?: string[] | null
          is_active?: boolean | null
          is_mental_health_provider?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          longitude?: number | null
          mental_health_specialties?: string[] | null
          name: string
          offers_teletherapy?: boolean | null
          opening_time?: string | null
          owner_id?: string | null
          phone?: string | null
          provider_type: string
          rating_average?: number | null
          rating_count?: number | null
          specialty?: string | null
          therapy_modes?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          available_days?: string[] | null
          city?: string | null
          closing_time?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          insurance_providers?: string[] | null
          is_active?: boolean | null
          is_mental_health_provider?: boolean | null
          is_verified?: boolean | null
          languages?: string[] | null
          latitude?: number | null
          longitude?: number | null
          mental_health_specialties?: string[] | null
          name?: string
          offers_teletherapy?: boolean | null
          opening_time?: string | null
          owner_id?: string | null
          phone?: string | null
          provider_type?: string
          rating_average?: number | null
          rating_count?: number | null
          specialty?: string | null
          therapy_modes?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      chatr_healthcare_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string | null
          id: string
          notes: string | null
          provider_id: string | null
          reason: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          provider_id?: string | null
          reason?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatr_healthcare_appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "chatr_healthcare"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string | null
          id: string
          job_id: string | null
          resume_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cover_letter?: string | null
          created_at?: string | null
          id?: string
          job_id?: string | null
          resume_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatr_job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "chatr_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_jobs: {
        Row: {
          applications_count: number | null
          category: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          employer_id: string | null
          experience_years: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          job_type: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          salary_max: number | null
          salary_min: number | null
          salary_type: string | null
          skills: string[] | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          applications_count?: number | null
          category?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          employer_id?: string | null
          experience_years?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          skills?: string[] | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          applications_count?: number | null
          category?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          employer_id?: string | null
          experience_years?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          job_type?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          skills?: string[] | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: []
      }
      chatr_leaderboards: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          leaderboard_type: string
          metadata: Json | null
          period: string
          rank: number | null
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          leaderboard_type: string
          metadata?: Json | null
          period?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          leaderboard_type?: string
          metadata?: Json | null
          period?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_login_streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          streak_rewards_claimed: number | null
          total_logins: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_rewards_claimed?: number | null
          total_logins?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          streak_rewards_claimed?: number | null
          total_logins?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_spicy: boolean | null
          is_vegan: boolean | null
          is_vegetarian: boolean | null
          name: string
          preparation_time: number | null
          price: number
          restaurant_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_spicy?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          restaurant_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_spicy?: boolean | null
          is_vegan?: boolean | null
          is_vegetarian?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatr_menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "chatr_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_os_apps: {
        Row: {
          app_name: string
          auto_update_enabled: boolean | null
          battery_drain_rate: number | null
          cpu_usage_avg: number | null
          created_at: string
          data_usage_total: number | null
          id: string
          install_size: number | null
          is_system_app: boolean | null
          last_opened_at: string | null
          lifecycle_state: string
          memory_usage_peak: number | null
          package_name: string
          runtime_permissions: Json | null
          storage_quota: number | null
          storage_used: number | null
          updated_at: string
          user_id: string
          version: string
        }
        Insert: {
          app_name: string
          auto_update_enabled?: boolean | null
          battery_drain_rate?: number | null
          cpu_usage_avg?: number | null
          created_at?: string
          data_usage_total?: number | null
          id?: string
          install_size?: number | null
          is_system_app?: boolean | null
          last_opened_at?: string | null
          lifecycle_state?: string
          memory_usage_peak?: number | null
          package_name: string
          runtime_permissions?: Json | null
          storage_quota?: number | null
          storage_used?: number | null
          updated_at?: string
          user_id: string
          version?: string
        }
        Update: {
          app_name?: string
          auto_update_enabled?: boolean | null
          battery_drain_rate?: number | null
          cpu_usage_avg?: number | null
          created_at?: string
          data_usage_total?: number | null
          id?: string
          install_size?: number | null
          is_system_app?: boolean | null
          last_opened_at?: string | null
          lifecycle_state?: string
          memory_usage_peak?: number | null
          package_name?: string
          runtime_permissions?: Json | null
          storage_quota?: number | null
          storage_used?: number | null
          updated_at?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      chatr_payment_methods: {
        Row: {
          card_last_4: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          metadata: Json | null
          method_type: string
          provider: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          card_last_4?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type: string
          provider?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          card_last_4?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          metadata?: Json | null
          method_type?: string
          provider?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatr_platform_fees: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          platform_fee_amount: number
          platform_fee_percent: number | null
          processing_fee_amount: number
          processing_fee_percent: number | null
          seller_id: string | null
          seller_payout: number
          status: string | null
          total_fee: number
          transaction_amount: number
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          platform_fee_amount: number
          platform_fee_percent?: number | null
          processing_fee_amount: number
          processing_fee_percent?: number | null
          seller_id?: string | null
          seller_payout: number
          status?: string | null
          total_fee: number
          transaction_amount: number
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          platform_fee_amount?: number
          platform_fee_percent?: number | null
          processing_fee_amount?: number
          processing_fee_percent?: number | null
          seller_id?: string | null
          seller_payout?: number
          status?: string | null
          total_fee?: number
          transaction_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "chatr_platform_fees_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatr_platform_fees_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_bookings: {
        Row: {
          booking_date: string
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          customer_address: string | null
          customer_name: string
          customer_phone: string
          id: string
          payment_method: string | null
          payment_status: string
          payment_transaction_id: string | null
          platform_fee: number | null
          seller_id: string
          service_id: string
          special_instructions: string | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          platform_fee?: number | null
          seller_id: string
          service_id: string
          special_instructions?: string | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_address?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          payment_transaction_id?: string | null
          platform_fee?: number | null
          seller_id?: string
          service_id?: string
          special_instructions?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_plus_bookings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatr_plus_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_services"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_categories: {
        Row: {
          color_scheme: string | null
          created_at: string
          description: string | null
          display_order: number | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          slug: string
        }
        Insert: {
          color_scheme?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          slug: string
        }
        Update: {
          color_scheme?: string | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_plus_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_reviews: {
        Row: {
          booking_id: string
          created_at: string
          helpful_count: number | null
          id: string
          images: string[] | null
          is_verified: boolean | null
          rating: number
          review_text: string | null
          seller_id: string
          service_id: string
          user_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          rating: number
          review_text?: string | null
          seller_id: string
          service_id: string
          user_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          is_verified?: boolean | null
          rating?: number
          review_text?: string | null
          seller_id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_plus_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "chatr_plus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatr_plus_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatr_plus_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_services"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_sellers: {
        Row: {
          aadhar_number: string | null
          address: string | null
          approval_notes: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          business_name: string
          business_type: string
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          kyc_documents: Json | null
          kyc_status: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          pan_number: string | null
          phone_number: string | null
          pincode: string | null
          rating_average: number | null
          rating_count: number | null
          rejection_reason: string | null
          state: string | null
          subscription_amount: number
          subscription_expires_at: string | null
          subscription_plan: string
          subscription_started_at: string | null
          subscription_status: string
          total_bookings: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhar_number?: string | null
          address?: string | null
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_name: string
          business_type: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          pan_number?: string | null
          phone_number?: string | null
          pincode?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          state?: string | null
          subscription_amount?: number
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          subscription_status?: string
          total_bookings?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhar_number?: string | null
          address?: string | null
          approval_notes?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          kyc_documents?: Json | null
          kyc_status?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          pan_number?: string | null
          phone_number?: string | null
          pincode?: string | null
          rating_average?: number | null
          rating_count?: number | null
          rejection_reason?: string | null
          state?: string | null
          subscription_amount?: number
          subscription_expires_at?: string | null
          subscription_plan?: string
          subscription_started_at?: string | null
          subscription_status?: string
          total_bookings?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_plus_services: {
        Row: {
          availability: Json | null
          booking_count: number | null
          category_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          metadata: Json | null
          price: number | null
          price_type: string
          pricing_tiers: Json | null
          rating_average: number | null
          rating_count: number | null
          seller_id: string
          service_area: string | null
          service_name: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          availability?: Json | null
          booking_count?: number | null
          category_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          price?: number | null
          price_type?: string
          pricing_tiers?: Json | null
          rating_average?: number | null
          rating_count?: number | null
          seller_id: string
          service_area?: string | null
          service_name: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          availability?: Json | null
          booking_count?: number | null
          category_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          metadata?: Json | null
          price?: number | null
          price_type?: string
          pricing_tiers?: Json | null
          rating_average?: number | null
          rating_count?: number | null
          seller_id?: string
          service_area?: string | null
          service_name?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_plus_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatr_plus_services_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          payment_gateway_ref: string | null
          payment_method: string | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway_ref?: string | null
          payment_method?: string | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway_ref?: string | null
          payment_method?: string | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_plus_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_plus_user_subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          created_at: string
          expires_at: string | null
          id: string
          plan_type: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_plus_wallet: {
        Row: {
          balance: number
          cashback_earned: number
          created_at: string
          id: string
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          cashback_earned?: number
          created_at?: string
          id?: string
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          cashback_earned?: number
          created_at?: string
          id?: string
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          qr_code_url: string | null
          total_rewards: number | null
          total_uses: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          total_rewards?: number | null
          total_uses?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          total_rewards?: number | null
          total_uses?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_referral_network: {
        Row: {
          created_at: string
          id: string
          level: number
          root_user_id: string
          total_coins_from_network: number | null
          total_network_size: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: number
          root_user_id: string
          total_coins_from_network?: number | null
          total_network_size?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          root_user_id?: string
          total_coins_from_network?: number | null
          total_network_size?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_referrals: {
        Row: {
          activated_at: string | null
          coins_earned: number | null
          created_at: string
          id: string
          level: number
          referral_code: string
          referred_user_id: string
          referrer_id: string
          rewarded_at: string | null
          status: string
        }
        Insert: {
          activated_at?: string | null
          coins_earned?: number | null
          created_at?: string
          id?: string
          level?: number
          referral_code: string
          referred_user_id: string
          referrer_id: string
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          activated_at?: string | null
          coins_earned?: number | null
          created_at?: string
          id?: string
          level?: number
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          rewarded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      chatr_restaurants: {
        Row: {
          address: string | null
          city: string | null
          closing_time: string | null
          created_at: string | null
          cuisine_type: string[] | null
          delivery_available: boolean | null
          delivery_fee: number | null
          description: string | null
          gallery_images: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          min_order_amount: number | null
          name: string
          opening_time: string | null
          owner_id: string | null
          phone: string | null
          price_range: string | null
          rating_average: number | null
          rating_count: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string | null
          cuisine_type?: string[] | null
          delivery_available?: boolean | null
          delivery_fee?: number | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          min_order_amount?: number | null
          name: string
          opening_time?: string | null
          owner_id?: string | null
          phone?: string | null
          price_range?: string | null
          rating_average?: number | null
          rating_count?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          closing_time?: string | null
          created_at?: string | null
          cuisine_type?: string[] | null
          delivery_available?: boolean | null
          delivery_fee?: number | null
          description?: string | null
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          min_order_amount?: number | null
          name?: string
          opening_time?: string | null
          owner_id?: string | null
          phone?: string | null
          price_range?: string | null
          rating_average?: number | null
          rating_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chatr_search_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          hit_count: number | null
          id: string
          query: string
          query_hash: string
          results: Json | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          query: string
          query_hash: string
          results?: Json | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          hit_count?: number | null
          id?: string
          query?: string
          query_hash?: string
          results?: Json | null
          source?: string | null
        }
        Relationships: []
      }
      chatr_search_history: {
        Row: {
          category: string | null
          clicked_result_id: string | null
          clicked_result_type: string | null
          created_at: string
          id: string
          location: Json | null
          results_count: number | null
          search_intent: string | null
          search_query: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          id?: string
          location?: Json | null
          results_count?: number | null
          search_intent?: string | null
          search_query: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string
          id?: string
          location?: Json | null
          results_count?: number | null
          search_intent?: string | null
          search_query?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chatr_seller_subscription_plans: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          end_date: string | null
          features: Json | null
          id: string
          monthly_price: number
          plan_tier: string
          seller_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          features?: Json | null
          id?: string
          monthly_price: number
          plan_tier?: string
          seller_id: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          features?: Json | null
          id?: string
          monthly_price?: number
          plan_tier?: string
          seller_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_seller_subscription_plans_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_shares: {
        Row: {
          clicks: number | null
          coins_earned: number | null
          conversions: number | null
          created_at: string
          id: string
          platform: string | null
          referral_code: string | null
          share_type: string
          shared_item_id: string | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          coins_earned?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          platform?: string | null
          referral_code?: string | null
          share_type: string
          shared_item_id?: string | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          coins_earned?: number | null
          conversions?: number | null
          created_at?: string
          id?: string
          platform?: string | null
          referral_code?: string | null
          share_type?: string
          shared_item_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chatr_subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          monthly_price: number
          plan_name: string
          plan_type: string
          target_audience: string | null
          yearly_price: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price: number
          plan_name: string
          plan_type: string
          target_audience?: string | null
          yearly_price?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          plan_name?: string
          plan_type?: string
          target_audience?: string | null
          yearly_price?: number | null
        }
        Relationships: []
      }
      chatr_user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "chatr_badges"
            referencedColumns: ["id"]
          },
        ]
      }
      chatr_user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          end_date: string | null
          id: string
          payment_method: string | null
          plan_type: string
          price: number
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string
          price?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string
          price?: number
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_wallet: {
        Row: {
          balance: number
          cashback_balance: number
          created_at: string
          currency: string | null
          id: string
          referral_earnings: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          cashback_balance?: number
          created_at?: string
          currency?: string | null
          id?: string
          referral_earnings?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          cashback_balance?: number
          created_at?: string
          currency?: string | null
          id?: string
          referral_earnings?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chatr_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatr_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "chatr_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      chronic_vitals: {
        Row: {
          created_at: string | null
          family_member_id: string | null
          id: string
          notes: string | null
          reading_time: string | null
          recorded_at: string | null
          source: string | null
          unit: string | null
          user_id: string
          value: number
          vital_type: string
        }
        Insert: {
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reading_time?: string | null
          recorded_at?: string | null
          source?: string | null
          unit?: string | null
          user_id: string
          value: number
          vital_type: string
        }
        Update: {
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          notes?: string | null
          reading_time?: string | null
          recorded_at?: string | null
          source?: string | null
          unit?: string | null
          user_id?: string
          value?: number
          vital_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chronic_vitals_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      click_logs: {
        Row: {
          created_at: string | null
          id: string
          result_rank: number
          result_type: string | null
          result_url: string
          search_id: string | null
          session_id: string
          time_to_click_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          result_rank: number
          result_type?: string | null
          result_url: string
          search_id?: string | null
          session_id: string
          time_to_click_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          result_rank?: number
          result_type?: string | null
          result_url?: string
          search_id?: string | null
          session_id?: string
          time_to_click_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "click_logs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "search_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_payments: {
        Row: {
          amount: number
          app_id: string | null
          created_at: string | null
          description: string | null
          id: string
          merchant_id: string | null
          metadata: Json | null
          payment_type: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          app_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          payment_type: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          app_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          merchant_id?: string | null
          metadata?: Json | null
          payment_type?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_payments_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      community_events_db: {
        Row: {
          address: string
          city: string
          created_at: string | null
          current_participants: number | null
          end_date: string | null
          entry_fee: number | null
          event_date: string
          event_description: string
          event_title: string
          event_type: string
          id: string
          is_featured: boolean | null
          is_free: boolean | null
          latitude: number | null
          longitude: number | null
          max_participants: number | null
          organizer_id: string
          organizer_name: string
          pincode: string | null
          state: string
          updated_at: string | null
          venue_name: string | null
          verified: boolean | null
          view_count: number | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          current_participants?: number | null
          end_date?: string | null
          entry_fee?: number | null
          event_date: string
          event_description: string
          event_title: string
          event_type: string
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          organizer_id: string
          organizer_name: string
          pincode?: string | null
          state: string
          updated_at?: string | null
          venue_name?: string | null
          verified?: boolean | null
          view_count?: number | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          current_participants?: number | null
          end_date?: string | null
          entry_fee?: number | null
          event_date?: string
          event_description?: string
          event_title?: string
          event_type?: string
          id?: string
          is_featured?: boolean | null
          is_free?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_participants?: number | null
          organizer_id?: string
          organizer_name?: string
          pincode?: string | null
          state?: string
          updated_at?: string | null
          venue_name?: string | null
          verified?: boolean | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_events_db_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string | null
          id: string
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_invites: {
        Row: {
          clicked_at: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          id: string
          invite_code: string
          invite_method: string
          inviter_id: string
          joined_at: string | null
          joined_user_id: string | null
          reward_given: boolean | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          clicked_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          id?: string
          invite_code: string
          invite_method: string
          inviter_id: string
          joined_at?: string | null
          joined_user_id?: string | null
          reward_given?: boolean | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          clicked_at?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          id?: string
          invite_code?: string
          invite_method?: string
          inviter_id?: string
          joined_at?: string | null
          joined_user_id?: string | null
          reward_given?: boolean | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          response: string | null
          status: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          response?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          response?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          contact_name: string | null
          contact_phone: string
          contact_phone_hash: string | null
          contact_user_id: string | null
          created_at: string | null
          id: string
          is_registered: boolean | null
          user_id: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          contact_phone_hash?: string | null
          contact_user_id?: string | null
          created_at?: string | null
          id?: string
          is_registered?: boolean | null
          user_id: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          contact_phone_hash?: string | null
          contact_user_id?: string | null
          created_at?: string | null
          id?: string
          is_registered?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      content_flags: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          flagged_by: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          flagged_by: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          flagged_by?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_flags_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string | null
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_id: string | null
          category: string | null
          community_description: string | null
          created_at: string | null
          created_by: string | null
          custom_wallpaper: string | null
          disappearing_messages_duration: number | null
          group_description: string | null
          group_icon_url: string | null
          group_name: string | null
          id: string
          is_community: boolean | null
          is_group: boolean | null
          is_muted: boolean | null
          is_public: boolean | null
          member_count: number | null
          updated_at: string | null
        }
        Insert: {
          admin_id?: string | null
          category?: string | null
          community_description?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_wallpaper?: string | null
          disappearing_messages_duration?: number | null
          group_description?: string | null
          group_icon_url?: string | null
          group_name?: string | null
          id?: string
          is_community?: boolean | null
          is_group?: boolean | null
          is_muted?: boolean | null
          is_public?: boolean | null
          member_count?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string | null
          category?: string | null
          community_description?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_wallpaper?: string | null
          disappearing_messages_duration?: number | null
          group_description?: string | null
          group_icon_url?: string | null
          group_name?: string | null
          id?: string
          is_community?: boolean | null
          is_group?: boolean | null
          is_muted?: boolean | null
          is_public?: boolean | null
          member_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          activity_type: string
          assigned_to: string | null
          business_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string
          outcome: string | null
          scheduled_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          activity_type: string
          assigned_to?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id: string
          outcome?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          activity_type?: string
          assigned_to?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string
          outcome?: string | null
          scheduled_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          business_id: string
          company: string | null
          conversation_id: string | null
          created_at: string | null
          currency: string | null
          custom_fields: Json | null
          customer_id: string | null
          deal_value: number | null
          email: string | null
          expected_close_date: string | null
          id: string
          last_contacted_at: string | null
          name: string
          notes: string | null
          phone: string | null
          priority: string | null
          probability: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id: string
          company?: string | null
          conversation_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          deal_value?: number | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string
          company?: string | null
          conversation_id?: string | null
          created_at?: string | null
          currency?: string | null
          custom_fields?: Json | null
          customer_id?: string | null
          deal_value?: number | null
          email?: string | null
          expected_close_date?: string | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: string | null
          probability?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          stages: Json
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          stages?: Json
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          stages?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_merchant_details: {
        Row: {
          business_category: string | null
          created_at: string | null
          id: string
          max_active_deals: number | null
          social_media: Json | null
          terms_accepted: boolean | null
          updated_at: string | null
          vendor_id: string
          website_url: string | null
        }
        Insert: {
          business_category?: string | null
          created_at?: string | null
          id?: string
          max_active_deals?: number | null
          social_media?: Json | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          vendor_id: string
          website_url?: string | null
        }
        Update: {
          business_category?: string | null
          created_at?: string | null
          id?: string
          max_active_deals?: number | null
          social_media?: Json | null
          terms_accepted?: boolean | null
          updated_at?: string | null
          vendor_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_merchant_details_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_redemptions: {
        Row: {
          amount_saved: number | null
          claimed_at: string | null
          created_at: string | null
          deal_id: string
          expired_at: string | null
          id: string
          qr_code: string | null
          redeemed_at: string | null
          redemption_code: string | null
          status: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          amount_saved?: number | null
          claimed_at?: string | null
          created_at?: string | null
          deal_id: string
          expired_at?: string | null
          id?: string
          qr_code?: string | null
          redeemed_at?: string | null
          redemption_code?: string | null
          status?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          amount_saved?: number | null
          claimed_at?: string | null
          created_at?: string | null
          deal_id?: string
          expired_at?: string | null
          id?: string
          qr_code?: string | null
          redeemed_at?: string | null
          redemption_code?: string | null
          status?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_redemptions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "local_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      developer_profiles: {
        Row: {
          api_key: string | null
          bio: string | null
          company_name: string | null
          created_at: string | null
          developer_name: string
          id: string
          is_verified: boolean | null
          portal_enabled: boolean | null
          total_apps: number | null
          total_downloads: number | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          api_key?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          developer_name: string
          id?: string
          is_verified?: boolean | null
          portal_enabled?: boolean | null
          total_apps?: number | null
          total_downloads?: number | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          api_key?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          developer_name?: string
          id?: string
          is_verified?: boolean | null
          portal_enabled?: boolean | null
          total_apps?: number | null
          total_downloads?: number | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      device_sessions: {
        Row: {
          biometric_enabled: boolean | null
          created_at: string | null
          device_fingerprint: string | null
          device_name: string
          device_type: string
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active: string | null
          pin_hash: string | null
          qr_token: string | null
          qr_token_hash: string | null
          quick_login_enabled: boolean | null
          session_token: string
          session_token_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          biometric_enabled?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name: string
          device_type: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          pin_hash?: string | null
          qr_token?: string | null
          qr_token_hash?: string | null
          quick_login_enabled?: boolean | null
          session_token: string
          session_token_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          biometric_enabled?: boolean | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string
          device_type?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active?: string | null
          pin_hash?: string | null
          qr_token?: string | null
          qr_token_hash?: string | null
          quick_login_enabled?: boolean | null
          session_token?: string
          session_token_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          device_token: string
          id: string
          last_used_at: string | null
          platform: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_token: string
          id?: string
          last_used_at?: string | null
          platform: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_token?: string
          id?: string
          last_used_at?: string | null
          platform?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_applications: {
        Row: {
          bio: string | null
          certifications: string[] | null
          consultation_fee: number | null
          created_at: string
          email: string
          experience_years: number
          full_name: string
          hospital_affiliation: string | null
          id: string
          phone: string
          preferred_language: string | null
          qualification: string
          registration_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          consultation_fee?: number | null
          created_at?: string
          email: string
          experience_years: number
          full_name: string
          hospital_affiliation?: string | null
          id?: string
          phone: string
          preferred_language?: string | null
          qualification: string
          registration_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          consultation_fee?: number | null
          created_at?: string
          email?: string
          experience_years?: number
          full_name?: string
          hospital_affiliation?: string | null
          id?: string
          phone?: string
          preferred_language?: string | null
          qualification?: string
          registration_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone_number: string
          relationship: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone_number: string
          relationship?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone_number?: string
          relationship?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emotion_circles: {
        Row: {
          active_until: string | null
          created_at: string | null
          current_emotion: string
          id: string
          intensity: number | null
          looking_for_connection: boolean | null
          user_id: string
        }
        Insert: {
          active_until?: string | null
          created_at?: string | null
          current_emotion: string
          id?: string
          intensity?: number | null
          looking_for_connection?: boolean | null
          user_id: string
        }
        Update: {
          active_until?: string | null
          created_at?: string | null
          current_emotion?: string
          id?: string
          intensity?: number | null
          looking_for_connection?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      emotionsync_challenges: {
        Row: {
          coins_earned: number | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string | null
          detected_emotion: string | null
          difficulty: string
          id: string
          input_type: string
          level: number
          success: boolean | null
          target_emotion: string
          time_taken_ms: number | null
          user_id: string
          user_input: string | null
        }
        Insert: {
          coins_earned?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detected_emotion?: string | null
          difficulty: string
          id?: string
          input_type: string
          level: number
          success?: boolean | null
          target_emotion: string
          time_taken_ms?: number | null
          user_id: string
          user_input?: string | null
        }
        Update: {
          coins_earned?: number | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          detected_emotion?: string | null
          difficulty?: string
          id?: string
          input_type?: string
          level?: number
          success?: boolean | null
          target_emotion?: string
          time_taken_ms?: number | null
          user_id?: string
          user_input?: string | null
        }
        Relationships: []
      }
      emotionsync_progress: {
        Row: {
          accuracy_rate: number | null
          best_streak: number | null
          created_at: string | null
          current_level: number | null
          id: string
          total_challenges: number | null
          unlocked_emotions: string[] | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          accuracy_rate?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          total_challenges?: number | null
          unlocked_emotions?: string[] | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          accuracy_rate?: number | null
          best_streak?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          total_challenges?: number | null
          unlocked_emotions?: string[] | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      encrypted_messages: {
        Row: {
          created_at: string | null
          encrypted_content: string
          id: string
          iv: string
          key_id: string | null
          message_id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          encrypted_content: string
          id?: string
          iv: string
          key_id?: string | null
          message_id: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          encrypted_content?: string
          id?: string
          iv?: string
          key_id?: string | null
          message_id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          device_id: string
          expires_at: string | null
          id: string
          public_key: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          expires_at?: string | null
          id?: string
          public_key: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          expires_at?: string | null
          id?: string
          public_key?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encryption_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_pulse_progress: {
        Row: {
          created_at: string | null
          current_level: number | null
          high_score: number | null
          id: string
          perfect_hits: number | null
          total_pulses: number | null
          unlocked_themes: string[] | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          high_score?: number | null
          id?: string
          perfect_hits?: number | null
          total_pulses?: number | null
          unlocked_themes?: string[] | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          high_score?: number | null
          id?: string
          perfect_hits?: number | null
          total_pulses?: number | null
          unlocked_themes?: string[] | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      energy_pulse_sessions: {
        Row: {
          bpm: number
          coins_earned: number | null
          combo_max: number | null
          completed: boolean | null
          created_at: string | null
          duration_seconds: number
          good_hits: number | null
          id: string
          level: number
          missed: number | null
          perfect_hits: number | null
          score: number | null
          total_beats: number
          user_id: string
        }
        Insert: {
          bpm: number
          coins_earned?: number | null
          combo_max?: number | null
          completed?: boolean | null
          created_at?: string | null
          duration_seconds: number
          good_hits?: number | null
          id?: string
          level: number
          missed?: number | null
          perfect_hits?: number | null
          score?: number | null
          total_beats: number
          user_id: string
        }
        Update: {
          bpm?: number
          coins_earned?: number | null
          combo_max?: number | null
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number
          good_hits?: number | null
          id?: string
          level?: number
          missed?: number | null
          perfect_hits?: number | null
          score?: number | null
          total_beats?: number
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number
          expert_id: string | null
          expert_name: string
          expert_title: string
          id: string
          is_live: boolean | null
          max_participants: number | null
          participant_count: number | null
          recording_url: string | null
          session_date: string
          session_title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          expert_id?: string | null
          expert_name: string
          expert_title: string
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          recording_url?: string | null
          session_date: string
          session_title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          expert_id?: string | null
          expert_name?: string
          expert_title?: string
          id?: string
          is_live?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          recording_url?: string | null
          session_date?: string
          session_title?: string
        }
        Relationships: []
      }
      fame_achievements: {
        Row: {
          badge_emoji: string | null
          coin_reward: number | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          requirement_type: string | null
          requirement_value: number | null
        }
        Insert: {
          badge_emoji?: string | null
          coin_reward?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Update: {
          badge_emoji?: string | null
          coin_reward?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          requirement_type?: string | null
          requirement_value?: number | null
        }
        Relationships: []
      }
      fame_cam_challenges: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration_seconds: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          participants_count: number | null
          reward_coins: number | null
          title: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          participants_count?: number | null
          reward_coins?: number | null
          title: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          participants_count?: number | null
          reward_coins?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fame_cam_challenges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "trending_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fame_cam_posts: {
        Row: {
          actual_engagement: number | null
          ai_virality_score: number | null
          caption: string | null
          category_id: string | null
          coins_earned: number | null
          created_at: string | null
          hashtags: string[] | null
          id: string
          is_viral: boolean | null
          likes_count: number | null
          media_type: string
          media_url: string
          posted_to_external: boolean | null
          shares_count: number | null
          updated_at: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          actual_engagement?: number | null
          ai_virality_score?: number | null
          caption?: string | null
          category_id?: string | null
          coins_earned?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_viral?: boolean | null
          likes_count?: number | null
          media_type: string
          media_url: string
          posted_to_external?: boolean | null
          shares_count?: number | null
          updated_at?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          actual_engagement?: number | null
          ai_virality_score?: number | null
          caption?: string | null
          category_id?: string | null
          coins_earned?: number | null
          created_at?: string | null
          hashtags?: string[] | null
          id?: string
          is_viral?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url?: string
          posted_to_external?: boolean | null
          shares_count?: number | null
          updated_at?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fame_cam_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "trending_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fame_leaderboard: {
        Row: {
          id: string
          period: string | null
          rank: number | null
          total_coins_earned: number | null
          total_fame_score: number | null
          total_posts: number | null
          total_viral_posts: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          period?: string | null
          rank?: number | null
          total_coins_earned?: number | null
          total_fame_score?: number | null
          total_posts?: number | null
          total_viral_posts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          period?: string | null
          rank?: number | null
          total_coins_earned?: number | null
          total_fame_score?: number | null
          total_posts?: number | null
          total_viral_posts?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      favorite_results: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reminder_date: string | null
          reminder_sent: boolean | null
          result_id: string | null
          tags: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          result_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reminder_date?: string | null
          reminder_sent?: boolean | null
          result_id?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorite_results_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "search_results"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      food_menu_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_vegetarian: boolean | null
          name: string
          price: number
          vendor_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_vegetarian?: boolean | null
          name: string
          price: number
          vendor_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_vegetarian?: boolean | null
          name?: string
          price?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          actual_delivery_time: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          created_at: string | null
          customer_rating: number | null
          customer_review: string | null
          delivery_address: string
          delivery_charge: number | null
          delivery_instructions: string | null
          discount: number | null
          estimated_delivery_time: string | null
          id: string
          items: Json
          order_number: string | null
          order_status: string | null
          packaging_charge: number | null
          payment_method: string | null
          payment_status: string | null
          refund_amount: number | null
          refund_status: string | null
          status: string | null
          subtotal: number | null
          taxes: number | null
          total_amount: number
          updated_at: string | null
          user_id: string
          vendor_id: string
          vendor_notes: string | null
        }
        Insert: {
          actual_delivery_time?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_rating?: number | null
          customer_review?: string | null
          delivery_address: string
          delivery_charge?: number | null
          delivery_instructions?: string | null
          discount?: number | null
          estimated_delivery_time?: string | null
          id?: string
          items: Json
          order_number?: string | null
          order_status?: string | null
          packaging_charge?: number | null
          payment_method?: string | null
          payment_status?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string | null
          subtotal?: number | null
          taxes?: number | null
          total_amount: number
          updated_at?: string | null
          user_id: string
          vendor_id: string
          vendor_notes?: string | null
        }
        Update: {
          actual_delivery_time?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          customer_rating?: number | null
          customer_review?: string | null
          delivery_address?: string
          delivery_charge?: number | null
          delivery_instructions?: string | null
          discount?: number | null
          estimated_delivery_time?: string | null
          id?: string
          items?: Json
          order_number?: string | null
          order_status?: string | null
          packaging_charge?: number | null
          payment_method?: string | null
          payment_status?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string | null
          subtotal?: number | null
          taxes?: number | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
          vendor_id?: string
          vendor_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "food_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      food_vendors: {
        Row: {
          avatar_url: string | null
          business_id: string | null
          cover_image_url: string | null
          created_at: string | null
          cuisine_type: string | null
          delivery_time_max: number | null
          delivery_time_min: number | null
          description: string | null
          id: string
          is_open: boolean | null
          min_order_amount: number | null
          name: string
          rating_average: number | null
          rating_count: number | null
        }
        Insert: {
          avatar_url?: string | null
          business_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          id?: string
          is_open?: boolean | null
          min_order_amount?: number | null
          name: string
          rating_average?: number | null
          rating_count?: number | null
        }
        Update: {
          avatar_url?: string | null
          business_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          cuisine_type?: string | null
          delivery_time_max?: number | null
          delivery_time_min?: number | null
          description?: string | null
          id?: string
          is_open?: boolean | null
          min_order_amount?: number | null
          name?: string
          rating_average?: number | null
          rating_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_vendors_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_achievements: {
        Row: {
          coin_reward: number
          created_at: string
          description: string
          game_type: string | null
          icon: string | null
          id: string
          name: string
          rarity: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          coin_reward?: number
          created_at?: string
          description: string
          game_type?: string | null
          icon?: string | null
          id?: string
          name: string
          rarity?: string
          requirement_type: string
          requirement_value?: number
          xp_reward?: number
        }
        Update: {
          coin_reward?: number
          created_at?: string
          description?: string
          game_type?: string | null
          icon?: string | null
          id?: string
          name?: string
          rarity?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      game_daily_challenges: {
        Row: {
          challenge_type: string
          coin_reward: number
          created_at: string
          description: string
          expires_at: string
          game_type: string | null
          id: string
          is_active: boolean
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          challenge_type?: string
          coin_reward?: number
          created_at?: string
          description: string
          expires_at: string
          game_type?: string | null
          id?: string
          is_active?: boolean
          target_value?: number
          title: string
          xp_reward?: number
        }
        Update: {
          challenge_type?: string
          coin_reward?: number
          created_at?: string
          description?: string
          expires_at?: string
          game_type?: string | null
          id?: string
          is_active?: boolean
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      game_leaderboards: {
        Row: {
          game_type: string
          id: string
          level: number
          recorded_at: string | null
          score: number
          user_id: string
        }
        Insert: {
          game_type: string
          id?: string
          level: number
          recorded_at?: string | null
          score: number
          user_id: string
        }
        Update: {
          game_type?: string
          id?: string
          level?: number
          recorded_at?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      game_levels: {
        Row: {
          coin_reward: number
          created_at: string | null
          description: string | null
          difficulty: string
          game_type: string
          id: string
          level_config: Json
          level_number: number
          title: string
          unlock_requirement: Json | null
          xp_reward: number
        }
        Insert: {
          coin_reward: number
          created_at?: string | null
          description?: string | null
          difficulty: string
          game_type: string
          id?: string
          level_config: Json
          level_number: number
          title: string
          unlock_requirement?: Json | null
          xp_reward: number
        }
        Update: {
          coin_reward?: number
          created_at?: string | null
          description?: string | null
          difficulty?: string
          game_type?: string
          id?: string
          level_config?: Json
          level_number?: number
          title?: string
          unlock_requirement?: Json | null
          xp_reward?: number
        }
        Relationships: []
      }
      game_user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "game_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      game_user_profiles: {
        Row: {
          achievements: Json | null
          created_at: string | null
          current_streak: number | null
          games_played: number | null
          id: string
          longest_streak: number | null
          total_coins: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          games_played?: number | null
          id?: string
          longest_streak?: number | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: Json | null
          created_at?: string | null
          current_streak?: number | null
          games_played?: number | null
          id?: string
          longest_streak?: number | null
          total_coins?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      geo_cache: {
        Row: {
          category: string
          created_at: string | null
          expires_at: string | null
          fetch_duration_ms: number | null
          id: string
          latitude: number
          longitude: number
          query: string
          radius_km: number | null
          result_count: number | null
          results: Json
          sources_used: string[] | null
        }
        Insert: {
          category: string
          created_at?: string | null
          expires_at?: string | null
          fetch_duration_ms?: number | null
          id?: string
          latitude: number
          longitude: number
          query: string
          radius_km?: number | null
          result_count?: number | null
          results?: Json
          sources_used?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string | null
          expires_at?: string | null
          fetch_duration_ms?: number | null
          id?: string
          latitude?: number
          longitude?: number
          query?: string
          radius_km?: number | null
          result_count?: number | null
          results?: Json
          sources_used?: string[] | null
        }
        Relationships: []
      }
      geofence_events: {
        Row: {
          event_type: string
          geofence_id: string
          id: string
          lat: number
          lng: number
          timestamp: string
          user_id: string
        }
        Insert: {
          event_type: string
          geofence_id: string
          id?: string
          lat: number
          lng: number
          timestamp?: string
          user_id: string
        }
        Update: {
          event_type?: string
          geofence_id?: string
          id?: string
          lat?: number
          lng?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_events_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          active: boolean | null
          center_lat: number
          center_lng: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          notification_body: string | null
          notification_title: string | null
          radius_meters: number
          trigger_on_enter: boolean | null
          trigger_on_exit: boolean | null
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          center_lat: number
          center_lng: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          notification_body?: string | null
          notification_title?: string | null
          radius_meters?: number
          trigger_on_enter?: boolean | null
          trigger_on_exit?: boolean | null
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          center_lat?: number
          center_lng?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          notification_body?: string | null
          notification_title?: string | null
          radius_meters?: number
          trigger_on_enter?: boolean | null
          trigger_on_exit?: boolean | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gmail_imported_contacts: {
        Row: {
          chatr_user_id: string | null
          email: string | null
          google_contact_id: string | null
          id: string
          imported_at: string | null
          is_chatr_user: boolean | null
          name: string | null
          phone: string | null
          photo_url: string | null
          user_id: string
        }
        Insert: {
          chatr_user_id?: string | null
          email?: string | null
          google_contact_id?: string | null
          id?: string
          imported_at?: string | null
          is_chatr_user?: boolean | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          user_id: string
        }
        Update: {
          chatr_user_id?: string | null
          email?: string | null
          google_contact_id?: string | null
          id?: string
          imported_at?: string | null
          is_chatr_user?: boolean | null
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gmail_imported_contacts_chatr_user_id_fkey"
            columns: ["chatr_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_challenge_participants: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number | null
          id: string
          joined_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number | null
          id?: string
          joined_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "health_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      health_challenges: {
        Row: {
          challenge_type: string
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          participant_count: number | null
          reward_points: number
          start_date: string
          target_value: number
        }
        Insert: {
          challenge_type: string
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          participant_count?: number | null
          reward_points: number
          start_date: string
          target_value: number
        }
        Update: {
          challenge_type?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          participant_count?: number | null
          reward_points?: number
          start_date?: string
          target_value?: number
        }
        Relationships: []
      }
      health_conditions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_hindi: string | null
          tracking_metrics: Json | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_hindi?: string | null
          tracking_metrics?: Json | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_hindi?: string | null
          tracking_metrics?: Json | null
        }
        Relationships: []
      }
      health_family_members: {
        Row: {
          alert_on_abnormal_vitals: boolean | null
          alert_on_missed_dose: boolean | null
          avatar_url: string | null
          caregiver_user_id: string
          conditions: string[] | null
          created_at: string | null
          date_of_birth: string | null
          id: string
          is_active: boolean | null
          member_name: string
          member_phone: string | null
          relationship: string
          updated_at: string | null
        }
        Insert: {
          alert_on_abnormal_vitals?: boolean | null
          alert_on_missed_dose?: boolean | null
          avatar_url?: string | null
          caregiver_user_id: string
          conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string
          is_active?: boolean | null
          member_name: string
          member_phone?: string | null
          relationship: string
          updated_at?: string | null
        }
        Update: {
          alert_on_abnormal_vitals?: boolean | null
          alert_on_missed_dose?: boolean | null
          avatar_url?: string | null
          caregiver_user_id?: string
          conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          id?: string
          is_active?: boolean | null
          member_name?: string
          member_phone?: string | null
          relationship?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      health_goals: {
        Row: {
          created_at: string
          current_value: number | null
          goal_name: string
          goal_type: string
          id: string
          notes: string | null
          start_date: string
          status: string | null
          target_date: string | null
          target_value: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          goal_name: string
          goal_type: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value: number
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          goal_name?: string
          goal_type?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string | null
          target_date?: string | null
          target_value?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_passport: {
        Row: {
          allergies: Json | null
          blood_type: string | null
          chronic_conditions: Json | null
          created_at: string | null
          current_address: string | null
          current_medications: Json | null
          date_of_birth: string | null
          dnr_order: boolean | null
          emergency_contact_id: string | null
          emergency_contacts: Json | null
          family_medical_history: string | null
          full_name: string | null
          home_address: string | null
          id: string
          implanted_devices: string | null
          insurance_number: string | null
          insurance_provider: string | null
          organ_donor: boolean | null
          passport_number: string
          past_medical_history: Json | null
          photo_url: string | null
          preferred_hospital: string | null
          primary_physician_contact: string | null
          primary_physician_name: string | null
          qr_code_data: string | null
          special_medical_needs: string | null
          specialists: Json | null
          updated_at: string | null
          user_id: string
          vaccination_history: Json | null
        }
        Insert: {
          allergies?: Json | null
          blood_type?: string | null
          chronic_conditions?: Json | null
          created_at?: string | null
          current_address?: string | null
          current_medications?: Json | null
          date_of_birth?: string | null
          dnr_order?: boolean | null
          emergency_contact_id?: string | null
          emergency_contacts?: Json | null
          family_medical_history?: string | null
          full_name?: string | null
          home_address?: string | null
          id?: string
          implanted_devices?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          organ_donor?: boolean | null
          passport_number?: string
          past_medical_history?: Json | null
          photo_url?: string | null
          preferred_hospital?: string | null
          primary_physician_contact?: string | null
          primary_physician_name?: string | null
          qr_code_data?: string | null
          special_medical_needs?: string | null
          specialists?: Json | null
          updated_at?: string | null
          user_id: string
          vaccination_history?: Json | null
        }
        Update: {
          allergies?: Json | null
          blood_type?: string | null
          chronic_conditions?: Json | null
          created_at?: string | null
          current_address?: string | null
          current_medications?: Json | null
          date_of_birth?: string | null
          dnr_order?: boolean | null
          emergency_contact_id?: string | null
          emergency_contacts?: Json | null
          family_medical_history?: string | null
          full_name?: string | null
          home_address?: string | null
          id?: string
          implanted_devices?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          organ_donor?: boolean | null
          passport_number?: string
          past_medical_history?: Json | null
          photo_url?: string | null
          preferred_hospital?: string | null
          primary_physician_contact?: string | null
          primary_physician_name?: string | null
          qr_code_data?: string | null
          special_medical_needs?: string | null
          specialists?: Json | null
          updated_at?: string | null
          user_id?: string
          vaccination_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "health_passport_emergency_contact_id_fkey"
            columns: ["emergency_contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_passport_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_predictions: {
        Row: {
          category: string
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          generated_at: string | null
          id: string
          is_viewed: boolean | null
          prediction_data: Json
          prediction_type: string
          user_id: string
        }
        Insert: {
          category: string
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_viewed?: boolean | null
          prediction_data: Json
          prediction_type: string
          user_id: string
        }
        Update: {
          category?: string
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_viewed?: boolean | null
          prediction_data?: Json
          prediction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      health_reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          reference_id: string | null
          reference_type: string | null
          reminder_time: string
          reminder_type: string
          repeat_pattern: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reminder_time: string
          reminder_type: string
          repeat_pattern?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          reminder_time?: string
          reminder_type?: string
          repeat_pattern?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      health_streaks: {
        Row: {
          coins_earned: number | null
          created_at: string | null
          current_streak: number | null
          family_member_id: string | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          streak_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coins_earned?: number | null
          created_at?: string | null
          current_streak?: number | null
          family_member_id?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coins_earned?: number | null
          created_at?: string | null
          current_streak?: number | null
          family_member_id?: string | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_streaks_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      health_vitals: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          recorded_at: string
          source: string | null
          user_id: string
          value: Json
          vital_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string
          source?: string | null
          user_id: string
          value: Json
          vital_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_at?: string
          source?: string | null
          user_id?: string
          value?: Json
          vital_type?: string
        }
        Relationships: []
      }
      health_wallet: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          insurance_expiry: string | null
          insurance_number: string | null
          insurance_provider: string | null
          total_earned: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          insurance_expiry?: string | null
          insurance_number?: string | null
          insurance_provider?: string | null
          total_earned?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      health_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          status: string | null
          transaction_type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "health_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      healthcare_db: {
        Row: {
          added_by: string
          address: string
          city: string
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_monetized: boolean | null
          latitude: number | null
          longitude: number | null
          monetization_tier: string | null
          name: string
          phone_number: string | null
          pincode: string
          rating_average: number | null
          rating_count: number | null
          services_offered: string[] | null
          specialties: string[] | null
          state: string
          type: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          added_by: string
          address: string
          city: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_monetized?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          name: string
          phone_number?: string | null
          pincode: string
          rating_average?: number | null
          rating_count?: number | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state: string
          type: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          added_by?: string
          address?: string
          city?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_monetized?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          name?: string
          phone_number?: string | null
          pincode?: string
          rating_average?: number | null
          rating_count?: number | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state?: string
          type?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "healthcare_db_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "healthcare_db_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_service_bookings: {
        Row: {
          address: string
          created_at: string | null
          customer_id: string
          description: string | null
          duration_hours: number | null
          id: string
          payment_status: string | null
          provider_id: string
          scheduled_date: string
          service_type: string
          status: string | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          payment_status?: string | null
          provider_id: string
          scheduled_date: string
          service_type: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          payment_status?: string | null
          provider_id?: string
          scheduled_date?: string
          service_type?: string
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_service_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "home_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      home_service_providers: {
        Row: {
          availability: Json | null
          avatar_url: string | null
          business_name: string
          category_id: string | null
          completed_jobs: number | null
          created_at: string | null
          description: string | null
          hourly_rate: number
          id: string
          phone_number: string | null
          rating_average: number | null
          rating_count: number | null
          service_areas: Json | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          availability?: Json | null
          avatar_url?: string | null
          business_name: string
          category_id?: string | null
          completed_jobs?: number | null
          created_at?: string | null
          description?: string | null
          hourly_rate: number
          id?: string
          phone_number?: string | null
          rating_average?: number | null
          rating_count?: number | null
          service_areas?: Json | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          availability?: Json | null
          avatar_url?: string | null
          business_name?: string
          category_id?: string | null
          completed_jobs?: number | null
          created_at?: string | null
          description?: string | null
          hourly_rate?: number
          id?: string
          phone_number?: string | null
          rating_average?: number | null
          rating_count?: number | null
          service_areas?: Json | null
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "home_service_providers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_service_reviews: {
        Row: {
          booking_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          provider_id: string
          rating: number
          review_text: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          provider_id: string
          rating: number
          review_text?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          provider_id?: string
          rating?: number
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_service_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "home_service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_service_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "home_service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_preauth: {
        Row: {
          approved_amount: number | null
          created_at: string
          documents: Json | null
          estimated_cost: number | null
          id: string
          insurance_provider: string
          notes: string | null
          policy_number: string
          preauth_number: string | null
          preauth_status: string | null
          procedure_code: string | null
          procedure_name: string
          processed_at: string | null
          provider_id: string | null
          submitted_at: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          approved_amount?: number | null
          created_at?: string
          documents?: Json | null
          estimated_cost?: number | null
          id?: string
          insurance_provider: string
          notes?: string | null
          policy_number: string
          preauth_number?: string | null
          preauth_status?: string | null
          procedure_code?: string | null
          procedure_name: string
          processed_at?: string | null
          provider_id?: string | null
          submitted_at?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          approved_amount?: number | null
          created_at?: string
          documents?: Json | null
          estimated_cost?: number | null
          id?: string
          insurance_provider?: string
          notes?: string | null
          policy_number?: string
          preauth_number?: string | null
          preauth_status?: string | null
          procedure_code?: string | null
          procedure_name?: string
          processed_at?: string | null
          provider_id?: string | null
          submitted_at?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      inter_app_messages: {
        Row: {
          acknowledged_at: string | null
          action: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          expires_at: string | null
          id: string
          message_type: string
          payload: Json | null
          priority: number | null
          sent_at: string
          source_app_id: string
          status: string
          target_app_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          action: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          message_type: string
          payload?: Json | null
          priority?: number | null
          sent_at?: string
          source_app_id: string
          status?: string
          target_app_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          action?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          expires_at?: string | null
          id?: string
          message_type?: string
          payload?: Json | null
          priority?: number | null
          sent_at?: string
          source_app_id?: string
          status?: string
          target_app_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inter_app_messages_source_app_id_fkey"
            columns: ["source_app_id"]
            isOneToOne: false
            referencedRelation: "chatr_os_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_app_messages_target_app_id_fkey"
            columns: ["target_app_id"]
            isOneToOne: false
            referencedRelation: "chatr_os_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_links: {
        Row: {
          created_at: string | null
          id: string
          invite_code: string
          user_id: string
          uses_count: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invite_code: string
          user_id: string
          uses_count?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invite_code?: string
          user_id?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          created_at: string
          experience_level: string | null
          id: string
          is_active: boolean | null
          job_type: string | null
          keywords: string
          last_notified_at: string | null
          location: string | null
          min_salary: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          keywords: string
          last_notified_at?: string | null
          location?: string | null
          min_salary?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          experience_level?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          keywords?: string
          last_notified_at?: string | null
          location?: string | null
          min_salary?: number | null
          user_id?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          application_notes: string | null
          applied_at: string
          cover_letter: string | null
          id: string
          job_id: string
          resume_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          application_notes?: string | null
          applied_at?: string
          cover_letter?: string | null
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          application_notes?: string | null
          applied_at?: string
          cover_letter?: string | null
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_searches: {
        Row: {
          id: string
          keywords: string
          location: string | null
          results_count: number | null
          searched_at: string
          sources_used: Json | null
          user_id: string | null
        }
        Insert: {
          id?: string
          keywords: string
          location?: string | null
          results_count?: number | null
          searched_at?: string
          sources_used?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          keywords?: string
          location?: string | null
          results_count?: number | null
          searched_at?: string
          sources_used?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      jobs_clean_master: {
        Row: {
          application_count: number | null
          apply_url: string | null
          category: string
          city: string
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          distance: number | null
          experience_required: string | null
          id: string
          is_featured: boolean | null
          is_remote: boolean | null
          is_verified: boolean | null
          job_title: string
          job_type: string
          last_synced_at: string | null
          latitude: number | null
          location: string
          longitude: number | null
          pincode: string | null
          posted_by: string | null
          salary_range: string | null
          skills_required: string[] | null
          source_id: string | null
          source_table: string
          source_url: string | null
          state: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          application_count?: number | null
          apply_url?: string | null
          category: string
          city: string
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          experience_required?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          job_title: string
          job_type: string
          last_synced_at?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          pincode?: string | null
          posted_by?: string | null
          salary_range?: string | null
          skills_required?: string[] | null
          source_id?: string | null
          source_table: string
          source_url?: string | null
          state?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          application_count?: number | null
          apply_url?: string | null
          category?: string
          city?: string
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          distance?: number | null
          experience_required?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          job_title?: string
          job_type?: string
          last_synced_at?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          pincode?: string | null
          posted_by?: string | null
          salary_range?: string | null
          skills_required?: string[] | null
          source_id?: string | null
          source_table?: string
          source_url?: string | null
          state?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      jobs_scraped_global: {
        Row: {
          category: string
          city: string | null
          company_name: string
          company_website: string | null
          created_at: string | null
          description: string | null
          experience_required: string | null
          id: string
          is_remote: boolean | null
          job_title: string
          job_type: string
          latitude: number | null
          location: string | null
          longitude: number | null
          pincode: string | null
          salary_range: string | null
          scraped_at: string | null
          skills_required: string[] | null
          source_type: string
          source_url: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          city?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string | null
          description?: string | null
          experience_required?: string | null
          id?: string
          is_remote?: boolean | null
          job_title: string
          job_type: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          pincode?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          skills_required?: string[] | null
          source_type: string
          source_url: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string | null
          description?: string | null
          experience_required?: string | null
          id?: string
          is_remote?: boolean | null
          job_title?: string
          job_type?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          pincode?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          skills_required?: string[] | null
          source_type?: string
          source_url?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs_scraped_local: {
        Row: {
          category: string
          city: string
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          experience_required: string | null
          id: string
          is_remote: boolean | null
          job_title: string
          job_type: string
          latitude: number | null
          location: string
          longitude: number | null
          pincode: string | null
          salary_range: string | null
          scraped_at: string | null
          source_type: string
          source_url: string
          state: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          city: string
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          experience_required?: string | null
          id?: string
          is_remote?: boolean | null
          job_title: string
          job_type: string
          latitude?: number | null
          location: string
          longitude?: number | null
          pincode?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          source_type: string
          source_url: string
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          city?: string
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          experience_required?: string | null
          id?: string
          is_remote?: boolean | null
          job_title?: string
          job_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          pincode?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          source_type?: string
          source_url?: string
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs_user_generated: {
        Row: {
          category: string
          city: string
          company_name: string
          company_type: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string
          experience_required: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_remote: boolean | null
          is_verified: boolean | null
          job_title: string
          job_type: string
          latitude: number | null
          location: string
          longitude: number | null
          pincode: string
          posted_by: string
          salary_range: string | null
          skills_required: string[] | null
          state: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category: string
          city: string
          company_name: string
          company_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description: string
          experience_required?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          job_title: string
          job_type: string
          latitude?: number | null
          location: string
          longitude?: number | null
          pincode: string
          posted_by: string
          salary_range?: string | null
          skills_required?: string[] | null
          state?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category?: string
          city?: string
          company_name?: string
          company_type?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string
          experience_required?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          job_title?: string
          job_type?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          pincode?: string
          posted_by?: string
          salary_range?: string | null
          skills_required?: string[] | null
          state?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string | null
          document_number: string | null
          document_number_encrypted: string | null
          document_type: string
          document_url: string
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_number?: string | null
          document_number_encrypted?: string | null
          document_type: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_number?: string | null
          document_number_encrypted?: string | null
          document_type?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      lab_reports: {
        Row: {
          category: string | null
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          report_name: string
          requires_signed_url: boolean | null
          test_date: string | null
          updated_at: string | null
          url_expires_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          report_name: string
          requires_signed_url?: boolean | null
          test_date?: string | null
          updated_at?: string | null
          url_expires_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          report_name?: string
          requires_signed_url?: boolean | null
          test_date?: string | null
          updated_at?: string | null
          url_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      last_locations: {
        Row: {
          accuracy_m: number | null
          id: string
          lat: number
          lon: number
          session_id: string | null
          source: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          accuracy_m?: number | null
          id?: string
          lat: number
          lon: number
          session_id?: string | null
          source: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          accuracy_m?: number | null
          id?: string
          lat?: number
          lon?: number
          session_id?: string | null
          source?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      leaderboard_cache: {
        Row: {
          challenges_completed: number | null
          id: string
          rank: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenges_completed?: number | null
          id?: string
          rank?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenges_completed?: number | null
          id?: string
          rank?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      link_previews: {
        Row: {
          created_at: string | null
          description: string | null
          expires_at: string | null
          favicon_url: string | null
          id: string
          image_url: string | null
          site_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          favicon_url?: string | null
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          favicon_url?: string | null
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      linked_devices: {
        Row: {
          browser: string | null
          created_at: string | null
          device_name: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active_at: string | null
          os: string | null
          session_token: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          session_token?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string | null
          os?: string | null
          session_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      live_rooms: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_participants: number | null
          participant_count: number | null
          room_type: string | null
          title: string
          topic: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          room_type?: string | null
          title: string
          topic?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_participants?: number | null
          participant_count?: number | null
          room_type?: string | null
          title?: string
          topic?: string | null
        }
        Relationships: []
      }
      local_business_db: {
        Row: {
          added_by: string
          address: string
          business_hours: Json | null
          business_name: string
          business_type: string
          category: string
          city: string
          created_at: string | null
          description: string | null
          email: string | null
          has_active_offers: boolean | null
          id: string
          is_partner: boolean | null
          latitude: number | null
          longitude: number | null
          monetization_tier: string | null
          phone_number: string | null
          pincode: string
          rating_average: number | null
          rating_count: number | null
          services_products: string[] | null
          state: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          website: string | null
        }
        Insert: {
          added_by: string
          address: string
          business_hours?: Json | null
          business_name: string
          business_type: string
          category: string
          city: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          has_active_offers?: boolean | null
          id?: string
          is_partner?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          phone_number?: string | null
          pincode: string
          rating_average?: number | null
          rating_count?: number | null
          services_products?: string[] | null
          state: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Update: {
          added_by?: string
          address?: string
          business_hours?: Json | null
          business_name?: string
          business_type?: string
          category?: string
          city?: string
          created_at?: string | null
          description?: string | null
          email?: string | null
          has_active_offers?: boolean | null
          id?: string
          is_partner?: boolean | null
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          phone_number?: string | null
          pincode?: string
          rating_average?: number | null
          rating_count?: number | null
          services_products?: string[] | null
          state?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_business_db_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_business_db_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_deals: {
        Row: {
          business_id: string | null
          category: string | null
          created_at: string | null
          current_redemptions: number | null
          description: string | null
          discount_percentage: number | null
          discounted_price: number
          id: string
          image_url: string | null
          is_active: boolean | null
          location: string | null
          max_redemptions: number | null
          original_price: number
          title: string
          valid_until: string | null
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          max_redemptions?: number | null
          original_price: number
          title: string
          valid_until?: string | null
        }
        Update: {
          business_id?: string | null
          category?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location?: string | null
          max_redemptions?: number | null
          original_price?: number
          title?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_deals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_jobs_db: {
        Row: {
          address: string | null
          application_count: number | null
          application_url: string | null
          category: string
          city: string
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string
          expires_at: string | null
          id: string
          is_featured: boolean | null
          is_remote: boolean | null
          job_title: string
          job_type: string
          latitude: number | null
          longitude: number | null
          monetization_tier: string | null
          pincode: string | null
          posted_by: string
          requirements: string[] | null
          salary_range: string | null
          state: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
          view_count: number | null
        }
        Insert: {
          address?: string | null
          application_count?: number | null
          application_url?: string | null
          category: string
          city: string
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description: string
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          job_title: string
          job_type: string
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          pincode?: string | null
          posted_by: string
          requirements?: string[] | null
          salary_range?: string | null
          state: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
        }
        Update: {
          address?: string | null
          application_count?: number | null
          application_url?: string | null
          category?: string
          city?: string
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string
          expires_at?: string | null
          id?: string
          is_featured?: boolean | null
          is_remote?: boolean | null
          job_title?: string
          job_type?: string
          latitude?: number | null
          longitude?: number | null
          monetization_tier?: string | null
          pincode?: string | null
          posted_by?: string
          requirements?: string[] | null
          salary_range?: string | null
          state?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "local_jobs_db_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_jobs_db_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_offers_db: {
        Row: {
          address: string | null
          business_id: string | null
          business_name: string
          city: string
          created_at: string | null
          discount_percentage: number | null
          id: string
          is_sponsored: boolean | null
          latitude: number | null
          longitude: number | null
          max_redemptions: number | null
          monetization_tier: string | null
          offer_description: string
          offer_price: number | null
          offer_title: string
          offer_type: string
          original_price: number | null
          pincode: string | null
          posted_by: string
          redemption_code: string | null
          redemption_count: number | null
          state: string
          terms_conditions: string | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          verified: boolean | null
          view_count: number | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          business_name: string
          city: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_sponsored?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_redemptions?: number | null
          monetization_tier?: string | null
          offer_description: string
          offer_price?: number | null
          offer_title: string
          offer_type: string
          original_price?: number | null
          pincode?: string | null
          posted_by: string
          redemption_code?: string | null
          redemption_count?: number | null
          state: string
          terms_conditions?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          verified?: boolean | null
          view_count?: number | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          business_name?: string
          city?: string
          created_at?: string | null
          discount_percentage?: number | null
          id?: string
          is_sponsored?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_redemptions?: number | null
          monetization_tier?: string | null
          offer_description?: string
          offer_price?: number | null
          offer_title?: string
          offer_type?: string
          original_price?: number | null
          pincode?: string | null
          posted_by?: string
          redemption_code?: string | null
          redemption_count?: number | null
          state?: string
          terms_conditions?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          verified?: boolean | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "local_offers_db_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "local_business_db"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_offers_db_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_search_history: {
        Row: {
          created_at: string | null
          id: string
          last_searched_at: string | null
          latitude: number
          location_name: string
          longitude: number
          search_count: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_searched_at?: string | null
          latitude: number
          location_name: string
          longitude: number
          search_count?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_searched_at?: string | null
          latitude?: number
          location_name?: string
          longitude?: number
          search_count?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      location_searches: {
        Row: {
          city: string | null
          clicked_result_id: string | null
          clicked_result_type: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          pincode: string | null
          results_count: number | null
          search_query: string
          search_type: string
          state: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          results_count?: number | null
          search_query: string
          search_type: string
          state?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          clicked_result_id?: string | null
          clicked_result_type?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          pincode?: string | null
          results_count?: number | null
          search_query?: string
          search_type?: string
          state?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      location_shares: {
        Row: {
          created_at: string | null
          duration: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          shared_with: string[]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          shared_with: string[]
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          shared_with?: string[]
          user_id?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempt_type: string
          created_at: string | null
          device_fingerprint: string
          id: string
          phone_number: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempt_type: string
          created_at?: string | null
          device_fingerprint: string
          id?: string
          phone_number: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempt_type?: string
          created_at?: string | null
          device_fingerprint?: string
          id?: string
          phone_number?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      map_hunt_clues: {
        Row: {
          clue_text: string
          clue_type: string
          coins_earned: number | null
          completed_at: string | null
          created_at: string | null
          hint_1: string | null
          hint_2: string | null
          hint_3: string | null
          hints_used: number | null
          id: string
          level: number
          photo_url: string | null
          target_description: string | null
          user_id: string
          verification_score: number | null
          verified: boolean | null
        }
        Insert: {
          clue_text: string
          clue_type: string
          coins_earned?: number | null
          completed_at?: string | null
          created_at?: string | null
          hint_1?: string | null
          hint_2?: string | null
          hint_3?: string | null
          hints_used?: number | null
          id?: string
          level: number
          photo_url?: string | null
          target_description?: string | null
          user_id: string
          verification_score?: number | null
          verified?: boolean | null
        }
        Update: {
          clue_text?: string
          clue_type?: string
          coins_earned?: number | null
          completed_at?: string | null
          created_at?: string | null
          hint_1?: string | null
          hint_2?: string | null
          hint_3?: string | null
          hints_used?: number | null
          id?: string
          level?: number
          photo_url?: string | null
          target_description?: string | null
          user_id?: string
          verification_score?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      map_hunt_progress: {
        Row: {
          created_at: string | null
          current_hunt_id: string | null
          current_level: number | null
          id: string
          total_keys_found: number | null
          total_treasures: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          created_at?: string | null
          current_hunt_id?: string | null
          current_level?: number | null
          id?: string
          total_keys_found?: number | null
          total_treasures?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          created_at?: string | null
          current_hunt_id?: string | null
          current_level?: number | null
          id?: string
          total_keys_found?: number | null
          total_treasures?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      media_files: {
        Row: {
          created_at: string | null
          hash: string
          id: string
          size: number
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hash: string
          id?: string
          size: number
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hash?: string
          id?: string
          size?: number
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_access_audit: {
        Row: {
          access_type: string
          accessed_at: string | null
          id: string
          ip_address: string | null
          patient_id: string
          provider_id: string
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          id?: string
          ip_address?: string | null
          patient_id: string
          provider_id: string
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          id?: string
          ip_address?: string | null
          patient_id?: string
          provider_id?: string
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_access_audit_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_id: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_notes: string | null
          height_cm: number | null
          id: string
          medical_conditions: string[] | null
          medications: string[] | null
          organ_donor: boolean | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_notes?: string | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_notes?: string | null
          height_cm?: number | null
          id?: string
          medical_conditions?: string[] | null
          medications?: string[] | null
          organ_donor?: boolean | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      medication_interactions: {
        Row: {
          created_at: string | null
          description: string
          id: string
          interaction_severity: string
          medication_1: string
          medication_2: string
          recommendation: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          interaction_severity: string
          medication_1: string
          medication_2: string
          recommendation?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          interaction_severity?: string
          medication_1?: string
          medication_2?: string
          recommendation?: string | null
        }
        Relationships: []
      }
      medication_reminders: {
        Row: {
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          medicine_name: string
          notes: string | null
          start_date: string
          time_slots: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          medicine_name: string
          notes?: string | null
          start_date: string
          time_slots: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          medicine_name?: string
          notes?: string | null
          start_date?: string
          time_slots?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          is_active: boolean | null
          medication_name: string
          prescribed_by: string | null
          purpose: string | null
          refill_reminder_date: string | null
          side_effects: string[] | null
          start_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name: string
          prescribed_by?: string | null
          purpose?: string | null
          refill_reminder_date?: string | null
          side_effects?: string[] | null
          start_date?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          medication_name?: string
          prescribed_by?: string | null
          purpose?: string | null
          refill_reminder_date?: string | null
          side_effects?: string[] | null
          start_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      medicine_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          discounted_price: number | null
          for_conditions: string[] | null
          form: string | null
          generic_name: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          manufacturer: string | null
          mrp: number
          name: string
          pack_size: number | null
          requires_prescription: boolean | null
          strength: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          discounted_price?: number | null
          for_conditions?: string[] | null
          form?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          manufacturer?: string | null
          mrp: number
          name: string
          pack_size?: number | null
          requires_prescription?: boolean | null
          strength?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          discounted_price?: number | null
          for_conditions?: string[] | null
          form?: string | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          manufacturer?: string | null
          mrp?: number
          name?: string
          pack_size?: number | null
          requires_prescription?: boolean | null
          strength?: string | null
        }
        Relationships: []
      }
      medicine_intake_log: {
        Row: {
          created_at: string | null
          family_member_id: string | null
          id: string
          medicine_name: string
          notes: string | null
          scheduled_at: string
          status: string | null
          subscription_item_id: string | null
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          medicine_name: string
          notes?: string | null
          scheduled_at: string
          status?: string | null
          subscription_item_id?: string | null
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          medicine_name?: string
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          subscription_item_id?: string | null
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_intake_log_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_intake_log_subscription_item_id_fkey"
            columns: ["subscription_item_id"]
            isOneToOne: false
            referencedRelation: "subscription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_orders: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          delivery_address: Json | null
          delivery_fee: number | null
          discount: number | null
          expected_delivery: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          subscription_id: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          expected_delivery?: string | null
          id?: string
          items: Json
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          subscription_id?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          delivery_address?: Json | null
          delivery_fee?: number | null
          discount?: number | null
          expected_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          subscription_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "medicine_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_reminders: {
        Row: {
          created_at: string | null
          days_of_week: number[] | null
          family_member_id: string | null
          id: string
          is_active: boolean | null
          medicine_name: string
          reminder_type: string | null
          scheduled_time: string
          snooze_minutes: number | null
          subscription_item_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_of_week?: number[] | null
          family_member_id?: string | null
          id?: string
          is_active?: boolean | null
          medicine_name: string
          reminder_type?: string | null
          scheduled_time: string
          snooze_minutes?: number | null
          subscription_item_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_of_week?: number[] | null
          family_member_id?: string | null
          id?: string
          is_active?: boolean | null
          medicine_name?: string
          reminder_type?: string | null
          scheduled_time?: string
          snooze_minutes?: number | null
          subscription_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_reminders_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicine_reminders_subscription_item_id_fkey"
            columns: ["subscription_item_id"]
            isOneToOne: false
            referencedRelation: "subscription_items"
            referencedColumns: ["id"]
          },
        ]
      }
      medicine_subscriptions: {
        Row: {
          auto_refill: boolean | null
          created_at: string | null
          delivery_address: Json | null
          family_member_id: string | null
          id: string
          monthly_cost: number | null
          next_delivery_date: string | null
          payment_method: string | null
          plan_type: string | null
          savings_amount: number | null
          status: string | null
          subscription_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_refill?: boolean | null
          created_at?: string | null
          delivery_address?: Json | null
          family_member_id?: string | null
          id?: string
          monthly_cost?: number | null
          next_delivery_date?: string | null
          payment_method?: string | null
          plan_type?: string | null
          savings_amount?: number | null
          status?: string | null
          subscription_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_refill?: boolean | null
          created_at?: string | null
          delivery_address?: Json | null
          family_member_id?: string | null
          id?: string
          monthly_cost?: number | null
          next_delivery_date?: string | null
          payment_method?: string | null
          plan_type?: string | null
          savings_amount?: number | null
          status?: string | null
          subscription_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_subscriptions_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_assessments: {
        Row: {
          assessed_at: string
          assessment_type: string
          created_at: string
          id: string
          interpretation: string | null
          recommendations: string[] | null
          responses: Json | null
          score: number | null
          user_id: string
        }
        Insert: {
          assessed_at?: string
          assessment_type: string
          created_at?: string
          id?: string
          interpretation?: string | null
          recommendations?: string[] | null
          responses?: Json | null
          score?: number | null
          user_id: string
        }
        Update: {
          assessed_at?: string
          assessment_type?: string
          created_at?: string
          id?: string
          interpretation?: string | null
          recommendations?: string[] | null
          responses?: Json | null
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          calories: number | null
          category_id: string | null
          created_at: string | null
          customizations: Json | null
          description: string | null
          discounted_price: number | null
          display_order: number | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_bestseller: boolean | null
          is_veg: boolean | null
          name: string
          preparation_time: number | null
          price: number
          serves: number | null
          spice_level: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          description?: string | null
          discounted_price?: number | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bestseller?: boolean | null
          is_veg?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          serves?: number | null
          spice_level?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          allergens?: string[] | null
          calories?: number | null
          category_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          description?: string | null
          discounted_price?: number | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bestseller?: boolean | null
          is_veg?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          serves?: number | null
          spice_level?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_deals: {
        Row: {
          category: string | null
          coupon_code: string | null
          created_at: string | null
          current_redemptions: number | null
          deal_price: number
          description: string | null
          discount_percent: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          max_redemptions: number | null
          original_price: number
          per_user_limit: number | null
          redemption_type: string | null
          terms_conditions: string | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          vendor_id: string
        }
        Insert: {
          category?: string | null
          coupon_code?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          deal_price: number
          description?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_redemptions?: number | null
          original_price: number
          per_user_limit?: number | null
          redemption_type?: string | null
          terms_conditions?: string | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_id: string
        }
        Update: {
          category?: string | null
          coupon_code?: string | null
          created_at?: string | null
          current_redemptions?: number | null
          deal_price?: number
          description?: string | null
          discount_percent?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_redemptions?: number | null
          original_price?: number
          per_user_limit?: number | null
          redemption_type?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_deals_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      message_delivery_status: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          message_id: string
          read_at: string | null
          recipient_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_id: string
          read_at?: string | null
          recipient_id: string
          status?: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          message_id?: string
          read_at?: string | null
          recipient_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_delivery_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_delivery_status_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_drafts: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_drafts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_forwards: {
        Row: {
          created_at: string | null
          forwarded_by: string
          forwarded_message_id: string
          id: string
          original_message_id: string
        }
        Insert: {
          created_at?: string | null
          forwarded_by: string
          forwarded_message_id: string
          id?: string
          original_message_id: string
        }
        Update: {
          created_at?: string | null
          forwarded_by?: string
          forwarded_message_id?: string
          id?: string
          original_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_forwards_forwarded_message_id_fkey"
            columns: ["forwarded_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_forwards_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          message_id: string
          message_preview: string | null
          reminder_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          message_id: string
          message_preview?: string | null
          reminder_time: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          message_id?: string
          message_preview?: string | null
          reminder_time?: string
          user_id?: string
        }
        Relationships: []
      }
      message_reports: {
        Row: {
          conversation_id: string
          created_at: string | null
          details: string | null
          id: string
          message_id: string
          reason: string
          reported_by: string
          reported_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reported_by: string
          reported_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string
          reported_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_retry_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          last_retry_at: string | null
          message_id: string
          retry_count: number | null
          succeeded: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          message_id: string
          retry_count?: number | null
          succeeded?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          message_id?: string
          retry_count?: number | null
          succeeded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "message_retry_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_tasks: {
        Row: {
          assignee_id: string | null
          assigner_id: string
          completed_at: string | null
          conversation_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          message_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          assigner_id: string
          completed_at?: string | null
          conversation_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          assigner_id?: string
          completed_at?: string | null
          conversation_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          message_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_tasks_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_tasks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_translations: {
        Row: {
          created_at: string | null
          id: string
          message_id: string | null
          original_language: string
          target_language: string
          translated_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          original_language: string
          target_language: string
          translated_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string | null
          original_language?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          deleted_at: string | null
          duration: number | null
          edited_at: string | null
          encrypted_iv: string | null
          encrypted_key: string | null
          encryption_key_id: string | null
          expires_at: string | null
          file_name: string | null
          file_size: number | null
          forwarded_from_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_encrypted: boolean | null
          is_expired: boolean | null
          is_starred: boolean | null
          location_latitude: number | null
          location_longitude: number | null
          location_name: string | null
          media_attachments: Json | null
          media_thumbnail_url: string | null
          media_url: string | null
          message_type: string | null
          original_message_id: string | null
          poll_options: Json | null
          poll_question: string | null
          reactions: Json | null
          read_at: string | null
          reply_to_id: string | null
          reply_to_message_content: string | null
          reply_to_sender_name: string | null
          scheduled_for: string | null
          sender_id: string | null
          status: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          duration?: number | null
          edited_at?: string | null
          encrypted_iv?: string | null
          encrypted_key?: string | null
          encryption_key_id?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_encrypted?: boolean | null
          is_expired?: boolean | null
          is_starred?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          media_attachments?: Json | null
          media_thumbnail_url?: string | null
          media_url?: string | null
          message_type?: string | null
          original_message_id?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          reactions?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          reply_to_message_content?: string | null
          reply_to_sender_name?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          duration?: number | null
          edited_at?: string | null
          encrypted_iv?: string | null
          encrypted_key?: string | null
          encryption_key_id?: string | null
          expires_at?: string | null
          file_name?: string | null
          file_size?: number | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_encrypted?: boolean | null
          is_expired?: boolean | null
          is_starred?: boolean | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_name?: string | null
          media_attachments?: Json | null
          media_thumbnail_url?: string | null
          media_url?: string | null
          message_type?: string | null
          original_message_id?: string | null
          poll_options?: Json | null
          poll_question?: string | null
          reactions?: Json | null
          read_at?: string | null
          reply_to_id?: string | null
          reply_to_message_content?: string | null
          reply_to_sender_name?: string | null
          scheduled_for?: string | null
          sender_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_id_fkey"
            columns: ["forwarded_from_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_original_message_id_fkey"
            columns: ["original_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_apps: {
        Row: {
          app_name: string
          app_url: string
          category_id: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          developer_id: string | null
          icon_url: string | null
          id: string
          install_count: number | null
          is_active: boolean | null
          is_trending: boolean | null
          is_verified: boolean | null
          launch_date: string | null
          monthly_active_users: number | null
          rating_average: number | null
          rating_count: number | null
          screenshots: string[] | null
          tags: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          app_name: string
          app_url: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_trending?: boolean | null
          is_verified?: boolean | null
          launch_date?: string | null
          monthly_active_users?: number | null
          rating_average?: number | null
          rating_count?: number | null
          screenshots?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          app_name?: string
          app_url?: string
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          developer_id?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number | null
          is_active?: boolean | null
          is_trending?: boolean | null
          is_verified?: boolean | null
          launch_date?: string | null
          monthly_active_users?: number | null
          rating_average?: number | null
          rating_count?: number | null
          screenshots?: string[] | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_apps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "app_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_shares: {
        Row: {
          created_at: string | null
          id: string
          moment_id: string
          shared_by: string
          shared_to_platform: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          moment_id: string
          shared_by: string
          shared_to_platform?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          moment_id?: string
          shared_by?: string
          shared_to_platform?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moment_shares_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "ai_moments"
            referencedColumns: ["id"]
          },
        ]
      }
      monetization_leads: {
        Row: {
          action_type: string
          converted_at: string | null
          created_at: string | null
          id: string
          is_converted: boolean | null
          lead_type: string
          listing_id: string
          listing_type: string
          location_city: string | null
          location_pincode: string | null
          revenue_potential: number | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          is_converted?: boolean | null
          lead_type: string
          listing_id: string
          listing_type: string
          location_city?: string | null
          location_pincode?: string | null
          revenue_potential?: number | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          converted_at?: string | null
          created_at?: string | null
          id?: string
          is_converted?: boolean | null
          lead_type?: string
          listing_id?: string
          listing_type?: string
          location_city?: string | null
          location_pincode?: string | null
          revenue_potential?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monetization_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mutual_friends: {
        Row: {
          mutual_count: number | null
          mutual_friend_ids: string[]
          updated_at: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          mutual_count?: number | null
          mutual_friend_ids: string[]
          updated_at?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          mutual_count?: number | null
          mutual_friend_ids?: string[]
          updated_at?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      native_apps: {
        Row: {
          category: string
          created_at: string
          icon_url: string
          id: string
          is_featured: boolean | null
          name: string
          package_name: string
          web_url: string
        }
        Insert: {
          category: string
          created_at?: string
          icon_url: string
          id?: string
          is_featured?: boolean | null
          name: string
          package_name: string
          web_url: string
        }
        Update: {
          category?: string
          created_at?: string
          icon_url?: string
          id?: string
          is_featured?: boolean | null
          name?: string
          package_name?: string
          web_url?: string
        }
        Relationships: []
      }
      network_diagnostics: {
        Row: {
          connection_type: string | null
          created_at: string | null
          diagnostics_data: Json | null
          downlink_speed: number | null
          id: string
          latency: number | null
          uplink_speed: number | null
          user_id: string
        }
        Insert: {
          connection_type?: string | null
          created_at?: string | null
          diagnostics_data?: Json | null
          downlink_speed?: number | null
          id?: string
          latency?: number | null
          uplink_speed?: number | null
          user_id: string
        }
        Update: {
          connection_type?: string | null
          created_at?: string | null
          diagnostics_data?: Json | null
          downlink_speed?: number | null
          id?: string
          latency?: number | null
          uplink_speed?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_diagnostics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_bundles: {
        Row: {
          bundle_type: string
          created_at: string | null
          id: string
          notification_ids: string[]
          summary: string | null
          user_id: string
        }
        Insert: {
          bundle_type: string
          created_at?: string | null
          id?: string
          notification_ids: string[]
          summary?: string | null
          user_id: string
        }
        Update: {
          bundle_type?: string
          created_at?: string | null
          id?: string
          notification_ids?: string[]
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          app_updates: boolean | null
          call_notifications: boolean | null
          chat_notifications: boolean | null
          created_at: string | null
          group_notifications: boolean | null
          id: string
          marketing_alerts: boolean | null
          sound_enabled: boolean | null
          transaction_alerts: boolean | null
          updated_at: string | null
          user_id: string
          vibration_enabled: boolean | null
        }
        Insert: {
          app_updates?: boolean | null
          call_notifications?: boolean | null
          chat_notifications?: boolean | null
          created_at?: string | null
          group_notifications?: boolean | null
          id?: string
          marketing_alerts?: boolean | null
          sound_enabled?: boolean | null
          transaction_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
          vibration_enabled?: boolean | null
        }
        Update: {
          app_updates?: boolean | null
          call_notifications?: boolean | null
          chat_notifications?: boolean | null
          created_at?: string | null
          group_notifications?: boolean | null
          id?: string
          marketing_alerts?: boolean | null
          sound_enabled?: boolean | null
          transaction_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
          vibration_enabled?: boolean | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          error: string | null
          id: string
          sent_at: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_daily_summary: {
        Row: {
          created_at: string
          goal_calories: number | null
          goal_carbs_g: number | null
          goal_fat_g: number | null
          goal_protein_g: number | null
          goal_water_ml: number | null
          id: string
          summary_date: string
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_protein_g: number | null
          total_water_ml: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_calories?: number | null
          goal_carbs_g?: number | null
          goal_fat_g?: number | null
          goal_protein_g?: number | null
          goal_water_ml?: number | null
          id?: string
          summary_date: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          total_water_ml?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          goal_calories?: number | null
          goal_carbs_g?: number | null
          goal_fat_g?: number | null
          goal_protein_g?: number | null
          goal_water_ml?: number | null
          id?: string
          summary_date?: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          total_water_ml?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string
          fat_g: number | null
          fiber_g: number | null
          food_name: string
          id: string
          log_date: string
          meal_type: string
          notes: string | null
          protein_g: number | null
          user_id: string
          water_ml: number | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name: string
          id?: string
          log_date?: string
          meal_type: string
          notes?: string | null
          protein_g?: number | null
          user_id: string
          water_ml?: number | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string
          fat_g?: number | null
          fiber_g?: number | null
          food_name?: string
          id?: string
          log_date?: string
          meal_type?: string
          notes?: string | null
          protein_g?: number | null
          user_id?: string
          water_ml?: number | null
        }
        Relationships: []
      }
      official_accounts: {
        Row: {
          account_name: string
          account_type: string | null
          category: string | null
          contact_info: Json | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          follower_count: number | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_type?: string | null
          category?: string | null
          contact_info?: Json | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_type?: string | null
          category?: string | null
          contact_info?: Json | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          follower_count?: number | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          step_name: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          step_name: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          step_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          otp_code: string
          phone_number: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      parallel_you_challenges: {
        Row: {
          ai_response: Json | null
          challenge_data: Json
          challenge_type: string
          completed_at: string | null
          created_at: string | null
          id: string
          level: number
          score: number | null
          user_id: string
          user_response: Json | null
          winner: string | null
        }
        Insert: {
          ai_response?: Json | null
          challenge_data: Json
          challenge_type: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level: number
          score?: number | null
          user_id: string
          user_response?: Json | null
          winner?: string | null
        }
        Update: {
          ai_response?: Json | null
          challenge_data?: Json
          challenge_type?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          level?: number
          score?: number | null
          user_id?: string
          user_response?: Json | null
          winner?: string | null
        }
        Relationships: []
      }
      parallel_you_profiles: {
        Row: {
          ai_personality: Json | null
          chat_patterns: Json | null
          created_at: string | null
          current_level: number | null
          evolution_level: number | null
          id: string
          last_trained_at: string | null
          losses: number | null
          total_battles: number | null
          updated_at: string | null
          user_id: string
          wins: number | null
          xp: number | null
        }
        Insert: {
          ai_personality?: Json | null
          chat_patterns?: Json | null
          created_at?: string | null
          current_level?: number | null
          evolution_level?: number | null
          id?: string
          last_trained_at?: string | null
          losses?: number | null
          total_battles?: number | null
          updated_at?: string | null
          user_id: string
          wins?: number | null
          xp?: number | null
        }
        Update: {
          ai_personality?: Json | null
          chat_patterns?: Json | null
          created_at?: string | null
          current_level?: number | null
          evolution_level?: number | null
          id?: string
          last_trained_at?: string | null
          losses?: number | null
          total_battles?: number | null
          updated_at?: string | null
          user_id?: string
          wins?: number | null
          xp?: number | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          id: string
          patient_id: string
          payment_method: string | null
          payment_status: string | null
          payment_type: string | null
          points_amount: number | null
          provider_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          patient_id: string
          payment_method?: string | null
          payment_status?: string | null
          payment_type?: string | null
          points_amount?: number | null
          provider_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          patient_id?: string
          payment_method?: string | null
          payment_status?: string | null
          payment_type?: string | null
          points_amount?: number | null
          provider_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_albums: {
        Row: {
          cover_photo_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          conversation_id: string
          id: string
          message_id: string
          pinned_at: string | null
          pinned_by: string
        }
        Insert: {
          conversation_id: string
          id?: string
          message_id: string
          pinned_at?: string | null
          pinned_by: string
        }
        Update: {
          conversation_id?: string
          id?: string
          message_id?: string
          pinned_at?: string | null
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pinned_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      point_earning_rules: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_daily_claims: number | null
          metadata: Json | null
          points_awarded: number
          rule_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_claims?: number | null
          metadata?: Json | null
          points_awarded: number
          rule_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_daily_claims?: number | null
          metadata?: Json | null
          points_awarded?: number
          rule_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      point_expirations: {
        Row: {
          created_at: string
          earned_at: string
          expires_at: string
          id: string
          points_amount: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          earned_at: string
          expires_at: string
          id?: string
          points_amount: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          earned_at?: string
          expires_at?: string
          id?: string
          points_amount?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      point_packages: {
        Row: {
          badge_text: string | null
          bonus_points: number | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          points: number
          popular: boolean | null
          price_usd: number
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          bonus_points?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          points: number
          popular?: boolean | null
          price_usd: number
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          bonus_points?: number | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          points?: number
          popular?: boolean | null
          price_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      point_rewards: {
        Row: {
          created_at: string
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          max_redemptions_per_user: number | null
          name: string
          points_required: number
          reward_type: string
          stock_quantity: number | null
          terms: string | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_redemptions_per_user?: number | null
          name: string
          points_required: number
          reward_type: string
          stock_quantity?: number | null
          terms?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          max_redemptions_per_user?: number | null
          name?: string
          points_required?: number
          reward_type?: string
          stock_quantity?: number | null
          terms?: string | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: []
      }
      point_settlements: {
        Row: {
          created_at: string | null
          id: string
          inr_amount: number
          payment_reference: string | null
          points_earned: number
          provider_id: string
          settlement_date: string | null
          settlement_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inr_amount: number
          payment_reference?: string | null
          points_earned: number
          provider_id: string
          settlement_date?: string | null
          settlement_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inr_amount?: number
          payment_reference?: string | null
          points_earned?: number
          provider_id?: string
          settlement_date?: string | null
          settlement_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
          reference_type: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          source: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          reference_type?: string | null
          source?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "youth_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "youth_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_uploads: {
        Row: {
          created_at: string | null
          doctor_name: string | null
          family_member_id: string | null
          hospital_name: string | null
          id: string
          image_url: string
          notes: string | null
          ocr_parsed_data: Json | null
          ocr_raw_text: string | null
          prescription_date: string | null
          status: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_name?: string | null
          family_member_id?: string | null
          hospital_name?: string | null
          id?: string
          image_url: string
          notes?: string | null
          ocr_parsed_data?: Json | null
          ocr_raw_text?: string | null
          prescription_date?: string | null
          status?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_name?: string | null
          family_member_id?: string | null
          hospital_name?: string | null
          id?: string
          image_url?: string
          notes?: string | null
          ocr_parsed_data?: Json | null
          ocr_raw_text?: string | null
          prescription_date?: string | null
          status?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_uploads_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "health_family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          dosage: string
          duration: string | null
          frequency: string
          id: string
          medication_name: string
          notes: string | null
          prescribed_date: string
          prescription_file_url: string | null
          provider_id: string | null
          requires_signed_url: boolean | null
          status: string | null
          url_expires_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dosage: string
          duration?: string | null
          frequency: string
          id?: string
          medication_name: string
          notes?: string | null
          prescribed_date?: string
          prescription_file_url?: string | null
          provider_id?: string | null
          requires_signed_url?: boolean | null
          status?: string | null
          url_expires_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dosage?: string
          duration?: string | null
          frequency?: string
          id?: string
          medication_name?: string
          notes?: string | null
          prescribed_date?: string
          prescription_file_url?: string | null
          provider_id?: string | null
          requires_signed_url?: boolean | null
          status?: string | null
          url_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_music: {
        Row: {
          album_art_url: string | null
          artist_name: string | null
          id: string
          preview_url: string | null
          spotify_uri: string | null
          track_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          album_art_url?: string | null
          artist_name?: string | null
          id?: string
          preview_url?: string | null
          spotify_uri?: string | null
          track_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          album_art_url?: string | null
          artist_name?: string | null
          id?: string
          preview_url?: string | null
          spotify_uri?: string | null
          track_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          auto_backup_enabled: boolean | null
          auto_backup_frequency: string | null
          auto_translate_enabled: boolean | null
          avatar_url: string | null
          call_blocking_settings: Json | null
          call_forwarding_settings: Json | null
          call_ringtone: string | null
          contacts_synced: boolean | null
          created_at: string | null
          delivery_address: Json | null
          email: string
          firebase_uid: string | null
          full_name: string | null
          gender: string | null
          google_id: string | null
          health_goals: string[] | null
          id: string
          is_online: boolean | null
          is_phone_verified: boolean | null
          is_verified: boolean | null
          ivr_settings: Json | null
          last_backup_at: string | null
          last_contact_sync: string | null
          last_seen: string | null
          last_seen_at: string | null
          lifestyle: Json | null
          location_city: string | null
          location_country: string | null
          location_ip: string | null
          location_latitude: number | null
          location_longitude: number | null
          location_precision: string | null
          location_sharing_enabled: boolean | null
          location_updated_at: string | null
          medical_history: Json | null
          notification_tone: string | null
          onboarding_completed: boolean | null
          phone_hash: string | null
          phone_number: string
          phone_search: string | null
          pin: string | null
          pin_hash: string | null
          pin_setup_completed: boolean | null
          preferred_auth_method: string | null
          preferred_country_code: string | null
          preferred_language: string | null
          privacy_settings: Json | null
          profile_completed_at: string | null
          public_key: string | null
          qr_code_token: string | null
          referral_code: string | null
          speed_dial_settings: Json | null
          status: string | null
          status_message: string | null
          streak_count: number | null
          updated_at: string | null
          username: string
        }
        Insert: {
          age?: number | null
          auto_backup_enabled?: boolean | null
          auto_backup_frequency?: string | null
          auto_translate_enabled?: boolean | null
          avatar_url?: string | null
          call_blocking_settings?: Json | null
          call_forwarding_settings?: Json | null
          call_ringtone?: string | null
          contacts_synced?: boolean | null
          created_at?: string | null
          delivery_address?: Json | null
          email: string
          firebase_uid?: string | null
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          health_goals?: string[] | null
          id: string
          is_online?: boolean | null
          is_phone_verified?: boolean | null
          is_verified?: boolean | null
          ivr_settings?: Json | null
          last_backup_at?: string | null
          last_contact_sync?: string | null
          last_seen?: string | null
          last_seen_at?: string | null
          lifestyle?: Json | null
          location_city?: string | null
          location_country?: string | null
          location_ip?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_precision?: string | null
          location_sharing_enabled?: boolean | null
          location_updated_at?: string | null
          medical_history?: Json | null
          notification_tone?: string | null
          onboarding_completed?: boolean | null
          phone_hash?: string | null
          phone_number: string
          phone_search?: string | null
          pin?: string | null
          pin_hash?: string | null
          pin_setup_completed?: boolean | null
          preferred_auth_method?: string | null
          preferred_country_code?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          profile_completed_at?: string | null
          public_key?: string | null
          qr_code_token?: string | null
          referral_code?: string | null
          speed_dial_settings?: Json | null
          status?: string | null
          status_message?: string | null
          streak_count?: number | null
          updated_at?: string | null
          username: string
        }
        Update: {
          age?: number | null
          auto_backup_enabled?: boolean | null
          auto_backup_frequency?: string | null
          auto_translate_enabled?: boolean | null
          avatar_url?: string | null
          call_blocking_settings?: Json | null
          call_forwarding_settings?: Json | null
          call_ringtone?: string | null
          contacts_synced?: boolean | null
          created_at?: string | null
          delivery_address?: Json | null
          email?: string
          firebase_uid?: string | null
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          health_goals?: string[] | null
          id?: string
          is_online?: boolean | null
          is_phone_verified?: boolean | null
          is_verified?: boolean | null
          ivr_settings?: Json | null
          last_backup_at?: string | null
          last_contact_sync?: string | null
          last_seen?: string | null
          last_seen_at?: string | null
          lifestyle?: Json | null
          location_city?: string | null
          location_country?: string | null
          location_ip?: string | null
          location_latitude?: number | null
          location_longitude?: number | null
          location_precision?: string | null
          location_sharing_enabled?: boolean | null
          location_updated_at?: string | null
          medical_history?: Json | null
          notification_tone?: string | null
          onboarding_completed?: boolean | null
          phone_hash?: string | null
          phone_number?: string
          phone_search?: string | null
          pin?: string | null
          pin_hash?: string | null
          pin_setup_completed?: boolean | null
          preferred_auth_method?: string | null
          preferred_country_code?: string | null
          preferred_language?: string | null
          privacy_settings?: Json | null
          profile_completed_at?: string | null
          public_key?: string | null
          qr_code_token?: string | null
          referral_code?: string | null
          speed_dial_settings?: Json | null
          status?: string | null
          status_message?: string | null
          streak_count?: number | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      provider_access_consents: {
        Row: {
          created_at: string | null
          expires_at: string
          granted_at: string | null
          id: string
          is_active: boolean | null
          patient_id: string
          provider_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_id: string
          provider_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          granted_at?: string | null
          id?: string
          is_active?: boolean | null
          patient_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_access_consents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_availability: {
        Row: {
          created_at: string | null
          date: string
          id: string
          is_available: boolean | null
          provider_id: string
          time_slots: Json
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          is_available?: boolean | null
          provider_id: string
          time_slots?: Json
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          is_available?: boolean | null
          provider_id?: string
          time_slots?: Json
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_payouts: {
        Row: {
          commission_deducted: number
          created_at: string | null
          id: string
          net_payout: number
          payment_method: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          processed_at: string | null
          provider_id: string
          status: string | null
          total_earnings: number
        }
        Insert: {
          commission_deducted: number
          created_at?: string | null
          id?: string
          net_payout: number
          payment_method?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          processed_at?: string | null
          provider_id: string
          status?: string | null
          total_earnings: number
        }
        Update: {
          commission_deducted?: number
          created_at?: string | null
          id?: string
          net_payout?: number
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          processed_at?: string | null
          provider_id?: string
          status?: string | null
          total_earnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          base_price: number | null
          category_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          pricing_model: string | null
          pricing_tiers: Json | null
          provider_id: string
          service_name: string
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          category_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          pricing_model?: string | null
          pricing_tiers?: Json | null
          provider_id: string
          service_name: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          category_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          pricing_model?: string | null
          pricing_tiers?: Json | null
          provider_id?: string
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_specializations: {
        Row: {
          provider_id: string
          specialization_id: string
        }
        Insert: {
          provider_id: string
          specialization_id: string
        }
        Update: {
          provider_id?: string
          specialization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_login_sessions: {
        Row: {
          authenticated_at: string | null
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          scanned_at: string | null
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          authenticated_at?: string | null
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          scanned_at?: string | null
          status?: string
          token: string
          user_id?: string | null
        }
        Update: {
          authenticated_at?: string | null
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          scanned_at?: string | null
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      qr_payments: {
        Row: {
          amount_points: number
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          payer_id: string
          qr_token: string
          receiver_id: string
          status: string | null
          transaction_type: string
        }
        Insert: {
          amount_points: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payer_id: string
          qr_token: string
          receiver_id: string
          status?: string | null
          transaction_type: string
        }
        Update: {
          amount_points?: number
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payer_id?: string
          qr_token?: string
          receiver_id?: string
          status?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      quick_reply_templates: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          template_text: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          template_text: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          template_text?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          user_id: string
          uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          user_id: string
          uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          user_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          points_awarded: number | null
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referral_code: string
          referred_user_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_claimed: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_claimed?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_claimed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_reviews: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_by: string
          review_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_by: string
          review_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_by?: string
          review_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reported_reviews_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "home_service_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_details: {
        Row: {
          avg_delivery_time: number | null
          closing_time: string | null
          created_at: string | null
          cuisine_types: string[] | null
          delivery_charge: number | null
          delivery_radius_km: number | null
          fssai_license: string | null
          id: string
          is_accepting_orders: boolean | null
          is_pure_veg: boolean | null
          min_order_amount: number | null
          opening_time: string | null
          packaging_charge: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          avg_delivery_time?: number | null
          closing_time?: string | null
          created_at?: string | null
          cuisine_types?: string[] | null
          delivery_charge?: number | null
          delivery_radius_km?: number | null
          fssai_license?: string | null
          id?: string
          is_accepting_orders?: boolean | null
          is_pure_veg?: boolean | null
          min_order_amount?: number | null
          opening_time?: string | null
          packaging_charge?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          avg_delivery_time?: number | null
          closing_time?: string | null
          created_at?: string | null
          cuisine_types?: string[] | null
          delivery_charge?: number | null
          delivery_radius_km?: number | null
          fssai_license?: string | null
          id?: string
          is_accepting_orders?: boolean | null
          is_pure_veg?: boolean | null
          min_order_amount?: number | null
          opening_time?: string | null
          packaging_charge?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_details_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          created_at: string | null
          id: string
          reply_text: string
          review_id: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          reply_text: string
          review_id: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          reply_text?: string
          review_id?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "home_service_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_daily_challenges: {
        Row: {
          challenge_description: string | null
          challenge_name: string
          challenge_type: string
          coin_reward: number
          created_at: string
          id: string
          is_active: boolean | null
          target_value: number
        }
        Insert: {
          challenge_description?: string | null
          challenge_name: string
          challenge_type: string
          coin_reward: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_value: number
        }
        Update: {
          challenge_description?: string | null
          challenge_name?: string
          challenge_type?: string
          coin_reward?: number
          created_at?: string
          id?: string
          is_active?: boolean | null
          target_value?: number
        }
        Relationships: []
      }
      rewards_mode_settings: {
        Row: {
          ad_rewards_enabled: boolean | null
          coin_multiplier: number | null
          created_at: string
          current_streak: number | null
          daily_challenges_enabled: boolean | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          streak_bonus_enabled: boolean | null
          survey_rewards_enabled: boolean | null
          total_ads_watched: number | null
          total_coins_earned: number | null
          total_surveys_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_rewards_enabled?: boolean | null
          coin_multiplier?: number | null
          created_at?: string
          current_streak?: number | null
          daily_challenges_enabled?: boolean | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_bonus_enabled?: boolean | null
          survey_rewards_enabled?: boolean | null
          total_ads_watched?: number | null
          total_coins_earned?: number | null
          total_surveys_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_rewards_enabled?: boolean | null
          coin_multiplier?: number | null
          created_at?: string
          current_streak?: number | null
          daily_challenges_enabled?: boolean | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          streak_bonus_enabled?: boolean | null
          survey_rewards_enabled?: boolean | null
          total_ads_watched?: number | null
          total_coins_earned?: number | null
          total_surveys_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          id: string
          is_speaking: boolean | null
          joined_at: string | null
          left_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_speaking?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_speaking?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "live_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          id: string
          job_id: string
          notes: string | null
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          job_id: string
          notes?: string | null
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          job_id?: string
          notes?: string | null
          saved_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_notification_sent: string | null
          notification_enabled: boolean | null
          notification_frequency: string | null
          query: string
          results_count: number | null
          search_filters: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notification_sent?: string | null
          notification_enabled?: boolean | null
          notification_frequency?: string | null
          query: string
          results_count?: number | null
          search_filters?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_notification_sent?: string | null
          notification_enabled?: boolean | null
          notification_frequency?: string | null
          query?: string
          results_count?: number | null
          search_filters?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          media_attachments: Json | null
          message_type: string | null
          scheduled_for: string
          sender_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          media_attachments?: Json | null
          message_type?: string | null
          scheduled_for: string
          sender_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          media_attachments?: Json | null
          message_type?: string | null
          scheduled_for?: string
          sender_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          recurring_end_date: string | null
          recurring_frequency: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          recurring_end_date?: string | null
          recurring_frequency?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_alerts: {
        Row: {
          alert_data: Json | null
          alert_type: string | null
          created_at: string
          id: string
          is_read: boolean | null
          new_results_count: number | null
          saved_search_id: string | null
          sent_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_data?: Json | null
          alert_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          new_results_count?: number | null
          saved_search_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_data?: Json | null
          alert_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          new_results_count?: number | null
          saved_search_id?: string | null
          sent_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_alerts_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_analytics: {
        Row: {
          clicked_position: number | null
          clicked_result_id: string | null
          has_location: boolean | null
          id: string
          intent: string | null
          latitude: number | null
          longitude: number | null
          query_text: string
          response_time_ms: number | null
          result_count: number | null
          search_type: string
          source: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          clicked_position?: number | null
          clicked_result_id?: string | null
          has_location?: boolean | null
          id?: string
          intent?: string | null
          latitude?: number | null
          longitude?: number | null
          query_text: string
          response_time_ms?: number | null
          result_count?: number | null
          search_type: string
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_position?: number | null
          clicked_result_id?: string | null
          has_location?: boolean | null
          id?: string
          intent?: string | null
          latitude?: number | null
          longitude?: number | null
          query_text?: string
          response_time_ms?: number | null
          result_count?: number | null
          search_type?: string
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_cache: {
        Row: {
          created_at: string
          hit_count: number | null
          id: string
          last_updated: string
          query: string
          response_data: Json
        }
        Insert: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_updated?: string
          query: string
          response_data: Json
        }
        Update: {
          created_at?: string
          hit_count?: number | null
          id?: string
          last_updated?: string
          query?: string
          response_data?: Json
        }
        Relationships: []
      }
      search_filter_preferences: {
        Row: {
          created_at: string | null
          default_max_distance: number | null
          default_min_rating: number | null
          default_price_range: Json | null
          exclude_categories: string[] | null
          id: string
          preferred_categories: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          default_max_distance?: number | null
          default_min_rating?: number | null
          default_price_range?: Json | null
          exclude_categories?: string[] | null
          id?: string
          preferred_categories?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          default_max_distance?: number | null
          default_min_rating?: number | null
          default_price_range?: Json | null
          exclude_categories?: string[] | null
          id?: string
          preferred_categories?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string | null
          engine: string | null
          gps_lat: number | null
          gps_lon: number | null
          id: string
          ip: string | null
          ip_city: string | null
          ip_country: string | null
          ip_lat: number | null
          ip_lon: number | null
          last_known_lat: number | null
          last_known_lon: number | null
          query: string
          session_id: string
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          engine?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          ip?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_lat?: number | null
          ip_lon?: number | null
          last_known_lat?: number | null
          last_known_lon?: number | null
          query: string
          session_id: string
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          engine?: string | null
          gps_lat?: number | null
          gps_lon?: number | null
          id?: string
          ip?: string | null
          ip_city?: string | null
          ip_country?: string | null
          ip_lat?: number | null
          ip_lon?: number | null
          last_known_lat?: number | null
          last_known_lon?: number | null
          query?: string
          session_id?: string
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      search_performance_metrics: {
        Row: {
          avg_response_time_ms: number | null
          created_at: string | null
          date: string
          failed_requests: number | null
          id: string
          search_type: string
          source: string
          success_rate: number | null
          total_requests: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date: string
          failed_requests?: number | null
          id?: string
          search_type: string
          source: string
          success_rate?: number | null
          total_requests?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          created_at?: string | null
          date?: string
          failed_requests?: number | null
          id?: string
          search_type?: string
          source?: string
          success_rate?: number | null
          total_requests?: number | null
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          category: string | null
          created_at: string
          id: string
          intent: string | null
          location_lat: number | null
          location_lng: number | null
          location_text: string | null
          query_text: string
          source: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          query_text: string
          source?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_text?: string | null
          query_text?: string
          source?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      search_result_rankings: {
        Row: {
          created_at: string | null
          distance_score: number | null
          freshness_score: number | null
          id: string
          popularity_score: number | null
          query_text: string
          ranking_score: number | null
          rating_score: number | null
          relevance_score: number | null
          result_id: string
          result_type: string | null
        }
        Insert: {
          created_at?: string | null
          distance_score?: number | null
          freshness_score?: number | null
          id?: string
          popularity_score?: number | null
          query_text: string
          ranking_score?: number | null
          rating_score?: number | null
          relevance_score?: number | null
          result_id: string
          result_type?: string | null
        }
        Update: {
          created_at?: string | null
          distance_score?: number | null
          freshness_score?: number | null
          id?: string
          popularity_score?: number | null
          query_text?: string
          ranking_score?: number | null
          rating_score?: number | null
          relevance_score?: number | null
          result_id?: string
          result_type?: string | null
        }
        Relationships: []
      }
      search_results: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          description: string | null
          distance: number | null
          id: string
          image_url: string | null
          link: string | null
          metadata: Json | null
          price: string | null
          query_id: string | null
          rating: number | null
          result_type: string | null
          review_count: number | null
          source: string
          title: string
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          image_url?: string | null
          link?: string | null
          metadata?: Json | null
          price?: string | null
          query_id?: string | null
          rating?: number | null
          result_type?: string | null
          review_count?: number | null
          source: string
          title: string
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          distance?: number | null
          id?: string
          image_url?: string | null
          link?: string | null
          metadata?: Json | null
          price?: string | null
          query_id?: string | null
          rating?: number | null
          result_type?: string | null
          review_count?: number | null
          source?: string
          title?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "search_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "search_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      search_suggestions: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_trending: boolean | null
          last_used_at: string | null
          popularity_score: number | null
          suggestion_text: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_trending?: boolean | null
          last_used_at?: string | null
          popularity_score?: number | null
          suggestion_text: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_trending?: boolean | null
          last_used_at?: string | null
          popularity_score?: number | null
          suggestion_text?: string
        }
        Relationships: []
      }
      seller_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          broadcasts_sent: number | null
          customer_count: number | null
          date: string
          id: string
          messages_received: number | null
          messages_sent: number | null
          products_shared: number | null
          user_id: string
        }
        Insert: {
          avg_response_time_seconds?: number | null
          broadcasts_sent?: number | null
          customer_count?: number | null
          date?: string
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          products_shared?: number | null
          user_id: string
        }
        Update: {
          avg_response_time_seconds?: number | null
          broadcasts_sent?: number | null
          customer_count?: number | null
          date?: string
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          products_shared?: number | null
          user_id?: string
        }
        Relationships: []
      }
      seller_invoices: {
        Row: {
          amount: number
          id: string
          invoice_number: string
          issued_at: string | null
          pdf_url: string | null
          period_end: string
          period_start: string
          seller_id: string
          status: string | null
          tax_amount: number | null
          total_amount: number
          withdrawal_request_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          invoice_number: string
          issued_at?: string | null
          pdf_url?: string | null
          period_end: string
          period_start: string
          seller_id: string
          status?: string | null
          tax_amount?: number | null
          total_amount: number
          withdrawal_request_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string | null
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          seller_id?: string
          status?: string | null
          tax_amount?: number | null
          total_amount?: number
          withdrawal_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_invoices_withdrawal_request_id_fkey"
            columns: ["withdrawal_request_id"]
            isOneToOne: false
            referencedRelation: "seller_withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string
          id: string
          rejection_reason: string | null
          seller_id: string
          status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url: string
          id?: string
          rejection_reason?: string | null
          seller_id: string
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          rejection_reason?: string | null
          seller_id?: string
          status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_kyc_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "chatr_plus_sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_mode_settings: {
        Row: {
          analytics_enabled: boolean | null
          auto_response_enabled: boolean | null
          auto_response_message: string | null
          away_message: string | null
          broadcast_enabled: boolean | null
          business_category: string | null
          business_hours: Json | null
          business_name: string | null
          created_at: string
          id: string
          priority_support: boolean | null
          quick_replies: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_enabled?: boolean | null
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          away_message?: string | null
          broadcast_enabled?: boolean | null
          business_category?: string | null
          business_hours?: Json | null
          business_name?: string | null
          created_at?: string
          id?: string
          priority_support?: boolean | null
          quick_replies?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_enabled?: boolean | null
          auto_response_enabled?: boolean | null
          auto_response_message?: string | null
          away_message?: string | null
          broadcast_enabled?: boolean | null
          business_category?: string | null
          business_hours?: Json | null
          business_name?: string | null
          created_at?: string
          id?: string
          priority_support?: boolean | null
          quick_replies?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          net_amount: number
          payment_id: string | null
          platform_fee: number | null
          seller_id: string
          seller_upi_id: string | null
          settled_at: string | null
          settlement_method: string | null
          settlement_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          net_amount: number
          payment_id?: string | null
          platform_fee?: number | null
          seller_id: string
          seller_upi_id?: string | null
          settled_at?: string | null
          settlement_method?: string | null
          settlement_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          net_amount?: number
          payment_id?: string | null
          platform_fee?: number | null
          seller_id?: string
          seller_upi_id?: string | null
          settled_at?: string | null
          settlement_method?: string | null
          settlement_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_settlements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "upi_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          seller_id: string
          service_id: string | null
          status: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          seller_id: string
          service_id?: string | null
          status?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          seller_id?: string
          service_id?: string | null
          status?: string | null
          transaction_type?: string
        }
        Relationships: []
      }
      seller_withdrawal_requests: {
        Row: {
          amount: number
          bank_account_last4: string | null
          completed_at: string | null
          id: string
          notes: string | null
          processed_at: string | null
          rejection_reason: string | null
          requested_at: string | null
          seller_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          bank_account_last4?: string | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          seller_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_last4?: string | null
          completed_at?: string | null
          id?: string
          notes?: string | null
          processed_at?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          seller_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          accepted_at: string | null
          after_photos: Json | null
          before_photos: Json | null
          booking_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          category_id: string
          commission_amount: number | null
          completed_at: string | null
          contact_phone: string | null
          coupon_code: string | null
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          id: string
          latitude: number | null
          longitude: number | null
          payment_method: string | null
          payment_status: string | null
          payment_transaction_id: string | null
          pricing_details: Json | null
          provider_earnings: number | null
          provider_id: string
          reached_at: string | null
          scheduled_date: string
          scheduled_time: string
          service_address: string
          service_id: string
          special_instructions: string | null
          started_at: string | null
          status: string | null
          subtotal: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          after_photos?: Json | null
          before_photos?: Json | null
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id: string
          commission_amount?: number | null
          completed_at?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_method?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          pricing_details?: Json | null
          provider_earnings?: number | null
          provider_id: string
          reached_at?: string | null
          scheduled_date: string
          scheduled_time: string
          service_address: string
          service_id: string
          special_instructions?: string | null
          started_at?: string | null
          status?: string | null
          subtotal: number
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          after_photos?: Json | null
          before_photos?: Json | null
          booking_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          category_id?: string
          commission_amount?: number | null
          completed_at?: string | null
          contact_phone?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          payment_method?: string | null
          payment_status?: string | null
          payment_transaction_id?: string | null
          pricing_details?: Json | null
          provider_earnings?: number | null
          provider_id?: string
          reached_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_address?: string
          service_id?: string
          special_instructions?: string | null
          started_at?: string | null
          status?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bundles: {
        Row: {
          bundle_price: number
          bundle_type: string | null
          created_at: string | null
          description: string | null
          id: string
          included_services: Json
          is_active: boolean | null
          name: string
          original_price: number | null
          validity_days: number | null
        }
        Insert: {
          bundle_price: number
          bundle_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          included_services: Json
          is_active?: boolean | null
          name: string
          original_price?: number | null
          validity_days?: number | null
        }
        Update: {
          bundle_price?: number
          bundle_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          included_services?: Json
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          validity_days?: number | null
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_parent_category"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_chat_messages: {
        Row: {
          attachment_url: string | null
          booking_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_text: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          booking_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          booking_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_chat_messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_coupons: {
        Row: {
          applicable_categories: string[] | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_order_amount: number | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_order_amount?: number | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      service_memberships: {
        Row: {
          auto_renew: boolean | null
          benefits: Json
          created_at: string | null
          end_date: string
          id: string
          plan_name: string
          plan_type: string | null
          price: number
          start_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          benefits: Json
          created_at?: string | null
          end_date: string
          id?: string
          plan_name: string
          plan_type?: string | null
          price: number
          start_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          benefits?: Json
          created_at?: string | null
          end_date?: string
          id?: string
          plan_name?: string
          plan_type?: string | null
          price?: number
          start_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          aadhaar_document_url: string | null
          aadhaar_number: string | null
          address: string | null
          base_price: number | null
          business_name: string
          city: string | null
          commission_percentage: number | null
          created_at: string | null
          description: string | null
          email: string | null
          experience_years: number | null
          id: string
          is_active: boolean | null
          is_online: boolean | null
          is_verified: boolean | null
          kyc_status: string | null
          latitude: number | null
          longitude: number | null
          other_documents: Json | null
          pan_document_url: string | null
          pan_number: string | null
          phone_number: string | null
          pincode: string | null
          pricing_type: string | null
          profile_image_url: string | null
          rating_average: number | null
          rating_count: number | null
          state: string | null
          total_bookings: number | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          aadhaar_document_url?: string | null
          aadhaar_number?: string | null
          address?: string | null
          base_price?: number | null
          business_name: string
          city?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          kyc_status?: string | null
          latitude?: number | null
          longitude?: number | null
          other_documents?: Json | null
          pan_document_url?: string | null
          pan_number?: string | null
          phone_number?: string | null
          pincode?: string | null
          pricing_type?: string | null
          profile_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          state?: string | null
          total_bookings?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          aadhaar_document_url?: string | null
          aadhaar_number?: string | null
          address?: string | null
          base_price?: number | null
          business_name?: string
          city?: string | null
          commission_percentage?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          experience_years?: number | null
          id?: string
          is_active?: boolean | null
          is_online?: boolean | null
          is_verified?: boolean | null
          kyc_status?: string | null
          latitude?: number | null
          longitude?: number | null
          other_documents?: Json | null
          pan_document_url?: string | null
          pan_number?: string | null
          phone_number?: string | null
          pincode?: string | null
          pricing_type?: string | null
          profile_image_url?: string | null
          rating_average?: number | null
          rating_count?: number | null
          state?: string | null
          total_bookings?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      service_reviews: {
        Row: {
          booking_id: string
          created_at: string | null
          customer_id: string
          id: string
          photos: Json | null
          provider_id: string
          provider_response: string | null
          provider_response_at: string | null
          rating: number
          review_text: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          photos?: Json | null
          provider_id: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating: number
          review_text?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          photos?: Json | null
          provider_id?: string
          provider_response?: string | null
          provider_response_at?: string | null
          rating?: number
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          point_discount_percentage: number | null
          price: number | null
          price_points: number | null
          provider_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          point_discount_percentage?: number | null
          price?: number | null
          price_points?: number | null
          provider_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          point_discount_percentage?: number | null
          price?: number | null
          price_points?: number | null
          provider_id?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: string
          joined_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "expert_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      specializations: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      sso_tokens: {
        Row: {
          app_id: string | null
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_tokens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sso_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      starred_messages: {
        Row: {
          conversation_id: string
          id: string
          message_id: string
          starred_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          message_id: string
          starred_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          message_id?: string
          starred_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "starred_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      status_views: {
        Row: {
          id: string
          status_id: string
          viewed_at: string | null
          viewer_id: string
        }
        Insert: {
          id?: string
          status_id: string
          viewed_at?: string | null
          viewer_id: string
        }
        Update: {
          id?: string
          status_id?: string
          viewed_at?: string | null
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_views_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "user_status"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          background_color: string | null
          caption: string | null
          created_at: string | null
          expires_at: string | null
          font_style: string | null
          id: string
          is_active: boolean | null
          media_type: string | null
          media_url: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          background_color?: string | null
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          font_style?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          background_color?: string | null
          caption?: string | null
          created_at?: string | null
          expires_at?: string | null
          font_style?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string | null
          media_url?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      stealth_mode_subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string
          currency: string | null
          expires_at: string | null
          id: string
          payment_method: string | null
          plan_type: string
          started_at: string
          status: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_type: string
          started_at?: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string
          started_at?: string
          status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          privacy: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at: string
          id?: string
          media_type: string
          media_url: string
          privacy?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          privacy?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string | null
          id: string
          stories: string[] | null
          title: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          stories?: string[] | null
          title: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          id?: string
          stories?: string[] | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      story_reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_reactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_design_templates: {
        Row: {
          category: string
          created_at: string
          dimensions: Json | null
          id: string
          is_premium: boolean | null
          name: string
          template_data: Json
          thumbnail_url: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          dimensions?: Json | null
          id?: string
          is_premium?: boolean | null
          name: string
          template_data?: Json
          thumbnail_url?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          dimensions?: Json | null
          id?: string
          is_premium?: boolean | null
          name?: string
          template_data?: Json
          thumbnail_url?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      studio_user_designs: {
        Row: {
          created_at: string
          design_data: Json
          exported_url: string | null
          id: string
          is_published: boolean | null
          name: string
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_data?: Json
          exported_url?: string | null
          id?: string
          is_published?: boolean | null
          name: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_data?: Json
          exported_url?: string | null
          id?: string
          is_published?: boolean | null
          name?: string
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_user_designs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "studio_design_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_items: {
        Row: {
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          is_generic: boolean | null
          medicine_id: string | null
          medicine_name: string
          notes: string | null
          quantity_per_month: number | null
          subscription_id: string
          timing: string[] | null
          total_price: number | null
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_generic?: boolean | null
          medicine_id?: string | null
          medicine_name: string
          notes?: string | null
          quantity_per_month?: number | null
          subscription_id: string
          timing?: string[] | null
          total_price?: number | null
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          is_generic?: boolean | null
          medicine_id?: string | null
          medicine_name?: string
          notes?: string | null
          quantity_per_month?: number | null
          subscription_id?: string
          timing?: string[] | null
          total_price?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicine_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "medicine_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          limits: Json | null
          monthly_price: number
          name: string
          yearly_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          monthly_price?: number
          name: string
          yearly_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          limits?: Json | null
          monthly_price?: number
          name?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      symptom_checks: {
        Row: {
          ai_assessment: string | null
          created_at: string | null
          id: string
          recommended_actions: Json | null
          severity_level: string | null
          specialist_type: string | null
          symptoms: Json
          user_id: string
        }
        Insert: {
          ai_assessment?: string | null
          created_at?: string | null
          id?: string
          recommended_actions?: Json | null
          severity_level?: string | null
          specialist_type?: string | null
          symptoms: Json
          user_id: string
        }
        Update: {
          ai_assessment?: string | null
          created_at?: string | null
          id?: string
          recommended_actions?: Json | null
          severity_level?: string | null
          specialist_type?: string | null
          symptoms?: Json
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teleconsultation_bookings: {
        Row: {
          appointment_date: string
          consultation_type: string | null
          created_at: string | null
          doctor_id: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          payment_amount: number | null
          payment_status: string | null
          prescription_id: string | null
          reason: string
          status: string | null
          symptoms: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_date: string
          consultation_type?: string | null
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          prescription_id?: string | null
          reason: string
          status?: string | null
          symptoms?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_date?: string
          consultation_type?: string | null
          created_at?: string | null
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_status?: string | null
          prescription_id?: string | null
          reason?: string
          status?: string | null
          symptoms?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teleconsultation_slots: {
        Row: {
          appointment_id: string | null
          booked_by: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          is_available: boolean | null
          provider_id: string
          slot_date: string
          slot_time: string
        }
        Insert: {
          appointment_id?: string | null
          booked_by?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean | null
          provider_id: string
          slot_date: string
          slot_time: string
        }
        Update: {
          appointment_id?: string | null
          booked_by?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          is_available?: boolean | null
          provider_id?: string
          slot_date?: string
          slot_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "teleconsultation_slots_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          amount: number | null
          created_at: string
          duration_minutes: number | null
          id: string
          mood_after: number | null
          mood_before: number | null
          payment_status: string | null
          scheduled_at: string
          session_notes: string | null
          session_type: string
          status: string
          therapist_id: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          payment_status?: string | null
          scheduled_at: string
          session_notes?: string | null
          session_type: string
          status?: string
          therapist_id: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          payment_status?: string | null
          scheduled_at?: string
          session_notes?: string | null
          session_type?: string
          status?: string
          therapist_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trending_categories: {
        Row: {
          category_name: string
          created_at: string | null
          emoji: string | null
          id: string
          region: string | null
          trend_score: number | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          emoji?: string | null
          id?: string
          region?: string | null
          trend_score?: number | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          emoji?: string | null
          id?: string
          region?: string | null
          trend_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trending_searches: {
        Row: {
          category: string | null
          created_at: string
          id: string
          last_searched_at: string
          query: string
          search_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          last_searched_at?: string
          query: string
          search_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          last_searched_at?: string
          query?: string
          search_count?: number | null
        }
        Relationships: []
      }
      tutor_bookings: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          notes: string | null
          session_date: string
          status: string | null
          student_feedback: string | null
          student_id: string | null
          student_rating: number | null
          subject: string
          tutor_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          session_date: string
          status?: string | null
          student_feedback?: string | null
          student_id?: string | null
          student_rating?: number | null
          subject: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          notes?: string | null
          session_date?: string
          status?: string | null
          student_feedback?: string | null
          student_id?: string | null
          student_rating?: number | null
          subject?: string
          tutor_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_bookings_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_reviews: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          rating: number
          review_text: string | null
          student_id: string | null
          tutor_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          rating: number
          review_text?: string | null
          student_id?: string | null
          tutor_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          student_id?: string | null
          tutor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutor_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "tutor_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_reviews_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          availability: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          education: string | null
          full_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          languages: Json | null
          rating_average: number | null
          subjects: Json | null
          total_sessions: number | null
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          education?: string | null
          full_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: Json | null
          rating_average?: number | null
          subjects?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          availability?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          education?: string | null
          full_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          languages?: Json | null
          rating_average?: number | null
          subjects?: Json | null
          total_sessions?: number | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      two_factor_auth: {
        Row: {
          backup_codes_encrypted: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          secret_key_encrypted: string
          user_id: string
        }
        Insert: {
          backup_codes_encrypted?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_key_encrypted: string
          user_id: string
        }
        Update: {
          backup_codes_encrypted?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_key_encrypted?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_auth_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          order_type: string
          payment_screenshot_url: string | null
          seller_id: string | null
          settled_at: string | null
          settlement_reference: string | null
          status: string
          updated_at: string
          upi_reference: string | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_type: string
          payment_screenshot_url?: string | null
          seller_id?: string | null
          settled_at?: string | null
          settlement_reference?: string | null
          status?: string
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_type?: string
          payment_screenshot_url?: string | null
          seller_id?: string | null
          settled_at?: string | null
          settlement_reference?: string | null
          status?: string
          updated_at?: string
          upi_reference?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_activities: {
        Row: {
          activity_type: string
          coins_earned: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          coins_earned?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          coins_earned?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: string
          id: string
          user_id: string
          verification_details: Json | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          badge_type: string
          id?: string
          user_id: string
          verification_details?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          badge_type?: string
          id?: string
          user_id?: string
          verification_details?: Json | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          coins_awarded: number | null
          completed: boolean | null
          completed_at: string | null
          current_progress: number | null
          date: string
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          coins_awarded?: number | null
          completed?: boolean | null
          completed_at?: string | null
          current_progress?: number | null
          date?: string
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          coins_awarded?: number | null
          completed?: boolean | null
          completed_at?: string | null
          current_progress?: number | null
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "rewards_daily_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_contacts: {
        Row: {
          contact_user_id: string
          created_at: string | null
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          contact_user_id: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          contact_user_id?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          active_call_id: string | null
          browser: string | null
          created_at: string | null
          device_fingerprint: string
          device_name: string
          device_type: string
          id: string
          ip_address: string | null
          is_online: boolean | null
          last_active: string | null
          last_seen: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          active_call_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint: string
          device_name: string
          device_type?: string
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_active?: string | null
          last_seen?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          active_call_id?: string | null
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string
          device_type?: string
          id?: string
          ip_address?: string | null
          is_online?: boolean | null
          last_active?: string | null
          last_seen?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_devices_active_call_id_fkey"
            columns: ["active_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_devices_active_call_id_fkey"
            columns: ["active_call_id"]
            isOneToOne: false
            referencedRelation: "missed_calls_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_fame_achievements: {
        Row: {
          achievement_id: string | null
          earned_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          achievement_id?: string | null
          earned_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_fame_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "fame_achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_health_profiles: {
        Row: {
          blood_group: string | null
          conditions: string[] | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gender: string | null
          height_cm: number | null
          id: string
          preferred_language: string | null
          reminder_preferences: Json | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          blood_group?: string | null
          conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          preferred_language?: string | null
          reminder_preferences?: Json | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          blood_group?: string | null
          conditions?: string[] | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          preferred_language?: string | null
          reminder_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_installed_apps: {
        Row: {
          app_id: string
          id: string
          installed_at: string | null
          last_opened_at: string | null
          user_id: string
        }
        Insert: {
          app_id: string
          id?: string
          installed_at?: string | null
          last_opened_at?: string | null
          user_id: string
        }
        Update: {
          app_id?: string
          id?: string
          installed_at?: string | null
          last_opened_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_installed_apps_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_installed_plugins: {
        Row: {
          app_id: string
          id: string
          installed_at: string | null
          is_active: boolean | null
          position: number | null
          user_id: string
        }
        Insert: {
          app_id: string
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          position?: number | null
          user_id: string
        }
        Update: {
          app_id?: string
          id?: string
          installed_at?: string | null
          is_active?: boolean | null
          position?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_installed_plugins_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          user_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          wellness_reminder_enabled: boolean | null
          wellness_reminder_time: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          wellness_reminder_enabled?: boolean | null
          wellness_reminder_time?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          wellness_reminder_enabled?: boolean | null
          wellness_reminder_time?: string | null
        }
        Relationships: []
      }
      user_reward_redemptions: {
        Row: {
          expires_at: string
          id: string
          metadata: Json | null
          points_spent: number
          redeemed_at: string
          redemption_code: string | null
          reward_id: string
          status: string
          transaction_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          expires_at: string
          id?: string
          metadata?: Json | null
          points_spent: number
          redeemed_at?: string
          redemption_code?: string | null
          reward_id: string
          status?: string
          transaction_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          metadata?: Json | null
          points_spent?: number
          redeemed_at?: string
          redemption_code?: string | null
          reward_id?: string
          status?: string
          transaction_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "point_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reward_redemptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rewards: {
        Row: {
          coins_spent: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          redeemed_at: string | null
          reward_name: string
          reward_type: string
          reward_value: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          coins_spent?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          redeemed_at?: string | null
          reward_name: string
          reward_type: string
          reward_value?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          coins_spent?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          redeemed_at?: string | null
          reward_name?: string
          reward_type?: string
          reward_value?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_search_interactions: {
        Row: {
          action: string
          created_at: string
          id: string
          result_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          result_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          result_id?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_search_interactions_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "search_results"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          call_notifications: boolean | null
          created_at: string | null
          data_usage: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          last_seen_visibility: string | null
          message_notifications: boolean | null
          profile_visibility: string | null
          push_notifications: boolean | null
          read_receipts: boolean | null
          theme: string | null
          typing_indicators: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          call_notifications?: boolean | null
          created_at?: string | null
          data_usage?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          last_seen_visibility?: string | null
          message_notifications?: boolean | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          read_receipts?: boolean | null
          theme?: string | null
          typing_indicators?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          call_notifications?: boolean | null
          created_at?: string | null
          data_usage?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          last_seen_visibility?: string | null
          message_notifications?: boolean | null
          profile_visibility?: string | null
          push_notifications?: boolean | null
          read_receipts?: boolean | null
          theme?: string | null
          typing_indicators?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          background_color: string | null
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          user_id: string
          views_count: number | null
        }
        Insert: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id: string
          views_count?: number | null
        }
        Update: {
          background_color?: string | null
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      user_stealth_modes: {
        Row: {
          created_at: string
          current_mode: string
          id: string
          rewards_opted_in: boolean | null
          rewards_opted_in_at: string | null
          seller_verified: boolean | null
          seller_verified_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_mode?: string
          id?: string
          rewards_opted_in?: boolean | null
          rewards_opted_in_at?: string | null
          seller_verified?: boolean | null
          seller_verified_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_mode?: string
          id?: string
          rewards_opted_in?: boolean | null
          rewards_opted_in_at?: string | null
          seller_verified?: boolean | null
          seller_verified_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_login_date: string | null
          longest_streak: number | null
          total_logins: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          total_logins?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_login_date?: string | null
          longest_streak?: number | null
          total_logins?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vaccination_records: {
        Row: {
          administered_by: string | null
          batch_number: string | null
          certificate_url: string | null
          created_at: string | null
          date_administered: string
          dose_number: number
          id: string
          next_dose_date: string | null
          requires_signed_url: boolean | null
          url_expires_at: string | null
          user_id: string
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          batch_number?: string | null
          certificate_url?: string | null
          created_at?: string | null
          date_administered: string
          dose_number?: number
          id?: string
          next_dose_date?: string | null
          requires_signed_url?: boolean | null
          url_expires_at?: string | null
          user_id: string
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          batch_number?: string | null
          certificate_url?: string | null
          created_at?: string | null
          date_administered?: string
          dose_number?: number
          id?: string
          next_dose_date?: string | null
          requires_signed_url?: boolean | null
          url_expires_at?: string | null
          user_id?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          vendor_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          vendor_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_settlements: {
        Row: {
          commission_amount: number
          created_at: string | null
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          order_count: number | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string | null
          vendor_id: string
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          notes?: string | null
          order_count?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string | null
          vendor_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          order_count?: number | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_settlements_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          city: string | null
          commission_rate: number | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          gst_number: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          pan_number: string | null
          pincode: string | null
          rating: number | null
          state: string | null
          total_orders: number | null
          total_revenue: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          city?: string | null
          commission_rate?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          pan_number?: string | null
          pincode?: string | null
          rating?: number | null
          state?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          vendor_type: Database["public"]["Enums"]["vendor_type"]
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          city?: string | null
          commission_rate?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          pan_number?: string | null
          pincode?: string | null
          rating?: number | null
          state?: string | null
          total_orders?: number | null
          total_revenue?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_type?: Database["public"]["Enums"]["vendor_type"]
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      visual_search_cache: {
        Row: {
          created_at: string | null
          detected_objects: Json | null
          expires_at: string | null
          id: string
          image_hash: string
          search_results: Json | null
        }
        Insert: {
          created_at?: string | null
          detected_objects?: Json | null
          expires_at?: string | null
          id?: string
          image_hash: string
          search_results?: Json | null
        }
        Update: {
          created_at?: string | null
          detected_objects?: Json | null
          expires_at?: string | null
          id?: string
          image_hash?: string
          search_results?: Json | null
        }
        Relationships: []
      }
      visual_search_history: {
        Row: {
          created_at: string
          id: string
          image_analysis: Json | null
          image_url: string
          results_found: number | null
          search_query_generated: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_analysis?: Json | null
          image_url: string
          results_found?: number | null
          search_query_generated?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_analysis?: Json | null
          image_url?: string
          results_found?: number | null
          search_query_generated?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      voice_transcriptions: {
        Row: {
          confidence: number | null
          created_at: string | null
          duration_seconds: number | null
          id: string
          language: string | null
          message_id: string
          transcription: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          message_id: string
          transcription: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          language?: string | null
          message_id?: string
          transcription?: string
        }
        Relationships: []
      }
      voicemails: {
        Row: {
          audio_url: string
          caller_id: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          is_read: boolean | null
          receiver_id: string
          transcription: string | null
        }
        Insert: {
          audio_url: string
          caller_id: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          transcription?: string | null
        }
        Update: {
          audio_url?: string
          caller_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          transcription?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      webrtc_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          signal_data: Json
          signal_type: string
          to_user: string
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          signal_data: Json
          signal_type: string
          to_user: string
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          signal_data?: Json
          signal_type?: string
          to_user?: string
        }
        Relationships: []
      }
      wellness_tracking: {
        Row: {
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          created_at: string | null
          date: string
          heart_rate: number | null
          id: string
          mood: string | null
          notes: string | null
          sleep_hours: number | null
          steps: number | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          date?: string
          heart_rate?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          steps?: number | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          created_at?: string | null
          date?: string
          heart_rate?: number | null
          id?: string
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          steps?: number | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      youth_posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          media_types: string[] | null
          media_urls: string[] | null
          mood: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_types?: string[] | null
          media_urls?: string[] | null
          mood?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          media_types?: string[] | null
          media_urls?: string[] | null
          mood?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youth_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      missed_calls_view: {
        Row: {
          call_type: string | null
          caller_avatar: string | null
          caller_id: string | null
          caller_username: string | null
          created_at: string | null
          id: string | null
          receiver_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_call_participant: {
        Args: { p_call_id: string; p_user_id: string }
        Returns: undefined
      }
      backfill_phone_hashes: { Args: never; Returns: undefined }
      calculate_bmi: {
        Args: { p_height_cm: number; p_weight_kg: number }
        Returns: {
          bmi_category: string
          bmi_value: number
        }[]
      }
      check_api_limit: {
        Args: { api: string; daily_max?: number }
        Returns: Json
      }
      clean_expired_geo_cache: { Args: never; Returns: undefined }
      cleanup_disappearing_messages: { Args: never; Returns: undefined }
      cleanup_expired_messages: { Args: never; Returns: number }
      cleanup_expired_qr_sessions: { Args: never; Returns: undefined }
      cleanup_expired_visual_search_cache: { Args: never; Returns: undefined }
      cleanup_old_webrtc_signals: { Args: never; Returns: undefined }
      create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      create_mutual_contact: {
        Args: { user1_email: string; user2_email: string }
        Returns: undefined
      }
      decrypt_health_value: {
        Args: { encrypted_value: string; user_id: string }
        Returns: number
      }
      decrypt_kyc_value: {
        Args: { encrypted_value: string; user_id: string }
        Returns: string
      }
      encrypt_health_value: {
        Args: { user_id: string; value: number }
        Returns: string
      }
      encrypt_kyc_value: {
        Args: { user_id: string; value: string }
        Returns: string
      }
      expire_old_inter_app_messages: { Args: never; Returns: undefined }
      find_emotion_matches: {
        Args: { p_emotion: string; p_user_id: string }
        Returns: {
          avatar_url: string
          emotion: string
          intensity: number
          match_user_id: string
          username: string
        }[]
      }
      find_shared_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      find_user_for_call: {
        Args: { search_term: string }
        Returns: {
          avatar_url: string
          id: string
          is_online: boolean
          phone_number: string
          username: string
        }[]
      }
      generate_sso_token: { Args: { app_id_param: string }; Returns: string }
      generate_user_referral_code: { Args: never; Returns: string }
      get_brand_for_object: {
        Args: { p_object_type: string; p_user_id?: string }
        Returns: {
          brand_id: string
          brand_name: string
          placement_id: string
          replacement_asset_url: string
          replacement_type: string
        }[]
      }
      get_call_participants: {
        Args: { p_call_id: string }
        Returns: {
          audio_enabled: boolean
          avatar_url: string
          is_active: boolean
          user_id: string
          username: string
          video_enabled: boolean
        }[]
      }
      get_conversation_messages: {
        Args: { p_before?: string; p_conversation_id: string; p_limit?: number }
        Returns: {
          content: string
          created_at: string
          is_deleted: boolean
          is_edited: boolean
          is_starred: boolean
          media_attachments: Json
          media_url: string
          message_id: string
          message_type: string
          reactions: Json
          reply_to_id: string
          sender_avatar: string
          sender_id: string
          sender_name: string
          status: string
        }[]
      }
      get_user_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          group_icon_url: string
          group_name: string
          is_archived: boolean
          is_group: boolean
          is_muted: boolean
          last_message: string
          last_message_at: string
          last_message_sender_id: string
          last_message_type: string
          other_user_avatar: string
          other_user_id: string
          other_user_name: string
          other_user_online: boolean
          unread_count: number
        }[]
      }
      get_user_conversations_optimized: {
        Args: { p_user_id: string }
        Returns: {
          community_description: string
          group_icon_url: string
          group_name: string
          id: string
          is_community: boolean
          is_group: boolean
          lastmessage: string
          lastmessagetime: string
          otheruser: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cache_hit: { Args: { cache_id: string }; Returns: undefined }
      increment_community_members: {
        Args: { community_id: string }
        Returns: undefined
      }
      increment_job_views: { Args: { job_id: string }; Returns: undefined }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      process_chatr_plus_payment: {
        Args: {
          p_amount: number
          p_booking_id?: string
          p_description?: string
          p_payment_method: string
          p_transaction_type: string
          p_user_id: string
        }
        Returns: string
      }
      process_coin_payment: {
        Args: {
          p_amount: number
          p_app_id?: string
          p_description: string
          p_merchant_id: string
          p_payment_type: string
          p_user_id: string
        }
        Returns: string
      }
      process_referral_reward: {
        Args: { referral_code_param: string }
        Returns: boolean
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_description: string
          p_reference_id?: string
          p_reference_type?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      sync_user_contacts: {
        Args: { contact_list: Json; user_uuid: string }
        Returns: undefined
      }
      toggle_message_reaction: {
        Args: { p_emoji: string; p_message_id: string; p_user_id: string }
        Returns: Json
      }
      track_app_usage: { Args: { p_app_id: string }; Returns: undefined }
      track_brand_impression: {
        Args: {
          p_brand_id: string
          p_detected_object?: string
          p_duration?: number
          p_impression_type: string
          p_placement_id: string
          p_user_id: string
        }
        Returns: string
      }
      update_cache_hit_count: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "consumer" | "doctor" | "nurse" | "pharmacy" | "admin"
      vendor_type: "restaurant" | "deal_merchant" | "healthcare_provider"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["consumer", "doctor", "nurse", "pharmacy", "admin"],
      vendor_type: ["restaurant", "deal_merchant", "healthcare_provider"],
    },
  },
} as const
