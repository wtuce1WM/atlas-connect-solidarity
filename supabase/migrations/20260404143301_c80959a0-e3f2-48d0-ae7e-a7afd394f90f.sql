UPDATE businesses
SET show_youtube_tab = true,
    youtube_force_external = false,
    updated_at = now()
WHERE youtube_force_external = true AND is_active = true;