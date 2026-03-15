
-- 1. Sécuriser ai_config : restreindre SELECT au staff uniquement
DROP POLICY IF EXISTS "ai_config_select" ON public.ai_config;
CREATE POLICY "ai_config_select" ON public.ai_config
  FOR SELECT TO authenticated
  USING (is_staff(auth.uid()));

-- 2. Sécuriser club_members INSERT : empêcher l'usurpation d'identité
DROP POLICY IF EXISTS "Anyone can register to club" ON public.club_members;
CREATE POLICY "Authenticated users can register to club" ON public.club_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Créer une vue publique de businesses sans les champs sensibles
CREATE OR REPLACE VIEW public.businesses_public AS
SELECT 
  id, name, description, categories, services, keywords, city, region, country,
  phone, email, website, address, logo_url, main_category, ice,
  facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url, tiktok_url,
  whatsapp, account_type, tripadvisor_url, booking_url, video_1_url,
  google_maps_url, airbnb_url, images, pdf_url, label1_url, online_shop_url,
  pinterest_url, reserve_now_url, skype, vimeo_url, label1_link_url,
  hotels_com_url, trivago_url, other_booking_url, other_booking_name,
  neighborhood, logo_2_url, hook_fr, hook_en, hook_ar,
  tripadvisor_review_url, restaurant_guru_url, google_reviews_url,
  menu_url, zone_chalandise, default_service, languages,
  getyourguide_url, telegram, logo_bg, destination_hook, destination_description,
  poi_hook, poi_description, pdf_name, pdf_2_url, pdf_2_name, pdf_3_url, pdf_3_name,
  engagements, viator_url, business_type, glovo_url, matterport_url,
  flipbook_url, menu_name, menu_language, flipbook_name, flipbook_language,
  menu_summary, menu_summary_title, tripadvisor_location_id,
  latitude, longitude, wtuce_status, priority_score, is_featured, search_vector,
  created_at, updated_at, is_regulated_activity, opening_hours, rating,
  show_opening_hours, is_active, vacation_dates, gamme_id, is_open_24h, is_master,
  tripadvisor_rating, tripadvisor_review_count, restaurant_guru_rating,
  restaurant_guru_review_count, google_rating, google_review_count,
  affiliate_id, badge_id, zone_city_ids, poissonnerie_details, is_visible_locale,
  getyourguide_rating, getyourguide_review_count, viator_rating, viator_review_count,
  ai_review_summary, is_poi, avg_price_range
FROM public.businesses;
