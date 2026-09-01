alter table public.ai_suggestions
  add column if not exists badges_match_all boolean not null default false;

comment on column public.ai_suggestions.badges_match_all is
  'true = les badges liés sont combinés en ET (un établissement doit porter TOUS les badges) ; false = OU (au moins un badge).';