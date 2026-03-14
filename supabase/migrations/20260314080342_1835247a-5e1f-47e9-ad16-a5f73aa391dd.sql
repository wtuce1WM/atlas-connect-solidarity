
UPDATE businesses
SET 
  latitude = (regexp_match(google_maps_url, '!3d(-?[0-9]+\.?[0-9]*)'))[1]::double precision,
  longitude = (regexp_match(google_maps_url, '!4d(-?[0-9]+\.?[0-9]*)'))[1]::double precision
WHERE is_active = true
  AND google_maps_url ~ '!3d(-?[0-9]+\.?[0-9]*)'
  AND google_maps_url ~ '!4d(-?[0-9]+\.?[0-9]*)'
  AND latitude IS NOT NULL
  AND (
    ABS(latitude - (regexp_match(google_maps_url, '!3d(-?[0-9]+\.?[0-9]*)'))[1]::double precision) > 0.0001
    OR ABS(longitude - (regexp_match(google_maps_url, '!4d(-?[0-9]+\.?[0-9]*)'))[1]::double precision) > 0.0001
  );
