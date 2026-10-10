INSERT INTO public.internal_service_tokens(name) VALUES ('widget_alerts') ON CONFLICT DO NOTHING;
SELECT cron.alter_job(358, command := $c$
  select net.http_post(
    url:='https://plnphgdrawpsnumnejzc.supabase.co/functions/v1/evaluate-widget-alerts',
    headers:=jsonb_build_object('Content-Type','application/json','x-internal-token',(select token from public.internal_service_tokens where name='widget_alerts' limit 1)),
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
$c$);