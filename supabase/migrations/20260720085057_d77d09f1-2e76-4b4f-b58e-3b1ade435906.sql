UPDATE public.businesses
SET
  description    = regexp_replace(regexp_replace(description,    '\s*(color|background(-color)?)\s*:\s*[^;"'']+;?', '', 'gi'), 'style="\s*"', '', 'gi'),
  description_fr = regexp_replace(regexp_replace(description_fr, '\s*(color|background(-color)?)\s*:\s*[^;"'']+;?', '', 'gi'), 'style="\s*"', '', 'gi'),
  description_en = regexp_replace(regexp_replace(description_en, '\s*(color|background(-color)?)\s*:\s*[^;"'']+;?', '', 'gi'), 'style="\s*"', '', 'gi'),
  description_ar = regexp_replace(regexp_replace(description_ar, '\s*(color|background(-color)?)\s*:\s*[^;"'']+;?', '', 'gi'), 'style="\s*"', '', 'gi')
WHERE
  description    ~* '(color|background)\s*:' OR
  description_fr ~* '(color|background)\s*:' OR
  description_en ~* '(color|background)\s*:' OR
  description_ar ~* '(color|background)\s*:';