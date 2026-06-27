ALTER TABLE public.club_members ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_club_member_activity()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.club_members
  SET last_active_at = now()
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_club_member_activity() TO authenticated;

DROP FUNCTION IF EXISTS public.get_club_members_with_last_sign_in();

CREATE OR REPLACE FUNCTION public.get_club_members_with_last_sign_in()
RETURNS TABLE(id uuid, first_name text, last_name text, nickname text, email text, phone text, whatsapp text, city text, country text, created_at timestamptz, user_id uuid, last_sign_in_at timestamptz, last_active_at timestamptz, personas jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    cm.id, cm.first_name, cm.last_name, cm.nickname, cm.email, cm.phone, cm.whatsapp,
    cm.city, cm.country, cm.created_at, cm.user_id,
    au.last_sign_in_at,
    cm.last_active_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name_fr', p.name_fr) ORDER BY p.sort_order)
       FROM club_member_personas cmp
       JOIN personas p ON p.id = cmp.persona_id
       WHERE cmp.member_id = cm.id),
      '[]'::jsonb
    ) AS personas
  FROM club_members cm
  LEFT JOIN auth.users au ON cm.user_id = au.id
  ORDER BY cm.created_at DESC;
END;
$$;