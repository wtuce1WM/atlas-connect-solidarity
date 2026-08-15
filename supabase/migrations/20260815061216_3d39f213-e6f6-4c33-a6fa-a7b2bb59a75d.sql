REVOKE ALL ON FUNCTION public.trigger_refresh_hotel_prices() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_refresh_hotel_prices() TO postgres, service_role;