
CREATE OR REPLACE FUNCTION public.get_club_members_with_last_sign_in()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  nickname text,
  email text,
  phone text,
  whatsapp text,
  city text,
  country text,
  created_at timestamptz,
  user_id uuid,
  last_sign_in_at timestamptz
)
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
    au.last_sign_in_at
  FROM club_members cm
  LEFT JOIN auth.users au ON cm.user_id = au.id
  ORDER BY cm.created_at DESC;
END;
$$;
