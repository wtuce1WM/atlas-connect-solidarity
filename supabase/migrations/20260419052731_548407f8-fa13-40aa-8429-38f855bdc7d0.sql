DROP FUNCTION IF EXISTS public.get_club_members_with_last_sign_in();

CREATE OR REPLACE FUNCTION public.get_club_members_with_last_sign_in()
 RETURNS TABLE(id uuid, first_name text, last_name text, nickname text, email text, phone text, whatsapp text, city text, country text, created_at timestamp with time zone, user_id uuid, last_sign_in_at timestamp with time zone, personas jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    cm.id,
    cm.first_name,
    cm.last_name,
    cm.nickname,
    cm.email,
    cm.phone,
    cm.whatsapp,
    cm.city,
    cm.country,
    cm.created_at,
    cm.user_id,
    au.last_sign_in_at,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('id', p.id, 'slug', p.slug, 'name_fr', p.name_fr) ORDER BY p.sort_order)
        FROM club_member_personas cmp
        JOIN personas p ON p.id = cmp.persona_id
        WHERE cmp.member_id = cm.id
      ),
      '[]'::jsonb
    ) AS personas
  FROM club_members cm
  LEFT JOIN auth.users au ON cm.user_id = au.id
  ORDER BY cm.created_at DESC;
END;
$function$;