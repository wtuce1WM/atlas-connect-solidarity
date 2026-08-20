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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      affiliate_business_promotions: {
        Row: {
          affiliate_id: string
          business_id: string
          created_at: string
          id: string
          images: string[]
          promotion_currency: string | null
          promotion_message: string | null
          promotion_message_ar: string | null
          promotion_message_en: string | null
          promotion_message_fr: string | null
          promotion_note: string | null
          promotion_type: string | null
          promotion_value: number | null
          savings_amount: number | null
          sort_order: number
          title: string | null
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          business_id: string
          created_at?: string
          id?: string
          images?: string[]
          promotion_currency?: string | null
          promotion_message?: string | null
          promotion_message_ar?: string | null
          promotion_message_en?: string | null
          promotion_message_fr?: string | null
          promotion_note?: string | null
          promotion_type?: string | null
          promotion_value?: number | null
          savings_amount?: number | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          business_id?: string
          created_at?: string
          id?: string
          images?: string[]
          promotion_currency?: string | null
          promotion_message?: string | null
          promotion_message_ar?: string | null
          promotion_message_en?: string | null
          promotion_message_fr?: string | null
          promotion_note?: string | null
          promotion_type?: string | null
          promotion_value?: number | null
          savings_amount?: number | null
          sort_order?: number
          title?: string | null
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_business_promotions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_business_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_business_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_internal_notes: {
        Row: {
          affiliate_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_internal_notes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: true
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_legal_documents: {
        Row: {
          affiliate_id: string
          created_at: string
          file_path: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          file_path: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_legal_documents_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          account_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_url: string | null
          country_id: string
          created_at: string
          has_ai_assistant: boolean
          has_blog_export: boolean
          has_custom_domain: boolean
          has_dashboard: boolean | null
          has_email_signature: boolean
          has_guide: boolean
          has_nearby_widget: boolean
          has_showcase_site: boolean
          has_video_studio: boolean | null
          ice: string | null
          id: string
          is_active: boolean
          kp_regroupement: string | null
          main_category: string | null
          max_businesses: number | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
          vat: string | null
          whatsapp: string | null
        }
        Insert: {
          account_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          country_id: string
          created_at?: string
          has_ai_assistant?: boolean
          has_blog_export?: boolean
          has_custom_domain?: boolean
          has_dashboard?: boolean | null
          has_email_signature?: boolean
          has_guide?: boolean
          has_nearby_widget?: boolean
          has_showcase_site?: boolean
          has_video_studio?: boolean | null
          ice?: string | null
          id?: string
          is_active?: boolean
          kp_regroupement?: string | null
          main_category?: string | null
          max_businesses?: number | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          vat?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_url?: string | null
          country_id?: string
          created_at?: string
          has_ai_assistant?: boolean
          has_blog_export?: boolean
          has_custom_domain?: boolean
          has_dashboard?: boolean | null
          has_email_signature?: boolean
          has_guide?: boolean
          has_nearby_widget?: boolean
          has_showcase_site?: boolean
          has_video_studio?: boolean | null
          ice?: string | null
          id?: string
          is_active?: boolean
          kp_regroupement?: string | null
          main_category?: string | null
          max_businesses?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          vat?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_bookmarks: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_bookmarks_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chats: {
        Row: {
          anon_token: string | null
          city: string | null
          created_at: string
          id: string
          is_bookmarked: boolean
          is_public: boolean
          kind: string
          messages: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anon_token?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_bookmarked?: boolean
          is_public?: boolean
          kind?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anon_token?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_bookmarked?: boolean
          is_public?: boolean
          kind?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ai_conversation_turns: {
        Row: {
          affiliate_id: string | null
          ai_class: string | null
          chat_id: string | null
          city_active: string | null
          city_detected: string | null
          classifier_confidence: number | null
          cost_usd: number | null
          created_at: string
          error_message: string | null
          fallback_reason: string | null
          feedback_comment: string | null
          feedback_score: number | null
          had_error: boolean | null
          id: string
          intent_classified: string | null
          language: string | null
          latency_ms_first_token: number | null
          latency_ms_synth: number | null
          latency_ms_total: number | null
          message_index: number | null
          model: string | null
          resolution_service_only: boolean | null
          resolution_unresolved: boolean | null
          resolved_targets: Json | null
          resolved_types: string[] | null
          results_count: number | null
          results_shown: number | null
          route_taken: string | null
          stream_completed: boolean | null
          surface: string | null
          tokens_in: number | null
          tokens_out: number | null
          tools_called: Json | null
          user_id: string | null
          user_message: string | null
        }
        Insert: {
          affiliate_id?: string | null
          ai_class?: string | null
          chat_id?: string | null
          city_active?: string | null
          city_detected?: string | null
          classifier_confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          fallback_reason?: string | null
          feedback_comment?: string | null
          feedback_score?: number | null
          had_error?: boolean | null
          id?: string
          intent_classified?: string | null
          language?: string | null
          latency_ms_first_token?: number | null
          latency_ms_synth?: number | null
          latency_ms_total?: number | null
          message_index?: number | null
          model?: string | null
          resolution_service_only?: boolean | null
          resolution_unresolved?: boolean | null
          resolved_targets?: Json | null
          resolved_types?: string[] | null
          results_count?: number | null
          results_shown?: number | null
          route_taken?: string | null
          stream_completed?: boolean | null
          surface?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          tools_called?: Json | null
          user_id?: string | null
          user_message?: string | null
        }
        Update: {
          affiliate_id?: string | null
          ai_class?: string | null
          chat_id?: string | null
          city_active?: string | null
          city_detected?: string | null
          classifier_confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          fallback_reason?: string | null
          feedback_comment?: string | null
          feedback_score?: number | null
          had_error?: boolean | null
          id?: string
          intent_classified?: string | null
          language?: string | null
          latency_ms_first_token?: number | null
          latency_ms_synth?: number | null
          latency_ms_total?: number | null
          message_index?: number | null
          model?: string | null
          resolution_service_only?: boolean | null
          resolution_unresolved?: boolean | null
          resolved_targets?: Json | null
          resolved_types?: string[] | null
          results_count?: number | null
          results_shown?: number | null
          route_taken?: string | null
          stream_completed?: boolean | null
          surface?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          tools_called?: Json | null
          user_id?: string | null
          user_message?: string | null
        }
        Relationships: []
      }
      ai_followups: {
        Row: {
          badge_ids: string[]
          blog_post_ids: string[]
          business_ids: string[]
          category: string | null
          city: string | null
          commodity_filters: string[]
          created_at: string
          destination_ids: string[]
          id: string
          is_active: boolean
          label_ar: string | null
          label_en: string | null
          label_fr: string | null
          main_categories: string[]
          mode: string | null
          radius_km: number | null
          route_override: string | null
          sort_order: number
          subcategory_ids: string[]
          surface: string
          updated_at: string
        }
        Insert: {
          badge_ids?: string[]
          blog_post_ids?: string[]
          business_ids?: string[]
          category?: string | null
          city?: string | null
          commodity_filters?: string[]
          created_at?: string
          destination_ids?: string[]
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string | null
          label_fr?: string | null
          main_categories?: string[]
          mode?: string | null
          radius_km?: number | null
          route_override?: string | null
          sort_order?: number
          subcategory_ids?: string[]
          surface: string
          updated_at?: string
        }
        Update: {
          badge_ids?: string[]
          blog_post_ids?: string[]
          business_ids?: string[]
          category?: string | null
          city?: string | null
          commodity_filters?: string[]
          created_at?: string
          destination_ids?: string[]
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_en?: string | null
          label_fr?: string | null
          main_categories?: string[]
          mode?: string | null
          radius_km?: number | null
          route_override?: string | null
          sort_order?: number
          subcategory_ids?: string[]
          surface?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_routes: {
        Row: {
          code: string
          confidence_threshold: number | null
          created_at: string
          default_class: string
          description: string | null
          editorial: Json
          enabled: boolean
          id: string
          label: string
          sort_order: number
          surfaces: string[]
          updated_at: string
        }
        Insert: {
          code: string
          confidence_threshold?: number | null
          created_at?: string
          default_class: string
          description?: string | null
          editorial?: Json
          enabled?: boolean
          id?: string
          label: string
          sort_order?: number
          surfaces?: string[]
          updated_at?: string
        }
        Update: {
          code?: string
          confidence_threshold?: number | null
          created_at?: string
          default_class?: string
          description?: string | null
          editorial?: Json
          enabled?: boolean
          id?: string
          label?: string
          sort_order?: number
          surfaces?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      ai_suggestions: {
        Row: {
          badge_ids: string[]
          blog_post_ids: string[]
          business_ids: string[]
          category: string | null
          city: string | null
          commodity_filters: string[]
          created_at: string
          destination_ids: string[]
          disabled_followup_ids: string[]
          fixed_response_ar: string | null
          fixed_response_en: string | null
          fixed_response_fr: string | null
          followups: Json | null
          id: string
          is_active: boolean
          label_ar: string | null
          label_embedded_at: string | null
          label_embedded_source: string | null
          label_embedding: string | null
          label_en: string | null
          label_fr: string | null
          main_categories: string[]
          mode: string | null
          prompt_ar: string | null
          prompt_en: string | null
          prompt_fr: string | null
          proximity_a_badge_ids: string[]
          proximity_a_subcategory_ids: string[]
          proximity_b_badge_ids: string[]
          proximity_b_subcategory_ids: string[]
          radius_km: number | null
          route_override: string | null
          service_ids: string[]
          sort_order: number
          subcategory_ids: string[]
          surface: string
          updated_at: string
        }
        Insert: {
          badge_ids?: string[]
          blog_post_ids?: string[]
          business_ids?: string[]
          category?: string | null
          city?: string | null
          commodity_filters?: string[]
          created_at?: string
          destination_ids?: string[]
          disabled_followup_ids?: string[]
          fixed_response_ar?: string | null
          fixed_response_en?: string | null
          fixed_response_fr?: string | null
          followups?: Json | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_embedded_at?: string | null
          label_embedded_source?: string | null
          label_embedding?: string | null
          label_en?: string | null
          label_fr?: string | null
          main_categories?: string[]
          mode?: string | null
          prompt_ar?: string | null
          prompt_en?: string | null
          prompt_fr?: string | null
          proximity_a_badge_ids?: string[]
          proximity_a_subcategory_ids?: string[]
          proximity_b_badge_ids?: string[]
          proximity_b_subcategory_ids?: string[]
          radius_km?: number | null
          route_override?: string | null
          service_ids?: string[]
          sort_order?: number
          subcategory_ids?: string[]
          surface: string
          updated_at?: string
        }
        Update: {
          badge_ids?: string[]
          blog_post_ids?: string[]
          business_ids?: string[]
          category?: string | null
          city?: string | null
          commodity_filters?: string[]
          created_at?: string
          destination_ids?: string[]
          disabled_followup_ids?: string[]
          fixed_response_ar?: string | null
          fixed_response_en?: string | null
          fixed_response_fr?: string | null
          followups?: Json | null
          id?: string
          is_active?: boolean
          label_ar?: string | null
          label_embedded_at?: string | null
          label_embedded_source?: string | null
          label_embedding?: string | null
          label_en?: string | null
          label_fr?: string | null
          main_categories?: string[]
          mode?: string | null
          prompt_ar?: string | null
          prompt_en?: string | null
          prompt_fr?: string | null
          proximity_a_badge_ids?: string[]
          proximity_a_subcategory_ids?: string[]
          proximity_b_badge_ids?: string[]
          proximity_b_subcategory_ids?: string[]
          radius_km?: number | null
          route_override?: string | null
          service_ids?: string[]
          sort_order?: number
          subcategory_ids?: string[]
          surface?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          affiliate_id: string | null
          business_id: string | null
          chat_id: string | null
          context: string
          created_at: string
          error_message: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          metadata: Json
          model: string | null
          output_tokens: number
          request_id: string | null
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          affiliate_id?: string | null
          business_id?: string | null
          chat_id?: string | null
          context: string
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          metadata?: Json
          model?: string | null
          output_tokens?: number
          request_id?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          affiliate_id?: string | null
          business_id?: string | null
          chat_id?: string | null
          context?: string
          created_at?: string
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          metadata?: Json
          model?: string | null
          output_tokens?: number
          request_id?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_events_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "ai_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      article_bookmarks: {
        Row: {
          article_slug: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_slug: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_slug?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      badge_subcategories: {
        Row: {
          badge_id: string
          created_at: string | null
          id: string
          subcategory_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string | null
          id?: string
          subcategory_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string | null
          id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_subcategories_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          color_hex: string | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          is_active_on_front: boolean | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          og_image_url: string | null
          sort_order: number | null
          text_color_hex: string | null
          updated_at: string | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active_on_front?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          og_image_url?: string | null
          sort_order?: number | null
          text_color_hex?: string | null
          updated_at?: string | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          is_active_on_front?: boolean | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          og_image_url?: string | null
          sort_order?: number | null
          text_color_hex?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_number_sequences: {
        Row: {
          kind: string
          last_value: number
          year: number
        }
        Insert: {
          kind: string
          last_value?: number
          year: number
        }
        Update: {
          kind?: string
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      billing_services: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          description_fr: string | null
          id: string
          is_active: boolean
          name_fr: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          name_fr: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          name_fr?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blocked_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          reason?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_views: {
        Row: {
          country: string | null
          created_at: string
          device: string | null
          id: string
          language: string | null
          referrer_domain: string | null
          session_id: string | null
          slug: string
          source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          language?: string | null
          referrer_domain?: string | null
          session_id?: string | null
          slug: string
          source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          language?: string | null
          referrer_domain?: string | null
          session_id?: string | null
          slug?: string
          source?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          anchor_business_id: string | null
          anchor_kind: string
          anchor_poi: Json | null
          author_name: string | null
          bookmark_slug: string | null
          city_scope: string | null
          content_ar: string | null
          content_en: string | null
          content_fr: string | null
          cover_image_url: string | null
          created_at: string
          custom_hero_image_mobile_url: string | null
          custom_hero_image_url: string | null
          editorial_sections_ar: Json | null
          editorial_sections_en: Json | null
          editorial_sections_fr: Json | null
          entries_ar: Json | null
          entries_en: Json | null
          entries_fr: Json | null
          excerpt_ar: string | null
          excerpt_en: string | null
          excerpt_fr: string | null
          faq_ar: Json | null
          faq_en: Json | null
          faq_fr: Json | null
          hero_alt: string | null
          hero_subtitle_ar: string | null
          hero_subtitle_en: string | null
          hero_subtitle_fr: string | null
          hero_title_bottom_ar: string | null
          hero_title_bottom_en: string | null
          hero_title_bottom_fr: string | null
          hero_title_top_ar: string | null
          hero_title_top_en: string | null
          hero_title_top_fr: string | null
          id: string
          intro_ar: string | null
          intro_en: string | null
          intro_fr: string | null
          is_pinned: boolean
          is_published: boolean
          poi_map_mode: string | null
          published_at: string | null
          slug: string
          sort_order: number
          template: string
          title_ar: string | null
          title_en: string | null
          title_fr: string
          tldr_ar: string | null
          tldr_en: string | null
          tldr_fr: string | null
          updated_at: string
          video_section_config: Json | null
        }
        Insert: {
          anchor_business_id?: string | null
          anchor_kind?: string
          anchor_poi?: Json | null
          author_name?: string | null
          bookmark_slug?: string | null
          city_scope?: string | null
          content_ar?: string | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_hero_image_mobile_url?: string | null
          custom_hero_image_url?: string | null
          editorial_sections_ar?: Json | null
          editorial_sections_en?: Json | null
          editorial_sections_fr?: Json | null
          entries_ar?: Json | null
          entries_en?: Json | null
          entries_fr?: Json | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          faq_ar?: Json | null
          faq_en?: Json | null
          faq_fr?: Json | null
          hero_alt?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_fr?: string | null
          hero_title_bottom_ar?: string | null
          hero_title_bottom_en?: string | null
          hero_title_bottom_fr?: string | null
          hero_title_top_ar?: string | null
          hero_title_top_en?: string | null
          hero_title_top_fr?: string | null
          id?: string
          intro_ar?: string | null
          intro_en?: string | null
          intro_fr?: string | null
          is_pinned?: boolean
          is_published?: boolean
          poi_map_mode?: string | null
          published_at?: string | null
          slug: string
          sort_order?: number
          template?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr: string
          tldr_ar?: string | null
          tldr_en?: string | null
          tldr_fr?: string | null
          updated_at?: string
          video_section_config?: Json | null
        }
        Update: {
          anchor_business_id?: string | null
          anchor_kind?: string
          anchor_poi?: Json | null
          author_name?: string | null
          bookmark_slug?: string | null
          city_scope?: string | null
          content_ar?: string | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          custom_hero_image_mobile_url?: string | null
          custom_hero_image_url?: string | null
          editorial_sections_ar?: Json | null
          editorial_sections_en?: Json | null
          editorial_sections_fr?: Json | null
          entries_ar?: Json | null
          entries_en?: Json | null
          entries_fr?: Json | null
          excerpt_ar?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          faq_ar?: Json | null
          faq_en?: Json | null
          faq_fr?: Json | null
          hero_alt?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_fr?: string | null
          hero_title_bottom_ar?: string | null
          hero_title_bottom_en?: string | null
          hero_title_bottom_fr?: string | null
          hero_title_top_ar?: string | null
          hero_title_top_en?: string | null
          hero_title_top_fr?: string | null
          id?: string
          intro_ar?: string | null
          intro_en?: string | null
          intro_fr?: string | null
          is_pinned?: boolean
          is_published?: boolean
          poi_map_mode?: string | null
          published_at?: string | null
          slug?: string
          sort_order?: number
          template?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string
          tldr_ar?: string | null
          tldr_en?: string | null
          tldr_fr?: string | null
          updated_at?: string
          video_section_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_anchor_business_id_fkey"
            columns: ["anchor_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_anchor_business_id_fkey"
            columns: ["anchor_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      broken_links: {
        Row: {
          business_id: string
          created_at: string
          error_message: string | null
          field_name: string
          http_status: number | null
          id: string
          is_active: boolean
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          error_message?: string | null
          field_name: string
          http_status?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          error_message?: string | null
          field_name?: string
          http_status?: number | null
          id?: string
          is_active?: boolean
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      business_affiliate_notes: {
        Row: {
          business_id: string
          note: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_affiliate_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_affiliate_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_ai_texts: {
        Row: {
          business_id: string
          content: string
          created_at: string
          extra_instructions: string | null
          hook: string
          id: string
          include_prices: boolean
          is_active: boolean
          length_mode: string | null
          model: string | null
          position: number
          source_mode: string
          style_mode: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          content?: string
          created_at?: string
          extra_instructions?: string | null
          hook?: string
          id?: string
          include_prices?: boolean
          is_active?: boolean
          length_mode?: string | null
          model?: string | null
          position?: number
          source_mode?: string
          style_mode?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string
          extra_instructions?: string | null
          hook?: string
          id?: string
          include_prices?: boolean
          is_active?: boolean
          length_mode?: string | null
          model?: string | null
          position?: number
          source_mode?: string
          style_mode?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_ai_texts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_ai_texts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_badges: {
        Row: {
          badge_id: string
          business_id: string
          created_at: string | null
          id: string
          is_default: boolean
        }
        Insert: {
          badge_id: string
          business_id: string
          created_at?: string | null
          id?: string
          is_default?: boolean
        }
        Update: {
          badge_id?: string
          business_id?: string
          created_at?: string | null
          id?: string
          is_default?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "business_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_badges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_badges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_destinations: {
        Row: {
          business_id: string
          created_at: string | null
          destination_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          destination_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          destination_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_destinations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_destinations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_document_badges: {
        Row: {
          badge_id: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_document_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_document_badges_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      business_document_cities: {
        Row: {
          city_id: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_document_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_document_cities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "business_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      business_documents: {
        Row: {
          business_id: string | null
          business_is_active: boolean
          city: string | null
          created_at: string
          description: string | null
          destination_id: string | null
          end_date: string | null
          event_id: string | null
          force_external: boolean
          front_sort_order: number
          hide_logo: boolean
          icon: string | null
          id: string
          instagram_account: string | null
          instagram_url: string | null
          instagram_video_url: string | null
          language: string | null
          linked_business_id: string | null
          media_height: number | null
          media_width: number | null
          name: string | null
          neighborhood: string | null
          orientation: string | null
          orientation_checked_at: string | null
          poi_id: string | null
          popup: boolean
          price: string | null
          price_type: string | null
          service_id: string | null
          show_on_front: boolean
          sort_order: number
          start_date: string | null
          subcategory_id: string | null
          thumbnail_locked: boolean
          thumbnail_url: string | null
          tiktok_account: string | null
          tiktok_url: string | null
          tiktok_video_url: string | null
          type: string
          url: string
          youtube_account: string | null
          youtube_url: string | null
          youtube_video_url: string | null
        }
        Insert: {
          business_id?: string | null
          business_is_active?: boolean
          city?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          end_date?: string | null
          event_id?: string | null
          force_external?: boolean
          front_sort_order?: number
          hide_logo?: boolean
          icon?: string | null
          id?: string
          instagram_account?: string | null
          instagram_url?: string | null
          instagram_video_url?: string | null
          language?: string | null
          linked_business_id?: string | null
          media_height?: number | null
          media_width?: number | null
          name?: string | null
          neighborhood?: string | null
          orientation?: string | null
          orientation_checked_at?: string | null
          poi_id?: string | null
          popup?: boolean
          price?: string | null
          price_type?: string | null
          service_id?: string | null
          show_on_front?: boolean
          sort_order?: number
          start_date?: string | null
          subcategory_id?: string | null
          thumbnail_locked?: boolean
          thumbnail_url?: string | null
          tiktok_account?: string | null
          tiktok_url?: string | null
          tiktok_video_url?: string | null
          type: string
          url: string
          youtube_account?: string | null
          youtube_url?: string | null
          youtube_video_url?: string | null
        }
        Update: {
          business_id?: string | null
          business_is_active?: boolean
          city?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          end_date?: string | null
          event_id?: string | null
          force_external?: boolean
          front_sort_order?: number
          hide_logo?: boolean
          icon?: string | null
          id?: string
          instagram_account?: string | null
          instagram_url?: string | null
          instagram_video_url?: string | null
          language?: string | null
          linked_business_id?: string | null
          media_height?: number | null
          media_width?: number | null
          name?: string | null
          neighborhood?: string | null
          orientation?: string | null
          orientation_checked_at?: string | null
          poi_id?: string | null
          popup?: boolean
          price?: string | null
          price_type?: string | null
          service_id?: string | null
          show_on_front?: boolean
          sort_order?: number
          start_date?: string | null
          subcategory_id?: string | null
          thumbnail_locked?: boolean
          thumbnail_url?: string | null
          tiktok_account?: string | null
          tiktok_url?: string | null
          tiktok_video_url?: string | null
          type?: string
          url?: string
          youtube_account?: string | null
          youtube_url?: string | null
          youtube_video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_linked_business_id_fkey"
            columns: ["linked_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_embed_ai_item_links: {
        Row: {
          ai_text_ids: string[]
          blog_post_ids: string[]
          business_id: string
          created_at: string
          id: string
          item_id: string
          item_kind: string
          updated_at: string
        }
        Insert: {
          ai_text_ids?: string[]
          blog_post_ids?: string[]
          business_id: string
          created_at?: string
          id?: string
          item_id: string
          item_kind: string
          updated_at?: string
        }
        Update: {
          ai_text_ids?: string[]
          blog_post_ids?: string[]
          business_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_embed_ai_item_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_embed_ai_item_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_embed_ai_prefs: {
        Row: {
          business_id: string
          created_at: string
          enabled_followup_ids: string[]
          enabled_suggestion_ids: string[]
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          enabled_followup_ids?: string[]
          enabled_suggestion_ids?: string[]
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          enabled_followup_ids?: string[]
          enabled_suggestion_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_embed_ai_prefs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_embed_ai_prefs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          event_subtype: string | null
          event_type: string
          id: number
          meta: Json
          referrer_domain: string | null
          session_id: string | null
          source_page: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_subtype?: string | null
          event_type: string
          id?: never
          meta?: Json
          referrer_domain?: string | null
          session_id?: string | null
          source_page?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_subtype?: string | null
          event_type?: string
          id?: never
          meta?: Json
          referrer_domain?: string | null
          session_id?: string | null
          source_page?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_feature_rights: {
        Row: {
          business_id: string
          created_at: string
          has_ai_assistant: boolean
          has_blog_export: boolean
          has_dashboard: boolean
          has_email_signature: boolean
          has_nearby_widget: boolean
          has_showcase_site: boolean
          id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          has_ai_assistant?: boolean
          has_blog_export?: boolean
          has_dashboard?: boolean
          has_email_signature?: boolean
          has_nearby_widget?: boolean
          has_showcase_site?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          has_ai_assistant?: boolean
          has_blog_export?: boolean
          has_dashboard?: boolean
          has_email_signature?: boolean
          has_nearby_widget?: boolean
          has_showcase_site?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_feature_rights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_feature_rights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_image_badges: {
        Row: {
          badge_id: string
          business_id: string
          created_at: string
          id: string
          image_url: string
        }
        Insert: {
          badge_id: string
          business_id: string
          created_at?: string
          id?: string
          image_url: string
        }
        Update: {
          badge_id?: string
          business_id?: string
          created_at?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_image_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_image_badges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_image_badges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_image_titles: {
        Row: {
          business_id: string
          created_at: string
          description: string
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          image_url: string
          title: string
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url: string
          title?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string
          title?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_image_titles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_image_titles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_internal_notes: {
        Row: {
          business_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_internal_notes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_labels: {
        Row: {
          business_id: string
          created_at: string | null
          custom_url: string | null
          id: string
          label_id: string
          sort_order: number | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          custom_url?: string | null
          id?: string
          label_id: string
          sort_order?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          custom_url?: string | null
          id?: string
          label_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_labels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_labels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_menu_summaries: {
        Row: {
          avg_price_range: Json | null
          business_id: string
          content: string | null
          created_at: string
          id: string
          price_details: string | null
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          avg_price_range?: Json | null
          business_id: string
          content?: string | null
          created_at?: string
          id?: string
          price_details?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          avg_price_range?: Json | null
          business_id?: string
          content?: string | null
          created_at?: string
          id?: string
          price_details?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_menu_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_menu_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_poi_businesses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          poi_business_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          poi_business_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          poi_business_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_poi_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_poi_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_poi_businesses_poi_business_id_fkey"
            columns: ["poi_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_poi_businesses_poi_business_id_fkey"
            columns: ["poi_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_points_of_interest: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          point_of_interest_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          point_of_interest_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          point_of_interest_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_points_of_interest_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_points_of_interest_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_points_of_interest_point_of_interest_id_fkey"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      business_published_widgets: {
        Row: {
          business_id: string
          created_at: string
          format: string
          id: string
          target_url: string | null
          updated_at: string
          widget_key: string
        }
        Insert: {
          business_id: string
          created_at?: string
          format?: string
          id?: string
          target_url?: string | null
          updated_at?: string
          widget_key: string
        }
        Update: {
          business_id?: string
          created_at?: string
          format?: string
          id?: string
          target_url?: string | null
          updated_at?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_published_widgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_published_widgets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_showcase_site: {
        Row: {
          business_id: string
          canonical_url: string | null
          created_at: string
          cta_config: Json
          custom_domain: string | null
          enabled: boolean
          gallery_image_ids: Json
          hero_image_url: string | null
          hero_video_url: string | null
          id: string
          story_ar: string | null
          story_en: string | null
          story_fr: string | null
          tagline_ar: string | null
          tagline_en: string | null
          tagline_fr: string | null
          testimonials: Json
          theme: Json
          updated_at: string
        }
        Insert: {
          business_id: string
          canonical_url?: string | null
          created_at?: string
          cta_config?: Json
          custom_domain?: string | null
          enabled?: boolean
          gallery_image_ids?: Json
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          story_ar?: string | null
          story_en?: string | null
          story_fr?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          tagline_fr?: string | null
          testimonials?: Json
          theme?: Json
          updated_at?: string
        }
        Update: {
          business_id?: string
          canonical_url?: string | null
          created_at?: string
          cta_config?: Json
          custom_domain?: string | null
          enabled?: boolean
          gallery_image_ids?: Json
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          story_ar?: string | null
          story_en?: string | null
          story_fr?: string | null
          tagline_ar?: string | null
          tagline_en?: string | null
          tagline_fr?: string | null
          testimonials?: Json
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_showcase_site_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_showcase_site_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_social_posts: {
        Row: {
          business_id: string
          created_at: string
          id: string
          platform: string
          post_url: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          platform: string
          post_url: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          platform?: string
          post_url?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_social_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_social_posts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_web_only: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          updated_at: string
          videos: string[] | null
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          updated_at?: string
          videos?: string[] | null
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          updated_at?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "business_web_only_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_web_only_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_widget_settings: {
        Row: {
          bg_dark: string | null
          bg_light: string | null
          business_id: string
          card_mode: string | null
          created_at: string
          fit: string | null
          height: number | null
          id: string
          lang: string | null
          max_width: number | null
          options: Json
          radius: number | null
          theme: string | null
          updated_at: string
          widget_key: string
        }
        Insert: {
          bg_dark?: string | null
          bg_light?: string | null
          business_id: string
          card_mode?: string | null
          created_at?: string
          fit?: string | null
          height?: number | null
          id?: string
          lang?: string | null
          max_width?: number | null
          options?: Json
          radius?: number | null
          theme?: string | null
          updated_at?: string
          widget_key: string
        }
        Update: {
          bg_dark?: string | null
          bg_light?: string | null
          business_id?: string
          card_mode?: string | null
          created_at?: string
          fit?: string | null
          height?: number | null
          id?: string
          lang?: string | null
          max_width?: number | null
          options?: Json
          radius?: number | null
          theme?: string | null
          updated_at?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_widget_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_widget_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_widget_settings_widget_key_fkey"
            columns: ["widget_key"]
            isOneToOne: false
            referencedRelation: "widget_types"
            referencedColumns: ["widget_key"]
          },
        ]
      }
      business_youtube_badge_rules: {
        Row: {
          badge_id: string
          business_id: string
          created_at: string
          id: string
        }
        Insert: {
          badge_id: string
          business_id: string
          created_at?: string
          id?: string
        }
        Update: {
          badge_id?: string
          business_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_badge_rules_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_badge_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_badge_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_themes: {
        Row: {
          business_id: string
          created_at: string
          theme_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          theme_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_themes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_themes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "youtube_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          youtube_video_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          youtube_video_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_badges_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_businesses: {
        Row: {
          business_id: string
          created_at: string
          end_time: number | null
          id: string
          sort_order: number
          start_time: number | null
          youtube_video_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time?: number | null
          id?: string
          sort_order?: number
          start_time?: number | null
          youtube_video_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: number | null
          id?: string
          sort_order?: number
          start_time?: number | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_businesses_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_cities: {
        Row: {
          city_id: string
          created_at: string
          id: string
          youtube_video_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          youtube_video_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_cities_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_destinations: {
        Row: {
          created_at: string
          destination_id: string
          end_time: number | null
          id: string
          sort_order: number
          start_time: number | null
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          destination_id: string
          end_time?: number | null
          id?: string
          sort_order?: number
          start_time?: number | null
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string
          end_time?: number | null
          id?: string
          sort_order?: number
          start_time?: number | null
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_destinations_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_pois: {
        Row: {
          created_at: string
          id: string
          point_of_interest_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          point_of_interest_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          point_of_interest_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_pois_point_of_interest_id_fkey"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_pois_point_of_interest_id_fkey"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_pois_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_video_subcategories: {
        Row: {
          created_at: string
          id: string
          subcategory_id: string
          youtube_video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subcategory_id: string
          youtube_video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subcategory_id?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_video_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_video_subcategories_youtube_video_id_fkey"
            columns: ["youtube_video_id"]
            isOneToOne: false
            referencedRelation: "business_youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      business_youtube_videos: {
        Row: {
          business_id: string
          business_is_active: boolean
          created_at: string
          custom_thumbnail_url: string | null
          destination_id: string | null
          duration_seconds: number
          id: string
          is_short: boolean
          is_visible: boolean
          published_at: string | null
          sort_order: number
          subcategory_id: string | null
          thumbnail: string
          thumbnail_locked: boolean
          title: string
          updated_at: string
          video_id: string
        }
        Insert: {
          business_id: string
          business_is_active?: boolean
          created_at?: string
          custom_thumbnail_url?: string | null
          destination_id?: string | null
          duration_seconds?: number
          id?: string
          is_short?: boolean
          is_visible?: boolean
          published_at?: string | null
          sort_order?: number
          subcategory_id?: string | null
          thumbnail?: string
          thumbnail_locked?: boolean
          title?: string
          updated_at?: string
          video_id: string
        }
        Update: {
          business_id?: string
          business_is_active?: boolean
          created_at?: string
          custom_thumbnail_url?: string | null
          destination_id?: string | null
          duration_seconds?: number
          id?: string
          is_short?: boolean
          is_visible?: boolean
          published_at?: string | null
          sort_order?: number
          subcategory_id?: string | null
          thumbnail?: string
          thumbnail_locked?: boolean
          title?: string
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_youtube_videos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_videos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_videos_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_youtube_videos_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          account_type: string | null
          address: string | null
          affiliate_id: string | null
          ai_review_summary: Json | null
          airbnb_url: string | null
          avg_price_range: Json | null
          avis_verifies_rating: number | null
          avis_verifies_review_count: number | null
          avis_verifies_url: string | null
          badge_id: string | null
          booking_url: string | null
          business_type: string | null
          carousel_badge: string | null
          categories: string[] | null
          city: string | null
          closure_message: string | null
          computed_rating: number | null
          country: string | null
          created_at: string
          default_destination_id: string | null
          default_destination_style: string
          default_poi_business_id: string | null
          default_poi_is_master: boolean
          default_service: string | null
          default_sound_on: boolean
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          destination_description: string | null
          destination_hook: string | null
          email: string | null
          engagements: string[]
          facebook_url: string | null
          faq: Json | null
          flipbook_language: string | null
          flipbook_name: string | null
          flipbook_url: string | null
          front_video_count: number | null
          gamme_id: string | null
          getyourguide_rating: number | null
          getyourguide_review_count: number | null
          getyourguide_url: string | null
          glovo_url: string | null
          google_maps_url: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_count: number | null
          google_review_url: string | null
          google_reviews_url: string | null
          hide_description: boolean
          hook_ar: string | null
          hook_en: string | null
          hook_fr: string | null
          hotels_com_url: string | null
          ice: string | null
          id: string
          images: string[] | null
          instagram_url: string | null
          is_active: boolean
          is_featured: boolean | null
          is_master: boolean
          is_open_24h: boolean
          is_poi: boolean
          is_regulated_activity: boolean | null
          is_visible_locale: boolean
          kayak_rating: number | null
          kayak_review_count: number | null
          kayak_url: string | null
          keywords: string[] | null
          kp_active: boolean
          kp_active_2: boolean
          kp_city: string | null
          kp_city_2: string | null
          kp_regroupement: string | null
          kp_regroupement_2: string | null
          label1_link_url: string | null
          label1_url: string | null
          languages: string[] | null
          latitude: number | null
          linkedin_url: string | null
          logo_2_url: string | null
          logo_bg: string | null
          logo_url: string | null
          longitude: number | null
          main_category: string | null
          manual_price_range: string | null
          map_bg_color: string | null
          matterport_url: string | null
          menu_language: string | null
          menu_name: string | null
          menu_summary: string | null
          menu_summary_title: string | null
          menu_url: string | null
          min_price: number | null
          name: string
          name_ar: string | null
          name_en: string | null
          neighborhood: string | null
          online_shop_cta: string | null
          online_shop_force_external: boolean
          online_shop_presentation_mode: string
          online_shop_url: string | null
          opening_hours: Json | null
          other_booking_name: string | null
          other_booking_url: string | null
          pdf_2_name: string | null
          pdf_2_url: string | null
          pdf_3_name: string | null
          pdf_3_url: string | null
          pdf_name: string | null
          pdf_url: string | null
          phone: string | null
          pinterest_url: string | null
          poi_business_style: string
          poi_description: string | null
          poi_hook: string | null
          poi_radius_km: number
          popup_image_url: string | null
          presentation_mode: string
          prioritize_images: boolean
          priority_score: number | null
          rating: number | null
          region: string | null
          reserve_now_cta: string | null
          reserve_now_force_external: boolean
          reserve_now_url: string | null
          restaurant_guru_rating: number | null
          restaurant_guru_review_count: number | null
          restaurant_guru_url: string | null
          search_vector: unknown
          services: string[] | null
          show_opening_hours: boolean | null
          show_videos: boolean
          show_youtube_tab: boolean
          showcase_target_url: string | null
          skype: string | null
          slug: string
          snapchat_url: string | null
          soundcloud_url: string | null
          spotify_url: string | null
          substack_url: string | null
          telegram: string | null
          tiktok_url: string | null
          total_review_count: number | null
          tourradar_rating: number | null
          tourradar_review_count: number | null
          tourradar_url: string | null
          tripadvisor_location_id: string | null
          tripadvisor_rating: number | null
          tripadvisor_review_count: number | null
          tripadvisor_review_url: string | null
          tripadvisor_url: string | null
          trivago_url: string | null
          trustpilot_rating: number | null
          trustpilot_review_count: number | null
          trustpilot_url: string | null
          twitter_url: string | null
          unified_cta: string | null
          updated_at: string
          url_4: string | null
          url_4_cta: string | null
          url_4_force_external: boolean
          url_4_presentation_mode: string
          url_5: string | null
          url_5_cta: string | null
          url_5_force_external: boolean
          url_5_presentation_mode: string
          url_6: string | null
          url_6_force_external: boolean | null
          url_6_title: string | null
          vacation_dates: Json | null
          viator_rating: number | null
          viator_review_count: number | null
          viator_url: string | null
          video_1_url: string | null
          vimeo_url: string | null
          website: string | null
          website_cta: string | null
          website_force_external: boolean
          website_presentation_mode: string
          whatsapp: string | null
          widget_bg_color: string | null
          widget_bg_color_dark: string | null
          widget_theme: string | null
          wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_channel_featured: boolean
          youtube_channel_thumbnail_url: string | null
          youtube_url: string | null
          zone_chalandise: string | null
          zone_city_ids: string[] | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          affiliate_id?: string | null
          ai_review_summary?: Json | null
          airbnb_url?: string | null
          avg_price_range?: Json | null
          avis_verifies_rating?: number | null
          avis_verifies_review_count?: number | null
          avis_verifies_url?: string | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          carousel_badge?: string | null
          categories?: string[] | null
          city?: string | null
          closure_message?: string | null
          computed_rating?: number | null
          country?: string | null
          created_at?: string
          default_destination_id?: string | null
          default_destination_style?: string
          default_poi_business_id?: string | null
          default_poi_is_master?: boolean
          default_service?: string | null
          default_sound_on?: boolean
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[]
          facebook_url?: string | null
          faq?: Json | null
          flipbook_language?: string | null
          flipbook_name?: string | null
          flipbook_url?: string | null
          front_video_count?: number | null
          gamme_id?: string | null
          getyourguide_rating?: number | null
          getyourguide_review_count?: number | null
          getyourguide_url?: string | null
          glovo_url?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_review_url?: string | null
          google_reviews_url?: string | null
          hide_description?: boolean
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          hotels_com_url?: string | null
          ice?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_master?: boolean
          is_open_24h?: boolean
          is_poi?: boolean
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean
          kayak_rating?: number | null
          kayak_review_count?: number | null
          kayak_url?: string | null
          keywords?: string[] | null
          kp_active?: boolean
          kp_active_2?: boolean
          kp_city?: string | null
          kp_city_2?: string | null
          kp_regroupement?: string | null
          kp_regroupement_2?: string | null
          label1_link_url?: string | null
          label1_url?: string | null
          languages?: string[] | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_2_url?: string | null
          logo_bg?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          manual_price_range?: string | null
          map_bg_color?: string | null
          matterport_url?: string | null
          menu_language?: string | null
          menu_name?: string | null
          menu_summary?: string | null
          menu_summary_title?: string | null
          menu_url?: string | null
          min_price?: number | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          neighborhood?: string | null
          online_shop_cta?: string | null
          online_shop_force_external?: boolean
          online_shop_presentation_mode?: string
          online_shop_url?: string | null
          opening_hours?: Json | null
          other_booking_name?: string | null
          other_booking_url?: string | null
          pdf_2_name?: string | null
          pdf_2_url?: string | null
          pdf_3_name?: string | null
          pdf_3_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          poi_business_style?: string
          poi_description?: string | null
          poi_hook?: string | null
          poi_radius_km?: number
          popup_image_url?: string | null
          presentation_mode?: string
          prioritize_images?: boolean
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_cta?: string | null
          reserve_now_force_external?: boolean
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          show_videos?: boolean
          show_youtube_tab?: boolean
          showcase_target_url?: string | null
          skype?: string | null
          slug: string
          snapchat_url?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          substack_url?: string | null
          telegram?: string | null
          tiktok_url?: string | null
          total_review_count?: number | null
          tourradar_rating?: number | null
          tourradar_review_count?: number | null
          tourradar_url?: string | null
          tripadvisor_location_id?: string | null
          tripadvisor_rating?: number | null
          tripadvisor_review_count?: number | null
          tripadvisor_review_url?: string | null
          tripadvisor_url?: string | null
          trivago_url?: string | null
          trustpilot_rating?: number | null
          trustpilot_review_count?: number | null
          trustpilot_url?: string | null
          twitter_url?: string | null
          unified_cta?: string | null
          updated_at?: string
          url_4?: string | null
          url_4_cta?: string | null
          url_4_force_external?: boolean
          url_4_presentation_mode?: string
          url_5?: string | null
          url_5_cta?: string | null
          url_5_force_external?: boolean
          url_5_presentation_mode?: string
          url_6?: string | null
          url_6_force_external?: boolean | null
          url_6_title?: string | null
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          website_cta?: string | null
          website_force_external?: boolean
          website_presentation_mode?: string
          whatsapp?: string | null
          widget_bg_color?: string | null
          widget_bg_color_dark?: string | null
          widget_theme?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_channel_featured?: boolean
          youtube_channel_thumbnail_url?: string | null
          youtube_url?: string | null
          zone_chalandise?: string | null
          zone_city_ids?: string[] | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          affiliate_id?: string | null
          ai_review_summary?: Json | null
          airbnb_url?: string | null
          avg_price_range?: Json | null
          avis_verifies_rating?: number | null
          avis_verifies_review_count?: number | null
          avis_verifies_url?: string | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          carousel_badge?: string | null
          categories?: string[] | null
          city?: string | null
          closure_message?: string | null
          computed_rating?: number | null
          country?: string | null
          created_at?: string
          default_destination_id?: string | null
          default_destination_style?: string
          default_poi_business_id?: string | null
          default_poi_is_master?: boolean
          default_service?: string | null
          default_sound_on?: boolean
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[]
          facebook_url?: string | null
          faq?: Json | null
          flipbook_language?: string | null
          flipbook_name?: string | null
          flipbook_url?: string | null
          front_video_count?: number | null
          gamme_id?: string | null
          getyourguide_rating?: number | null
          getyourguide_review_count?: number | null
          getyourguide_url?: string | null
          glovo_url?: string | null
          google_maps_url?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_review_url?: string | null
          google_reviews_url?: string | null
          hide_description?: boolean
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          hotels_com_url?: string | null
          ice?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_master?: boolean
          is_open_24h?: boolean
          is_poi?: boolean
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean
          kayak_rating?: number | null
          kayak_review_count?: number | null
          kayak_url?: string | null
          keywords?: string[] | null
          kp_active?: boolean
          kp_active_2?: boolean
          kp_city?: string | null
          kp_city_2?: string | null
          kp_regroupement?: string | null
          kp_regroupement_2?: string | null
          label1_link_url?: string | null
          label1_url?: string | null
          languages?: string[] | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_2_url?: string | null
          logo_bg?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          manual_price_range?: string | null
          map_bg_color?: string | null
          matterport_url?: string | null
          menu_language?: string | null
          menu_name?: string | null
          menu_summary?: string | null
          menu_summary_title?: string | null
          menu_url?: string | null
          min_price?: number | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          neighborhood?: string | null
          online_shop_cta?: string | null
          online_shop_force_external?: boolean
          online_shop_presentation_mode?: string
          online_shop_url?: string | null
          opening_hours?: Json | null
          other_booking_name?: string | null
          other_booking_url?: string | null
          pdf_2_name?: string | null
          pdf_2_url?: string | null
          pdf_3_name?: string | null
          pdf_3_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          poi_business_style?: string
          poi_description?: string | null
          poi_hook?: string | null
          poi_radius_km?: number
          popup_image_url?: string | null
          presentation_mode?: string
          prioritize_images?: boolean
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_cta?: string | null
          reserve_now_force_external?: boolean
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          show_videos?: boolean
          show_youtube_tab?: boolean
          showcase_target_url?: string | null
          skype?: string | null
          slug?: string
          snapchat_url?: string | null
          soundcloud_url?: string | null
          spotify_url?: string | null
          substack_url?: string | null
          telegram?: string | null
          tiktok_url?: string | null
          total_review_count?: number | null
          tourradar_rating?: number | null
          tourradar_review_count?: number | null
          tourradar_url?: string | null
          tripadvisor_location_id?: string | null
          tripadvisor_rating?: number | null
          tripadvisor_review_count?: number | null
          tripadvisor_review_url?: string | null
          tripadvisor_url?: string | null
          trivago_url?: string | null
          trustpilot_rating?: number | null
          trustpilot_review_count?: number | null
          trustpilot_url?: string | null
          twitter_url?: string | null
          unified_cta?: string | null
          updated_at?: string
          url_4?: string | null
          url_4_cta?: string | null
          url_4_force_external?: boolean
          url_4_presentation_mode?: string
          url_5?: string | null
          url_5_cta?: string | null
          url_5_force_external?: boolean
          url_5_presentation_mode?: string
          url_6?: string | null
          url_6_force_external?: boolean | null
          url_6_title?: string | null
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          website_cta?: string | null
          website_force_external?: boolean
          website_presentation_mode?: string
          whatsapp?: string | null
          widget_bg_color?: string | null
          widget_bg_color_dark?: string | null
          widget_theme?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_channel_featured?: boolean
          youtube_channel_thumbnail_url?: string | null
          youtube_url?: string | null
          zone_chalandise?: string | null
          zone_city_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_default_destination_id_fkey"
            columns: ["default_destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_default_poi_business_id_fkey"
            columns: ["default_poi_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_default_poi_business_id_fkey"
            columns: ["default_poi_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_gamme_id_fkey"
            columns: ["gamme_id"]
            isOneToOne: false
            referencedRelation: "gammes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          adj_ar: string | null
          adj_en: string | null
          adj_fr: string | null
          created_at: string | null
          front_color: string
          icon: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          og_image_url: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          adj_ar?: string | null
          adj_en?: string | null
          adj_fr?: string | null
          created_at?: string | null
          front_color?: string
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          og_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          adj_ar?: string | null
          adj_en?: string | null
          adj_fr?: string | null
          created_at?: string | null
          front_color?: string
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          og_image_url?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      certification_metadata: {
        Row: {
          certification_name: string
          created_at: string
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          image_url: string | null
          link_title_ar: string | null
          link_title_en: string | null
          link_title_fr: string | null
          link_url: string | null
          updated_at: string
        }
        Insert: {
          certification_name: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          link_title_ar?: string | null
          link_title_en?: string | null
          link_title_fr?: string | null
          link_url?: string | null
          updated_at?: string
        }
        Update: {
          certification_name?: string
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          link_title_ar?: string | null
          link_title_en?: string | null
          link_title_fr?: string | null
          link_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          country_id: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          image_url: string | null
          is_active: boolean
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          official_site_1_name: string | null
          official_site_1_url: string | null
          official_site_2_name: string | null
          official_site_2_url: string | null
          official_site_3_name: string | null
          official_site_3_url: string | null
          official_site_4_name: string | null
          official_site_4_url: string | null
          official_site_5_name: string | null
          official_site_5_url: string | null
          official_site_6_name: string | null
          official_site_6_url: string | null
          priority_score: number | null
          region: string | null
          sort_order: number | null
          updated_at: string | null
          wikipedia_ar: string | null
          wikipedia_en: string | null
          wikipedia_fr: string | null
        }
        Insert: {
          country_id: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          official_site_1_name?: string | null
          official_site_1_url?: string | null
          official_site_2_name?: string | null
          official_site_2_url?: string | null
          official_site_3_name?: string | null
          official_site_3_url?: string | null
          official_site_4_name?: string | null
          official_site_4_url?: string | null
          official_site_5_name?: string | null
          official_site_5_url?: string | null
          official_site_6_name?: string | null
          official_site_6_url?: string | null
          priority_score?: number | null
          region?: string | null
          sort_order?: number | null
          updated_at?: string | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Update: {
          country_id?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          official_site_1_name?: string | null
          official_site_1_url?: string | null
          official_site_2_name?: string | null
          official_site_2_url?: string | null
          official_site_3_name?: string | null
          official_site_3_url?: string | null
          official_site_4_name?: string | null
          official_site_4_url?: string | null
          official_site_5_name?: string | null
          official_site_5_url?: string | null
          official_site_6_name?: string | null
          official_site_6_url?: string | null
          priority_score?: number | null
          region?: string | null
          sort_order?: number | null
          updated_at?: string | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      club_member_personas: {
        Row: {
          created_at: string
          id: string
          member_id: string
          persona_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          persona_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_member_personas_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "club_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_member_personas_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          first_name: string | null
          id: string
          instagram: string | null
          last_active_at: string | null
          last_name: string | null
          linkedin: string | null
          nickname: string
          phone: string | null
          pinterest: string | null
          skype: string | null
          soundcloud: string | null
          spotify: string | null
          tiktok: string | null
          twitter: string | null
          user_id: string | null
          website: string | null
          welcome_email_sent_at: string | null
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          first_name?: string | null
          id?: string
          instagram?: string | null
          last_active_at?: string | null
          last_name?: string | null
          linkedin?: string | null
          nickname: string
          phone?: string | null
          pinterest?: string | null
          skype?: string | null
          soundcloud?: string | null
          spotify?: string | null
          tiktok?: string | null
          twitter?: string | null
          user_id?: string | null
          website?: string | null
          welcome_email_sent_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook?: string | null
          first_name?: string | null
          id?: string
          instagram?: string | null
          last_active_at?: string | null
          last_name?: string | null
          linkedin?: string | null
          nickname?: string
          phone?: string | null
          pinterest?: string | null
          skype?: string | null
          soundcloud?: string | null
          spotify?: string | null
          tiktok?: string | null
          twitter?: string | null
          user_id?: string | null
          website?: string | null
          welcome_email_sent_at?: string | null
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      club_trip_businesses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          sort_order: number
          trip_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          sort_order?: number
          trip_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_trip_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_trip_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_trip_businesses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "club_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      club_trips: {
        Row: {
          arrival_date: string | null
          arrival_time: string | null
          created_at: string
          departure_date: string | null
          departure_time: string | null
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arrival_date?: string | null
          arrival_time?: string | null
          created_at?: string
          departure_date?: string | null
          departure_time?: string | null
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      destination_internal_notes: {
        Row: {
          destination_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          destination_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          destination_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "destination_internal_notes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: true
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_reviews: {
        Row: {
          author_name: string | null
          created_at: string
          destination_id: string
          fetched_at: string
          id: string
          is_default: boolean
          is_hidden: boolean
          language: string | null
          published_at: string | null
          rating: number | null
          relative_time: string | null
          source: string
          text: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string
          destination_id: string
          fetched_at?: string
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source?: string
          text?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string
          destination_id?: string
          fetched_at?: string
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destination_reviews_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      destinations: {
        Row: {
          city_ids: string[] | null
          computed_rating: number | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          google_maps_url: string | null
          google_rating: number | null
          google_review_count: number | null
          google_reviews_url: string | null
          hook: string | null
          hook_ar: string | null
          hook_en: string | null
          hook_fr: string | null
          id: string
          image_url: string | null
          images: string[] | null
          is_searchable: boolean
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          matterport_url: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          region: string[] | null
          sort_order: number | null
          total_review_count: number | null
          updated_at: string | null
          videos: string[] | null
          wikipedia_ar: string | null
          wikipedia_en: string | null
          wikipedia_fr: string | null
        }
        Insert: {
          city_ids?: string[] | null
          computed_rating?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_reviews_url?: string | null
          hook?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_searchable?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          matterport_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          region?: string[] | null
          sort_order?: number | null
          total_review_count?: number | null
          updated_at?: string | null
          videos?: string[] | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Update: {
          city_ids?: string[] | null
          computed_rating?: number | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_reviews_url?: string | null
          hook?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_searchable?: boolean
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          matterport_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          region?: string[] | null
          sort_order?: number | null
          total_review_count?: number | null
          updated_at?: string | null
          videos?: string[] | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Relationships: []
      }
      easter_eggs: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          name: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_badges: {
        Row: {
          badge_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_badges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_businesses: {
        Row: {
          business_id: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_businesses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          created_at: string
          id: string
          name: string
          name_ar: string | null
          name_en: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          name_ar?: string | null
          name_en?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          name_ar?: string | null
          name_en?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          city_id: string | null
          created_at: string
          days_of_week: string[]
          default_business_id: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          google_maps_url: string | null
          hook: string | null
          id: string
          images: string[] | null
          kp_regroupement: string[] | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          neighborhood_id: string | null
          recurrence: string | null
          sort_order: number
          start_date: string | null
          start_time: string | null
          type: string | null
          updated_at: string
          url: string | null
          url_cta: string | null
          url_force_external: boolean | null
          videos: string[] | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          days_of_week?: string[]
          default_business_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          google_maps_url?: string | null
          hook?: string | null
          id?: string
          images?: string[] | null
          kp_regroupement?: string[] | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          neighborhood_id?: string | null
          recurrence?: string | null
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
          url_cta?: string | null
          url_force_external?: boolean | null
          videos?: string[] | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          days_of_week?: string[]
          default_business_id?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          google_maps_url?: string | null
          hook?: string | null
          id?: string
          images?: string[] | null
          kp_regroupement?: string[] | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          neighborhood_id?: string | null
          recurrence?: string | null
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
          url_cta?: string | null
          url_force_external?: boolean | null
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_default_business_id_fkey"
            columns: ["default_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_default_business_id_fkey"
            columns: ["default_business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      front_highlights: {
        Row: {
          business_id: string | null
          created_at: string
          description: string
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          icon: string
          id: string
          image_url: string | null
          metric_title: string | null
          metric_title_ar: string | null
          metric_title_en: string | null
          metric_title_fr: string | null
          metric_value: string | null
          metric_value_ar: string | null
          metric_value_en: string | null
          metric_value_fr: string | null
          section_columns: number
          section_intro: string | null
          section_intro_ar: string | null
          section_intro_en: string | null
          section_intro_fr: string | null
          section_title: string | null
          section_title_ar: string | null
          section_title_en: string | null
          section_title_fr: string | null
          sort_order: number
          title: string
          title_ar: string | null
          title_en: string | null
          title_fr: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          metric_title?: string | null
          metric_title_ar?: string | null
          metric_title_en?: string | null
          metric_title_fr?: string | null
          metric_value?: string | null
          metric_value_ar?: string | null
          metric_value_en?: string | null
          metric_value_fr?: string | null
          section_columns?: number
          section_intro?: string | null
          section_intro_ar?: string | null
          section_intro_en?: string | null
          section_intro_fr?: string | null
          section_title?: string | null
          section_title_ar?: string | null
          section_title_en?: string | null
          section_title_fr?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string
          id?: string
          image_url?: string | null
          metric_title?: string | null
          metric_title_ar?: string | null
          metric_title_en?: string | null
          metric_title_fr?: string | null
          metric_value?: string | null
          metric_value_ar?: string | null
          metric_value_en?: string | null
          metric_value_fr?: string | null
          section_columns?: number
          section_intro?: string | null
          section_intro_ar?: string | null
          section_intro_en?: string | null
          section_intro_fr?: string | null
          section_title?: string | null
          section_title_ar?: string | null
          section_title_en?: string | null
          section_title_fr?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "front_highlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_highlights_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      front_structure: {
        Row: {
          created_at: string
          id: string
          name: string
          show_in_menu: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          show_in_menu?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          show_in_menu?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      front_structure_badges: {
        Row: {
          badge_id: string
          created_at: string
          front_structure_id: string
          id: string
          sort_order: number
        }
        Insert: {
          badge_id: string
          created_at?: string
          front_structure_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          badge_id?: string
          created_at?: string
          front_structure_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "front_structure_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_badges_front_structure_id_fkey"
            columns: ["front_structure_id"]
            isOneToOne: false
            referencedRelation: "front_structure"
            referencedColumns: ["id"]
          },
        ]
      }
      front_structure_homepage_extra_cards: {
        Row: {
          badge_id: string | null
          business_id: string | null
          city: string
          created_at: string
          event_id: string | null
          id: string
          image_url: string | null
          search_query: string | null
          sort_order: number
          title: string | null
          updated_at: string
          video_document_id: string | null
        }
        Insert: {
          badge_id?: string | null
          business_id?: string | null
          city: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string | null
          search_query?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_document_id?: string | null
        }
        Update: {
          badge_id?: string | null
          business_id?: string | null
          city?: string
          created_at?: string
          event_id?: string | null
          id?: string
          image_url?: string | null
          search_query?: string | null
          sort_order?: number
          title?: string | null
          updated_at?: string
          video_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "front_structure_homepage_extra_cards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_homepage_extra_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_homepage_extra_cards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_homepage_extra_cards_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      front_structure_homepage_order: {
        Row: {
          city: string
          created_at: string
          id: string
          item_id: string
          item_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      front_structure_homepage_overrides: {
        Row: {
          business_id: string | null
          city: string
          created_at: string
          front_structure_id: string
          id: string
          image_url: string | null
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          city: string
          created_at?: string
          front_structure_id: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          city?: string
          created_at?: string
          front_structure_id?: string
          id?: string
          image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "front_structure_homepage_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_homepage_overrides_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_homepage_overrides_front_structure_id_fkey"
            columns: ["front_structure_id"]
            isOneToOne: false
            referencedRelation: "front_structure"
            referencedColumns: ["id"]
          },
        ]
      }
      front_structure_services: {
        Row: {
          created_at: string
          front_structure_id: string
          id: string
          service_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          front_structure_id: string
          id?: string
          service_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          front_structure_id?: string
          id?: string
          service_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "front_structure_services_front_structure_id_fkey"
            columns: ["front_structure_id"]
            isOneToOne: false
            referencedRelation: "front_structure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      front_structure_subcategories: {
        Row: {
          created_at: string
          front_structure_id: string
          id: string
          sort_order: number
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          front_structure_id: string
          id?: string
          sort_order?: number
          subcategory_id: string
        }
        Update: {
          created_at?: string
          front_structure_id?: string
          id?: string
          sort_order?: number
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "front_structure_subcategories_front_structure_id_fkey"
            columns: ["front_structure_id"]
            isOneToOne: false
            referencedRelation: "front_structure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "front_structure_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      gamme_categories: {
        Row: {
          category_id: string
          created_at: string | null
          gamme_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          gamme_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          gamme_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamme_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamme_categories_gamme_id_fkey"
            columns: ["gamme_id"]
            isOneToOne: false
            referencedRelation: "gammes"
            referencedColumns: ["id"]
          },
        ]
      }
      gammes: {
        Row: {
          color_hex: string | null
          created_at: string | null
          description: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          text_color_hex: string | null
          updated_at: string | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          text_color_hex?: string | null
          updated_at?: string | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          sort_order?: number | null
          text_color_hex?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      generic_video_badges: {
        Row: {
          badge_id: string
          created_at: string
          generic_video_id: string
          id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          generic_video_id: string
          id?: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          generic_video_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_badges_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_video_businesses: {
        Row: {
          business_id: string
          created_at: string
          end_time: number | null
          generic_video_id: string
          id: string
          sort_order: number
          start_time: number | null
          timeframe_enabled: boolean
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time?: number | null
          generic_video_id: string
          id?: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: number | null
          generic_video_id?: string
          id?: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_businesses_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_video_cities: {
        Row: {
          city_id: string
          created_at: string
          generic_video_id: string
          id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          generic_video_id: string
          id?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          generic_video_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_cities_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_video_destinations: {
        Row: {
          created_at: string
          destination_id: string
          end_time: number | null
          generic_video_id: string
          id: string
          sort_order: number
          start_time: number | null
          timeframe_enabled: boolean
        }
        Insert: {
          created_at?: string
          destination_id: string
          end_time?: number | null
          generic_video_id: string
          id?: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Update: {
          created_at?: string
          destination_id?: string
          end_time?: number | null
          generic_video_id?: string
          id?: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_destinations_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_destinations_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_video_pois: {
        Row: {
          created_at: string
          end_time: number | null
          generic_video_id: string
          id: string
          poi_id: string
          sort_order: number
          start_time: number | null
          timeframe_enabled: boolean
        }
        Insert: {
          created_at?: string
          end_time?: number | null
          generic_video_id: string
          id?: string
          poi_id: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Update: {
          created_at?: string
          end_time?: number | null
          generic_video_id?: string
          id?: string
          poi_id?: string
          sort_order?: number
          start_time?: number | null
          timeframe_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_pois_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_pois_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_pois_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_video_subcategories: {
        Row: {
          created_at: string
          generic_video_id: string
          id: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string
          generic_video_id: string
          id?: string
          subcategory_id: string
        }
        Update: {
          created_at?: string
          generic_video_id?: string
          id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generic_video_subcategories_generic_video_id_fkey"
            columns: ["generic_video_id"]
            isOneToOne: false
            referencedRelation: "generic_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generic_video_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      generic_videos: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          id: string
          instagram_account: string | null
          instagram_url: string | null
          instagram_video_url: string | null
          media_height: number | null
          media_width: number | null
          name: string | null
          neighborhood: string | null
          orientation: string | null
          orientation_checked_at: string | null
          sort_order: number
          thumbnail_locked: boolean
          thumbnail_url: string | null
          tiktok_account: string | null
          tiktok_url: string | null
          tiktok_video_url: string | null
          title: string | null
          updated_at: string
          url: string
          youtube_account: string | null
          youtube_url: string | null
          youtube_video_url: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_account?: string | null
          instagram_url?: string | null
          instagram_video_url?: string | null
          media_height?: number | null
          media_width?: number | null
          name?: string | null
          neighborhood?: string | null
          orientation?: string | null
          orientation_checked_at?: string | null
          sort_order?: number
          thumbnail_locked?: boolean
          thumbnail_url?: string | null
          tiktok_account?: string | null
          tiktok_url?: string | null
          tiktok_video_url?: string | null
          title?: string | null
          updated_at?: string
          url: string
          youtube_account?: string | null
          youtube_url?: string | null
          youtube_video_url?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instagram_account?: string | null
          instagram_url?: string | null
          instagram_video_url?: string | null
          media_height?: number | null
          media_width?: number | null
          name?: string | null
          neighborhood?: string | null
          orientation?: string | null
          orientation_checked_at?: string | null
          sort_order?: number
          thumbnail_locked?: boolean
          thumbnail_url?: string | null
          tiktok_account?: string | null
          tiktok_url?: string | null
          tiktok_video_url?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          youtube_account?: string | null
          youtube_url?: string | null
          youtube_video_url?: string | null
        }
        Relationships: []
      }
      homepage_cards_snapshots: {
        Row: {
          city: string
          created_at: string
          generated_at: string
          id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          city: string
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          city?: string
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      homepage_selections: {
        Row: {
          business_id: string
          city: string
          created_at: string
          front_structure_id: string
          id: string
          sort_order: number
        }
        Insert: {
          business_id: string
          city: string
          created_at?: string
          front_structure_id: string
          id?: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          city?: string
          created_at?: string
          front_structure_id?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "homepage_selections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_selections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_selections_front_structure_id_fkey"
            columns: ["front_structure_id"]
            isOneToOne: false
            referencedRelation: "front_structure"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_api_mappings: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          liteapi_hotel_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          liteapi_hotel_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          liteapi_hotel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_api_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_api_mappings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_mappings: {
        Row: {
          business_id: string
          city: string
          created_at: string
          id: string
          serp_hotel_name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          city: string
          created_at?: string
          id?: string
          serp_hotel_name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          city?: string
          created_at?: string
          id?: string
          serp_hotel_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotel_price_cache: {
        Row: {
          business_id: string
          check_in: string | null
          check_out: string | null
          city: string | null
          created_at: string
          currency: string
          fetched_at: string
          hotel_external_id: string | null
          hotel_rating: string | null
          id: string
          price_per_night: number | null
          raw_data: Json | null
          review_count: number | null
          room_type: string | null
          source: string
          updated_at: string
        }
        Insert: {
          business_id: string
          check_in?: string | null
          check_out?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          fetched_at?: string
          hotel_external_id?: string | null
          hotel_rating?: string | null
          id?: string
          price_per_night?: number | null
          raw_data?: Json | null
          review_count?: number | null
          room_type?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          check_in?: string | null
          check_out?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          fetched_at?: string
          hotel_external_id?: string | null
          hotel_rating?: string | null
          id?: string
          price_per_night?: number | null
          raw_data?: Json | null
          review_count?: number | null
          room_type?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      image_compression_log: {
        Row: {
          business_id: string
          compressed_path: string
          compressed_size_kb: number | null
          compressed_url: string
          created_at: string
          id: string
          original_path: string
          original_size_kb: number | null
          original_url: string
          reverted_at: string | null
        }
        Insert: {
          business_id: string
          compressed_path: string
          compressed_size_kb?: number | null
          compressed_url: string
          created_at?: string
          id?: string
          original_path: string
          original_size_kb?: number | null
          original_url: string
          reverted_at?: string | null
        }
        Update: {
          business_id?: string
          compressed_path?: string
          compressed_size_kb?: number | null
          compressed_url?: string
          created_at?: string
          id?: string
          original_path?: string
          original_size_kb?: number | null
          original_url?: string
          reverted_at?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          label: string
          line_total_ht: number
          line_total_ttc: number
          line_total_vat: number
          manual_reason: string | null
          price_source: Database["public"]["Enums"]["billing_price_source"]
          quantity: number
          recurrence: Database["public"]["Enums"]["billing_recurrence"]
          sort_order: number
          unit_price_ht: number
          vat_exempt: boolean
          vat_exempt_reason: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          label: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          manual_reason?: string | null
          price_source?: Database["public"]["Enums"]["billing_price_source"]
          quantity?: number
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          sort_order?: number
          unit_price_ht?: number
          vat_exempt?: boolean
          vat_exempt_reason?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          label?: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          manual_reason?: string | null
          price_source?: Database["public"]["Enums"]["billing_price_source"]
          quantity?: number
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          sort_order?: number
          unit_price_ht?: number
          vat_exempt?: boolean
          vat_exempt_reason?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          affiliate_id: string | null
          created_at: string
          currency: Database["public"]["Enums"]["billing_currency"]
          id: string
          number: string | null
          paid_at: string | null
          pdf_url: string | null
          prospect_email: string | null
          prospect_name: string | null
          quote_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_ht: number
          total_ttc: number
          total_vat: number
          updated_at: string
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          number?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          business_id: string | null
          category: string
          city_id: string | null
          content: string
          created_at: string
          destination_id: string | null
          external_urls: Json | null
          external_urls_section_title: string | null
          external_urls_title: string | null
          id: string
          is_active: boolean
          neighborhood_id: string | null
          notes: string | null
          point_of_interest_id: string | null
          source: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          category?: string
          city_id?: string | null
          content: string
          created_at?: string
          destination_id?: string | null
          external_urls?: Json | null
          external_urls_section_title?: string | null
          external_urls_title?: string | null
          id?: string
          is_active?: boolean
          neighborhood_id?: string | null
          notes?: string | null
          point_of_interest_id?: string | null
          source?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          category?: string
          city_id?: string | null
          content?: string
          created_at?: string
          destination_id?: string | null
          external_urls?: Json | null
          external_urls_section_title?: string | null
          external_urls_title?: string | null
          id?: string
          is_active?: boolean
          neighborhood_id?: string | null
          notes?: string | null
          point_of_interest_id?: string | null
          source?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_entries_point_of_interest_id_fkey"
            columns: ["point_of_interest_id"]
            isOneToOne: false
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      kp_group_titles: {
        Row: {
          created_at: string
          id: string
          kp_code: string
          kp_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kp_code: string
          kp_type: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kp_code?: string
          kp_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      label_categories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          label_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          label_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_categories_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_cities: {
        Row: {
          city_id: string
          created_at: string | null
          id: string
          label_id: string
        }
        Insert: {
          city_id: string
          created_at?: string | null
          id?: string
          label_id: string
        }
        Update: {
          city_id?: string
          created_at?: string | null
          id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_cities_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      label_neighborhoods: {
        Row: {
          created_at: string | null
          id: string
          label_id: string
          neighborhood_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_id: string
          neighborhood_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_id?: string
          neighborhood_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_neighborhoods_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_neighborhoods_neighborhood_id_fkey"
            columns: ["neighborhood_id"]
            isOneToOne: false
            referencedRelation: "neighborhoods"
            referencedColumns: ["id"]
          },
        ]
      }
      label_services: {
        Row: {
          created_at: string | null
          id: string
          label_id: string
          service_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_id: string
          service_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_services_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      label_subcategories: {
        Row: {
          created_at: string | null
          id: string
          label_id: string
          subcategory_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label_id: string
          subcategory_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label_id?: string
          subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_subcategories_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_subcategories_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          id: string
          image_url: string | null
          logo_url: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          show_on_category: boolean
          show_on_city: boolean
          show_on_home: boolean
          show_on_neighborhood: boolean
          show_on_service: boolean
          show_on_subcategory: boolean
          sort_order: number | null
          updated_at: string | null
          url_ar: string | null
          url_en: string | null
          url_fr: string | null
        }
        Insert: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          show_on_category?: boolean
          show_on_city?: boolean
          show_on_home?: boolean
          show_on_neighborhood?: boolean
          show_on_service?: boolean
          show_on_subcategory?: boolean
          sort_order?: number | null
          updated_at?: string | null
          url_ar?: string | null
          url_en?: string | null
          url_fr?: string | null
        }
        Update: {
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          show_on_category?: boolean
          show_on_city?: boolean
          show_on_home?: boolean
          show_on_neighborhood?: boolean
          show_on_service?: boolean
          show_on_subcategory?: boolean
          sort_order?: number | null
          updated_at?: string | null
          url_ar?: string | null
          url_en?: string | null
          url_fr?: string | null
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          city_id: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          hook: string | null
          hook_ar: string | null
          hook_en: string | null
          id: string
          image_url: string | null
          keywords: string[] | null
          keywords_ar: string[] | null
          keywords_en: string[] | null
          latitude: number | null
          longitude: number | null
          name: string
          name_ar: string | null
          name_en: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          hook?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          keywords_ar?: string[] | null
          keywords_en?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          hook?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          keywords_ar?: string[] | null
          keywords_en?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "neighborhoods_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      page_meta_overrides: {
        Row: {
          description: string | null
          og_image: string | null
          og_type: string | null
          route_pattern: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          og_image?: string | null
          og_type?: string | null
          route_pattern: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          og_image?: string | null
          og_type?: string | null
          route_pattern?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invoice_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invoice_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: Database["public"]["Enums"]["billing_currency"]
          id: string
          invoice_id: string
          paid_at: string | null
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["billing_payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          invoice_id: string
          paid_at?: string | null
          provider: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["billing_payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          invoice_id?: string
          paid_at?: string | null
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["billing_payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number
          updated_at: string
          video_ids: string[]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number
          updated_at?: string
          video_ids?: string[]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          video_ids?: string[]
        }
        Relationships: []
      }
      phone_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      poi_internal_notes: {
        Row: {
          notes: string | null
          poi_id: string
          updated_at: string
        }
        Insert: {
          notes?: string | null
          poi_id: string
          updated_at?: string
        }
        Update: {
          notes?: string | null
          poi_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poi_internal_notes_poi_id_fkey"
            columns: ["poi_id"]
            isOneToOne: true
            referencedRelation: "points_of_interest"
            referencedColumns: ["id"]
          },
        ]
      }
      points_of_interest: {
        Row: {
          city_id: string
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          hook: string | null
          id: string
          image_url: string | null
          images: string[] | null
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          official_site_ar: string | null
          official_site_en: string | null
          official_site_fr: string | null
          sort_order: number | null
          updated_at: string | null
          wikipedia_ar: string | null
          wikipedia_en: string | null
          wikipedia_fr: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          official_site_ar?: string | null
          official_site_en?: string | null
          official_site_fr?: string | null
          sort_order?: number | null
          updated_at?: string | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          official_site_ar?: string | null
          official_site_en?: string | null
          official_site_fr?: string | null
          sort_order?: number | null
          updated_at?: string | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_of_interest_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_searches: {
        Row: {
          created_at: string
          extracted_keywords: string | null
          id: string
          is_active: boolean
          query: string
          query_ar: string | null
          query_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_keywords?: string | null
          id?: string
          is_active?: boolean
          query: string
          query_ar?: string | null
          query_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_keywords?: string | null
          id?: string
          is_active?: boolean
          query?: string
          query_ar?: string | null
          query_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pricing_grids: {
        Row: {
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["billing_currency"]
          id: string
          is_active: boolean
          notes: string | null
          recurrence: Database["public"]["Enums"]["billing_recurrence"]
          service_id: string
          unit_price: number
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          is_active?: boolean
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          service_id: string
          unit_price: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["billing_currency"]
          id?: string
          is_active?: boolean
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          service_id?: string
          unit_price?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_grids_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "billing_services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          id: string
          label: string
          line_total_ht: number
          line_total_ttc: number
          line_total_vat: number
          manual_reason: string | null
          price_source: Database["public"]["Enums"]["billing_price_source"]
          pricing_grid_id: string | null
          quantity: number
          quote_id: string
          recurrence: Database["public"]["Enums"]["billing_recurrence"]
          sort_order: number
          unit_price_ht: number
          vat_exempt: boolean
          vat_exempt_reason: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          manual_reason?: string | null
          price_source?: Database["public"]["Enums"]["billing_price_source"]
          pricing_grid_id?: string | null
          quantity?: number
          quote_id: string
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          sort_order?: number
          unit_price_ht?: number
          vat_exempt?: boolean
          vat_exempt_reason?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          line_total_ht?: number
          line_total_ttc?: number
          line_total_vat?: number
          manual_reason?: string | null
          price_source?: Database["public"]["Enums"]["billing_price_source"]
          pricing_grid_id?: string | null
          quantity?: number
          quote_id?: string
          recurrence?: Database["public"]["Enums"]["billing_recurrence"]
          sort_order?: number
          unit_price_ht?: number
          vat_exempt?: boolean
          vat_exempt_reason?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_pricing_grid_id_fkey"
            columns: ["pricing_grid_id"]
            isOneToOne: false
            referencedRelation: "pricing_grids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          accepted_at: string | null
          affiliate_id: string | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["billing_currency"]
          expired_at: string | null
          expires_at: string | null
          id: string
          internal_notes: string | null
          invoiced_at: string | null
          number: string | null
          prospect_email: string | null
          prospect_name: string | null
          refusal_reason: string | null
          refused_at: string | null
          reminder_sent_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          subtotal_ht: number
          total_ttc: number
          total_vat: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          affiliate_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["billing_currency"]
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          invoiced_at?: string | null
          number?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          refusal_reason?: string | null
          refused_at?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          affiliate_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["billing_currency"]
          expired_at?: string | null
          expires_at?: string | null
          id?: string
          internal_notes?: string | null
          invoiced_at?: string | null
          number?: string | null
          prospect_email?: string | null
          prospect_name?: string | null
          refusal_reason?: string | null
          refused_at?: string | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal_ht?: number
          total_ttc?: number
          total_vat?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          name_ar: string | null
          name_en: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          name_ar?: string | null
          name_en?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          business_id: string
          created_at: string
          fetched_at: string
          highlight: string | null
          id: string
          is_default: boolean
          is_hidden: boolean
          language: string | null
          published_at: string | null
          rating: number | null
          relative_time: string | null
          source: string
          text: string | null
          text_ar: string | null
          text_en: string | null
          text_fr: string | null
        }
        Insert: {
          author_name?: string | null
          business_id: string
          created_at?: string
          fetched_at?: string
          highlight?: string | null
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source: string
          text?: string | null
          text_ar?: string | null
          text_en?: string | null
          text_fr?: string | null
        }
        Update: {
          author_name?: string | null
          business_id?: string
          created_at?: string
          fetched_at?: string
          highlight?: string | null
          id?: string
          is_default?: boolean
          is_hidden?: boolean
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source?: string
          text?: string | null
          text_ar?: string | null
          text_en?: string | null
          text_fr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      search_bundles: {
        Row: {
          badge_id: string | null
          created_at: string | null
          id: string
          is_active: boolean
          keyword: string
          required_service: string | null
          sort_order: number
          subcategory_name: string | null
          time_slots: string[]
          updated_at: string | null
        }
        Insert: {
          badge_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          required_service?: string | null
          sort_order?: number
          subcategory_name?: string | null
          time_slots?: string[]
          updated_at?: string | null
        }
        Update: {
          badge_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
          required_service?: string | null
          sort_order?: number
          subcategory_name?: string | null
          time_slots?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_bundles_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          category: string | null
          city: string | null
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string
          id?: string
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      search_intent_words: {
        Row: {
          category_name: string
          created_at: string | null
          id: string
          is_active: boolean
          merge_on_conflict: boolean
          updated_at: string | null
          word: string
          word_ar: string | null
          word_en: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          merge_on_conflict?: boolean
          updated_at?: string | null
          word: string
          word_ar?: string | null
          word_en?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          merge_on_conflict?: boolean
          updated_at?: string | null
          word?: string
          word_ar?: string | null
          word_en?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          detected_city: string | null
          detected_neighborhood: string | null
          detected_subcategory: string | null
          effective_query: string | null
          id: string
          is_autocomplete: boolean | null
          is_superlative: boolean | null
          movements: Json | null
          query: string
          rerank_applied: boolean | null
          rerank_latency_ms: number | null
          resolution_service_only: boolean | null
          resolution_unresolved: boolean | null
          resolved_targets: Json | null
          resolved_types: string[] | null
          results_after: Json | null
          results_before: Json | null
          search_level: string | null
          search_mode: string | null
          total_latency_ms: number | null
          total_results: number | null
        }
        Insert: {
          created_at?: string
          detected_city?: string | null
          detected_neighborhood?: string | null
          detected_subcategory?: string | null
          effective_query?: string | null
          id?: string
          is_autocomplete?: boolean | null
          is_superlative?: boolean | null
          movements?: Json | null
          query: string
          rerank_applied?: boolean | null
          rerank_latency_ms?: number | null
          resolution_service_only?: boolean | null
          resolution_unresolved?: boolean | null
          resolved_targets?: Json | null
          resolved_types?: string[] | null
          results_after?: Json | null
          results_before?: Json | null
          search_level?: string | null
          search_mode?: string | null
          total_latency_ms?: number | null
          total_results?: number | null
        }
        Update: {
          created_at?: string
          detected_city?: string | null
          detected_neighborhood?: string | null
          detected_subcategory?: string | null
          effective_query?: string | null
          id?: string
          is_autocomplete?: boolean | null
          is_superlative?: boolean | null
          movements?: Json | null
          query?: string
          rerank_applied?: boolean | null
          rerank_latency_ms?: number | null
          resolution_service_only?: boolean | null
          resolution_unresolved?: boolean | null
          resolved_targets?: Json | null
          resolved_types?: string[] | null
          results_after?: Json | null
          results_before?: Json | null
          search_level?: string | null
          search_mode?: string | null
          total_latency_ms?: number | null
          total_results?: number | null
        }
        Relationships: []
      }
      search_noise_words: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          updated_at: string | null
          word: string
          word_ar: string | null
          word_en: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          word: string
          word_ar?: string | null
          word_en?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          word?: string
          word_ar?: string | null
          word_en?: string | null
        }
        Relationships: []
      }
      search_service_filters: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          keyword: string
          keyword_ar: string | null
          keyword_en: string | null
          required_service: string
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          keyword_ar?: string | null
          keyword_en?: string | null
          required_service: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
          keyword_ar?: string | null
          keyword_en?: string | null
          required_service?: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_service_filters_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      search_synonyms: {
        Row: {
          badge_id: string | null
          commodity_filters: string[]
          created_at: string | null
          engagement_filters: string[]
          filters: Json
          id: string
          is_active: boolean
          key_word: string
          key_word_ar: string | null
          key_word_en: string | null
          service_names: string[]
          subcategory_names: string[]
          synonyms: string[]
          synonyms_ar: string[] | null
          synonyms_en: string[] | null
          updated_at: string | null
        }
        Insert: {
          badge_id?: string | null
          commodity_filters?: string[]
          created_at?: string | null
          engagement_filters?: string[]
          filters?: Json
          id?: string
          is_active?: boolean
          key_word: string
          key_word_ar?: string | null
          key_word_en?: string | null
          service_names?: string[]
          subcategory_names?: string[]
          synonyms?: string[]
          synonyms_ar?: string[] | null
          synonyms_en?: string[] | null
          updated_at?: string | null
        }
        Update: {
          badge_id?: string | null
          commodity_filters?: string[]
          created_at?: string | null
          engagement_filters?: string[]
          filters?: Json
          id?: string
          is_active?: boolean
          key_word?: string
          key_word_ar?: string | null
          key_word_en?: string | null
          service_names?: string[]
          subcategory_names?: string[]
          synonyms?: string[]
          synonyms_ar?: string[] | null
          synonyms_en?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_synonyms_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      serpapi_hotels_cache: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          city_key: string
          country: string
          created_at: string
          currency: string
          expires_at: string
          fetched_at: string
          hotel_count: number
          id: string
          language: string
          payload: Json
        }
        Insert: {
          adults?: number
          check_in: string
          check_out: string
          city_key: string
          country?: string
          created_at?: string
          currency?: string
          expires_at?: string
          fetched_at?: string
          hotel_count?: number
          id?: string
          language?: string
          payload: Json
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          city_key?: string
          country?: string
          created_at?: string
          currency?: string
          expires_at?: string
          fetched_at?: string
          hotel_count?: number
          id?: string
          language?: string
          payload?: Json
        }
        Relationships: []
      }
      service_city_filters: {
        Row: {
          city_id: string
          created_at: string | null
          id: string
          service_id: string
        }
        Insert: {
          city_id: string
          created_at?: string | null
          id?: string
          service_id: string
        }
        Update: {
          city_id?: string
          created_at?: string | null
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_city_filters_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_city_filters_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_filtered: boolean
          keywords: string[] | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_filtered?: boolean
          keywords?: string[] | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_filtered?: boolean
          keywords?: string[] | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          sort_order?: number | null
          subcategory_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sponsor_internal_notes: {
        Row: {
          notes: string | null
          sponsor_id: string
          updated_at: string
        }
        Insert: {
          notes?: string | null
          sponsor_id: string
          updated_at?: string
        }
        Update: {
          notes?: string | null
          sponsor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_internal_notes_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: true
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsors: {
        Row: {
          city_ids: string[] | null
          created_at: string
          id: string
          image_big_url_ar: string | null
          image_big_url_en: string | null
          image_big_url_fr: string | null
          image_small_url_ar: string | null
          image_small_url_en: string | null
          image_small_url_fr: string | null
          is_active: boolean | null
          logo_big_url_ar: string | null
          logo_big_url_en: string | null
          logo_big_url_fr: string | null
          logo_small_url_ar: string | null
          logo_small_url_en: string | null
          logo_small_url_fr: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          updated_at: string
          url_ar: string | null
          url_en: string | null
          url_fr: string | null
          zones: string[]
        }
        Insert: {
          city_ids?: string[] | null
          created_at?: string
          id?: string
          image_big_url_ar?: string | null
          image_big_url_en?: string | null
          image_big_url_fr?: string | null
          image_small_url_ar?: string | null
          image_small_url_en?: string | null
          image_small_url_fr?: string | null
          is_active?: boolean | null
          logo_big_url_ar?: string | null
          logo_big_url_en?: string | null
          logo_big_url_fr?: string | null
          logo_small_url_ar?: string | null
          logo_small_url_en?: string | null
          logo_small_url_fr?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          updated_at?: string
          url_ar?: string | null
          url_en?: string | null
          url_fr?: string | null
          zones: string[]
        }
        Update: {
          city_ids?: string[] | null
          created_at?: string
          id?: string
          image_big_url_ar?: string | null
          image_big_url_en?: string | null
          image_big_url_fr?: string | null
          image_small_url_ar?: string | null
          image_small_url_en?: string | null
          image_small_url_fr?: string | null
          is_active?: boolean | null
          logo_big_url_ar?: string | null
          logo_big_url_en?: string | null
          logo_big_url_fr?: string | null
          logo_small_url_ar?: string | null
          logo_small_url_en?: string | null
          logo_small_url_fr?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          sort_order?: number | null
          updated_at?: string
          url_ar?: string | null
          url_en?: string | null
          url_fr?: string | null
          zones?: string[]
        }
        Relationships: []
      }
      staff_notes: {
        Row: {
          content: string | null
          id: string
          key: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          id?: string
          key: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          id?: string
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_user_notes: {
        Row: {
          content: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          adj_ar: string | null
          adj_en: string | null
          adj_fr: string | null
          category_id: string
          created_at: string | null
          description_ar: string | null
          description_en: string | null
          description_fr: string | null
          icon: string | null
          id: string
          keywords: string[] | null
          merge_group: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
          og_image_url: string | null
          show_google_map: boolean
          sort_order: number | null
          tab_title: string | null
          updated_at: string | null
        }
        Insert: {
          adj_ar?: string | null
          adj_en?: string | null
          adj_fr?: string | null
          category_id: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          merge_group?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          og_image_url?: string | null
          show_google_map?: boolean
          sort_order?: number | null
          tab_title?: string | null
          updated_at?: string | null
        }
        Update: {
          adj_ar?: string | null
          adj_en?: string | null
          adj_fr?: string | null
          category_id?: string
          created_at?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          merge_group?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          og_image_url?: string | null
          show_google_map?: boolean
          sort_order?: number | null
          tab_title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategory_relations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          source_subcategory_id: string
          target_subcategory_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          source_subcategory_id: string
          target_subcategory_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          source_subcategory_id?: string
          target_subcategory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategory_relations_source_subcategory_id_fkey"
            columns: ["source_subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategory_relations_target_subcategory_id_fkey"
            columns: ["target_subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategory_search_config: {
        Row: {
          boost_weight: number
          created_at: string | null
          id: string
          max_results: number | null
          search_mode: string
          subcategory_id: string
          synonyms: string[]
          synonyms_ar: string[] | null
          synonyms_en: string[] | null
          updated_at: string | null
        }
        Insert: {
          boost_weight?: number
          created_at?: string | null
          id?: string
          max_results?: number | null
          search_mode?: string
          subcategory_id: string
          synonyms?: string[]
          synonyms_ar?: string[] | null
          synonyms_en?: string[] | null
          updated_at?: string | null
        }
        Update: {
          boost_weight?: number
          created_at?: string | null
          id?: string
          max_results?: number | null
          search_mode?: string
          subcategory_id?: string
          synonyms?: string[]
          synonyms_ar?: string[] | null
          synonyms_en?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategory_search_config_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: true
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      translation_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          error_count: number
          fields: Json
          finished_at: string | null
          id: string
          last_error: string | null
          options: Json
          processed_rows: number
          source_lang: string
          started_at: string | null
          status: string
          success_count: number
          table_name: string
          target_lang: string
          total_rows: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_count?: number
          fields?: Json
          finished_at?: string | null
          id?: string
          last_error?: string | null
          options?: Json
          processed_rows?: number
          source_lang?: string
          started_at?: string | null
          status?: string
          success_count?: number
          table_name: string
          target_lang: string
          total_rows?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_count?: number
          fields?: Json
          finished_at?: string | null
          id?: string
          last_error?: string | null
          options?: Json
          processed_rows?: number
          source_lang?: string
          started_at?: string | null
          status?: string
          success_count?: number
          table_name?: string
          target_lang?: string
          total_rows?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vanity_urls: {
        Row: {
          created_at: string
          slug: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          slug: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          slug?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
          video_source: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
          video_source: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
          video_source?: string
        }
        Relationships: []
      }
      video_feed_pages: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          custom_hero_image_url: string | null
          hero_alt: string | null
          hero_subtitle_ar: string | null
          hero_subtitle_en: string | null
          hero_subtitle_fr: string | null
          hero_title_bottom_ar: string | null
          hero_title_bottom_en: string | null
          hero_title_bottom_fr: string | null
          hero_title_top_ar: string | null
          hero_title_top_en: string | null
          hero_title_top_fr: string | null
          id: string
          intro_ar: string | null
          intro_en: string | null
          intro_fr: string | null
          is_published: boolean
          published_at: string | null
          section_intro_ar: string | null
          section_intro_en: string | null
          section_intro_fr: string | null
          section_title_ar: string | null
          section_title_en: string | null
          section_title_fr: string | null
          seo_description_ar: string | null
          seo_description_en: string | null
          seo_description_fr: string | null
          seo_title_ar: string | null
          seo_title_en: string | null
          seo_title_fr: string | null
          slug: string
          updated_at: string
          video_config: Json
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_hero_image_url?: string | null
          hero_alt?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_fr?: string | null
          hero_title_bottom_ar?: string | null
          hero_title_bottom_en?: string | null
          hero_title_bottom_fr?: string | null
          hero_title_top_ar?: string | null
          hero_title_top_en?: string | null
          hero_title_top_fr?: string | null
          id?: string
          intro_ar?: string | null
          intro_en?: string | null
          intro_fr?: string | null
          is_published?: boolean
          published_at?: string | null
          section_intro_ar?: string | null
          section_intro_en?: string | null
          section_intro_fr?: string | null
          section_title_ar?: string | null
          section_title_en?: string | null
          section_title_fr?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_description_fr?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          seo_title_fr?: string | null
          slug: string
          updated_at?: string
          video_config?: Json
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_hero_image_url?: string | null
          hero_alt?: string | null
          hero_subtitle_ar?: string | null
          hero_subtitle_en?: string | null
          hero_subtitle_fr?: string | null
          hero_title_bottom_ar?: string | null
          hero_title_bottom_en?: string | null
          hero_title_bottom_fr?: string | null
          hero_title_top_ar?: string | null
          hero_title_top_en?: string | null
          hero_title_top_fr?: string | null
          id?: string
          intro_ar?: string | null
          intro_en?: string | null
          intro_fr?: string | null
          is_published?: boolean
          published_at?: string | null
          section_intro_ar?: string | null
          section_intro_en?: string | null
          section_intro_fr?: string | null
          section_title_ar?: string | null
          section_title_en?: string | null
          section_title_fr?: string | null
          seo_description_ar?: string | null
          seo_description_en?: string | null
          seo_description_fr?: string | null
          seo_title_ar?: string | null
          seo_title_en?: string | null
          seo_title_fr?: string | null
          slug?: string
          updated_at?: string
          video_config?: Json
        }
        Relationships: []
      }
      video_jobs: {
        Row: {
          business_id: string | null
          created_at: string
          duration_sec: number
          error_message: string | null
          gallery_sort_order: number | null
          id: string
          notify_email: boolean
          notify_email_to: string | null
          output_url: string | null
          parent_job_id: string | null
          prompt: string
          scenario_json: Json | null
          status: string
          template_id: string | null
          template_props: Json | null
          title: string | null
          tone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          duration_sec?: number
          error_message?: string | null
          gallery_sort_order?: number | null
          id?: string
          notify_email?: boolean
          notify_email_to?: string | null
          output_url?: string | null
          parent_job_id?: string | null
          prompt: string
          scenario_json?: Json | null
          status?: string
          template_id?: string | null
          template_props?: Json | null
          title?: string | null
          tone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          duration_sec?: number
          error_message?: string | null
          gallery_sort_order?: number | null
          id?: string
          notify_email?: boolean
          notify_email_to?: string | null
          output_url?: string | null
          parent_job_id?: string | null
          prompt?: string
          scenario_json?: Json | null
          status?: string
          template_id?: string | null
          template_props?: Json | null
          title?: string | null
          tone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
          video_source: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
          video_source: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
          video_source?: string
        }
        Relationships: []
      }
      video_media_library: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string | null
          duration_sec: number | null
          id: string
          kind: string
          orientation: string | null
          storage_path: string | null
          tags: string[]
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          id?: string
          kind: string
          orientation?: string | null
          storage_path?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          duration_sec?: number | null
          id?: string
          kind?: string
          orientation?: string | null
          storage_path?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_media_library_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_media_library_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      video_render_presets: {
        Row: {
          business_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_render_presets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_render_presets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scenario_configs: {
        Row: {
          business_id: string | null
          created_at: string
          effects: Json | null
          encode: Json | null
          format_key: string
          fps: number
          global_media: Json
          height: number
          mode: string
          render_duration_sec: number
          render_prompt: string | null
          render_tone: string
          updated_at: string
          width: number
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          effects?: Json | null
          encode?: Json | null
          format_key?: string
          fps?: number
          global_media?: Json
          height?: number
          mode: string
          render_duration_sec?: number
          render_prompt?: string | null
          render_tone?: string
          updated_at?: string
          width?: number
        }
        Update: {
          business_id?: string | null
          created_at?: string
          effects?: Json | null
          encode?: Json | null
          format_key?: string
          fps?: number
          global_media?: Json
          height?: number
          mode?: string
          render_duration_sec?: number
          render_prompt?: string | null
          render_tone?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_scenario_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_scenario_configs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scenario_internal_notes: {
        Row: {
          mode: string
          note: string | null
          updated_at: string
        }
        Insert: {
          mode: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          mode?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_scenario_internal_notes_mode_fkey"
            columns: ["mode"]
            isOneToOne: true
            referencedRelation: "video_scenario_configs"
            referencedColumns: ["mode"]
          },
        ]
      }
      video_scenario_step_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          position: number
          step_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          step_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          position?: number
          step_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_scenario_step_notes_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "video_scenario_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      video_scenario_steps: {
        Row: {
          body: string | null
          business_id: string | null
          config: Json
          created_at: string
          duration_sec: number
          enabled: boolean
          id: string
          key_message: string | null
          kicker: string | null
          label: string | null
          mode: string
          position: number
          scene_key: string
          step_type: string | null
          storyboard_id: string | null
          title: string | null
          updated_at: string
          widget_keys: string[]
        }
        Insert: {
          body?: string | null
          business_id?: string | null
          config?: Json
          created_at?: string
          duration_sec?: number
          enabled?: boolean
          id?: string
          key_message?: string | null
          kicker?: string | null
          label?: string | null
          mode: string
          position?: number
          scene_key: string
          step_type?: string | null
          storyboard_id?: string | null
          title?: string | null
          updated_at?: string
          widget_keys?: string[]
        }
        Update: {
          body?: string | null
          business_id?: string | null
          config?: Json
          created_at?: string
          duration_sec?: number
          enabled?: boolean
          id?: string
          key_message?: string | null
          kicker?: string | null
          label?: string | null
          mode?: string
          position?: number
          scene_key?: string
          step_type?: string | null
          storyboard_id?: string | null
          title?: string | null
          updated_at?: string
          widget_keys?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "video_scenario_steps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_scenario_steps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_scenario_steps_storyboard_id_fkey"
            columns: ["storyboard_id"]
            isOneToOne: false
            referencedRelation: "video_storyboards"
            referencedColumns: ["id"]
          },
        ]
      }
      video_storyboards: {
        Row: {
          business_id: string | null
          created_at: string
          effects: Json | null
          encode: Json | null
          format: string
          global_media: Json
          id: string
          internal_note: string | null
          max_duration_sec: number
          name: string
          preview_scale: number
          scenario_type: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          effects?: Json | null
          encode?: Json | null
          format?: string
          global_media?: Json
          id?: string
          internal_note?: string | null
          max_duration_sec?: number
          name: string
          preview_scale?: number
          scenario_type?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          effects?: Json | null
          encode?: Json | null
          format?: string
          global_media?: Json
          id?: string
          internal_note?: string | null
          max_duration_sec?: number
          name?: string
          preview_scale?: number
          scenario_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_storyboards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_storyboards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          id: string
          user_id: string | null
          video_id: string
          video_source: string
          viewed_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          video_id: string
          video_source: string
          viewed_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          video_id?: string
          video_source?: string
          viewed_at?: string
        }
        Relationships: []
      }
      voice_intent_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_text: string
          rule_text_ar: string | null
          rule_text_en: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text: string
          rule_text_ar?: string | null
          rule_text_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text?: string
          rule_text_ar?: string | null
          rule_text_en?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      widget_alert_sends: {
        Row: {
          alert_type: string
          city_slug: string
          created_at: string
          details: Json | null
          email: string
          id: string
          subscriber_id: string | null
          target_date: string
        }
        Insert: {
          alert_type: string
          city_slug: string
          created_at?: string
          details?: Json | null
          email: string
          id?: string
          subscriber_id?: string | null
          target_date: string
        }
        Update: {
          alert_type?: string
          city_slug?: string
          created_at?: string
          details?: Json | null
          email?: string
          id?: string
          subscriber_id?: string | null
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_alert_sends_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "widget_alert_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_alert_subscribers: {
        Row: {
          alert_fishing: boolean
          alert_kitesurf: boolean
          alert_spring_tide: boolean
          alert_surf: boolean
          alert_wingfoil: boolean
          avatar_url: string | null
          city_name: string | null
          city_slug: string
          created_at: string
          email: string
          id: string
          lang: string
          nickname: string | null
          unsubscribe_token: string
          updated_at: string
        }
        Insert: {
          alert_fishing?: boolean
          alert_kitesurf?: boolean
          alert_spring_tide?: boolean
          alert_surf?: boolean
          alert_wingfoil?: boolean
          avatar_url?: string | null
          city_name?: string | null
          city_slug: string
          created_at?: string
          email: string
          id?: string
          lang?: string
          nickname?: string | null
          unsubscribe_token?: string
          updated_at?: string
        }
        Update: {
          alert_fishing?: boolean
          alert_kitesurf?: boolean
          alert_spring_tide?: boolean
          alert_surf?: boolean
          alert_wingfoil?: boolean
          avatar_url?: string | null
          city_name?: string | null
          city_slug?: string
          created_at?: string
          email?: string
          id?: string
          lang?: string
          nickname?: string | null
          unsubscribe_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      widget_events: {
        Row: {
          action: string | null
          business_id: string | null
          created_at: string
          device: string | null
          event_type: string
          host: string | null
          id: string
          lang: string | null
          meta: Json
          page_url: string | null
          widget_key: string
        }
        Insert: {
          action?: string | null
          business_id?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          host?: string | null
          id?: string
          lang?: string | null
          meta?: Json
          page_url?: string | null
          widget_key: string
        }
        Update: {
          action?: string | null
          business_id?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          host?: string | null
          id?: string
          lang?: string | null
          meta?: Json
          page_url?: string | null
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "widget_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses_public"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          bg_dark: string | null
          bg_light: string | null
          card_mode: string
          created_at: string
          fit: string
          height: number
          id: string
          lang: string
          max_width: number | null
          options: Json
          radius: number
          theme: string
          updated_at: string
          widget_key: string
        }
        Insert: {
          bg_dark?: string | null
          bg_light?: string | null
          card_mode?: string
          created_at?: string
          fit?: string
          height?: number
          id?: string
          lang?: string
          max_width?: number | null
          options?: Json
          radius?: number
          theme?: string
          updated_at?: string
          widget_key: string
        }
        Update: {
          bg_dark?: string | null
          bg_light?: string | null
          card_mode?: string
          created_at?: string
          fit?: string
          height?: number
          id?: string
          lang?: string
          max_width?: number | null
          options?: Json
          radius?: number
          theme?: string
          updated_at?: string
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_settings_widget_key_fkey"
            columns: ["widget_key"]
            isOneToOne: true
            referencedRelation: "widget_types"
            referencedColumns: ["widget_key"]
          },
        ]
      }
      widget_types: {
        Row: {
          created_at: string
          description: string | null
          embed_path: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          widget_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          embed_path?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          widget_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          embed_path?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          widget_key?: string
        }
        Relationships: []
      }
      youtube_themes: {
        Row: {
          created_at: string
          id: string
          name_fr: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name_fr: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name_fr?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      businesses_public: {
        Row: {
          account_type: string | null
          address: string | null
          affiliate_id: string | null
          ai_review_summary: Json | null
          airbnb_url: string | null
          avg_price_range: Json | null
          badge_id: string | null
          booking_url: string | null
          business_type: string | null
          categories: string[] | null
          city: string | null
          country: string | null
          created_at: string | null
          default_service: string | null
          description: string | null
          destination_description: string | null
          destination_hook: string | null
          email: string | null
          engagements: string[] | null
          facebook_url: string | null
          flipbook_language: string | null
          flipbook_name: string | null
          flipbook_url: string | null
          gamme_id: string | null
          getyourguide_rating: number | null
          getyourguide_review_count: number | null
          getyourguide_url: string | null
          glovo_url: string | null
          google_maps_url: string | null
          google_rating: number | null
          google_review_count: number | null
          google_reviews_url: string | null
          hook_ar: string | null
          hook_en: string | null
          hook_fr: string | null
          hotels_com_url: string | null
          ice: string | null
          id: string | null
          images: string[] | null
          instagram_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_master: boolean | null
          is_open_24h: boolean | null
          is_poi: boolean | null
          is_regulated_activity: boolean | null
          is_visible_locale: boolean | null
          keywords: string[] | null
          label1_link_url: string | null
          label1_url: string | null
          languages: string[] | null
          latitude: number | null
          linkedin_url: string | null
          logo_2_url: string | null
          logo_bg: string | null
          logo_url: string | null
          longitude: number | null
          main_category: string | null
          matterport_url: string | null
          menu_language: string | null
          menu_name: string | null
          menu_summary: string | null
          menu_summary_title: string | null
          menu_url: string | null
          name: string | null
          neighborhood: string | null
          online_shop_url: string | null
          opening_hours: Json | null
          other_booking_name: string | null
          other_booking_url: string | null
          pdf_2_name: string | null
          pdf_2_url: string | null
          pdf_3_name: string | null
          pdf_3_url: string | null
          pdf_name: string | null
          pdf_url: string | null
          phone: string | null
          pinterest_url: string | null
          poi_description: string | null
          poi_hook: string | null
          priority_score: number | null
          rating: number | null
          region: string | null
          reserve_now_url: string | null
          restaurant_guru_rating: number | null
          restaurant_guru_review_count: number | null
          restaurant_guru_url: string | null
          search_vector: unknown
          services: string[] | null
          show_opening_hours: boolean | null
          skype: string | null
          telegram: string | null
          tiktok_url: string | null
          tripadvisor_location_id: string | null
          tripadvisor_rating: number | null
          tripadvisor_review_count: number | null
          tripadvisor_review_url: string | null
          tripadvisor_url: string | null
          trivago_url: string | null
          twitter_url: string | null
          updated_at: string | null
          vacation_dates: Json | null
          viator_rating: number | null
          viator_review_count: number | null
          viator_url: string | null
          video_1_url: string | null
          vimeo_url: string | null
          website: string | null
          whatsapp: string | null
          wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url: string | null
          zone_chalandise: string | null
          zone_city_ids: string[] | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          affiliate_id?: string | null
          ai_review_summary?: Json | null
          airbnb_url?: string | null
          avg_price_range?: Json | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_service?: string | null
          description?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[] | null
          facebook_url?: string | null
          flipbook_language?: string | null
          flipbook_name?: string | null
          flipbook_url?: string | null
          gamme_id?: string | null
          getyourguide_rating?: number | null
          getyourguide_review_count?: number | null
          getyourguide_url?: string | null
          glovo_url?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_reviews_url?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          hotels_com_url?: string | null
          ice?: string | null
          id?: string | null
          images?: string[] | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_master?: boolean | null
          is_open_24h?: boolean | null
          is_poi?: boolean | null
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean | null
          keywords?: string[] | null
          label1_link_url?: string | null
          label1_url?: string | null
          languages?: string[] | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_2_url?: string | null
          logo_bg?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          matterport_url?: string | null
          menu_language?: string | null
          menu_name?: string | null
          menu_summary?: string | null
          menu_summary_title?: string | null
          menu_url?: string | null
          name?: string | null
          neighborhood?: string | null
          online_shop_url?: string | null
          opening_hours?: Json | null
          other_booking_name?: string | null
          other_booking_url?: string | null
          pdf_2_name?: string | null
          pdf_2_url?: string | null
          pdf_3_name?: string | null
          pdf_3_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          poi_description?: string | null
          poi_hook?: string | null
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          telegram?: string | null
          tiktok_url?: string | null
          tripadvisor_location_id?: string | null
          tripadvisor_rating?: number | null
          tripadvisor_review_count?: number | null
          tripadvisor_review_url?: string | null
          tripadvisor_url?: string | null
          trivago_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          whatsapp?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url?: string | null
          zone_chalandise?: string | null
          zone_city_ids?: string[] | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          affiliate_id?: string | null
          ai_review_summary?: Json | null
          airbnb_url?: string | null
          avg_price_range?: Json | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          default_service?: string | null
          description?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[] | null
          facebook_url?: string | null
          flipbook_language?: string | null
          flipbook_name?: string | null
          flipbook_url?: string | null
          gamme_id?: string | null
          getyourguide_rating?: number | null
          getyourguide_review_count?: number | null
          getyourguide_url?: string | null
          glovo_url?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          google_reviews_url?: string | null
          hook_ar?: string | null
          hook_en?: string | null
          hook_fr?: string | null
          hotels_com_url?: string | null
          ice?: string | null
          id?: string | null
          images?: string[] | null
          instagram_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_master?: boolean | null
          is_open_24h?: boolean | null
          is_poi?: boolean | null
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean | null
          keywords?: string[] | null
          label1_link_url?: string | null
          label1_url?: string | null
          languages?: string[] | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_2_url?: string | null
          logo_bg?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          matterport_url?: string | null
          menu_language?: string | null
          menu_name?: string | null
          menu_summary?: string | null
          menu_summary_title?: string | null
          menu_url?: string | null
          name?: string | null
          neighborhood?: string | null
          online_shop_url?: string | null
          opening_hours?: Json | null
          other_booking_name?: string | null
          other_booking_url?: string | null
          pdf_2_name?: string | null
          pdf_2_url?: string | null
          pdf_3_name?: string | null
          pdf_3_url?: string | null
          pdf_name?: string | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          poi_description?: string | null
          poi_hook?: string | null
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          telegram?: string | null
          tiktok_url?: string | null
          tripadvisor_location_id?: string | null
          tripadvisor_rating?: number | null
          tripadvisor_review_count?: number | null
          tripadvisor_review_url?: string | null
          tripadvisor_url?: string | null
          trivago_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          whatsapp?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url?: string | null
          zone_chalandise?: string | null
          zone_city_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_gamme_id_fkey"
            columns: ["gamme_id"]
            isOneToOne: false
            referencedRelation: "gammes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_user_role_by_email: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: string
      }
      affiliate_owns_business_in_path: {
        Args: { _name: string; _user_id: string }
        Returns: boolean
      }
      business_exists: { Args: { _business_id: string }; Returns: boolean }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_badge_video_feed: {
        Args: {
          _badge_id: string
          _city_ids?: string[]
          _limit?: number
          _offset?: number
          _seed?: string
        }
        Returns: {
          business_id: string
          business_logo_bg: string
          business_logo_url: string
          business_name: string
          description: string
          feed_position: number
          group_key: string
          id: string
          is_generic: boolean
          price: string
          source: string
          thumbnail_url: string
          title: string
          url: string
        }[]
      }
      get_badges_video_feed: {
        Args: {
          _badge_ids: string[]
          _city_ids: string[]
          _include_no_city?: boolean
          _limit: number
          _offset: number
          _seed: string
        }
        Returns: {
          badges: Json
          business_id: string
          business_logo_bg: string
          business_logo_url: string
          business_name: string
          description: string
          feed_position: number
          group_key: string
          id: string
          is_generic: boolean
          price: string
          social_account: string
          social_platform: string
          social_url: string
          source: string
          thumbnail_url: string
          title: string
          total_count: number
          url: string
        }[]
      }
      get_blocked_domains_list: { Args: never; Returns: string[] }
      get_blog_analytics: { Args: { p_days?: number }; Returns: Json }
      get_broken_urls_list: { Args: never; Returns: string[] }
      get_business_analytics: {
        Args: { p_business_id: string; p_range?: string }
        Returns: Json
      }
      get_club_ai_usage_by_user: {
        Args: { p_since?: string }
        Returns: {
          event_count: number
          input_tokens: number
          last_used_at: string
          output_tokens: number
          total_cost_usd: number
          total_tokens: number
          user_id: string
        }[]
      }
      get_club_members_with_last_sign_in: {
        Args: never
        Returns: {
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_active_at: string
          last_name: string
          last_sign_in_at: string
          nickname: string
          personas: Json
          phone: string
          user_id: string
          whatsapp: string
        }[]
      }
      get_hotel_mapping_for_business: {
        Args: { _business_id: string }
        Returns: {
          liteapi_hotel_id: string
        }[]
      }
      get_hotel_mappings_by_liteapi_ids: {
        Args: { _ids: string[] }
        Returns: {
          business_id: string
          liteapi_hotel_id: string
        }[]
      }
      get_public_club_profile: {
        Args: { _nickname: string }
        Returns: {
          avatar_url: string
          city: string
          country: string
          description: string
          facebook: string
          first_name: string
          instagram: string
          last_name: string
          linkedin: string
          nickname: string
          pinterest: string
          soundcloud: string
          spotify: string
          tiktok: string
          twitter: string
          website: string
          youtube: string
        }[]
      }
      get_showcase_site_stats: {
        Args: { p_business_id: string; p_days?: number }
        Returns: Json
      }
      get_user_roles_with_emails: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_video_like_count: {
        Args: { p_video_id: string; p_video_source: string }
        Returns: number
      }
      get_video_view_count: {
        Args: { p_video_id: string; p_video_source: string }
        Returns: number
      }
      get_widget_analytics: {
        Args: { p_business_id?: string; p_days?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_affiliate: { Args: { _user_id: string }; Returns: boolean }
      is_own_affiliate_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_club_suggestions: {
        Args: {
          match_count?: number
          min_similarity?: number
          query_embedding: string
        }
        Returns: {
          blog_post_ids: string[]
          fixed_response_ar: string
          fixed_response_en: string
          fixed_response_fr: string
          id: string
          label_ar: string
          label_en: string
          label_fr: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_billing_number: { Args: { _kind: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_business_search_vector_for_ids: {
        Args: { _ids: string[] }
        Returns: undefined
      }
      replace_business_documents: {
        Args: {
          p_business_id: string
          p_docs: Json
          p_managed_types?: string[]
        }
        Returns: Json
      }
      resolve_affiliate_id: { Args: { _user_id: string }; Returns: string }
      search_businesses_with_rank:
        | {
            Args: {
              p_category?: string
              p_city?: string
              p_limit?: number
              p_query: string
              p_service?: string
            }
            Returns: {
              account_type: string | null
              address: string | null
              affiliate_id: string | null
              ai_review_summary: Json | null
              airbnb_url: string | null
              avg_price_range: Json | null
              avis_verifies_rating: number | null
              avis_verifies_review_count: number | null
              avis_verifies_url: string | null
              badge_id: string | null
              booking_url: string | null
              business_type: string | null
              carousel_badge: string | null
              categories: string[] | null
              city: string | null
              closure_message: string | null
              computed_rating: number | null
              country: string | null
              created_at: string
              default_destination_id: string | null
              default_destination_style: string
              default_poi_business_id: string | null
              default_poi_is_master: boolean
              default_service: string | null
              default_sound_on: boolean
              description: string | null
              description_ar: string | null
              description_en: string | null
              description_fr: string | null
              destination_description: string | null
              destination_hook: string | null
              email: string | null
              engagements: string[]
              facebook_url: string | null
              faq: Json | null
              flipbook_language: string | null
              flipbook_name: string | null
              flipbook_url: string | null
              front_video_count: number | null
              gamme_id: string | null
              getyourguide_rating: number | null
              getyourguide_review_count: number | null
              getyourguide_url: string | null
              glovo_url: string | null
              google_maps_url: string | null
              google_place_id: string | null
              google_rating: number | null
              google_review_count: number | null
              google_review_url: string | null
              google_reviews_url: string | null
              hide_description: boolean
              hook_ar: string | null
              hook_en: string | null
              hook_fr: string | null
              hotels_com_url: string | null
              ice: string | null
              id: string
              images: string[] | null
              instagram_url: string | null
              is_active: boolean
              is_featured: boolean | null
              is_master: boolean
              is_open_24h: boolean
              is_poi: boolean
              is_regulated_activity: boolean | null
              is_visible_locale: boolean
              kayak_rating: number | null
              kayak_review_count: number | null
              kayak_url: string | null
              keywords: string[] | null
              kp_active: boolean
              kp_active_2: boolean
              kp_city: string | null
              kp_city_2: string | null
              kp_regroupement: string | null
              kp_regroupement_2: string | null
              label1_link_url: string | null
              label1_url: string | null
              languages: string[] | null
              latitude: number | null
              linkedin_url: string | null
              logo_2_url: string | null
              logo_bg: string | null
              logo_url: string | null
              longitude: number | null
              main_category: string | null
              manual_price_range: string | null
              map_bg_color: string | null
              matterport_url: string | null
              menu_language: string | null
              menu_name: string | null
              menu_summary: string | null
              menu_summary_title: string | null
              menu_url: string | null
              min_price: number | null
              name: string
              name_ar: string | null
              name_en: string | null
              neighborhood: string | null
              online_shop_cta: string | null
              online_shop_force_external: boolean
              online_shop_presentation_mode: string
              online_shop_url: string | null
              opening_hours: Json | null
              other_booking_name: string | null
              other_booking_url: string | null
              pdf_2_name: string | null
              pdf_2_url: string | null
              pdf_3_name: string | null
              pdf_3_url: string | null
              pdf_name: string | null
              pdf_url: string | null
              phone: string | null
              pinterest_url: string | null
              poi_business_style: string
              poi_description: string | null
              poi_hook: string | null
              poi_radius_km: number
              popup_image_url: string | null
              presentation_mode: string
              prioritize_images: boolean
              priority_score: number | null
              rating: number | null
              region: string | null
              reserve_now_cta: string | null
              reserve_now_force_external: boolean
              reserve_now_url: string | null
              restaurant_guru_rating: number | null
              restaurant_guru_review_count: number | null
              restaurant_guru_url: string | null
              search_vector: unknown
              services: string[] | null
              show_opening_hours: boolean | null
              show_videos: boolean
              show_youtube_tab: boolean
              showcase_target_url: string | null
              skype: string | null
              slug: string
              snapchat_url: string | null
              soundcloud_url: string | null
              spotify_url: string | null
              substack_url: string | null
              telegram: string | null
              tiktok_url: string | null
              total_review_count: number | null
              tourradar_rating: number | null
              tourradar_review_count: number | null
              tourradar_url: string | null
              tripadvisor_location_id: string | null
              tripadvisor_rating: number | null
              tripadvisor_review_count: number | null
              tripadvisor_review_url: string | null
              tripadvisor_url: string | null
              trivago_url: string | null
              trustpilot_rating: number | null
              trustpilot_review_count: number | null
              trustpilot_url: string | null
              twitter_url: string | null
              unified_cta: string | null
              updated_at: string
              url_4: string | null
              url_4_cta: string | null
              url_4_force_external: boolean
              url_4_presentation_mode: string
              url_5: string | null
              url_5_cta: string | null
              url_5_force_external: boolean
              url_5_presentation_mode: string
              url_6: string | null
              url_6_force_external: boolean | null
              url_6_title: string | null
              vacation_dates: Json | null
              viator_rating: number | null
              viator_review_count: number | null
              viator_url: string | null
              video_1_url: string | null
              vimeo_url: string | null
              website: string | null
              website_cta: string | null
              website_force_external: boolean
              website_presentation_mode: string
              whatsapp: string | null
              widget_bg_color: string | null
              widget_bg_color_dark: string | null
              widget_theme: string | null
              wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
              youtube_channel_featured: boolean
              youtube_channel_thumbnail_url: string | null
              youtube_url: string | null
              zone_chalandise: string | null
              zone_city_ids: string[] | null
            }[]
            SetofOptions: {
              from: "*"
              to: "businesses"
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_category?: string
              p_city?: string
              p_city_id?: string
              p_limit?: number
              p_query: string
              p_service?: string
            }
            Returns: {
              account_type: string | null
              address: string | null
              affiliate_id: string | null
              ai_review_summary: Json | null
              airbnb_url: string | null
              avg_price_range: Json | null
              avis_verifies_rating: number | null
              avis_verifies_review_count: number | null
              avis_verifies_url: string | null
              badge_id: string | null
              booking_url: string | null
              business_type: string | null
              carousel_badge: string | null
              categories: string[] | null
              city: string | null
              closure_message: string | null
              computed_rating: number | null
              country: string | null
              created_at: string
              default_destination_id: string | null
              default_destination_style: string
              default_poi_business_id: string | null
              default_poi_is_master: boolean
              default_service: string | null
              default_sound_on: boolean
              description: string | null
              description_ar: string | null
              description_en: string | null
              description_fr: string | null
              destination_description: string | null
              destination_hook: string | null
              email: string | null
              engagements: string[]
              facebook_url: string | null
              faq: Json | null
              flipbook_language: string | null
              flipbook_name: string | null
              flipbook_url: string | null
              front_video_count: number | null
              gamme_id: string | null
              getyourguide_rating: number | null
              getyourguide_review_count: number | null
              getyourguide_url: string | null
              glovo_url: string | null
              google_maps_url: string | null
              google_place_id: string | null
              google_rating: number | null
              google_review_count: number | null
              google_review_url: string | null
              google_reviews_url: string | null
              hide_description: boolean
              hook_ar: string | null
              hook_en: string | null
              hook_fr: string | null
              hotels_com_url: string | null
              ice: string | null
              id: string
              images: string[] | null
              instagram_url: string | null
              is_active: boolean
              is_featured: boolean | null
              is_master: boolean
              is_open_24h: boolean
              is_poi: boolean
              is_regulated_activity: boolean | null
              is_visible_locale: boolean
              kayak_rating: number | null
              kayak_review_count: number | null
              kayak_url: string | null
              keywords: string[] | null
              kp_active: boolean
              kp_active_2: boolean
              kp_city: string | null
              kp_city_2: string | null
              kp_regroupement: string | null
              kp_regroupement_2: string | null
              label1_link_url: string | null
              label1_url: string | null
              languages: string[] | null
              latitude: number | null
              linkedin_url: string | null
              logo_2_url: string | null
              logo_bg: string | null
              logo_url: string | null
              longitude: number | null
              main_category: string | null
              manual_price_range: string | null
              map_bg_color: string | null
              matterport_url: string | null
              menu_language: string | null
              menu_name: string | null
              menu_summary: string | null
              menu_summary_title: string | null
              menu_url: string | null
              min_price: number | null
              name: string
              name_ar: string | null
              name_en: string | null
              neighborhood: string | null
              online_shop_cta: string | null
              online_shop_force_external: boolean
              online_shop_presentation_mode: string
              online_shop_url: string | null
              opening_hours: Json | null
              other_booking_name: string | null
              other_booking_url: string | null
              pdf_2_name: string | null
              pdf_2_url: string | null
              pdf_3_name: string | null
              pdf_3_url: string | null
              pdf_name: string | null
              pdf_url: string | null
              phone: string | null
              pinterest_url: string | null
              poi_business_style: string
              poi_description: string | null
              poi_hook: string | null
              poi_radius_km: number
              popup_image_url: string | null
              presentation_mode: string
              prioritize_images: boolean
              priority_score: number | null
              rating: number | null
              region: string | null
              reserve_now_cta: string | null
              reserve_now_force_external: boolean
              reserve_now_url: string | null
              restaurant_guru_rating: number | null
              restaurant_guru_review_count: number | null
              restaurant_guru_url: string | null
              search_vector: unknown
              services: string[] | null
              show_opening_hours: boolean | null
              show_videos: boolean
              show_youtube_tab: boolean
              showcase_target_url: string | null
              skype: string | null
              slug: string
              snapchat_url: string | null
              soundcloud_url: string | null
              spotify_url: string | null
              substack_url: string | null
              telegram: string | null
              tiktok_url: string | null
              total_review_count: number | null
              tourradar_rating: number | null
              tourradar_review_count: number | null
              tourradar_url: string | null
              tripadvisor_location_id: string | null
              tripadvisor_rating: number | null
              tripadvisor_review_count: number | null
              tripadvisor_review_url: string | null
              tripadvisor_url: string | null
              trivago_url: string | null
              trustpilot_rating: number | null
              trustpilot_review_count: number | null
              trustpilot_url: string | null
              twitter_url: string | null
              unified_cta: string | null
              updated_at: string
              url_4: string | null
              url_4_cta: string | null
              url_4_force_external: boolean
              url_4_presentation_mode: string
              url_5: string | null
              url_5_cta: string | null
              url_5_force_external: boolean
              url_5_presentation_mode: string
              url_6: string | null
              url_6_force_external: boolean | null
              url_6_title: string | null
              vacation_dates: Json | null
              viator_rating: number | null
              viator_review_count: number | null
              viator_url: string | null
              video_1_url: string | null
              vimeo_url: string | null
              website: string | null
              website_cta: string | null
              website_force_external: boolean
              website_presentation_mode: string
              whatsapp: string | null
              widget_bg_color: string | null
              widget_bg_color_dark: string | null
              widget_theme: string | null
              wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
              youtube_channel_featured: boolean
              youtube_channel_thumbnail_url: string | null
              youtube_url: string | null
              zone_chalandise: string | null
              zone_city_ids: string[] | null
            }[]
            SetofOptions: {
              from: "*"
              to: "businesses"
              isOneToOne: false
              isSetofReturn: true
            }
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      slugify: { Args: { input: string }; Returns: string }
      staff_get_member_details: { Args: { p_member_id: string }; Returns: Json }
      staff_rls_matrix: { Args: never; Returns: Json }
      staff_update_club_member: {
        Args: { p_member_id: string; p_payload: Json }
        Returns: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook: string | null
          first_name: string | null
          id: string
          instagram: string | null
          last_active_at: string | null
          last_name: string | null
          linkedin: string | null
          nickname: string
          phone: string | null
          pinterest: string | null
          skype: string | null
          soundcloud: string | null
          spotify: string | null
          tiktok: string | null
          twitter: string | null
          user_id: string | null
          website: string | null
          welcome_email_sent_at: string | null
          whatsapp: string | null
          youtube: string | null
        }
        SetofOptions: {
          from: "*"
          to: "club_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      touch_club_member_activity: { Args: never; Returns: undefined }
      trigger_refresh_hotel_prices: { Args: never; Returns: undefined }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff" | "affiliate" | "video_studio"
      billing_currency: "MAD" | "EUR" | "USD"
      billing_payment_status: "pending" | "succeeded" | "failed"
      billing_price_source: "grid" | "manual"
      billing_recurrence: "one_time" | "monthly" | "quarterly" | "yearly"
      invoice_status: "unpaid" | "paid"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "refused"
        | "expired"
        | "invoiced"
      wtuce_status: "verified" | "pending"
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
      app_role: ["admin", "staff", "affiliate", "video_studio"],
      billing_currency: ["MAD", "EUR", "USD"],
      billing_payment_status: ["pending", "succeeded", "failed"],
      billing_price_source: ["grid", "manual"],
      billing_recurrence: ["one_time", "monthly", "quarterly", "yearly"],
      invoice_status: ["unpaid", "paid"],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "refused",
        "expired",
        "invoiced",
      ],
      wtuce_status: ["verified", "pending"],
    },
  },
} as const
