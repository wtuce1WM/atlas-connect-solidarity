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
          promotion_currency: string
          promotion_message: string | null
          promotion_type: string
          promotion_value: number
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          business_id: string
          created_at?: string
          id?: string
          promotion_currency?: string
          promotion_message?: string | null
          promotion_type?: string
          promotion_value?: number
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          business_id?: string
          created_at?: string
          id?: string
          promotion_currency?: string
          promotion_message?: string | null
          promotion_type?: string
          promotion_value?: number
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
      affiliates: {
        Row: {
          account_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country_id: string
          created_at: string
          ice: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          kp_regroupement: string | null
          main_category: string | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          account_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_id: string
          created_at?: string
          ice?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          kp_regroupement?: string | null
          main_category?: string | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          account_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_id?: string
          created_at?: string
          ice?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          kp_regroupement?: string | null
          main_category?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
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
      blog_posts: {
        Row: {
          author_name: string | null
          content_ar: string | null
          content_en: string | null
          content_fr: string | null
          cover_image_url: string | null
          created_at: string
          excerpt_ar: string | null
          excerpt_en: string | null
          excerpt_fr: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title_ar: string | null
          title_en: string | null
          title_fr: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content_ar?: string | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title_ar?: string | null
          title_en?: string | null
          title_fr: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content_ar?: string | null
          content_en?: string | null
          content_fr?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt_ar?: string | null
          excerpt_en?: string | null
          excerpt_fr?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title_ar?: string | null
          title_en?: string | null
          title_fr?: string
          updated_at?: string
        }
        Relationships: []
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
      business_documents: {
        Row: {
          business_id: string
          created_at: string
          icon: string | null
          id: string
          language: string | null
          name: string | null
          sort_order: number
          type: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          icon?: string | null
          id?: string
          language?: string | null
          name?: string | null
          sort_order?: number
          type: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          icon?: string | null
          id?: string
          language?: string | null
          name?: string | null
          sort_order?: number
          type?: string
          url?: string
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
          categories: string[] | null
          city: string | null
          country: string | null
          created_at: string
          default_service: string | null
          description: string | null
          destination_description: string | null
          destination_hook: string | null
          email: string | null
          engagements: string[]
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
          id: string
          images: string[] | null
          instagram_url: string | null
          internal_notes: string | null
          is_active: boolean
          is_featured: boolean | null
          is_master: boolean
          is_open_24h: boolean
          is_poi: boolean
          is_regulated_activity: boolean | null
          is_visible_locale: boolean
          keywords: string[] | null
          kp_regroupement: string | null
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
          name: string
          neighborhood: string | null
          online_shop_force_external: boolean
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
          poissonnerie_details: Json | null
          presentation_mode: string
          priority_score: number | null
          rating: number | null
          region: string | null
          reserve_now_force_external: boolean
          reserve_now_url: string | null
          restaurant_guru_rating: number | null
          restaurant_guru_review_count: number | null
          restaurant_guru_url: string | null
          search_vector: unknown
          services: string[] | null
          show_opening_hours: boolean | null
          skype: string | null
          slug: string
          telegram: string | null
          tiktok_url: string | null
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
          updated_at: string
          vacation_dates: Json | null
          viator_rating: number | null
          viator_review_count: number | null
          viator_url: string | null
          video_1_url: string | null
          vimeo_url: string | null
          website: string | null
          website_force_external: boolean
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
          avis_verifies_rating?: number | null
          avis_verifies_review_count?: number | null
          avis_verifies_url?: string | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_service?: string | null
          description?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[]
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
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          internal_notes?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_master?: boolean
          is_open_24h?: boolean
          is_poi?: boolean
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean
          keywords?: string[] | null
          kp_regroupement?: string | null
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
          name: string
          neighborhood?: string | null
          online_shop_force_external?: boolean
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
          poissonnerie_details?: Json | null
          presentation_mode?: string
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_force_external?: boolean
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          slug: string
          telegram?: string | null
          tiktok_url?: string | null
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
          updated_at?: string
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          website_force_external?: boolean
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
          avis_verifies_rating?: number | null
          avis_verifies_review_count?: number | null
          avis_verifies_url?: string | null
          badge_id?: string | null
          booking_url?: string | null
          business_type?: string | null
          categories?: string[] | null
          city?: string | null
          country?: string | null
          created_at?: string
          default_service?: string | null
          description?: string | null
          destination_description?: string | null
          destination_hook?: string | null
          email?: string | null
          engagements?: string[]
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
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          internal_notes?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_master?: boolean
          is_open_24h?: boolean
          is_poi?: boolean
          is_regulated_activity?: boolean | null
          is_visible_locale?: boolean
          keywords?: string[] | null
          kp_regroupement?: string | null
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
          name?: string
          neighborhood?: string | null
          online_shop_force_external?: boolean
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
          poissonnerie_details?: Json | null
          presentation_mode?: string
          priority_score?: number | null
          rating?: number | null
          region?: string | null
          reserve_now_force_external?: boolean
          reserve_now_url?: string | null
          restaurant_guru_rating?: number | null
          restaurant_guru_review_count?: number | null
          restaurant_guru_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          slug?: string
          telegram?: string | null
          tiktok_url?: string | null
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
          updated_at?: string
          vacation_dates?: Json | null
          viator_rating?: number | null
          viator_review_count?: number | null
          viator_url?: string | null
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          website_force_external?: boolean
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
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      certification_metadata: {
        Row: {
          certification_name: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          link_title: string | null
          link_url: string | null
          updated_at: string
        }
        Insert: {
          certification_name: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          link_title?: string | null
          link_url?: string | null
          updated_at?: string
        }
        Update: {
          certification_name?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          link_title?: string | null
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
      club_members: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          nickname: string
          phone: string | null
          skype: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          nickname: string
          phone?: string | null
          skype?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          nickname?: string
          phone?: string | null
          skype?: string | null
          user_id?: string | null
          whatsapp?: string | null
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
      destinations: {
        Row: {
          created_at: string | null
          description: string | null
          hook: string | null
          id: string
          image_url: string | null
          images: string[] | null
          internal_notes: string | null
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
          updated_at: string | null
          videos: string[] | null
          wikipedia_ar: string | null
          wikipedia_en: string | null
          wikipedia_fr: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          internal_notes?: string | null
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
          updated_at?: string | null
          videos?: string[] | null
          wikipedia_ar?: string | null
          wikipedia_en?: string | null
          wikipedia_fr?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          internal_notes?: string | null
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
          hook: string | null
          id: string
          image_url: string | null
          keywords: string[] | null
          latitude: number | null
          longitude: number | null
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          description?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          description?: string | null
          hook?: string | null
          id?: string
          image_url?: string | null
          keywords?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name?: string
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
      points_of_interest: {
        Row: {
          city_id: string
          created_at: string | null
          description: string | null
          hook: string | null
          id: string
          image_url: string | null
          images: string[] | null
          internal_notes: string | null
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
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          internal_notes?: string | null
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
          hook?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          internal_notes?: string | null
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
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_keywords?: string | null
          id?: string
          is_active?: boolean
          query: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_keywords?: string | null
          id?: string
          is_active?: boolean
          query?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
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
          id: string
          language: string | null
          published_at: string | null
          rating: number | null
          relative_time: string | null
          source: string
          text: string | null
        }
        Insert: {
          author_name?: string | null
          business_id: string
          created_at?: string
          fetched_at?: string
          id?: string
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source: string
          text?: string | null
        }
        Update: {
          author_name?: string | null
          business_id?: string
          created_at?: string
          fetched_at?: string
          id?: string
          language?: string | null
          published_at?: string | null
          rating?: number | null
          relative_time?: string | null
          source?: string
          text?: string | null
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
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          merge_on_conflict?: boolean
          updated_at?: string | null
          word: string
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          merge_on_conflict?: boolean
          updated_at?: string | null
          word?: string
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
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string | null
          word?: string
        }
        Relationships: []
      }
      search_service_filters: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          keyword: string
          required_service: string
          subcategory_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword: string
          required_service: string
          subcategory_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          keyword?: string
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
          service_names: string[]
          subcategory_names: string[]
          synonyms: string[]
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
          service_names?: string[]
          subcategory_names?: string[]
          synonyms?: string[]
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
          service_names?: string[]
          subcategory_names?: string[]
          synonyms?: string[]
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
          internal_notes: string | null
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
          internal_notes?: string | null
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
          internal_notes?: string | null
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
          description_fr: string | null
          icon: string | null
          id: string
          keywords: string[] | null
          merge_group: string | null
          name_ar: string | null
          name_en: string | null
          name_fr: string
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
          description_fr?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          merge_group?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
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
          description_fr?: string | null
          icon?: string | null
          id?: string
          keywords?: string[] | null
          merge_group?: string | null
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
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
      voice_intent_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          rule_text: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          rule_text?: string
          sort_order?: number
          updated_at?: string
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
          poissonnerie_details: Json | null
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
          poissonnerie_details?: Json | null
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
          poissonnerie_details?: Json | null
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
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_club_members_with_last_sign_in: {
        Args: never
        Returns: {
          city: string
          country: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          last_sign_in_at: string
          nickname: string
          phone: string
          user_id: string
          whatsapp: string
        }[]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_own_affiliate_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
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
              categories: string[] | null
              city: string | null
              country: string | null
              created_at: string
              default_service: string | null
              description: string | null
              destination_description: string | null
              destination_hook: string | null
              email: string | null
              engagements: string[]
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
              id: string
              images: string[] | null
              instagram_url: string | null
              internal_notes: string | null
              is_active: boolean
              is_featured: boolean | null
              is_master: boolean
              is_open_24h: boolean
              is_poi: boolean
              is_regulated_activity: boolean | null
              is_visible_locale: boolean
              keywords: string[] | null
              kp_regroupement: string | null
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
              name: string
              neighborhood: string | null
              online_shop_force_external: boolean
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
              poissonnerie_details: Json | null
              presentation_mode: string
              priority_score: number | null
              rating: number | null
              region: string | null
              reserve_now_force_external: boolean
              reserve_now_url: string | null
              restaurant_guru_rating: number | null
              restaurant_guru_review_count: number | null
              restaurant_guru_url: string | null
              search_vector: unknown
              services: string[] | null
              show_opening_hours: boolean | null
              skype: string | null
              slug: string
              telegram: string | null
              tiktok_url: string | null
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
              updated_at: string
              vacation_dates: Json | null
              viator_rating: number | null
              viator_review_count: number | null
              viator_url: string | null
              video_1_url: string | null
              vimeo_url: string | null
              website: string | null
              website_force_external: boolean
              whatsapp: string | null
              wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
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
              categories: string[] | null
              city: string | null
              country: string | null
              created_at: string
              default_service: string | null
              description: string | null
              destination_description: string | null
              destination_hook: string | null
              email: string | null
              engagements: string[]
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
              id: string
              images: string[] | null
              instagram_url: string | null
              internal_notes: string | null
              is_active: boolean
              is_featured: boolean | null
              is_master: boolean
              is_open_24h: boolean
              is_poi: boolean
              is_regulated_activity: boolean | null
              is_visible_locale: boolean
              keywords: string[] | null
              kp_regroupement: string | null
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
              name: string
              neighborhood: string | null
              online_shop_force_external: boolean
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
              poissonnerie_details: Json | null
              presentation_mode: string
              priority_score: number | null
              rating: number | null
              region: string | null
              reserve_now_force_external: boolean
              reserve_now_url: string | null
              restaurant_guru_rating: number | null
              restaurant_guru_review_count: number | null
              restaurant_guru_url: string | null
              search_vector: unknown
              services: string[] | null
              show_opening_hours: boolean | null
              skype: string | null
              slug: string
              telegram: string | null
              tiktok_url: string | null
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
              updated_at: string
              vacation_dates: Json | null
              viator_rating: number | null
              viator_review_count: number | null
              viator_url: string | null
              video_1_url: string | null
              vimeo_url: string | null
              website: string | null
              website_force_external: boolean
              whatsapp: string | null
              wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
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
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "staff" | "affiliate"
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
      app_role: ["admin", "staff", "affiliate"],
      wtuce_status: ["verified", "pending"],
    },
  },
} as const
