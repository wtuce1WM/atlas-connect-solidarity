DROP POLICY IF EXISTS "Anyone can update their widget subscription" ON public.widget_alert_subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe from the widget" ON public.widget_alert_subscribers;
DROP POLICY IF EXISTS "Anyone can upload a widget avatar" ON storage.objects;