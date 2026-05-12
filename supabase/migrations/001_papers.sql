-- BrainBite: papers stored after user saves from PubMed search

create extension if not exists "uuid-ossp";

create table if not exists public.papers (
  id uuid primary key default uuid_generate_v4(),
  pmid text not null unique,
  title text not null,
  abstract text,
  authors text[],
  journal text,
  pub_date text,
  summary text,
  script text,
  created_at timestamptz not null default now()
);

create index if not exists papers_created_at_idx on public.papers (created_at desc);

comment on table public.papers is 'BrainBite saved PubMed papers with optional AI outputs';
