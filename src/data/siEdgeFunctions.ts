// Généré automatiquement depuis le dépôt (scan statique). Ne pas éditer à la main.
export type SiEdgeFunction = { name: string; tables: string[]; writes: string[]; rpc: string[]; secrets: string[]; service_role: boolean; ai: boolean; ext: string[]; lines: number; verify_jwt: boolean };

export const SI_EDGE_FUNCTIONS: SiEdgeFunction[] = [
  {
    "name": "admin-apply",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "ADMIN_APPLY_SECRET",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 18,
    "verify_jwt": false
  },
  {
    "name": "ai-search-answer",
    "tables": [
      "ai_config",
      "blog_posts",
      "business_badges",
      "business_menu_summaries",
      "business_youtube_videos",
      "businesses",
      "generic_video_businesses",
      "hotel_mappings",
      "knowledge_entries",
      "reviews"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 966,
    "verify_jwt": false
  },
  {
    "name": "amadeus-hotels",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "AMADEUS_API_KEY",
      "AMADEUS_API_SECRET"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "test.api.amadeus.com"
    ],
    "lines": 118,
    "verify_jwt": false
  },
  {
    "name": "auth-email-hook",
    "tables": [
      "email_send_log"
    ],
    "writes": [
      "email_send_log"
    ],
    "rpc": [
      "enqueue_email"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 344,
    "verify_jwt": false
  },
  {
    "name": "backfill-google-place-ids",
    "tables": [
      "businesses"
    ],
    "writes": [
      "businesses"
    ],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 120,
    "verify_jwt": true
  },
  {
    "name": "batch-fetch-reviews",
    "tables": [
      "businesses",
      "reviews"
    ],
    "writes": [
      "businesses",
      "reviews"
    ],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev",
      "places.googleapis.com"
    ],
    "lines": 338,
    "verify_jwt": false
  },
  {
    "name": "batch-translate-reviews",
    "tables": [
      "reviews"
    ],
    "writes": [
      "reviews"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 155,
    "verify_jwt": false
  },
  {
    "name": "business-search",
    "tables": [
      "business_badges",
      "business_destinations",
      "business_documents",
      "business_labels",
      "business_youtube_videos",
      "businesses",
      "categories",
      "cities",
      "destinations",
      "generic_video_businesses",
      "generic_videos",
      "labels",
      "neighborhoods",
      "popular_searches",
      "search_bundles",
      "search_intent_words",
      "search_logs",
      "search_noise_words",
      "search_service_filters",
      "search_synonyms",
      "services",
      "subcategories",
      "subcategory_relations",
      "subcategory_search_config"
    ],
    "writes": [
      "search_logs"
    ],
    "rpc": [
      "search_businesses_with_rank"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 5701,
    "verify_jwt": false
  },
  {
    "name": "check-iframe-blocked",
    "tables": [
      "blocked_domains",
      "businesses"
    ],
    "writes": [
      "blocked_domains"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 209,
    "verify_jwt": true
  },
  {
    "name": "check-links",
    "tables": [],
    "writes": [],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_URL"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 103,
    "verify_jwt": true
  },
  {
    "name": "club-ai-chat",
    "tables": [
      "ai_chats",
      "ai_config",
      "ai_conversation_turns",
      "badges",
      "blog_posts",
      "bookmarks",
      "businesses",
      "club_ai_followups",
      "club_ai_suggestions",
      "club_member_personas",
      "club_members",
      "club_trip_businesses",
      "club_trips",
      "destinations",
      "event_badges",
      "events",
      "front_highlights",
      "search_history",
      "subcategories",
      "video_bookmarks",
      "video_likes"
    ],
    "writes": [
      "ai_chats",
      "ai_conversation_turns",
      "club_trip_businesses"
    ],
    "rpc": [
      "match_club_suggestions"
    ],
    "secrets": [
      "FIRECRAWL_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev",
      "api.firecrawl.dev"
    ],
    "lines": 3492,
    "verify_jwt": false
  },
  {
    "name": "compute-route",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "routes.googleapis.com"
    ],
    "lines": 109,
    "verify_jwt": true
  },
  {
    "name": "create-staff-user",
    "tables": [
      "user_roles"
    ],
    "writes": [
      "user_roles"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 126,
    "verify_jwt": true
  },
  {
    "name": "delete-club-member",
    "tables": [
      "club_members",
      "user_roles"
    ],
    "writes": [
      "club_members"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 69,
    "verify_jwt": false
  },
  {
    "name": "diag-github",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GITHUB_PAT",
      "GITHUB_REPO",
      "GITHUB_WORKFLOW_FILE"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.github.com"
    ],
    "lines": 93,
    "verify_jwt": true
  },
  {
    "name": "elevenlabs-scribe-token",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "ELEVENLABS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.elevenlabs.io"
    ],
    "lines": 49,
    "verify_jwt": false
  },
  {
    "name": "elevenlabs-transcribe",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "ELEVENLABS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.elevenlabs.io"
    ],
    "lines": 81,
    "verify_jwt": false
  },
  {
    "name": "elevenlabs-tts",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "ELEVENLABS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.elevenlabs.io"
    ],
    "lines": 100,
    "verify_jwt": false
  },
  {
    "name": "embed-ai-chat",
    "tables": [
      "ai_chats",
      "ai_conversation_turns",
      "badges",
      "blog_posts",
      "business_ai_texts",
      "business_documents",
      "business_embed_ai_item_links",
      "business_menu_summaries",
      "businesses",
      "cities",
      "destinations",
      "embed_ai_followups",
      "embed_ai_suggestions",
      "event_badges",
      "event_businesses",
      "events",
      "front_structure",
      "front_structure_subcategories",
      "neighborhoods",
      "reviews",
      "subcategories",
      "subcategory_relations"
    ],
    "writes": [
      "ai_chats",
      "ai_conversation_turns"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 4905,
    "verify_jwt": true
  },
  {
    "name": "embed-club-suggestions",
    "tables": [
      "club_ai_suggestions",
      "user_roles"
    ],
    "writes": [
      "club_ai_suggestions"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 94,
    "verify_jwt": true
  },
  {
    "name": "evaluate-widget-alerts",
    "tables": [
      "widget_alert_sends",
      "widget_alert_subscribers"
    ],
    "writes": [
      "widget_alert_sends"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 288,
    "verify_jwt": false
  },
  {
    "name": "export-businesses-csv",
    "tables": [
      "businesses"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 79,
    "verify_jwt": true
  },
  {
    "name": "export-storage-manifest",
    "tables": [
      "user_roles"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 159,
    "verify_jwt": true
  },
  {
    "name": "extract-menu-image",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY"
    ],
    "service_role": false,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 88,
    "verify_jwt": true
  },
  {
    "name": "fetch-getyourguide",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.firecrawl.dev"
    ],
    "lines": 211,
    "verify_jwt": false
  },
  {
    "name": "fetch-reviews",
    "tables": [
      "businesses",
      "reviews"
    ],
    "writes": [
      "businesses",
      "reviews"
    ],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY",
      "GOOGLE_MAPS_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "TRIPADVISOR_API_KEY"
    ],
    "service_role": true,
    "ai": false,
    "ext": [
      "api.firecrawl.dev",
      "places.googleapis.com"
    ],
    "lines": 1201,
    "verify_jwt": true
  },
  {
    "name": "fetch-tourradar",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.firecrawl.dev"
    ],
    "lines": 160,
    "verify_jwt": true
  },
  {
    "name": "fetch-youtube-channel",
    "tables": [
      "business_youtube_videos"
    ],
    "writes": [
      "business_youtube_videos"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "YOUTUBE_API_KEY"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 205,
    "verify_jwt": false
  },
  {
    "name": "generate-blog-article",
    "tables": [
      "blog_posts",
      "businesses"
    ],
    "writes": [
      "blog_posts"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 277,
    "verify_jwt": true
  },
  {
    "name": "generate-business-ai-text",
    "tables": [
      "business_documents",
      "businesses",
      "reviews"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev",
      "api.firecrawl.dev"
    ],
    "lines": 596,
    "verify_jwt": true
  },
  {
    "name": "generate-review-summary",
    "tables": [
      "businesses",
      "reviews"
    ],
    "writes": [
      "businesses"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 173,
    "verify_jwt": true
  },
  {
    "name": "generate-sitemap",
    "tables": [
      "blog_posts",
      "businesses",
      "categories",
      "cities",
      "destinations",
      "neighborhoods",
      "points_of_interest",
      "services",
      "subcategories"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 197,
    "verify_jwt": true
  },
  {
    "name": "geocode-locations",
    "tables": [
      "businesses",
      "cities",
      "destinations",
      "points_of_interest"
    ],
    "writes": [
      "businesses",
      "cities",
      "destinations",
      "points_of_interest"
    ],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 211,
    "verify_jwt": false
  },
  {
    "name": "get-google-maps-key",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 61,
    "verify_jwt": false
  },
  {
    "name": "get-weather",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "OPENWEATHERMAP_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 158,
    "verify_jwt": true
  },
  {
    "name": "handle-email-suppression",
    "tables": [
      "email_send_log",
      "suppressed_emails"
    ],
    "writes": [
      "email_send_log",
      "suppressed_emails"
    ],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 163,
    "verify_jwt": false
  },
  {
    "name": "handle-email-unsubscribe",
    "tables": [
      "email_unsubscribe_tokens",
      "suppressed_emails"
    ],
    "writes": [
      "email_unsubscribe_tokens",
      "suppressed_emails"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 131,
    "verify_jwt": false
  },
  {
    "name": "home-bootstrap",
    "tables": [
      "badges",
      "front_structure",
      "front_structure_badges",
      "front_structure_services",
      "front_structure_subcategories",
      "generic_videos",
      "services",
      "subcategories"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 95,
    "verify_jwt": false
  },
  {
    "name": "internalize-images",
    "tables": [
      "businesses"
    ],
    "writes": [
      "businesses"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 187,
    "verify_jwt": true
  },
  {
    "name": "internalize-video",
    "tables": [],
    "writes": [],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 199,
    "verify_jwt": true
  },
  {
    "name": "liteapi-hotel-lookup",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LITEAPI_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 85,
    "verify_jwt": true
  },
  {
    "name": "liteapi-hotels",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LITEAPI_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 323,
    "verify_jwt": false
  },
  {
    "name": "log-business-event",
    "tables": [
      "business_events"
    ],
    "writes": [
      "business_events"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 136,
    "verify_jwt": true
  },
  {
    "name": "log-video-view",
    "tables": [
      "video_views"
    ],
    "writes": [
      "video_views"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 88,
    "verify_jwt": false
  },
  {
    "name": "manage-affiliate-user",
    "tables": [
      "affiliates",
      "user_roles"
    ],
    "writes": [
      "affiliates",
      "user_roles"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 313,
    "verify_jwt": false
  },
  {
    "name": "mcp",
    "tables": [
      "blog_posts",
      "business_destinations",
      "business_documents",
      "business_image_titles",
      "business_menu_summaries",
      "business_poi_businesses",
      "business_youtube_videos",
      "businesses",
      "destinations",
      "event_businesses",
      "events",
      "points_of_interest"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 484,
    "verify_jwt": true
  },
  {
    "name": "og-image",
    "tables": [
      "businesses"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_URL"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 124,
    "verify_jwt": true
  },
  {
    "name": "og-meta",
    "tables": [
      "badges",
      "businesses",
      "categories",
      "cities",
      "destinations",
      "points_of_interest",
      "subcategories",
      "vanity_urls"
    ],
    "writes": [],
    "rpc": [
      "get_public_club_profile"
    ],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_URL"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 407,
    "verify_jwt": true
  },
  {
    "name": "preview-transactional-email",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY"
    ],
    "service_role": false,
    "ai": true,
    "ext": [],
    "lines": 101,
    "verify_jwt": false
  },
  {
    "name": "process-email-queue",
    "tables": [
      "email_send_log",
      "email_send_state"
    ],
    "writes": [
      "email_send_log",
      "email_send_state"
    ],
    "rpc": [
      "delete_email",
      "move_to_dlq",
      "read_email_batch"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "LOVABLE_SEND_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 361,
    "verify_jwt": true
  },
  {
    "name": "recompress-business-images",
    "tables": [
      "businesses",
      "image_compression_log"
    ],
    "writes": [
      "businesses",
      "image_compression_log"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 208,
    "verify_jwt": true
  },
  {
    "name": "refresh-hotel-prices",
    "tables": [
      "businesses",
      "hotel_api_mappings",
      "hotel_mappings",
      "hotel_price_cache"
    ],
    "writes": [
      "hotel_price_cache"
    ],
    "rpc": [],
    "secrets": [
      "LITEAPI_API_KEY",
      "SERPAPI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 264,
    "verify_jwt": true
  },
  {
    "name": "regenerate-homepage-cards",
    "tables": [
      "badges",
      "business_document_badges",
      "business_document_cities",
      "business_documents",
      "businesses",
      "cities",
      "events",
      "front_structure",
      "front_structure_homepage_extra_cards",
      "front_structure_homepage_order",
      "front_structure_homepage_overrides",
      "front_structure_subcategories",
      "generic_videos",
      "homepage_cards_snapshots",
      "subcategories"
    ],
    "writes": [
      "homepage_cards_snapshots"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 383,
    "verify_jwt": true
  },
  {
    "name": "resolve-maps-url",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 351,
    "verify_jwt": true
  },
  {
    "name": "sabre-hotels",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SABRE_CLIENT_ID",
      "SABRE_CLIENT_SECRET"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 249,
    "verify_jwt": false
  },
  {
    "name": "scan-broken-links",
    "tables": [
      "broken_links",
      "businesses"
    ],
    "writes": [
      "broken_links"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 248,
    "verify_jwt": false
  },
  {
    "name": "scrape-article-summary",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.firecrawl.dev"
    ],
    "lines": 104,
    "verify_jwt": true
  },
  {
    "name": "send-affiliate-welcome",
    "tables": [
      "affiliates",
      "user_roles"
    ],
    "writes": [
      "affiliates",
      "user_roles"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 132,
    "verify_jwt": true
  },
  {
    "name": "send-phone-otp",
    "tables": [
      "phone_otp_codes"
    ],
    "writes": [
      "phone_otp_codes"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER"
    ],
    "service_role": true,
    "ai": false,
    "ext": [
      "api.twilio.com"
    ],
    "lines": 86,
    "verify_jwt": true
  },
  {
    "name": "send-transactional-email",
    "tables": [
      "email_send_log",
      "email_unsubscribe_tokens",
      "suppressed_emails"
    ],
    "writes": [
      "email_send_log",
      "email_unsubscribe_tokens"
    ],
    "rpc": [
      "enqueue_email"
    ],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 369,
    "verify_jwt": false
  },
  {
    "name": "serpapi-flights",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SERPAPI_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 164,
    "verify_jwt": false
  },
  {
    "name": "serpapi-hotels",
    "tables": [
      "serpapi_hotels_cache"
    ],
    "writes": [
      "serpapi_hotels_cache"
    ],
    "rpc": [],
    "secrets": [
      "SERPAPI_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 256,
    "verify_jwt": false
  },
  {
    "name": "serpapi-web",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "SERPAPI_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 80,
    "verify_jwt": false
  },
  {
    "name": "static-map",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GOOGLE_MAPS_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 80,
    "verify_jwt": false
  },
  {
    "name": "studio-video-text-assist",
    "tables": [
      "business_documents",
      "business_youtube_videos",
      "businesses"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [],
    "lines": 179,
    "verify_jwt": true
  },
  {
    "name": "submit-affiliate-request",
    "tables": [
      "affiliate_internal_notes",
      "affiliates",
      "countries"
    ],
    "writes": [
      "affiliate_internal_notes",
      "affiliates"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 123,
    "verify_jwt": true
  },
  {
    "name": "substack-feed",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 67,
    "verify_jwt": true
  },
  {
    "name": "test-trustpilot",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.firecrawl.dev"
    ],
    "lines": 62,
    "verify_jwt": false
  },
  {
    "name": "tides",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 314,
    "verify_jwt": true
  },
  {
    "name": "translate-blog-post",
    "tables": [
      "blog_posts"
    ],
    "writes": [
      "blog_posts"
    ],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 310,
    "verify_jwt": true
  },
  {
    "name": "translate-business",
    "tables": [
      "businesses",
      "front_highlights"
    ],
    "writes": [
      "businesses",
      "front_highlights"
    ],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 372,
    "verify_jwt": true
  },
  {
    "name": "translate-content",
    "tables": [
      "translation_jobs"
    ],
    "writes": [
      "translation_jobs"
    ],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 461,
    "verify_jwt": true
  },
  {
    "name": "trigger-render-workflow",
    "tables": [
      "video_jobs"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "GITHUB_PAT",
      "GITHUB_REPO",
      "GITHUB_WORKFLOW_FILE",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [
      "api.github.com"
    ],
    "lines": 91,
    "verify_jwt": true
  },
  {
    "name": "tripadvisor-sync",
    "tables": [
      "businesses",
      "reviews"
    ],
    "writes": [
      "businesses",
      "reviews"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "TRIPADVISOR_API_KEY"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 278,
    "verify_jwt": false
  },
  {
    "name": "update-business-min-price",
    "tables": [
      "businesses",
      "user_roles"
    ],
    "writes": [
      "businesses"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 127,
    "verify_jwt": true
  },
  {
    "name": "verify-phone-otp",
    "tables": [
      "phone_otp_codes"
    ],
    "writes": [
      "phone_otp_codes"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 96,
    "verify_jwt": true
  },
  {
    "name": "video-scenario-generate",
    "tables": [
      "affiliate_business_promotions",
      "blog_posts",
      "business_ai_texts",
      "business_documents",
      "business_image_titles",
      "businesses",
      "destinations",
      "front_highlights",
      "reviews",
      "video_jobs",
      "video_scenario_steps"
    ],
    "writes": [
      "video_jobs"
    ],
    "rpc": [],
    "secrets": [
      "FIRECRAWL_API_KEY",
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev",
      "api.firecrawl.dev"
    ],
    "lines": 1989,
    "verify_jwt": true
  },
  {
    "name": "voice-search-intent",
    "tables": [
      "voice_intent_rules"
    ],
    "writes": [],
    "rpc": [],
    "secrets": [
      "LOVABLE_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": true,
    "ext": [
      "ai.gateway.lovable.dev"
    ],
    "lines": 354,
    "verify_jwt": false
  },
  {
    "name": "weather",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [
      "OPENWEATHERMAP_API_KEY"
    ],
    "service_role": false,
    "ai": false,
    "ext": [
      "api.openweathermap.org"
    ],
    "lines": 137,
    "verify_jwt": true
  },
  {
    "name": "widget-alerts-subscribe",
    "tables": [
      "widget_alert_subscribers"
    ],
    "writes": [
      "widget_alert_subscribers"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 117,
    "verify_jwt": false
  },
  {
    "name": "widget-alerts-unsubscribe",
    "tables": [
      "widget_alert_subscribers"
    ],
    "writes": [
      "widget_alert_subscribers"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 54,
    "verify_jwt": false
  },
  {
    "name": "worker-claim-job",
    "tables": [
      "video_jobs"
    ],
    "writes": [
      "video_jobs"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "WORKER_SECRET"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 102,
    "verify_jwt": true
  },
  {
    "name": "worker-finalize-job",
    "tables": [
      "businesses",
      "video_jobs"
    ],
    "writes": [
      "video_jobs"
    ],
    "rpc": [],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "WORKER_SECRET"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 83,
    "verify_jwt": true
  },
  {
    "name": "yext-sync",
    "tables": [
      "businesses"
    ],
    "writes": [],
    "rpc": [
      "is_own_affiliate_business"
    ],
    "secrets": [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL",
      "YEXT_API_KEY"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 234,
    "verify_jwt": false
  },
  {
    "name": "youtube-frame-capture",
    "tables": [],
    "writes": [],
    "rpc": [
      "is_staff"
    ],
    "secrets": [
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL"
    ],
    "service_role": true,
    "ai": false,
    "ext": [],
    "lines": 137,
    "verify_jwt": true
  },
  {
    "name": "youtube-player-page",
    "tables": [],
    "writes": [],
    "rpc": [],
    "secrets": [],
    "service_role": false,
    "ai": false,
    "ext": [],
    "lines": 79,
    "verify_jwt": false
  }
];
