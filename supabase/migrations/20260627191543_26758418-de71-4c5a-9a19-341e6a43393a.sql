
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_first text := COALESCE(
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'first_name',
    split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1)
  );
  v_last text := COALESCE(
    NEW.raw_user_meta_data->>'family_name',
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(substring(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '') from position(' ' in COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '') || ' ') + 1), '')
  );
  v_nick text := COALESCE(NEW.raw_user_meta_data->>'nickname', v_first, split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, avatar_url)
  VALUES (
    NEW.id, v_first, v_last,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF COALESCE((NEW.raw_user_meta_data->>'is_club_signup')::boolean, false) THEN
    INSERT INTO public.club_members (user_id, nickname, email, first_name, last_name, phone, whatsapp)
    VALUES (
      NEW.id,
      v_nick,
      NEW.email,
      NULLIF(v_first, ''),
      NULLIF(v_last, ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'whatsapp', '')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
