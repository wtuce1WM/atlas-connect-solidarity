CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_is_affiliate boolean := COALESCE((NEW.raw_user_meta_data->>'is_affiliate_signup')::boolean, false);
  v_is_club boolean := NOT v_is_affiliate;
  v_base text;
  v_nick text;
  v_suffix int := 0;
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, avatar_url)
  VALUES (
    NEW.id, v_first, v_last,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF v_is_club THEN
    v_base := COALESCE(NEW.raw_user_meta_data->>'nickname', NULLIF(v_first, ''), split_part(NEW.email, '@', 1));
    v_base := regexp_replace(unaccent(coalesce(v_base, '')), '[^A-Za-z0-9_\-\.]+', '', 'g');
    IF v_base IS NULL OR length(v_base) < 3 THEN
      v_base := 'member' || substr(replace(NEW.id::text, '-', ''), 1, 6);
    END IF;
    IF length(v_base) > 24 THEN
      v_base := substr(v_base, 1, 24);
    END IF;

    v_nick := v_base;
    WHILE EXISTS (SELECT 1 FROM public.club_members WHERE lower(nickname) = lower(v_nick)) LOOP
      v_suffix := v_suffix + 1;
      v_nick := v_base || v_suffix::text;
    END LOOP;

    INSERT INTO public.club_members (user_id, nickname, email, first_name, last_name, phone, whatsapp)
    VALUES (
      NEW.id, v_nick, NEW.email,
      NULLIF(v_first, ''), NULLIF(v_last, ''),
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      NULLIF(NEW.raw_user_meta_data->>'whatsapp', '')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;