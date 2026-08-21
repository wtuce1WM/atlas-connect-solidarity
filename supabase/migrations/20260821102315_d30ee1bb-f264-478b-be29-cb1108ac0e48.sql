
UPDATE public.business_documents
SET url = regexp_replace(url, '1776244169156-97yac\.mp4$', '1776244169666-rr06nl.mp4')
WHERE id = 'ad01957f-74f6-41c8-ac0c-c93c778fa91d';
