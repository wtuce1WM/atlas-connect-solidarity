CREATE OR REPLACE FUNCTION public.trigger_refresh_hotel_prices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  service_key text;
BEGIN
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key';

  PERFORM net.http_post(
    url := 'https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/refresh-hotel-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body := '{}'::jsonb
  );
END;
$function$;

SELECT cron.alter_job(1, command := 'SELECT public.trigger_refresh_hotel_prices();');