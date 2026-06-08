CREATE OR REPLACE FUNCTION public.get_public_club_profile(_nickname text)
RETURNS TABLE (
  nickname text,
  first_name text,
  last_name text,
  city text,
  country text,
  description text,
  avatar_url text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  youtube text,
  twitter text,
  linkedin text,
  pinterest text,
  spotify text,
  soundcloud text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.nickname, cm.first_name, cm.last_name, cm.city, cm.country,
    cm.description, cm.avatar_url, cm.website,
    cm.instagram, cm.facebook, cm.tiktok, cm.youtube, cm.twitter,
    cm.linkedin, cm.pinterest, cm.spotify, cm.soundcloud
  FROM public.club_members cm
  WHERE lower(cm.nickname) = lower(_nickname)
  ORDER BY cm.created_at ASC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_club_profile(text) TO anon, authenticated;