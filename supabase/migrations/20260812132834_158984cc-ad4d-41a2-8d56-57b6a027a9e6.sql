-- Fusion du scénario « Explicative (affiliés) » dans le scénario Corporate.
-- Les étapes explicatives sont conservées et passent en mode corporate,
-- placées après les étapes corporate existantes.
DO $$
DECLARE maxpos int;
BEGIN
  SELECT COALESCE(MAX(position), 0) INTO maxpos FROM public.video_scenario_steps WHERE mode = 'corporate';
  UPDATE public.video_scenario_steps
     SET mode = 'corporate', position = position + maxpos
   WHERE mode = 'explainer';
END $$;

-- Report de la note interne / établissement lié si le corporate n'en a pas.
UPDATE public.video_scenario_configs c
   SET business_id = COALESCE(c.business_id, e.business_id),
       internal_note = COALESCE(c.internal_note, e.internal_note)
  FROM public.video_scenario_configs e
 WHERE c.mode = 'corporate' AND e.mode = 'explainer';

INSERT INTO public.video_scenario_configs (mode, business_id, format_key, width, height, fps, internal_note)
SELECT 'corporate', business_id, format_key, width, height, fps, internal_note
  FROM public.video_scenario_configs WHERE mode = 'explainer'
   AND NOT EXISTS (SELECT 1 FROM public.video_scenario_configs WHERE mode = 'corporate');

DELETE FROM public.video_scenario_configs WHERE mode = 'explainer';