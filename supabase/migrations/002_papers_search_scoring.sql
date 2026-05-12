alter table public.papers
  add column if not exists published_date date,
  add column if not exists keywords text[] not null default '{}'::text[],
  add column if not exists paper_type text not null default 'unknown',
  add column if not exists importance_score int not null default 0,
  add column if not exists shorts_fit_score int not null default 0,
  add column if not exists longform_fit_score int not null default 0;

update public.papers
set
  published_date = nullif(pub_date, '')::date
where published_date is null
  and pub_date ~ '^\d{4}-\d{2}-\d{2}$';
