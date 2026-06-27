
-- De-duplicate existing nicknames: keep oldest, suffix newer
WITH ranked AS (
  SELECT id, nickname,
         row_number() OVER (PARTITION BY lower(nickname) ORDER BY created_at ASC, id ASC) AS rn
  FROM public.club_members
)
UPDATE public.club_members cm
SET nickname = r.nickname || (r.rn - 1)::text
FROM ranked r
WHERE cm.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS club_members_nickname_lower_unique
  ON public.club_members (lower(nickname));

CREATE OR REPLACE FUNCTION public.validate_club_member_nickname()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.nickname IS NULL OR length(trim(NEW.nickname)) < 3 THEN
    RAISE EXCEPTION 'Nickname must be at least 3 characters';
  END IF;
  IF length(NEW.nickname) > 30 THEN
    RAISE EXCEPTION 'Nickname must be at most 30 characters';
  END IF;
  IF NEW.nickname !~ '^[A-Za-z0-9_\-\.]+$' THEN
    RAISE EXCEPTION 'Nickname may only contain letters, digits, dot, underscore and hyphen';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_club_member_nickname_trg ON public.club_members;
CREATE TRIGGER validate_club_member_nickname_trg
  BEFORE INSERT OR UPDATE OF nickname ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_club_member_nickname();

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

  IF COALESCE((NEW.raw_user_meta_data->>'is_club_signup')::boolean, false) THEN
    v_base := COALESCE(NEW.raw_user_meta_data->>'nickname', v_first, split_part(NEW.email, '@', 1));
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
