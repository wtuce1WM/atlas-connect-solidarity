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
      businesses: {
        Row: {
          account_type: string | null
          address: string | null
          airbnb_url: string | null
          booking_url: string | null
          categories: string[] | null
          city: string
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook_url: string | null
          google_maps_url: string | null
          ice: string | null
          id: string
          images: string[] | null
          instagram_url: string | null
          internal_notes: string | null
          is_active: boolean
          is_featured: boolean | null
          is_regulated_activity: boolean | null
          keywords: string[] | null
          kp_regroupement: string | null
          label1_url: string | null
          latitude: number | null
          linkedin_url: string | null
          logo_url: string | null
          longitude: number | null
          main_category: string | null
          name: string
          online_shop_url: string | null
          opening_hours: Json | null
          pdf_url: string | null
          phone: string | null
          pinterest_url: string | null
          priority_score: number | null
          rating: number | null
          region: string
          reserve_now_url: string | null
          search_vector: unknown
          services: string[] | null
          show_opening_hours: boolean | null
          skype: string | null
          tiktok_url: string | null
          tripadvisor_url: string | null
          twitter_url: string | null
          updated_at: string
          video_1_url: string | null
          vimeo_url: string | null
          website: string | null
          whatsapp: string | null
          wtuce_status: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          airbnb_url?: string | null
          booking_url?: string | null
          categories?: string[] | null
          city: string
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          ice?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          internal_notes?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_regulated_activity?: boolean | null
          keywords?: string[] | null
          kp_regroupement?: string | null
          label1_url?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          name: string
          online_shop_url?: string | null
          opening_hours?: Json | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          priority_score?: number | null
          rating?: number | null
          region: string
          reserve_now_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          tiktok_url?: string | null
          tripadvisor_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          whatsapp?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          airbnb_url?: string | null
          booking_url?: string | null
          categories?: string[] | null
          city?: string
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_url?: string | null
          google_maps_url?: string | null
          ice?: string | null
          id?: string
          images?: string[] | null
          instagram_url?: string | null
          internal_notes?: string | null
          is_active?: boolean
          is_featured?: boolean | null
          is_regulated_activity?: boolean | null
          keywords?: string[] | null
          kp_regroupement?: string | null
          label1_url?: string | null
          latitude?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          longitude?: number | null
          main_category?: string | null
          name?: string
          online_shop_url?: string | null
          opening_hours?: Json | null
          pdf_url?: string | null
          phone?: string | null
          pinterest_url?: string | null
          priority_score?: number | null
          rating?: number | null
          region?: string
          reserve_now_url?: string | null
          search_vector?: unknown
          services?: string[] | null
          show_opening_hours?: boolean | null
          skype?: string | null
          tiktok_url?: string | null
          tripadvisor_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          video_1_url?: string | null
          vimeo_url?: string | null
          website?: string | null
          whatsapp?: string | null
          wtuce_status?: Database["public"]["Enums"]["wtuce_status"] | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
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
      cities: {
        Row: {
          country_id: string
          created_at: string | null
          description: string | null
          id: string
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
      services: {
        Row: {
          created_at: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          subcategory_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          subcategory_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
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
      subcategories: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          name_ar: string | null
          name_en: string | null
          name_fr: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          name_ar?: string | null
          name_en?: string | null
          name_fr?: string
          sort_order?: number | null
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
    }
    Views: {
      [_ in never]: never
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
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
      wtuce_status: ["verified", "pending"],
    },
  },
} as const
