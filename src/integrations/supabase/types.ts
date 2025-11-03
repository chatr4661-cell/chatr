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
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
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
      calls: {
        Row: {
          average_bitrate: number | null
          call_type: string
          caller_avatar: string | null
          caller_id: string
          caller_name: string | null
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
          is_muted: boolean | null
          joined_at: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
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
      deal_redemptions: {
        Row: {
          deal_id: string
          id: string
          qr_code: string | null
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          deal_id: string
          id?: string
          qr_code?: string | null
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          deal_id?: string
          id?: string
          qr_code?: string | null
          redeemed_at?: string | null
          user_id?: string
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
          created_at: string | null
          delivery_address: string
          id: string
          items: Json
          status: string | null
          total_amount: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          delivery_address: string
          id?: string
          items: Json
          status?: string | null
          total_amount: number
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          delivery_address?: string
          id?: string
          items?: Json
          status?: string | null
          total_amount?: number
          user_id?: string
          vendor_id?: string
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
            foreignKeyName: "home_service_providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "medical_access_audit_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
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
          encryption_key_id: string | null
          file_name: string | null
          file_size: number | null
          forwarded_from_id: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_encrypted: boolean | null
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
          encryption_key_id?: string | null
          file_name?: string | null
          file_size?: number | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_encrypted?: boolean | null
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
          encryption_key_id?: string | null
          file_name?: string | null
          file_size?: number | null
          forwarded_from_id?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_encrypted?: boolean | null
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
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "point_settlements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "prescriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          auto_backup_enabled: boolean | null
          auto_backup_frequency: string | null
          auto_translate_enabled: boolean | null
          avatar_url: string | null
          call_ringtone: string | null
          contacts_synced: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          gender: string | null
          google_id: string | null
          health_goals: string[] | null
          id: string
          is_online: boolean | null
          is_phone_verified: boolean | null
          last_backup_at: string | null
          last_contact_sync: string | null
          last_seen: string | null
          lifestyle: Json | null
          medical_history: Json | null
          notification_tone: string | null
          onboarding_completed: boolean | null
          phone_hash: string | null
          phone_number: string
          phone_search: string | null
          pin: string | null
          pin_setup_completed: boolean | null
          preferred_auth_method: string | null
          preferred_country_code: string | null
          preferred_language: string | null
          profile_completed_at: string | null
          qr_code_token: string | null
          referral_code: string | null
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
          call_ringtone?: string | null
          contacts_synced?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          health_goals?: string[] | null
          id: string
          is_online?: boolean | null
          is_phone_verified?: boolean | null
          last_backup_at?: string | null
          last_contact_sync?: string | null
          last_seen?: string | null
          lifestyle?: Json | null
          medical_history?: Json | null
          notification_tone?: string | null
          onboarding_completed?: boolean | null
          phone_hash?: string | null
          phone_number: string
          phone_search?: string | null
          pin?: string | null
          pin_setup_completed?: boolean | null
          preferred_auth_method?: string | null
          preferred_country_code?: string | null
          preferred_language?: string | null
          profile_completed_at?: string | null
          qr_code_token?: string | null
          referral_code?: string | null
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
          call_ringtone?: string | null
          contacts_synced?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          gender?: string | null
          google_id?: string | null
          health_goals?: string[] | null
          id?: string
          is_online?: boolean | null
          is_phone_verified?: boolean | null
          last_backup_at?: string | null
          last_contact_sync?: string | null
          last_seen?: string | null
          lifestyle?: Json | null
          medical_history?: Json | null
          notification_tone?: string | null
          onboarding_completed?: boolean | null
          phone_hash?: string | null
          phone_number?: string
          phone_search?: string | null
          pin?: string | null
          pin_setup_completed?: boolean | null
          preferred_auth_method?: string | null
          preferred_country_code?: string | null
          preferred_language?: string | null
          profile_completed_at?: string | null
          qr_code_token?: string | null
          referral_code?: string | null
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
          {
            foreignKeyName: "provider_access_consents_provider_id_fkey"
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
            foreignKeyName: "provider_specializations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_specializations_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
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
      service_categories: {
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
      service_providers: {
        Row: {
          address: string | null
          business_name: string
          created_at: string | null
          description: string | null
          document_urls: string[] | null
          id: string
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          rating: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          business_name: string
          created_at?: string | null
          description?: string | null
          document_urls?: string[] | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          business_name?: string
          created_at?: string | null
          description?: string | null
          document_urls?: string[] | null
          id?: string
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          rating?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "teleconsultation_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "service_providers"
            referencedColumns: ["id"]
          },
        ]
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
          caller_name: string | null
          created_at: string | null
          id: string | null
          missed: boolean | null
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
      cleanup_disappearing_messages: { Args: never; Returns: undefined }
      cleanup_old_webrtc_signals: { Args: never; Returns: undefined }
      create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      create_mutual_contact: {
        Args: { user1_email: string; user2_email: string }
        Returns: undefined
      }
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
      increment_community_members: {
        Args: { community_id: string }
        Returns: undefined
      }
      is_business_owner: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
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
      sync_user_contacts: {
        Args: { contact_list: Json; user_uuid: string }
        Returns: undefined
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
    }
    Enums: {
      app_role: "consumer" | "doctor" | "nurse" | "pharmacy" | "admin"
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
    },
  },
} as const
