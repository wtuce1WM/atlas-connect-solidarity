
-- Allow staff to update club member profile fields
CREATE OR REPLACE FUNCTION public.staff_update_club_member(p_member_id uuid, p_payload jsonb)
RETURNS public.club_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.club_members;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.club_members SET
    first_name  = COALESCE(p_payload->>'first_name',  first_name),
    last_name   = COALESCE(p_payload->>'last_name',   last_name),
    nickname    = COALESCE(p_payload->>'nickname',    nickname),
    email       = COALESCE(p_payload->>'email',       email),
    phone       = COALESCE(p_payload->>'phone',       phone),
    whatsapp    = COALESCE(p_payload->>'whatsapp',    whatsapp),
    city        = COALESCE(p_payload->>'city',        city),
    country     = COALESCE(p_payload->>'country',     country),
    description = COALESCE(p_payload->>'description', description),
    website     = COALESCE(p_payload->>'website',     website),
    instagram   = COALESCE(p_payload->>'instagram',   instagram),
    facebook    = COALESCE(p_payload->>'facebook',    facebook),
    tiktok      = COALESCE(p_payload->>'tiktok',      tiktok),
    youtube     = COALESCE(p_payload->>'youtube',     youtube),
    twitter     = COALESCE(p_payload->>'twitter',     twitter),
    linkedin    = COALESCE(p_payload->>'linkedin',    linkedin),
    pinterest   = COALESCE(p_payload->>'pinterest',   pinterest),
    spotify     = COALESCE(p_payload->>'spotify',     spotify),
    soundcloud  = COALESCE(p_payload->>'soundcloud',  soundcloud),
    avatar_url  = COALESCE(p_payload->>'avatar_url',  avatar_url)
  WHERE id = p_member_id
  RETURNING * INTO m;

  RETURN m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_update_club_member(uuid, jsonb) TO authenticated;

-- Detailed member view for staff: trips, bookmarks, AI chats, stats
CREATE OR REPLACE FUNCTION public.staff_get_member_details(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m public.club_members;
  trips jsonb;
  bookmarks jsonb;
  chats jsonb;
  stats jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT * INTO m FROM public.club_members WHERE id = p_member_id;
  IF m.id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'description', t.description,
    'arrival_date', t.arrival_date,
    'departure_date', t.departure_date,
    'arrival_time', t.arrival_time,
    'departure_time', t.departure_time,
    'business_count', (SELECT count(*) FROM public.club_trip_businesses tb WHERE tb.trip_id = t.id)
  ) ORDER BY t.arrival_date DESC NULLS LAST), '[]'::jsonb)
  INTO trips
  FROM public.club_trips t
  WHERE t.user_id = m.user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'business_id', b.business_id,
    'name', biz.name,
    'slug', biz.slug,
    'city', biz.city,
    'created_at', b.created_at
  ) ORDER BY b.created_at DESC), '[]'::jsonb)
  INTO bookmarks
  FROM public.bookmarks b
  LEFT JOIN public.businesses biz ON biz.id = b.business_id
  WHERE b.user_id = m.user_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'kind', c.kind,
    'city', c.city,
    'is_bookmarked', c.is_bookmarked,
    'message_count', COALESCE(jsonb_array_length(c.messages), 0),
    'created_at', c.created_at,
    'updated_at', c.updated_at
  ) ORDER BY c.updated_at DESC), '[]'::jsonb)
  INTO chats
  FROM public.ai_chats c
  WHERE c.user_id = m.user_id
    AND (c.is_bookmarked = true
         OR EXISTS (SELECT 1 FROM public.ai_chat_bookmarks ab WHERE ab.chat_id = c.id AND ab.user_id = m.user_id));

  SELECT jsonb_build_object(
    'total_chats', (SELECT count(*) FROM public.ai_chats WHERE user_id = m.user_id),
    'total_messages', (SELECT COALESCE(SUM(jsonb_array_length(messages)), 0) FROM public.ai_chats WHERE user_id = m.user_id),
    'bookmarked_chats', (SELECT count(*) FROM public.ai_chats WHERE user_id = m.user_id AND is_bookmarked = true),
    'total_trips', (SELECT count(*) FROM public.club_trips WHERE user_id = m.user_id),
    'total_bookmarks', (SELECT count(*) FROM public.bookmarks WHERE user_id = m.user_id)
  ) INTO stats;

  RETURN jsonb_build_object(
    'member', to_jsonb(m),
    'stats', stats,
    'trips', trips,
    'bookmarks', bookmarks,
    'ai_chats', chats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_get_member_details(uuid) TO authenticated;
