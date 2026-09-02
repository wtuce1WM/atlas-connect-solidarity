DO $do$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef(oid) INTO d FROM pg_proc
   WHERE proname = 'get_badges_video_feed' AND pronamespace = 'public'::regnamespace;
  IF position('ORDER BY c.is_portrait DESC, c.cycle_pos, c.h' in d) = 0 THEN
    RAISE EXCEPTION 'ordering clause not found';
  END IF;
  d := replace(d, 'ORDER BY c.is_portrait DESC, c.cycle_pos, c.h', 'ORDER BY c.cycle_pos, c.is_portrait DESC, c.h');
  EXECUTE d;
END
$do$;