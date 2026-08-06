ALTER TABLE public.business_events DROP CONSTRAINT IF EXISTS business_events_type_chk;
ALTER TABLE public.business_events ADD CONSTRAINT business_events_type_chk CHECK (event_type IN (
  'view','whatsapp_click','phone_click','email_click','directions_click',
  'affiliate_click','bookmark_add','bookmark_remove','share_open','share_complete',
  'booking_intent','video_play','document_open','outbound_click','impression'
));