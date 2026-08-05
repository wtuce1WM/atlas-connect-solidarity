insert into public.video_scenario_steps (mode, scene_key, label, position, duration_sec, enabled)
select 'business', 'outro', 'Outro (clôture de marque)', 240, 3, true
where not exists (select 1 from public.video_scenario_steps where mode='business' and scene_key='outro');