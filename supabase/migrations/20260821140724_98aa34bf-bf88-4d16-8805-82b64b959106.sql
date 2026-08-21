insert into public.business_youtube_badge_rules (business_id, badge_id)
select b, '1d77d9d1-cc49-4630-8abc-4af49ab68a98'::uuid
from (values
 ('5ece3d91-1a96-44f6-a3b9-c92217aaa39f'::uuid),
 ('129ce4e3-2411-4ab2-b87c-08702b8a5ce5'::uuid),
 ('c111f1d8-27d8-44e0-861e-db62fcb8d415'::uuid)
) as t(b)
on conflict do nothing;

insert into public.business_youtube_video_badges (youtube_video_id, badge_id)
select v.id, '1d77d9d1-cc49-4630-8abc-4af49ab68a98'::uuid
from public.business_youtube_videos v
where v.business_id in (
 '5ece3d91-1a96-44f6-a3b9-c92217aaa39f',
 '129ce4e3-2411-4ab2-b87c-08702b8a5ce5',
 'c111f1d8-27d8-44e0-861e-db62fcb8d415'
)
on conflict do nothing;