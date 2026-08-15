insert into public.video_jobs (user_id, business_id, title, prompt, status, duration_sec, template_id, template_props)
select
  src.user_id,
  src.business_id,
  'Promo TEST ' || v.label || ' — Chaabi Payment',
  src.prompt,
  'pending',
  src.duration_sec,
  'business-promo-landscape',
  jsonb_set(
    jsonb_set(
      jsonb_set(src.template_props, '{variant}', to_jsonb(v.variant)),
      '{browserUrl}', case when v.variant in ('browser','multi') then to_jsonb('oneworldmorocco.com'::text) else 'null'::jsonb end),
    '{splitSide}', case when v.variant = 'split' then to_jsonb('left'::text) else 'null'::jsonb end)
from public.video_jobs src
cross join (values
  ('fullscreen','plein écran'),
  ('mockup','mockup smartphone'),
  ('browser','mockup navigateur'),
  ('multi','multi-écrans'),
  ('split','split média/texte')
) as v(variant, label)
where src.id = '5cd8c6d5-ee44-4c8b-9070-e9a100298ca4';